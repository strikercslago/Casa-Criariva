set check_function_bodies = off;

create or replace function public.get_dashboard_today(p_day date)
returns table (
  day_date date,
  sessions_count bigint,
  expected_students bigint,
  pending_sessions_count bigint,
  next_session_id uuid,
  next_session_start time,
  next_session_class_name text,
  next_session_expected_students bigint,
  events_today_count bigint,
  next_event_id uuid,
  next_event_name text,
  next_event_start time
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can read dashboard today.' using errcode = '42501';
  end if;

  return query
  with day_sessions as (
    select *
    from public.list_agenda_sessions(p_day, p_day)
  ),
  next_session as (
    select ds.session_id, ds.start_time, ds.class_name, ds.expected_students
    from day_sessions ds
    where ds.status <> 'cancelled'
    order by
      case when ds.start_time >= localtime then 0 else 1 end,
      ds.start_time asc,
      ds.class_name asc
    limit 1
  ),
  event_rows as (
    select e.id, e.name, es.start_time
    from public.event_sessions es
    join public.events e on e.id = es.event_id
    where es.session_date = p_day
      and e.status not in ('cancelled', 'completed')
      and public.current_user_is_owner()
  ),
  next_event as (
    select er.id, er.name, er.start_time
    from event_rows er
    order by
      case when er.start_time >= localtime then 0 else 1 end,
      er.start_time asc,
      er.name asc
    limit 1
  )
  select
    p_day,
    count(ds.session_id)::bigint,
    coalesce(sum(ds.expected_students), 0)::bigint,
    count(*) filter (where ds.attendance_state = 'pending')::bigint,
    ns.session_id,
    ns.start_time,
    ns.class_name,
    coalesce(ns.expected_students, 0)::bigint,
    (select count(*)::bigint from event_rows),
    ne.id,
    ne.name,
    ne.start_time
  from day_sessions ds
  left join next_session ns on true
  left join next_event ne on true
  group by ns.session_id, ns.start_time, ns.class_name, ns.expected_students, ne.id, ne.name, ne.start_time;
end;
$$;

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
    from public.list_agenda_sessions(p_day - interval '7 days', p_day) sessions
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

create or replace function public.get_dashboard_operations(p_reference_month date)
returns table (
  reference_month date,
  cash_in numeric,
  cash_out numeric,
  result_amount numeric,
  receivable_amount numeric,
  payable_amount numeric,
  overdue_billing_amount numeric,
  overdue_billing_count bigint,
  active_students_count bigint,
  new_students_count bigint,
  archived_students_count bigint,
  net_students_change bigint,
  active_classes_count bigint,
  class_active_enrollments bigint,
  class_total_capacity bigint,
  class_occupancy_rate numeric,
  full_classes_count bigint,
  available_spots bigint,
  attendance_rate numeric,
  attendance_present_count bigint,
  attendance_absent_count bigint,
  attendance_excused_count bigint,
  attendance_pending_sessions bigint,
  upcoming_events_count bigint,
  next_event_id uuid,
  next_event_name text,
  next_event_date date,
  low_stock_count bigint,
  out_of_stock_count bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select * from public.finance_month_bounds(p_reference_month)
  ),
  finance_summary as (
    select * from public.get_finance_month_summary((select start_date from bounds))
  ),
  billing_overdue as (
    select count(*)::bigint as item_count, coalesce(sum(balance), 0)::numeric(12,2) as amount_value
    from public.monthly_fee_financial_rows((select start_date from bounds), null)
    where lifecycle_status = 'active'
      and balance > 0
      and due_date < current_date
  ),
  students_summary as (
    select
      count(*) filter (where status = 'active')::bigint as active_count,
      count(*) filter (where enrollment_date between (select start_date from bounds) and (select end_date from bounds))::bigint as new_count,
      count(*) filter (where status = 'archived' and archived_at::date between (select start_date from bounds) and (select end_date from bounds))::bigint as archived_count
    from public.students
    where public.current_user_is_owner()
  ),
  class_summary as (
    select
      count(*)::bigint as active_count,
      coalesce(sum(active_enrollments), 0)::bigint as active_enrollments,
      coalesce(sum(capacity) filter (where capacity is not null), 0)::bigint as total_capacity,
      count(*) filter (where is_full)::bigint as full_count,
      coalesce(sum(available_spots) filter (where available_spots is not null), 0)::bigint as available_spots
    from public.list_classes('', 'active', 'all', 1, 100000)
  ),
  attendance_summary as (
    select
      coalesce(sum(present_count), 0)::bigint as present_count,
      coalesce(sum(absent_count), 0)::bigint as absent_count,
      coalesce(sum(excused_count), 0)::bigint as excused_count,
      count(*) filter (where attendance_state = 'pending' and status <> 'cancelled')::bigint as pending_sessions
    from public.list_agenda_sessions((select start_date from bounds), (select end_date from bounds))
    where status <> 'cancelled'
  ),
  upcoming_events as (
    select e.id, e.name, min(es.session_date) as first_date
    from public.events e
    join public.event_sessions es on es.event_id = e.id
    where e.status in ('open', 'draft')
      and es.session_date >= current_date
      and public.current_user_is_owner()
    group by e.id, e.name
  ),
  next_event as (
    select *
    from upcoming_events
    order by first_date asc, name asc
    limit 1
  ),
  inventory_summary as (
    select * from public.get_inventory_summary()
  )
  select
    (select start_date from bounds),
    fs.cash_in,
    fs.cash_out,
    fs.result_amount,
    fs.receivable_amount,
    fs.payable_amount,
    bo.amount_value,
    bo.item_count,
    ss.active_count,
    ss.new_count,
    ss.archived_count,
    (ss.new_count - ss.archived_count)::bigint,
    cs.active_count,
    cs.active_enrollments,
    cs.total_capacity,
    case when cs.total_capacity > 0 then round((cs.active_enrollments::numeric / cs.total_capacity::numeric) * 100, 1) else null end,
    cs.full_count,
    cs.available_spots,
    case
      when (ats.present_count + ats.absent_count + ats.excused_count) > 0
      then round((ats.present_count::numeric / (ats.present_count + ats.absent_count + ats.excused_count)::numeric) * 100, 1)
      else null
    end,
    ats.present_count,
    ats.absent_count,
    ats.excused_count,
    ats.pending_sessions,
    (select count(*)::bigint from upcoming_events),
    ne.id,
    ne.name,
    ne.first_date,
    inv.low_stock_count,
    inv.out_of_stock_count
  from finance_summary fs
  cross join billing_overdue bo
  cross join students_summary ss
  cross join class_summary cs
  cross join attendance_summary ats
  cross join inventory_summary inv
  left join next_event ne on true;
$$;

create or replace function public.get_financial_report(p_start_date date, p_end_date date)
returns table (
  start_date date,
  end_date date,
  cash_in numeric,
  cash_out numeric,
  result_amount numeric,
  receivable_amount numeric,
  payable_amount numeric,
  tuition_received numeric,
  other_income numeric,
  previous_cash_in numeric,
  previous_cash_out numeric,
  previous_result_amount numeric,
  expenses_by_category jsonb,
  cash_flow_rows jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      least(p_start_date, p_end_date) as start_date,
      greatest(p_start_date, p_end_date) as end_date
  ),
  previous_params as (
    select
      (start_date - ((end_date - start_date) + 1))::date as previous_start,
      (start_date - 1)::date as previous_end
    from params
  ),
  cash_rows as (
    select rows.*
    from params p
    join public.finance_cash_flow_rows(p.start_date, p.end_date) rows on true
  ),
  previous_cash_rows as (
    select rows.*
    from previous_params p
    join public.finance_cash_flow_rows(p.previous_start, p.previous_end) rows on true
  ),
  receivable_rows as (
    select balance
    from params p
    join public.monthly_fee_financial_rows(null, null) mf on true
    where mf.lifecycle_status = 'active'
      and mf.balance > 0
      and mf.due_date between p.start_date and p.end_date

    union all

    select rows.balance
    from params p
    join public.finance_entry_financial_rows(p.start_date, p.end_date, 'income') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  ),
  payable_rows as (
    select rows.balance
    from params p
    join public.finance_entry_financial_rows(p.start_date, p.end_date, 'expense') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  ),
  expenses as (
    select
      coalesce(category_name, 'Sem categoria') as category_name,
      coalesce(sum(amount), 0)::numeric(12,2) as amount
    from cash_rows
    where direction = 'expense'
    group by coalesce(category_name, 'Sem categoria')
  )
  select
    p.start_date,
    p.end_date,
    coalesce(sum(cr.amount) filter (where cr.direction = 'income'), 0)::numeric(12,2),
    coalesce(sum(cr.amount) filter (where cr.direction = 'expense'), 0)::numeric(12,2),
    (coalesce(sum(cr.amount) filter (where cr.direction = 'income'), 0) - coalesce(sum(cr.amount) filter (where cr.direction = 'expense'), 0))::numeric(12,2),
    coalesce((select sum(balance) from receivable_rows), 0)::numeric(12,2),
    coalesce((select sum(balance) from payable_rows), 0)::numeric(12,2),
    coalesce(sum(cr.amount) filter (where cr.direction = 'income' and cr.source_type = 'tuition_payment'), 0)::numeric(12,2),
    coalesce(sum(cr.amount) filter (where cr.direction = 'income' and cr.source_type <> 'tuition_payment'), 0)::numeric(12,2),
    coalesce((select sum(amount) filter (where direction = 'income') from previous_cash_rows), 0)::numeric(12,2),
    coalesce((select sum(amount) filter (where direction = 'expense') from previous_cash_rows), 0)::numeric(12,2),
    coalesce((select sum(amount) filter (where direction = 'income') - sum(amount) filter (where direction = 'expense') from previous_cash_rows), 0)::numeric(12,2),
    coalesce((select jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) order by amount desc, category_name asc) from expenses), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object(
      'date', cr.occurred_at::date,
      'description', cr.description,
      'direction', cr.direction,
      'category_name', cr.category_name,
      'source_type', cr.source_type,
      'amount', cr.amount
    ) order by cr.occurred_at desc, cr.description asc) filter (where cr.movement_id is not null), '[]'::jsonb)
  from params p
  left join cash_rows cr on true
  where public.current_user_is_owner()
  group by p.start_date, p.end_date;
