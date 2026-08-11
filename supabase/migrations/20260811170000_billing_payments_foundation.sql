create type public.monthly_fee_lifecycle_status as enum ('active', 'cancelled');
create type public.payment_method as enum ('pix', 'cash', 'card', 'bank_transfer', 'other');
create type public.payment_status as enum ('received', 'reversed');

create table public.monthly_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  billing_plan_id uuid references public.student_billing_plans(id) on delete set null,
  reference_month date not null,
  due_date date not null,
  base_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  final_amount numeric(12,2) generated always as (base_amount - discount_amount) stored,
  lifecycle_status public.monthly_fee_lifecycle_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  constraint monthly_fees_reference_month_first_day check (reference_month = date_trunc('month', reference_month)::date),
  constraint monthly_fees_due_in_reference_month check (
    due_date >= reference_month
    and due_date < (reference_month + interval '1 month')::date
  ),
  constraint monthly_fees_amounts_valid check (
    base_amount >= 0
    and discount_amount >= 0
    and discount_amount <= base_amount
  ),
  constraint monthly_fees_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  ),
  constraint monthly_fees_cancellation_reason_required check (
    lifecycle_status = 'active'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and char_length(btrim(cancellation_reason)) between 4 and 500
    )
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_guardian_id uuid references public.guardians(id) on delete set null,
  amount numeric(12,2) not null,
  paid_at timestamptz not null,
  payment_method public.payment_method not null,
  notes text,
  received_by uuid not null references auth.users(id) on delete restrict,
  status public.payment_status not null default 'received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id) on delete set null,
  reversal_reason text,
  constraint payments_amount_positive check (amount > 0),
  constraint payments_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  ),
  constraint payments_reversal_reason_required check (
    status = 'received'
    or (
      reversed_at is not null
      and reversal_reason is not null
      and char_length(btrim(reversal_reason)) between 4 and 500
    )
  )
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  monthly_fee_id uuid not null references public.monthly_fees(id) on delete restrict,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint payment_allocations_amount_positive check (amount > 0),
  constraint payment_allocations_payment_fee_unique unique (payment_id, monthly_fee_id)
);

create trigger monthly_fees_set_updated_at
before update on public.monthly_fees
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create unique index monthly_fees_active_student_month_uidx
on public.monthly_fees (student_id, reference_month)
where lifecycle_status = 'active';

create index monthly_fees_reference_month_idx on public.monthly_fees (reference_month, due_date, id);
create index monthly_fees_student_reference_idx on public.monthly_fees (student_id, reference_month desc);
create index monthly_fees_due_date_idx on public.monthly_fees (due_date) where lifecycle_status = 'active';
create index monthly_fees_billing_plan_idx on public.monthly_fees (billing_plan_id) where billing_plan_id is not null;
create index payments_paid_at_idx on public.payments (paid_at desc, id);
create index payments_status_idx on public.payments (status, paid_at desc);
create index payments_payer_guardian_idx on public.payments (payer_guardian_id) where payer_guardian_id is not null;
create index payment_allocations_monthly_fee_idx on public.payment_allocations (monthly_fee_id);
create index payment_allocations_payment_idx on public.payment_allocations (payment_id);

comment on table public.monthly_fees is
  'Monthly student charge snapshot. Amounts and due date are copied from student_billing_plans when generated so historical charges do not change with future plan edits.';
comment on table public.payments is
  'Money actually received for billing. Rows are reversed, never deleted by the application.';
comment on table public.payment_allocations is
  'Allocation of received money to monthly fees. Reversed payments keep allocations for history but no longer count as paid.';
comment on column public.monthly_fees.reference_month is
  'First day of the reference month, for example 2026-08-01 for August 2026.';

alter table public.monthly_fees enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;

revoke all on table public.monthly_fees from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.payment_allocations from anon, authenticated;

grant select, insert, update on table public.monthly_fees to authenticated;
grant select, insert, update on table public.payments to authenticated;
grant select, insert on table public.payment_allocations to authenticated;

