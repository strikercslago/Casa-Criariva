create or replace function public.get_inventory_summary()
returns table (
  materials_count bigint,
  low_stock_count bigint,
  out_of_stock_count bigint,
  recent_purchases_count bigint
)
language sql
stable
set search_path = public
as $$
  with material_rows as (
    select
      m.id,
      coalesce(ms.current_stock, 0)::numeric(12,3) as current_stock,
      m.minimum_stock
    from public.materials m
    left join public.material_stock_rows() ms on ms.material_id = m.id
    where m.is_active
      and public.current_user_is_owner()
  )
  select
    count(*)::bigint,
    count(*) filter (where current_stock > 0 and current_stock <= minimum_stock)::bigint,
    count(*) filter (where current_stock <= 0)::bigint,
    (
      select count(*)::bigint
      from public.purchases p
      where public.current_user_is_owner()
        and p.purchase_date >= current_date - interval '30 days'
    )
  from material_rows;
$$;

alter function public.get_inventory_summary() owner to postgres;
alter function public.get_inventory_summary() security definer;
revoke all on function public.get_inventory_summary() from public, anon;
grant execute on function public.get_inventory_summary() to authenticated;