$$;

create or replace function public.get_students_report(p_start_date date, p_end_date date)
returns table (
  start_date date,
  end_date date,
  active_students_count bigint,
  new_students_count bigint,
  archived_students_count bigint,
  net_students_change bigint,
  class_distribution jsonb,
  age_bands jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select least(p_start_date, p_end_date) as start_date, greatest(p_start_date, p_end_date) as end_date
  ),
  students_summary as (
    select
      count(*) filter (where status = 'active')::bigint as active_count,
      count(*) filter (where enrollment_date between (select start_date from params) and (select end_date from params))::bigint as new_count,
      count(*) filter (where status = 'archived' and archived_at::date between (select start_date from params) and (select end_date from params))::bigint as archived_count
    from public.students
    where public.current_user_is_owner()
  ),
  distribution as (
    select
      c.name as class_name,
      count(e.id)::bigint as active_students
    from public.classes c
    left join public.enrollments e on e.class_id = c.id and e.status = 'active'
    where c.status = 'active'
      and public.current_user_is_owner()
    group by c.name
  ),
  age_rows as (
    select
      case
        when birth_date is null then 'Sem data'
        when extract(year from age(current_date, birth_date)) < 6 then 'Ate 5'
        when extract(year from age(current_date, birth_date)) between 6 and 8 then '6 a 8'
        when extract(year from age(current_date, birth_date)) between 9 and 12 then '9 a 12'
        else '13+'
      end as age_band,
      count(*)::bigint as student_count
    from public.students
    where status = 'active'
      and public.current_user_is_owner()
    group by 1
  )
  select
    p.start_date,
    p.end_date,
    ss.active_count,
    ss.new_count,
    ss.archived_count,
    (ss.new_count - ss.archived_count)::bigint,
    coalesce((select jsonb_agg(jsonb_build_object('class_name', class_name, 'active_students', active_students) order by active_students desc, class_name asc) from distribution), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('age_band', age_band, 'student_count', student_count) order by age_band asc) from age_rows), '[]'::jsonb)
  from params p
  cross join students_summary ss;