create policy "monthly_fees_owner_all"
on public.monthly_fees
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "payments_owner_all"
on public.payments
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "payment_allocations_owner_all"
on public.payment_allocations
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create or replace function public.normalize_reference_month(value date)
returns date
language sql
immutable
set search_path = public
as $$
  select date_trunc('month', value)::date;
$$;

create or replace function public.monthly_fee_due_date(reference_month date, due_day smallint)
returns date
language sql
immutable
set search_path = public
as $$
  select least(
    public.normalize_reference_month(reference_month) + (greatest(least(due_day, 31), 1) - 1),
    (public.normalize_reference_month(reference_month) + interval '1 month - 1 day')::date
  );
$$;

create or replace function public.ensure_monthly_fees(p_reference_month date)
returns table (
  reference_month date,
  generated_count integer,
  existing_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_month date := public.normalize_reference_month(p_reference_month);
  month_end date := (target_month + interval '1 month - 1 day')::date;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can generate monthly fees.' using errcode = '42501';
  end if;

  if p_reference_month is null then
    raise exception 'Reference month is required.' using errcode = '22023';
  end if;

  select count(*)::integer
  into existing_count
  from public.monthly_fees mf
  where mf.reference_month = target_month
    and mf.lifecycle_status = 'active';

  with inserted as (
    insert into public.monthly_fees (
      student_id,
      billing_plan_id,
      reference_month,
      due_date,
      base_amount,
      discount_amount,
      notes
    )
    select
      bp.student_id,
      bp.id,
      target_month,
      public.monthly_fee_due_date(target_month, bp.due_day),
      bp.base_amount,
      bp.discount_amount,
      nullif(
        btrim(
          concat_ws(
            ' ',
            'Gerada automaticamente a partir do plano financeiro.',
            case when bp.discount_reason is not null then 'Desconto: ' || bp.discount_reason else null end
          )
        ),
        ''
      )
    from public.student_billing_plans bp
    join public.students s on s.id = bp.student_id
    where bp.status = 'active'
      and bp.auto_generate_fees
      and s.status = 'active'
      and bp.billing_start_date <= month_end
      and not exists (
        select 1
        from public.monthly_fees existing_fee
        where existing_fee.student_id = bp.student_id
          and existing_fee.reference_month = target_month
          and existing_fee.lifecycle_status = 'active'
      )
    on conflict do nothing
    returning id, student_id, billing_plan_id, final_amount, due_date
  ),
  audit_insert as (
    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    select
      actor_id,
      'monthly_fee',
      inserted.id,
      'monthly_fee.generated',
      jsonb_build_object(
        'student_id', inserted.student_id,
        'billing_plan_id', inserted.billing_plan_id,
        'reference_month', target_month,
        'final_amount', inserted.final_amount,
        'due_date', inserted.due_date
      )
    from inserted
    returning 1
  )
  select count(*)::integer into generated_count from audit_insert;

  reference_month := target_month;
  return next;
end;
$$;

create or replace function public.monthly_fee_financial_rows(
  p_reference_month date default null,
  p_student_id uuid default null
)
returns table (
  monthly_fee_id uuid,
  student_id uuid,
  student_name text,
  reference_month date,
  due_date date,
  base_amount numeric,
  discount_amount numeric,
  final_amount numeric,
  amount_paid numeric,
  balance numeric,
  computed_status text,
  is_partial boolean,
  days_overdue integer,
  lifecycle_status public.monthly_fee_lifecycle_status,
  notes text,
  financial_guardian_id uuid,
  financial_guardian_name text,
  financial_guardian_phone text,
  payment_count bigint
)
language sql
stable
set search_path = public
as $$
  with allocation_summary as (
    select
      pa.monthly_fee_id,
      coalesce(sum(pa.amount) filter (where p.status = 'received'), 0)::numeric(12,2) as amount_paid,
      count(*) filter (where p.status = 'received')::bigint as payment_count
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    group by pa.monthly_fee_id
  ),
  fee_rows as (
    select
      mf.id as monthly_fee_id,
      mf.student_id,
      s.full_name as student_name,
      mf.reference_month,
      mf.due_date,
      mf.base_amount,
      mf.discount_amount,
      mf.final_amount,
      coalesce(a.amount_paid, 0)::numeric(12,2) as amount_paid,
      greatest(mf.final_amount - coalesce(a.amount_paid, 0), 0)::numeric(12,2) as balance,
      mf.lifecycle_status,
      mf.notes,
      coalesce(bp.financial_guardian_id, sg.guardian_id) as financial_guardian_id,
      g.full_name as financial_guardian_name,
      g.phone as financial_guardian_phone,
      coalesce(a.payment_count, 0)::bigint as payment_count
    from public.monthly_fees mf
    join public.students s on s.id = mf.student_id
    left join public.student_billing_plans bp on bp.id = mf.billing_plan_id
    left join lateral (
      select sg_inner.guardian_id
      from public.student_guardians sg_inner
      where sg_inner.student_id = mf.student_id
        and sg_inner.is_financial_responsible
      order by sg_inner.created_at asc, sg_inner.guardian_id asc
      limit 1
    ) sg on true
    left join public.guardians g on g.id = coalesce(bp.financial_guardian_id, sg.guardian_id)
    left join allocation_summary a on a.monthly_fee_id = mf.id
    where (p_reference_month is null or mf.reference_month = public.normalize_reference_month(p_reference_month))
      and (p_student_id is null or mf.student_id = p_student_id)
  )
  select
    fee_rows.monthly_fee_id,
    fee_rows.student_id,
    fee_rows.student_name,
    fee_rows.reference_month,
    fee_rows.due_date,
    fee_rows.base_amount,
    fee_rows.discount_amount,
    fee_rows.final_amount,
    fee_rows.amount_paid,
    fee_rows.balance,
    case
      when fee_rows.lifecycle_status = 'cancelled' then 'cancelled'
      when fee_rows.balance <= 0 then 'paid'
      when fee_rows.due_date < current_date then 'overdue'
      when fee_rows.amount_paid > 0 then 'partial'
      else 'pending'
    end as computed_status,
    fee_rows.amount_paid > 0 and fee_rows.balance > 0 as is_partial,
    case
      when fee_rows.balance > 0 and fee_rows.due_date < current_date then (current_date - fee_rows.due_date)::integer
      else 0
    end as days_overdue,
    fee_rows.lifecycle_status,
    fee_rows.notes,
    fee_rows.financial_guardian_id,
    fee_rows.financial_guardian_name,
    fee_rows.financial_guardian_phone,
    fee_rows.payment_count
  from fee_rows
  where public.current_user_is_owner();
$$;

create or replace function public.list_monthly_fees(
  p_reference_month date,
  p_status_filter text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  monthly_fee_id uuid,
  student_id uuid,
  student_name text,
  reference_month date,
  due_date date,
  base_amount numeric,
  discount_amount numeric,
  final_amount numeric,
  amount_paid numeric,
  balance numeric,
  computed_status text,
  is_partial boolean,
  days_overdue integer,
  lifecycle_status public.monthly_fee_lifecycle_status,
  financial_guardian_id uuid,
  financial_guardian_name text,
  financial_guardian_phone text,
  payment_count bigint,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      public.normalize_reference_month(p_reference_month) as target_month,
      case when p_status_filter in ('all', 'pending', 'overdue', 'partial', 'paid', 'cancelled') then p_status_filter else 'all' end as status_filter,
      nullif(btrim(coalesce(p_search, '')), '') as search_text,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 20), 1), 50) as page_size
  ),
  filtered as (
    select rows.*
    from public.monthly_fee_financial_rows((select target_month from params), null) rows
    cross join params p
    where (
      p.search_text is null
      or rows.student_name ilike '%' || p.search_text || '%'
      or coalesce(rows.financial_guardian_name, '') ilike '%' || p.search_text || '%'
    )
    and (
      p.status_filter = 'all'
      or (p.status_filter = 'partial' and rows.is_partial)
      or (p.status_filter <> 'partial' and rows.computed_status = p.status_filter)
    )
  ),
  paged as (
    select filtered.*, count(*) over () as total_count
    from filtered
    cross join params p
    order by
      case when filtered.computed_status = 'overdue' then 0 else 1 end,
      filtered.due_date asc,
      filtered.student_name asc,
      filtered.monthly_fee_id asc
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select
    paged.monthly_fee_id,
    paged.student_id,
    paged.student_name,
    paged.reference_month,
    paged.due_date,
    paged.base_amount,
    paged.discount_amount,
    paged.final_amount,
    paged.amount_paid,
    paged.balance,
    paged.computed_status,
    paged.is_partial,
    paged.days_overdue,
    paged.lifecycle_status,
    paged.financial_guardian_id,
    paged.financial_guardian_name,
    paged.financial_guardian_phone,
    paged.payment_count,
    paged.total_count
  from paged
  where public.current_user_is_owner();
$$;

create or replace function public.get_billing_month_summary(p_reference_month date)
returns table (
  reference_month date,
  expected_amount numeric,
  received_amount numeric,
  pending_amount numeric,
  overdue_amount numeric,
  active_fees_count bigint,
  overdue_fees_count bigint,
  paid_fees_count bigint,
  partial_fees_count bigint,
  cancelled_fees_count bigint
)
language sql
stable
set search_path = public
as $$
  with fee_rows as (
    select *
    from public.monthly_fee_financial_rows(public.normalize_reference_month(p_reference_month), null)
  )
  select
    public.normalize_reference_month(p_reference_month) as reference_month,
    coalesce(sum(final_amount) filter (where lifecycle_status = 'active'), 0)::numeric(12,2) as expected_amount,
    coalesce(sum(amount_paid) filter (where lifecycle_status = 'active'), 0)::numeric(12,2) as received_amount,
    coalesce(sum(balance) filter (where computed_status in ('pending', 'partial')), 0)::numeric(12,2) as pending_amount,
    coalesce(sum(balance) filter (where computed_status = 'overdue'), 0)::numeric(12,2) as overdue_amount,
    count(*) filter (where lifecycle_status = 'active')::bigint as active_fees_count,
    count(*) filter (where computed_status = 'overdue')::bigint as overdue_fees_count,
    count(*) filter (where computed_status = 'paid')::bigint as paid_fees_count,
    count(*) filter (where is_partial)::bigint as partial_fees_count,
    count(*) filter (where lifecycle_status = 'cancelled')::bigint as cancelled_fees_count
  from fee_rows;
$$;

create or replace function public.get_monthly_fee_detail(p_monthly_fee_id uuid)
returns table (
  monthly_fee_id uuid,
  student_id uuid,
  student_name text,
  reference_month date,
  due_date date,
  base_amount numeric,
  discount_amount numeric,
  final_amount numeric,
  amount_paid numeric,
  balance numeric,
  computed_status text,
  is_partial boolean,
  days_overdue integer,
  lifecycle_status public.monthly_fee_lifecycle_status,
  notes text,
  financial_guardian_id uuid,
  financial_guardian_name text,
  financial_guardian_phone text,
  payments jsonb
)
language sql
stable
set search_path = public
as $$
  with listed as (
    select *
    from public.monthly_fee_financial_rows(null, null)
    where monthly_fee_id = p_monthly_fee_id
  )
  select
    listed.monthly_fee_id,
    listed.student_id,
    listed.student_name,
    listed.reference_month,
    listed.due_date,
    listed.base_amount,
    listed.discount_amount,
    listed.final_amount,
    listed.amount_paid,
    listed.balance,
    listed.computed_status,
    listed.is_partial,
    listed.days_overdue,
    listed.lifecycle_status,
    listed.notes,
    listed.financial_guardian_id,
    listed.financial_guardian_name,
    listed.financial_guardian_phone,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_id', p.id,
            'allocation_id', pa.id,
            'amount', pa.amount,
            'paid_at', p.paid_at,
            'payment_method', p.payment_method,
            'notes', p.notes,
            'status', p.status,
            'received_by', p.received_by,
            'created_at', p.created_at,
            'reversed_at', p.reversed_at,
            'reversed_by', p.reversed_by,
            'reversal_reason', p.reversal_reason
          )
          order by p.paid_at desc, p.created_at desc, p.id desc
        )
        from public.payment_allocations pa
        join public.payments p on p.id = pa.payment_id
        where pa.monthly_fee_id = listed.monthly_fee_id
      ),
      '[]'::jsonb
    ) as payments
  from listed
  where public.current_user_is_owner();
