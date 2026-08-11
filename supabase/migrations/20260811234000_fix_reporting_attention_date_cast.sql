create or replace function public.get_dashboard_attention(p_day date)
returns table (
  priority integer,
  kind text,
  title text,
  description text,
  count_value bigint,
  amount numeric,
  href text
)
language sql
stable
set search_path = public
as $$
  with overdue_fees as (
    select count(*)::bigint as item_count, coalesce(sum(balance), 0)::numeric(12,2) as amount_value
    from public.monthly_fee_financial_rows(null, null)
    where lifecycle_status = 'active'
      and balance > 0
      and due_date < p_day
  ),
  overdue_payables as (
    select count(*)::bigint as item_count, coalesce(sum(balance), 0)::numeric(12,2) as amount_value
    from public.finance_entry_financial_rows(null, null, 'expense')
    where lifecycle_status = 'active'
      and balance > 0
      and due_date is not null
      and due_date < p_day
  ),
  pending_attendance as (
    select count(*)::bigint as item_count, coalesce(sum(expected_students), 0)::numeric(12,2) as amount_value
    from public.list_agenda_sessions((p_day - 7)::date, p_day) sessions
    where sessions.session_date <= p_day
      and sessions.attendance_state = 'pending'
      and sessions.status <> 'cancelled'
  ),
  stock_rows as (
    select
      count(*) filter (where stock_status = 'out')::bigint as out_count,
      count(*) filter (where stock_status = 'low')::bigint as low_count
    from public.list_materials('', 'all', 'active', null, 1, 100000)
  ),
  full_classes as (
    select count(*)::bigint as item_count
    from public.list_classes('', 'active', 'full', 1, 100000)
  ),
  rows as (
    select 10 as priority, 'overdue_billing' as kind, 'Mensalidades vencidas' as title,
      case when item_count = 1 then '1 mensalidade em aberto.' else item_count::text || ' mensalidades em aberto.' end as description,
      item_count as count_value, amount_value as amount, '/mensalidades?status=overdue' as href
    from overdue_fees where item_count > 0

    union all
    select 20, 'overdue_payables', 'Contas a pagar vencidas',
      case when item_count = 1 then '1 conta vencida.' else item_count::text || ' contas vencidas.' end,
      item_count, amount_value, '/financeiro?tab=payables'
    from overdue_payables where item_count > 0

    union all
    select 30, 'pending_attendance', 'Frequencia pendente',
      case when item_count = 1 then '1 aula sem chamada registrada.' else item_count::text || ' aulas sem chamada registrada.' end,
      item_count, null::numeric, '/agenda'
    from pending_attendance where item_count > 0

    union all
    select 40, 'stock_out', 'Materiais sem estoque',
      case when out_count = 1 then '1 material zerado.' else out_count::text || ' materiais zerados.' end,
      out_count, null::numeric, '/materiais?status=out'
    from stock_rows where out_count > 0

    union all
    select 50, 'stock_low', 'Materiais abaixo do minimo',
      case when low_count = 1 then '1 material abaixo do minimo.' else low_count::text || ' materiais abaixo do minimo.' end,
      low_count, null::numeric, '/materiais?status=low'
    from stock_rows where low_count > 0

    union all
    select 60, 'full_classes', 'Turmas lotadas',
      case when item_count = 1 then '1 turma esta com ocupacao completa.' else item_count::text || ' turmas estao com ocupacao completa.' end,
      item_count, null::numeric, '/turmas?capacity=full'
    from full_classes where item_count > 0
  )
  select *
  from rows
  where public.current_user_is_owner()
  order by priority asc, title asc;
$$;

alter function public.get_dashboard_attention(date) owner to postgres;
alter function public.get_dashboard_attention(date) security definer;
revoke all on function public.get_dashboard_attention(date) from public, anon;
grant execute on function public.get_dashboard_attention(date) to authenticated;