$$;

create or replace function public.get_classes_report()
returns table (
  active_classes_count bigint,
  class_active_enrollments bigint,
  class_total_capacity bigint,
  class_occupancy_rate numeric,
  full_classes_count bigint,
  available_spots bigint,
  classes jsonb
)
language sql
stable
set search_path = public
as $$
  with rows as (
    select *
    from public.list_classes('', 'active', 'all', 1, 100000)
  )
  select
    count(*)::bigint,
    coalesce(sum(active_enrollments), 0)::bigint,
    coalesce(sum(capacity) filter (where capacity is not null), 0)::bigint,
    case
      when coalesce(sum(capacity) filter (where capacity is not null), 0) > 0
      then round((coalesce(sum(active_enrollments), 0)::numeric / sum(capacity)::numeric) * 100, 1)
      else null
    end,
    count(*) filter (where is_full)::bigint,
    coalesce(sum(available_spots) filter (where available_spots is not null), 0)::bigint,
    coalesce(jsonb_agg(jsonb_build_object(
      'class_id', class_id,
      'name', name,
      'capacity', capacity,
      'active_enrollments', active_enrollments,
      'available_spots', available_spots,
      'occupancy_rate', case when capacity is not null and capacity > 0 then round((active_enrollments::numeric / capacity::numeric) * 100, 1) else null end,
      'is_full', is_full,
      'schedules', schedules
    ) order by name asc) filter (where class_id is not null), '[]'::jsonb)
  from rows
  where public.current_user_is_owner();