$$;

create or replace function public.register_payment(payload jsonb)
returns table (
  monthly_fee_id uuid,
  amount_paid numeric,
  balance numeric,
  computed_status text,
  payment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_fee public.monthly_fees%rowtype;
  payment_amount numeric(12,2) := (payload ->> 'amount')::numeric;
  method public.payment_method := (payload ->> 'payment_method')::public.payment_method;
  paid_on timestamptz := coalesce(nullif(payload ->> 'paid_at', '')::timestamptz, now());
  note_text text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  payer_id uuid := nullif(payload ->> 'payer_guardian_id', '')::uuid;
  paid_so_far numeric(12,2);
  current_balance numeric(12,2);
  created_payment_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can register payments.' using errcode = '42501';
  end if;

  if jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;

  select *
  into target_fee
  from public.monthly_fees
  where id = (payload ->> 'monthly_fee_id')::uuid
  for update;

  if not found then
    raise exception 'Monthly fee not found.' using errcode = 'P0002';
  end if;

  if target_fee.lifecycle_status = 'cancelled' then
    raise exception 'Cannot register payment for a cancelled monthly fee.' using errcode = '23514';
  end if;

  if payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.' using errcode = '23514';
  end if;

  select coalesce(sum(pa.amount), 0)::numeric(12,2)
  into paid_so_far
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.monthly_fee_id = target_fee.id
    and p.status = 'received';

  current_balance := greatest(target_fee.final_amount - paid_so_far, 0)::numeric(12,2);

  if payment_amount > current_balance then
    raise exception 'Payment amount exceeds monthly fee balance.' using errcode = '23514';
  end if;

  if payer_id is null then
    select coalesce(bp.financial_guardian_id, sg.guardian_id)
    into payer_id
    from public.monthly_fees mf
    left join public.student_billing_plans bp on bp.id = mf.billing_plan_id
    left join lateral (
      select sg_inner.guardian_id
      from public.student_guardians sg_inner
      where sg_inner.student_id = mf.student_id
        and sg_inner.is_financial_responsible
      order by sg_inner.created_at asc, sg_inner.guardian_id asc
      limit 1
    ) sg on true
    where mf.id = target_fee.id;
  end if;

  insert into public.payments (
    payer_guardian_id,
    amount,
    paid_at,
    payment_method,
    notes,
    received_by
  )
  values (
    payer_id,
    payment_amount,
    paid_on,
    method,
    note_text,
    actor_id
  )
  returning id into created_payment_id;

  insert into public.payment_allocations (payment_id, monthly_fee_id, amount)
  values (created_payment_id, target_fee.id, payment_amount);

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'payment',
      created_payment_id,
      'payment.received',
      jsonb_build_object(
        'monthly_fee_id', target_fee.id,
        'student_id', target_fee.student_id,
        'amount', payment_amount,
        'payment_method', method,
        'paid_at', paid_on
      )
    ),
    (
      actor_id,
      'monthly_fee',
      target_fee.id,
      'payment.received',
      jsonb_build_object('payment_id', created_payment_id, 'amount', payment_amount)
    ),
    (
      actor_id,
      'student',
      target_fee.student_id,
      'payment.received',
      jsonb_build_object('monthly_fee_id', target_fee.id, 'payment_id', created_payment_id, 'amount', payment_amount)
    );

  monthly_fee_id := target_fee.id;
  amount_paid := paid_so_far + payment_amount;
  balance := greatest(target_fee.final_amount - amount_paid, 0)::numeric(12,2);
  computed_status := case
    when balance <= 0 then 'paid'
    when target_fee.due_date < current_date then 'overdue'
    when amount_paid > 0 then 'partial'
    else 'pending'
  end;
  payment_id := created_payment_id;
  return next;
