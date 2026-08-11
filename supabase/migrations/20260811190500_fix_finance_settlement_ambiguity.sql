create or replace function public.settle_financial_entry(payload jsonb)
returns table (
  financial_entry_id uuid,
  settlement_id uuid,
  settled_amount numeric,
  balance numeric,
  computed_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_entry public.financial_entries%rowtype;
  settlement_amount numeric(12,2) := (payload ->> 'amount')::numeric;
  paid_so_far numeric(12,2);
  current_balance numeric(12,2);
  new_settlement_id uuid;
  resulting_settled_amount numeric(12,2);
  resulting_balance numeric(12,2);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can settle financial entries.' using errcode = '42501';
  end if;

  select *
  into target_entry
  from public.financial_entries fe
  where fe.id = (payload ->> 'financial_entry_id')::uuid
  for update;

  if not found then
    raise exception 'Financial entry not found.' using errcode = 'P0002';
  end if;

  if target_entry.lifecycle_status = 'cancelled' then
    raise exception 'Cannot settle a cancelled financial entry.' using errcode = '23514';
  end if;

  if settlement_amount <= 0 then
    raise exception 'Settlement amount must be greater than zero.' using errcode = '23514';
  end if;

  select coalesce(sum(fs.amount), 0)::numeric(12,2)
  into paid_so_far
  from public.financial_settlements fs
  where fs.financial_entry_id = target_entry.id
    and fs.status = 'active';

  current_balance := greatest(target_entry.amount - paid_so_far, 0)::numeric(12,2);

  if settlement_amount > current_balance then
    raise exception 'Settlement amount exceeds entry balance.' using errcode = '23514';
  end if;

  insert into public.financial_settlements (
    financial_entry_id,
    amount,
    settled_at,
    payment_method,
    cash_account_id,
    notes,
    recorded_by
  )
  values (
    target_entry.id,
    settlement_amount,
    coalesce(nullif(payload ->> 'settled_at', '')::timestamptz, now()),
    (payload ->> 'payment_method')::public.payment_method,
    nullif(payload ->> 'cash_account_id', '')::uuid,
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_settlement_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'financial_settlement',
      new_settlement_id,
      'financial_settlement.created',
      jsonb_build_object('financial_entry_id', target_entry.id, 'amount', settlement_amount)
    ),
    (
      actor_id,
      'financial_entry',
      target_entry.id,
      'financial_settlement.created',
      jsonb_build_object('settlement_id', new_settlement_id, 'amount', settlement_amount)
    );

  resulting_settled_amount := paid_so_far + settlement_amount;
  resulting_balance := greatest(target_entry.amount - resulting_settled_amount, 0)::numeric(12,2);

  financial_entry_id := target_entry.id;
  settlement_id := new_settlement_id;
  settled_amount := resulting_settled_amount;
  balance := resulting_balance;
  computed_status := case
    when resulting_balance <= 0 and target_entry.type = 'income' then 'received'
    when resulting_balance <= 0 and target_entry.type = 'expense' then 'paid'
    when resulting_settled_amount > 0 and resulting_balance > 0 then 'partial'
    when resulting_balance > 0 and target_entry.due_date is not null and target_entry.due_date < current_date then 'overdue'
    else 'pending'
  end;
  return next;
end;
$$;

comment on function public.settle_financial_entry(jsonb) is
  'Transactional settlement creation. Locks the entry and recalculates balance in the database to prevent concurrent overpayment.';

alter function public.settle_financial_entry(jsonb) owner to postgres;
revoke all on function public.settle_financial_entry(jsonb) from public, anon;
grant execute on function public.settle_financial_entry(jsonb) to authenticated;