$$;

create or replace function public.get_attendance_report(p_start_date date, p_end_date date)
returns table (
  start_date date,
  end_date date,
  attendance_rate numeric,
  present_count bigint,
  absent_count bigint,
  excused_count bigint,
  pending_sessions_count bigint,
  sessions_count bigint,
  by_class jsonb,
  by_student jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select least(p_start_date, p_end_date) as start_date, greatest(p_start_date, p_end_date) as end_date
  ),
  sessions as (
    select *
    from public.list_agenda_sessions((select start_date from params), (select end_date from params))
    where status <> 'cancelled'
  ),
  class_rows as (
    select
      class_id,
      class_name,
      count(*)::bigint as sessions_count,
      coalesce(sum(present_count), 0)::bigint as present_count,
      coalesce(sum(absent_count), 0)::bigint as absent_count,
      coalesce(sum(excused_count), 0)::bigint as excused_count,
      count(*) filter (where attendance_state = 'pending')::bigint as pending_sessions_count
    from sessions
    group by class_id, class_name
  ),
  student_rows as (
    select
      st.id as student_id,
      st.full_name as student_name,
      count(ar.id)::bigint as recorded_classes,
      count(ar.id) filter (where ar.status = 'present')::bigint as present_count,
      count(ar.id) filter (where ar.status = 'absent')::bigint as absent_count,
      count(ar.id) filter (where ar.status = 'excused')::bigint as excused_count
    from public.attendance_records ar
    join public.students st on st.id = ar.student_id
    join public.class_sessions cs on cs.id = ar.session_id
    cross join params p
    where cs.status <> 'cancelled'
      and cs.session_date between p.start_date and p.end_date
      and public.current_user_is_owner()
    group by st.id, st.full_name
  ),
  totals as (
    select
      coalesce(sum(present_count), 0)::bigint as present_count,
      coalesce(sum(absent_count), 0)::bigint as absent_count,
      coalesce(sum(excused_count), 0)::bigint as excused_count,
      count(*) filter (where attendance_state = 'pending')::bigint as pending_sessions_count,
      count(*)::bigint as sessions_count
    from sessions
  )
  select
    p.start_date,
    p.end_date,
    case
      when (t.present_count + t.absent_count + t.excused_count) > 0
      then round((t.present_count::numeric / (t.present_count + t.absent_count + t.excused_count)::numeric) * 100, 1)
      else null
    end,
    t.present_count,
    t.absent_count,
    t.excused_count,
    t.pending_sessions_count,
    t.sessions_count,
    coalesce((select jsonb_agg(jsonb_build_object(
      'class_id', class_id,
      'class_name', class_name,
      'sessions_count', sessions_count,
      'present_count', present_count,
      'absent_count', absent_count,
      'excused_count', excused_count,
      'pending_sessions_count', pending_sessions_count,
      'attendance_rate', case when (present_count + absent_count + excused_count) > 0 then round((present_count::numeric / (present_count + absent_count + excused_count)::numeric) * 100, 1) else null end
    ) order by class_name asc) from class_rows), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'student_id', student_id,
      'student_name', student_name,
      'recorded_classes', recorded_classes,
      'present_count', present_count,
      'absent_count', absent_count,
      'excused_count', excused_count,
      'attendance_rate', case when (present_count + absent_count + excused_count) > 0 then round((present_count::numeric / (present_count + absent_count + excused_count)::numeric) * 100, 1) else null end
    ) order by case when (present_count + absent_count + excused_count) > 0 then (present_count::numeric / (present_count + absent_count + excused_count)::numeric) else 1 end asc, student_name asc) from student_rows), '[]'::jsonb)
  from params p
  cross join totals t;