end;
$$;

create or replace function public.reverse_payment(payload jsonb)
returns table (
  payment_id uuid,
  monthly_fee_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_payment public.payments%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  affected_fee_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can reverse payments.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Reversal reason is required.' using errcode = '23514';
  end if;

  select *
  into target_payment
  from public.payments
  where id = (payload ->> 'payment_id')::uuid
  for update;

  if not found then
    raise exception 'Payment not found.' using errcode = 'P0002';
  end if;

  if target_payment.status = 'reversed' then
    raise exception 'Payment is already reversed.' using errcode = '23514';
  end if;

  update public.payments
  set
    status = 'reversed',
    reversed_at = now(),
    reversed_by = actor_id,
    reversal_reason = reason_text
  where id = target_payment.id;

  select pa.monthly_fee_id
  into affected_fee_id
  from public.payment_allocations pa
  where pa.payment_id = target_payment.id
  order by pa.created_at asc, pa.id asc
  limit 1;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'payment',
      target_payment.id,
      'payment.reversed',
      jsonb_build_object('reason', reason_text, 'amount', target_payment.amount)
    ),
    (
      actor_id,
      'monthly_fee',
      affected_fee_id,
      'payment.reversed',
      jsonb_build_object('payment_id', target_payment.id, 'reason', reason_text, 'amount', target_payment.amount)
    );

  payment_id := target_payment.id;
  monthly_fee_id := affected_fee_id;
  return next;
