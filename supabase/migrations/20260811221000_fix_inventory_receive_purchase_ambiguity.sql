create or replace function public.receive_purchase(payload jsonb)
returns table (
  purchase_id uuid,
  financial_entry_id uuid,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_purchase public.purchases%rowtype;
  target_total numeric;
  target_category_id uuid;
  target_financial_entry_id uuid;
  supplier_name text;
  item record;
  should_settle boolean := coalesce((payload ->> 'settle_now')::boolean, false);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can receive purchases.' using errcode = '42501';
  end if;

  select *
  into target_purchase
  from public.purchases
  where id = (payload ->> 'purchase_id')::uuid
  for update;

  if not found then
    raise exception 'Purchase not found.' using errcode = 'P0002';
  end if;

  if target_purchase.status <> 'draft' then
    raise exception 'Only draft purchases can be received.' using errcode = '23514';
  end if;

  select coalesce(sum(pi.total_amount), 0)::numeric(12,2)
  into target_total
  from public.purchase_items pi
  where pi.purchase_id = target_purchase.id;

  if target_total <= 0 then
    raise exception 'Purchase total must be greater than zero.' using errcode = '23514';
  end if;

  select s.name into supplier_name
  from public.suppliers s
  where s.id = target_purchase.supplier_id;

  select fc.id
  into target_category_id
  from public.financial_categories fc
  where lower(fc.name) = lower('Materiais')
    and fc.type = 'expense'
  limit 1;

  if target_category_id is null then
    insert into public.financial_categories (name, type)
    values ('Materiais', 'expense')
    returning id into target_category_id;
  end if;

  insert into public.financial_entries (
    type,
    category_id,
    description,
    amount,
    competence_date,
    due_date,
    notes,
    created_by
  )
  values (
    'expense',
    target_category_id,
    'Compra de materiais' || coalesce(' - ' || supplier_name, ''),
    target_total,
    target_purchase.purchase_date,
    coalesce(target_purchase.due_date, target_purchase.purchase_date),
    target_purchase.notes,
    actor_id
  )
  returning id into target_financial_entry_id;

  for item in
    select pi.*
    from public.purchase_items pi
    where pi.purchase_id = target_purchase.id
  loop
    perform 1
    from public.materials m
    where m.id = item.material_id
      and m.is_active
    for update;

    if not found then
      raise exception 'Purchase contains archived or missing material.' using errcode = '23514';
    end if;

    insert into public.inventory_movements (
      material_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      occurred_at,
      created_by
    )
    values (
      item.material_id,
      'purchase',
      item.quantity,
      item.unit_cost,
      'purchase',
      target_purchase.id,
      'Recebimento de compra',
      now(),
      actor_id
    );
  end loop;

  update public.purchases p
  set status = 'received',
      financial_entry_id = target_financial_entry_id,
      received_at = now(),
      received_by = actor_id
  where p.id = target_purchase.id;

  if should_settle then
    perform public.settle_financial_entry(jsonb_build_object(
      'financial_entry_id', target_financial_entry_id,
      'amount', target_total,
      'payment_method', coalesce(nullif(payload ->> 'payment_method', ''), 'pix'),
      'cash_account_id', nullif(payload ->> 'cash_account_id', ''),
      'settled_at', coalesce(nullif(payload ->> 'settled_at', ''), now()::text),
      'notes', nullif(btrim(coalesce(payload ->> 'settlement_notes', 'Pagamento de compra de materiais')), '')
    ));
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'purchase',
    target_purchase.id,
    'purchase.received',
    jsonb_build_object('financial_entry_id', target_financial_entry_id, 'total_amount', target_total, 'settled_now', should_settle)
  );

  return query select target_purchase.id, target_financial_entry_id, target_total;
end;
$$;

alter function public.receive_purchase(jsonb) owner to postgres;
revoke all on function public.receive_purchase(jsonb) from public, anon;
grant execute on function public.receive_purchase(jsonb) to authenticated;