$$;

create or replace function public.get_events_report(p_start_date date, p_end_date date)
returns table (
  start_date date,
  end_date date,
  events_count bigint,
  registrations_count bigint,
  confirmed_count bigint,
  total_capacity bigint,
  occupancy_rate numeric,
  expected_revenue numeric,
  received_amount numeric,
  receivable_amount numeric,
  events jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select least(p_start_date, p_end_date) as start_date, greatest(p_start_date, p_end_date) as end_date
  ),
  event_scope as (
    select e.id, e.name, e.status, e.capacity, min(es.session_date) as first_session_date, max(es.session_date) as last_session_date
    from public.events e
    join public.event_sessions es on es.event_id = e.id
    cross join params p
    where e.status <> 'cancelled'
      and es.session_date between p.start_date and p.end_date
      and public.current_user_is_owner()
    group by e.id, e.name, e.status, e.capacity
  ),
  registration_rows as (
    select
      es.id as event_id,
      count(er.id)::bigint as registrations_count,
      count(er.id) filter (where er.status = 'confirmed')::bigint as confirmed_count,
      coalesce(sum(er.final_amount) filter (where er.status = 'confirmed'), 0)::numeric(12,2) as expected_revenue,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as received_amount
    from event_scope es
    left join public.event_registrations er on er.event_id = es.id
    left join public.financial_settlements fs on fs.financial_entry_id = er.financial_entry_id
    group by es.id
  ),
  rows as (
    select
      es.*,
      coalesce(rr.registrations_count, 0)::bigint as registrations_count,
      coalesce(rr.confirmed_count, 0)::bigint as confirmed_count,
      coalesce(rr.expected_revenue, 0)::numeric(12,2) as expected_revenue,
      coalesce(rr.received_amount, 0)::numeric(12,2) as received_amount,
      greatest(coalesce(rr.expected_revenue, 0) - coalesce(rr.received_amount, 0), 0)::numeric(12,2) as receivable_amount
    from event_scope es
    left join registration_rows rr on rr.event_id = es.id
  )
  select
    p.start_date,
    p.end_date,
    count(rows.id)::bigint,
    coalesce(sum(rows.registrations_count), 0)::bigint,
    coalesce(sum(rows.confirmed_count), 0)::bigint,
    coalesce(sum(rows.capacity) filter (where rows.capacity is not null), 0)::bigint,
    case
      when coalesce(sum(rows.capacity) filter (where rows.capacity is not null), 0) > 0
      then round((coalesce(sum(rows.confirmed_count), 0)::numeric / sum(rows.capacity)::numeric) * 100, 1)
      else null
    end,
    coalesce(sum(rows.expected_revenue), 0)::numeric(12,2),
    coalesce(sum(rows.received_amount), 0)::numeric(12,2),
    coalesce(sum(rows.receivable_amount), 0)::numeric(12,2),
    coalesce(jsonb_agg(jsonb_build_object(
      'event_id', rows.id,
      'name', rows.name,
      'status', rows.status,
      'capacity', rows.capacity,
      'first_session_date', rows.first_session_date,
      'last_session_date', rows.last_session_date,
      'registrations_count', rows.registrations_count,
      'confirmed_count', rows.confirmed_count,
      'expected_revenue', rows.expected_revenue,
      'received_amount', rows.received_amount,
      'receivable_amount', rows.receivable_amount
    ) order by rows.first_session_date asc, rows.name asc) filter (where rows.id is not null), '[]'::jsonb)
  from params p
  left join rows on true
  group by p.start_date, p.end_date;