end;
$$;

create or replace function public.cancel_monthly_fee(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_fee public.monthly_fees%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  active_paid numeric(12,2);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can cancel monthly fees.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Cancellation reason is required.' using errcode = '23514';
  end if;

  select *
  into target_fee
  from public.monthly_fees
  where id = (payload ->> 'monthly_fee_id')::uuid
  for update;

  if not found then
    raise exception 'Monthly fee not found.' using errcode = 'P0002';
  end if;

  if target_fee.lifecycle_status = 'cancelled' then
    return target_fee.id;
  end if;

  select coalesce(sum(pa.amount), 0)::numeric(12,2)
  into active_paid
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.monthly_fee_id = target_fee.id
    and p.status = 'received';

  if active_paid > 0 then
    raise exception 'Reverse received payments before cancelling this monthly fee.' using errcode = '23514';
  end if;

  update public.monthly_fees
  set
    lifecycle_status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = actor_id,
    cancellation_reason = reason_text
  where id = target_fee.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'monthly_fee',
    target_fee.id,
    'monthly_fee.cancelled',
    jsonb_build_object('student_id', target_fee.student_id, 'reason', reason_text, 'reference_month', target_fee.reference_month)
  );

  return target_fee.id;
end;
$$;

create or replace function public.update_monthly_fee_amount(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_fee public.monthly_fees%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  new_base numeric(12,2) := (payload ->> 'base_amount')::numeric;
  new_discount numeric(12,2) := coalesce((payload ->> 'discount_amount')::numeric, 0);
  new_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  active_paid numeric(12,2);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update monthly fees.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Adjustment reason is required.' using errcode = '23514';
  end if;

  if new_base < 0 or new_discount < 0 or new_discount > new_base then
    raise exception 'Invalid monthly fee amounts.' using errcode = '23514';
  end if;

  select *
  into target_fee
  from public.monthly_fees
  where id = (payload ->> 'monthly_fee_id')::uuid
  for update;

  if not found then
    raise exception 'Monthly fee not found.' using errcode = 'P0002';
  end if;

  if target_fee.lifecycle_status = 'cancelled' then
    raise exception 'Cannot update a cancelled monthly fee.' using errcode = '23514';
  end if;

  select coalesce(sum(pa.amount), 0)::numeric(12,2)
  into active_paid
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.monthly_fee_id = target_fee.id
    and p.status = 'received';

  if active_paid > (new_base - new_discount) then
    raise exception 'New amount cannot be lower than received payments.' using errcode = '23514';
  end if;

  update public.monthly_fees
  set
    base_amount = new_base,
    discount_amount = new_discount,
    notes = new_notes
  where id = target_fee.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'monthly_fee',
    target_fee.id,
    'monthly_fee.updated',
    jsonb_build_object(
      'reason', reason_text,
      'old_base_amount', target_fee.base_amount,
      'old_discount_amount', target_fee.discount_amount,
      'new_base_amount', new_base,
      'new_discount_amount', new_discount
    )
  );

  return target_fee.id;
end;
$$;

create or replace function public.get_student_billing_snapshot(
  p_student_id uuid,
  p_reference_month date default current_date,
  p_page integer default 1,
  p_page_size integer default 5
)
returns table (
  student_id uuid,
  billing_plan jsonb,
  current_fee jsonb,
  recent_fees jsonb,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      public.normalize_reference_month(p_reference_month) as target_month,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 5), 1), 12) as page_size
  ),
  plan_row as (
    select bp.*, g.full_name as guardian_name, g.phone as guardian_phone
    from public.student_billing_plans bp
    left join public.guardians g on g.id = bp.financial_guardian_id
    where bp.student_id = p_student_id
      and bp.status = 'active'
    order by bp.created_at desc, bp.id desc
    limit 1
  ),
  fee_rows as (
    select *
    from public.monthly_fee_financial_rows(null, p_student_id)
    order by reference_month desc, due_date desc, monthly_fee_id desc
  ),
  current_row as (
    select *
    from fee_rows fr
    cross join params p
    where fr.reference_month = p.target_month
    limit 1
  ),
  paged_rows as (
    select fee_rows.*, count(*) over () as all_count
    from fee_rows
    cross join params p
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select
    p_student_id as student_id,
    coalesce(
      (
        select jsonb_build_object(
          'id', plan_row.id,
          'base_amount', plan_row.base_amount,
          'discount_amount', plan_row.discount_amount,
          'due_day', plan_row.due_day,
          'billing_start_date', plan_row.billing_start_date,
          'auto_generate_fees', plan_row.auto_generate_fees,
          'status', plan_row.status,
          'financial_guardian_id', plan_row.financial_guardian_id,
          'financial_guardian_name', plan_row.guardian_name,
          'financial_guardian_phone', plan_row.guardian_phone
        )
        from plan_row
      ),
      '{}'::jsonb
    ) as billing_plan,
    coalesce(
      (
        select to_jsonb(current_row)
        from current_row
      ),
      '{}'::jsonb
    ) as current_fee,
    coalesce(
      (
        select jsonb_agg(to_jsonb(paged_rows) - 'total_count' - 'all_count')
        from paged_rows
      ),
      '[]'::jsonb
    ) as recent_fees,
    coalesce((select max(all_count) from paged_rows), 0)::bigint as total_count
  where public.current_user_is_owner();
$$;

comment on function public.ensure_monthly_fees(date) is
  'Idempotently generates active monthly_fee snapshots for active students with active auto-generated billing plans in the requested month.';
comment on function public.monthly_fee_financial_rows(date, uuid) is
  'Internal reusable billing projection with payment sums, derived status and financial guardian. The application uses paged RPCs on top of this projection.';
comment on function public.list_monthly_fees(date, text, text, integer, integer) is
  'Paged, aggregated monthly fee list with derived status, balance and financial guardian. Avoids billing list N+1 queries.';
comment on function public.get_billing_month_summary(date) is
  'Aggregates expected, received, pending and overdue amounts for active monthly fees in one reference month.';
comment on function public.get_monthly_fee_detail(uuid) is
  'Returns one monthly fee with derived balance and full payment history, including reversed payments.';
comment on function public.register_payment(jsonb) is
  'Transactional payment registration for one monthly fee. Locks the fee row and recalculates balance in the database to prevent concurrent overpayment.';
comment on function public.reverse_payment(jsonb) is
  'Reverses a payment without deleting its row or allocations. Reversed payments stop counting toward monthly fee balances.';
comment on function public.cancel_monthly_fee(jsonb) is
  'Cancels an unpaid monthly fee with a required reason. Active payments must be reversed first.';
comment on function public.update_monthly_fee_amount(jsonb) is
  'Adjusts a generated monthly fee snapshot with a required reason and prevents reducing the amount below received payments.';
comment on function public.get_student_billing_snapshot(uuid, date, integer, integer) is
  'Loads a compact Student 360 financial snapshot and paged recent monthly fees without loading full payment history.';

alter function public.normalize_reference_month(date) owner to postgres;
alter function public.monthly_fee_due_date(date, smallint) owner to postgres;
alter function public.ensure_monthly_fees(date) owner to postgres;
alter function public.monthly_fee_financial_rows(date, uuid) owner to postgres;
alter function public.list_monthly_fees(date, text, text, integer, integer) owner to postgres;
alter function public.get_billing_month_summary(date) owner to postgres;
alter function public.get_monthly_fee_detail(uuid) owner to postgres;
alter function public.register_payment(jsonb) owner to postgres;
alter function public.reverse_payment(jsonb) owner to postgres;
alter function public.cancel_monthly_fee(jsonb) owner to postgres;
alter function public.update_monthly_fee_amount(jsonb) owner to postgres;
alter function public.get_student_billing_snapshot(uuid, date, integer, integer) owner to postgres;

revoke all on function public.normalize_reference_month(date) from public, anon, authenticated;
revoke all on function public.monthly_fee_due_date(date, smallint) from public, anon, authenticated;
revoke all on function public.ensure_monthly_fees(date) from public, anon;
revoke all on function public.monthly_fee_financial_rows(date, uuid) from public, anon, authenticated;
revoke all on function public.list_monthly_fees(date, text, text, integer, integer) from public, anon;
revoke all on function public.get_billing_month_summary(date) from public, anon;
revoke all on function public.get_monthly_fee_detail(uuid) from public, anon;
revoke all on function public.register_payment(jsonb) from public, anon;
revoke all on function public.reverse_payment(jsonb) from public, anon;
revoke all on function public.cancel_monthly_fee(jsonb) from public, anon;
revoke all on function public.update_monthly_fee_amount(jsonb) from public, anon;
revoke all on function public.get_student_billing_snapshot(uuid, date, integer, integer) from public, anon;

grant execute on function public.ensure_monthly_fees(date) to authenticated;
grant execute on function public.list_monthly_fees(date, text, text, integer, integer) to authenticated;
grant execute on function public.get_billing_month_summary(date) to authenticated;
grant execute on function public.get_monthly_fee_detail(uuid) to authenticated;
grant execute on function public.register_payment(jsonb) to authenticated;
grant execute on function public.reverse_payment(jsonb) to authenticated;
grant execute on function public.cancel_monthly_fee(jsonb) to authenticated;
grant execute on function public.update_monthly_fee_amount(jsonb) to authenticated;
grant execute on function public.get_student_billing_snapshot(uuid, date, integer, integer) to authenticated;