$$;

create or replace function public.get_inventory_report(p_start_date date, p_end_date date)
returns table (
  start_date date,
  end_date date,
  active_materials_count bigint,
  low_stock_count bigint,
  out_of_stock_count bigint,
  consumption_quantity numeric,
  loss_quantity numeric,
  purchased_quantity numeric,
  purchases_amount numeric,
  low_stock_materials jsonb,
  movement_rows jsonb
)
language sql
stable
set search_path = public
as $$
  with params as (
    select least(p_start_date, p_end_date) as start_date, greatest(p_start_date, p_end_date) as end_date
  ),
  material_rows as (
    select *
    from public.list_materials('', 'all', 'active', null, 1, 100000)
  ),
  movements as (
    select
      im.movement_type,
      im.quantity,
      im.unit_cost,
      im.occurred_at,
      m.name as material_name,
      m.unit
    from public.inventory_movements im
    join public.materials m on m.id = im.material_id
    cross join params p
    where im.occurred_at::date between p.start_date and p.end_date
      and public.current_user_is_owner()
  )
  select
    p.start_date,
    p.end_date,
    (select count(*)::bigint from material_rows),
    (select count(*)::bigint from material_rows where stock_status = 'low'),
    (select count(*)::bigint from material_rows where stock_status = 'out'),
    coalesce((select sum(quantity) from movements where movement_type = 'consumption'), 0)::numeric(12,3),
    coalesce((select sum(quantity) from movements where movement_type = 'loss'), 0)::numeric(12,3),
    coalesce((select sum(quantity) from movements where movement_type = 'purchase'), 0)::numeric(12,3),
    coalesce((select sum(quantity * coalesce(unit_cost, 0)) from movements where movement_type = 'purchase'), 0)::numeric(12,2),
    coalesce((select jsonb_agg(jsonb_build_object(
      'material_id', material_id,
      'name', name,
      'unit', unit,
      'current_stock', current_stock,
      'minimum_stock', minimum_stock,
      'stock_status', stock_status
    ) order by case stock_status when 'out' then 0 when 'low' then 1 else 2 end, name asc) from material_rows where stock_status in ('out', 'low')), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'date', occurred_at::date,
      'material_name', material_name,
      'unit', unit,
      'movement_type', movement_type,
      'quantity', quantity,
      'unit_cost', unit_cost
    ) order by occurred_at desc, material_name asc) from movements), '[]'::jsonb)
  from params p;
$$;

do $$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    'public.get_dashboard_today(date)'::regprocedure,
    'public.get_dashboard_attention(date)'::regprocedure,
    'public.get_dashboard_operations(date)'::regprocedure,
    'public.get_financial_report(date,date)'::regprocedure,
    'public.get_students_report(date,date)'::regprocedure,
    'public.get_classes_report()'::regprocedure,
    'public.get_attendance_report(date,date)'::regprocedure,
    'public.get_events_report(date,date)'::regprocedure,
    'public.get_inventory_report(date,date)'::regprocedure
  ]
  loop
    execute format('alter function %s owner to postgres', fn);
    execute format('alter function %s security definer', fn);
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;
