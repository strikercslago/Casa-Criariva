create type public.financial_entry_type as enum ('income', 'expense');
create type public.financial_lifecycle_status as enum ('active', 'cancelled');
create type public.financial_settlement_status as enum ('active', 'reversed');
create type public.cash_account_type as enum ('cash', 'bank', 'other');
create type public.recurring_financial_frequency as enum ('monthly');

create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.financial_entry_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_categories_name_clean check (
    name = btrim(name)
    and char_length(name) between 2 and 80
  )
);

create table public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.cash_account_type not null default 'bank',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_accounts_name_clean check (
    name = btrim(name)
    and char_length(name) between 2 and 80
  )
);

create table public.recurring_financial_rules (
  id uuid primary key default gen_random_uuid(),
  type public.financial_entry_type not null,
  category_id uuid references public.financial_categories(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  frequency public.recurring_financial_frequency not null default 'monthly',
  due_day smallint not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_financial_rules_description_clean check (
    description = btrim(description)
    and char_length(description) between 2 and 160
  ),
  constraint recurring_financial_rules_amount_positive check (amount > 0),
  constraint recurring_financial_rules_due_day_range check (due_day between 1 and 31),
  constraint recurring_financial_rules_date_order check (
    end_date is null
    or end_date >= start_date
  )
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  type public.financial_entry_type not null,
  category_id uuid references public.financial_categories(id) on delete set null,
  recurring_rule_id uuid references public.recurring_financial_rules(id) on delete set null,
  description text not null,
  competence_date date not null,
  due_date date,
  amount numeric(12,2) not null,
  lifecycle_status public.financial_lifecycle_status not null default 'active',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  constraint financial_entries_description_clean check (
    description = btrim(description)
    and char_length(description) between 2 and 160
  ),
  constraint financial_entries_amount_positive check (amount > 0),
  constraint financial_entries_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  ),
  constraint financial_entries_cancellation_reason_required check (
    lifecycle_status = 'active'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and char_length(btrim(cancellation_reason)) between 4 and 500
    )
  )
);

create table public.financial_settlements (
  id uuid primary key default gen_random_uuid(),
  financial_entry_id uuid not null references public.financial_entries(id) on delete restrict,
  amount numeric(12,2) not null,
  settled_at timestamptz not null,
  payment_method public.payment_method not null,
  cash_account_id uuid references public.cash_accounts(id) on delete set null,
  notes text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  status public.financial_settlement_status not null default 'active',
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id) on delete set null,
  reversal_reason text,
  constraint financial_settlements_amount_positive check (amount > 0),
  constraint financial_settlements_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  ),
  constraint financial_settlements_reversal_reason_required check (
    status = 'active'
    or (
      reversed_at is not null
      and reversal_reason is not null
      and char_length(btrim(reversal_reason)) between 4 and 500
    )
  )
);

create trigger financial_categories_set_updated_at
before update on public.financial_categories
for each row execute function public.set_updated_at();

create trigger cash_accounts_set_updated_at
before update on public.cash_accounts
for each row execute function public.set_updated_at();

create trigger recurring_financial_rules_set_updated_at
before update on public.recurring_financial_rules
for each row execute function public.set_updated_at();

create trigger financial_entries_set_updated_at
before update on public.financial_entries
for each row execute function public.set_updated_at();

create unique index financial_categories_type_name_uidx
on public.financial_categories (type, lower(name));

create unique index cash_accounts_name_uidx
on public.cash_accounts (lower(name));

create unique index financial_entries_recurring_month_uidx
on public.financial_entries (recurring_rule_id, competence_date)
where recurring_rule_id is not null and lifecycle_status = 'active';

create index financial_entries_type_competence_idx
on public.financial_entries (type, competence_date desc, id);

create index financial_entries_due_date_idx
on public.financial_entries (due_date)
where lifecycle_status = 'active';

create index financial_entries_category_idx
on public.financial_entries (category_id)
where category_id is not null;

create index financial_entries_recurring_rule_idx
on public.financial_entries (recurring_rule_id)
where recurring_rule_id is not null;

create index financial_settlements_entry_idx
on public.financial_settlements (financial_entry_id);

create index financial_settlements_settled_at_idx
on public.financial_settlements (settled_at desc, id);

create index financial_settlements_account_idx
on public.financial_settlements (cash_account_id)
where cash_account_id is not null;

create index recurring_financial_rules_active_idx
on public.recurring_financial_rules (is_active, type, start_date);

comment on table public.financial_entries is
  'Manual financial obligations for non-tuition income and expenses. Tuition payments are read from payments and must not be duplicated here.';
comment on table public.financial_settlements is
  'Actual settlement of manual financial entries. Active settlements count in cash flow; reversed ones remain as history.';
comment on table public.cash_accounts is
  'Where money enters or leaves. Balance is derived from movements and is not stored manually.';
comment on table public.recurring_financial_rules is
  'Monthly manual recurring income/expense rules. Generated entries snapshot values and do not change historically when a rule changes.';

alter table public.financial_categories enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.recurring_financial_rules enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_settlements enable row level security;

revoke all on table public.financial_categories from anon, authenticated;
revoke all on table public.cash_accounts from anon, authenticated;
revoke all on table public.recurring_financial_rules from anon, authenticated;
revoke all on table public.financial_entries from anon, authenticated;
revoke all on table public.financial_settlements from anon, authenticated;

grant select, insert, update on table public.financial_categories to authenticated;
grant select, insert, update on table public.cash_accounts to authenticated;
grant select, insert, update on table public.recurring_financial_rules to authenticated;
grant select, insert, update on table public.financial_entries to authenticated;
grant select, insert, update on table public.financial_settlements to authenticated;

create policy "financial_categories_owner_all"
on public.financial_categories
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "cash_accounts_owner_all"
on public.cash_accounts
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "recurring_financial_rules_owner_all"
on public.recurring_financial_rules
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "financial_entries_owner_all"
on public.financial_entries
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "financial_settlements_owner_all"
on public.financial_settlements
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

insert into public.financial_categories (name, type)
values
  ('Outras receitas', 'income'),
  ('Eventos', 'income'),
  ('Colonia de ferias', 'income'),
  ('Venda de materiais', 'income'),
  ('Outros', 'income'),
  ('Aluguel', 'expense'),
  ('Energia', 'expense'),
  ('Internet', 'expense'),
  ('Materiais', 'expense'),
  ('Limpeza', 'expense'),
  ('Marketing', 'expense'),
  ('Manutencao', 'expense'),
  ('Servicos', 'expense'),
  ('Impostos', 'expense'),
  ('Outros', 'expense')
on conflict do nothing;

insert into public.cash_accounts (name, type)
values
  ('Conta Principal', 'bank'),
  ('Caixa', 'cash')
on conflict do nothing;

create or replace function public.finance_month_bounds(p_reference_month date)
returns table (start_date date, end_date date)
language sql
immutable
set search_path = public
as $$
  select
    public.normalize_reference_month(p_reference_month) as start_date,
    (public.normalize_reference_month(p_reference_month) + interval '1 month - 1 day')::date as end_date;
$$;

create or replace function public.finance_entry_financial_rows(
  p_start_date date default null,
  p_end_date date default null,
  p_entry_type public.financial_entry_type default null
)
returns table (
  entry_id uuid,
  type public.financial_entry_type,
  category_id uuid,
  category_name text,
  recurring_rule_id uuid,
  description text,
  competence_date date,
  due_date date,
  amount numeric,
  settled_amount numeric,
  balance numeric,
  computed_status text,
  is_partial boolean,
  days_overdue integer,
  lifecycle_status public.financial_lifecycle_status,
  notes text,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with settlement_summary as (
    select
      fs.financial_entry_id,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as settled_amount
    from public.financial_settlements fs
    group by fs.financial_entry_id
  ),
  rows as (
    select
      fe.id as entry_id,
      fe.type,
      fe.category_id,
      fc.name as category_name,
      fe.recurring_rule_id,
      fe.description,
      fe.competence_date,
      fe.due_date,
      fe.amount,
      coalesce(ss.settled_amount, 0)::numeric(12,2) as settled_amount,
      greatest(fe.amount - coalesce(ss.settled_amount, 0), 0)::numeric(12,2) as balance,
      fe.lifecycle_status,
      fe.notes,
      fe.created_at
    from public.financial_entries fe
    left join public.financial_categories fc on fc.id = fe.category_id
    left join settlement_summary ss on ss.financial_entry_id = fe.id
    where (p_start_date is null or fe.competence_date >= p_start_date)
      and (p_end_date is null or fe.competence_date <= p_end_date)
      and (p_entry_type is null or fe.type = p_entry_type)
  )
  select
    rows.entry_id,
    rows.type,
    rows.category_id,
    rows.category_name,
    rows.recurring_rule_id,
    rows.description,
    rows.competence_date,
    rows.due_date,
    rows.amount,
    rows.settled_amount,
    rows.balance,
    case
      when rows.lifecycle_status = 'cancelled' then 'cancelled'
      when rows.balance <= 0 and rows.type = 'income' then 'received'
      when rows.balance <= 0 and rows.type = 'expense' then 'paid'
      when rows.settled_amount > 0 and rows.balance > 0 then 'partial'
      when rows.balance > 0 and rows.due_date is not null and rows.due_date < current_date then 'overdue'
      else 'pending'
    end as computed_status,
    rows.settled_amount > 0 and rows.balance > 0 as is_partial,
    case
      when rows.balance > 0 and rows.due_date is not null and rows.due_date < current_date then (current_date - rows.due_date)::integer
      else 0
    end as days_overdue,
    rows.lifecycle_status,
    rows.notes,
    rows.created_at
  from rows
  where public.current_user_is_owner();
$$;

create or replace function public.finance_cash_flow_rows(
  p_start_date date,
  p_end_date date
)
returns table (
  movement_id uuid,
  source_type text,
  source_id uuid,
  direction text,
  description text,
  category_id uuid,
  category_name text,
  cash_account_id uuid,
  cash_account_name text,
  payment_method public.payment_method,
  amount numeric,
  occurred_at timestamptz,
  related_entry_id uuid
)
language sql
stable
set search_path = public
as $$
  with tuition_payments as (
    select
      p.id as movement_id,
      'tuition_payment'::text as source_type,
      p.id as source_id,
      'income'::text as direction,
      coalesce(
        'Mensalidade - ' || nullif(string_agg(distinct s.full_name, ', ' order by s.full_name), ''),
        'Mensalidade'
      ) as description,
      null::uuid as category_id,
      'Mensalidades'::text as category_name,
      null::uuid as cash_account_id,
      null::text as cash_account_name,
      p.payment_method,
      p.amount,
      p.paid_at as occurred_at,
      null::uuid as related_entry_id
    from public.payments p
    left join public.payment_allocations pa on pa.payment_id = p.id
    left join public.monthly_fees mf on mf.id = pa.monthly_fee_id
    left join public.students s on s.id = mf.student_id
    where p.status = 'received'
      and p.paid_at::date between p_start_date and p_end_date
    group by p.id, p.payment_method, p.amount, p.paid_at
  ),
  manual_settlements as (
    select
      fs.id as movement_id,
      'financial_settlement'::text as source_type,
      fs.id as source_id,
      fe.type::text as direction,
      fe.description,
      fe.category_id,
      fc.name as category_name,
      fs.cash_account_id,
      ca.name as cash_account_name,
      fs.payment_method,
      fs.amount,
      fs.settled_at as occurred_at,
      fe.id as related_entry_id
    from public.financial_settlements fs
    join public.financial_entries fe on fe.id = fs.financial_entry_id
    left join public.financial_categories fc on fc.id = fe.category_id
    left join public.cash_accounts ca on ca.id = fs.cash_account_id
    where fs.status = 'active'
      and fe.lifecycle_status = 'active'
      and fs.settled_at::date between p_start_date and p_end_date
  )
  select *
  from (
    select * from tuition_payments
    union all
    select * from manual_settlements
  ) combined
  where public.current_user_is_owner();
$$;

create or replace function public.list_financial_entries(
  p_start_date date,
  p_end_date date,
  p_type_filter text default 'all',
  p_status_filter text default 'all',
  p_search text default '',
  p_category_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  entry_id uuid,
  type public.financial_entry_type,
  category_id uuid,
  category_name text,
  recurring_rule_id uuid,
  description text,
  competence_date date,
  due_date date,
  amount numeric,
  settled_amount numeric,
  balance numeric,
  computed_status text,
  is_partial boolean,
  days_overdue integer,
  lifecycle_status public.financial_lifecycle_status,
  notes text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      case when p_type_filter in ('income', 'expense') then p_type_filter else 'all' end as type_filter,
      case when p_status_filter in ('all', 'pending', 'overdue', 'partial', 'paid', 'received', 'cancelled') then p_status_filter else 'all' end as status_filter,
      nullif(btrim(coalesce(p_search, '')), '') as search_text,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 20), 1), 50) as page_size
  ),
  filtered as (
    select rows.*
    from public.finance_entry_financial_rows(
      p_start_date,
      p_end_date,
      case when p_type_filter in ('income', 'expense') then p_type_filter::public.financial_entry_type else null end
    ) rows
    cross join params p
    where (p_category_id is null or rows.category_id = p_category_id)
      and (
        p.search_text is null
        or rows.description ilike '%' || p.search_text || '%'
        or coalesce(rows.category_name, '') ilike '%' || p.search_text || '%'
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
    order by coalesce(filtered.due_date, filtered.competence_date) asc, filtered.description asc, filtered.entry_id asc
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select * from paged;
$$;

create or replace function public.list_finance_cash_flow(
  p_start_date date,
  p_end_date date,
  p_direction_filter text default 'all',
  p_category_id uuid default null,
  p_cash_account_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  movement_id uuid,
  source_type text,
  source_id uuid,
  direction text,
  description text,
  category_id uuid,
  category_name text,
  cash_account_id uuid,
  cash_account_name text,
  payment_method public.payment_method,
  amount numeric,
  occurred_at timestamptz,
  related_entry_id uuid,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      case when p_direction_filter in ('income', 'expense') then p_direction_filter else 'all' end as direction_filter,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 20), 1), 50) as page_size
  ),
  filtered as (
    select rows.*
    from public.finance_cash_flow_rows(p_start_date, p_end_date) rows
    cross join params p
    where (p.direction_filter = 'all' or rows.direction = p.direction_filter)
      and (p_category_id is null or rows.category_id = p_category_id)
      and (p_cash_account_id is null or rows.cash_account_id = p_cash_account_id)
  ),
  paged as (
    select filtered.*, count(*) over () as total_count
    from filtered
    cross join params p
    order by filtered.occurred_at desc, filtered.movement_id desc
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select * from paged;
$$;

create or replace function public.list_finance_receivables(
  p_reference_month date,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  item_id uuid,
  source_type text,
  source_id uuid,
  description text,
  due_date date,
  amount numeric,
  settled_amount numeric,
  balance numeric,
  computed_status text,
  days_overdue integer,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select * from public.finance_month_bounds(p_reference_month)
  ),
  tuition as (
    select
      mf.monthly_fee_id as item_id,
      'tuition_fee'::text as source_type,
      mf.monthly_fee_id as source_id,
      'Mensalidade - ' || mf.student_name as description,
      mf.due_date,
      mf.final_amount as amount,
      mf.amount_paid as settled_amount,
      mf.balance,
      mf.computed_status,
      mf.days_overdue
    from bounds b
    join public.monthly_fee_financial_rows(b.start_date, null) mf on true
    where mf.reference_month = b.start_date
      and mf.lifecycle_status = 'active'
      and mf.balance > 0
  ),
  manual_income as (
    select
      rows.entry_id as item_id,
      'financial_entry'::text as source_type,
      rows.entry_id as source_id,
      rows.description,
      rows.due_date,
      rows.amount,
      rows.settled_amount,
      rows.balance,
      rows.computed_status,
      rows.days_overdue
    from bounds b
    join public.finance_entry_financial_rows(b.start_date, b.end_date, 'income') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  ),
  combined as (
    select * from tuition
    union all
    select * from manual_income
  ),
  paged as (
    select combined.*, count(*) over () as total_count
    from combined
    order by coalesce(due_date, (select start_date from bounds)) asc, description asc
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
$$;

create or replace function public.list_finance_payables(
  p_reference_month date,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  item_id uuid,
  source_type text,
  source_id uuid,
  description text,
  due_date date,
  amount numeric,
  settled_amount numeric,
  balance numeric,
  computed_status text,
  days_overdue integer,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select * from public.finance_month_bounds(p_reference_month)
  ),
  combined as (
    select
      rows.entry_id as item_id,
      'financial_entry'::text as source_type,
      rows.entry_id as source_id,
      rows.description,
      rows.due_date,
      rows.amount,
      rows.settled_amount,
      rows.balance,
      rows.computed_status,
      rows.days_overdue
    from bounds b
    join public.finance_entry_financial_rows(b.start_date, b.end_date, 'expense') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  ),
  paged as (
    select combined.*, count(*) over () as total_count
    from combined
    order by coalesce(due_date, (select start_date from bounds)) asc, description asc
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
$$;

create or replace function public.get_finance_month_summary(p_reference_month date)
returns table (
  reference_month date,
  cash_in numeric,
  cash_out numeric,
  result_amount numeric,
  receivable_amount numeric,
  payable_amount numeric,
  cash_movements_count bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select * from public.finance_month_bounds(p_reference_month)
  ),
  cash_rows as (
    select rows.*
    from bounds b
    join public.finance_cash_flow_rows(b.start_date, b.end_date) rows on true
  ),
  receivable_rows as (
    select mf.balance
    from bounds b
    join public.monthly_fee_financial_rows(b.start_date, null) mf on true
    where mf.lifecycle_status = 'active'
      and mf.balance > 0

    union all

    select rows.balance
    from bounds b
    join public.finance_entry_financial_rows(b.start_date, b.end_date, 'income') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  ),
  payable_rows as (
    select rows.balance
    from bounds b
    join public.finance_entry_financial_rows(b.start_date, b.end_date, 'expense') rows on true
    where rows.lifecycle_status = 'active'
      and rows.balance > 0
  )
  select
    public.normalize_reference_month(p_reference_month) as reference_month,
    coalesce(sum(amount) filter (where direction = 'income'), 0)::numeric(12,2) as cash_in,
    coalesce(sum(amount) filter (where direction = 'expense'), 0)::numeric(12,2) as cash_out,
    (
      coalesce(sum(amount) filter (where direction = 'income'), 0)
      - coalesce(sum(amount) filter (where direction = 'expense'), 0)
    )::numeric(12,2) as result_amount,
    coalesce((select sum(balance) from receivable_rows), 0)::numeric(12,2) as receivable_amount,
    coalesce((select sum(balance) from payable_rows), 0)::numeric(12,2) as payable_amount,
    count(*)::bigint as cash_movements_count
  from cash_rows;
$$;

create or replace function public.create_financial_entry(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_entry_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create financial entries.' using errcode = '42501';
  end if;

  insert into public.financial_entries (
    type,
    category_id,
    description,
    competence_date,
    due_date,
    amount,
    notes,
    created_by
  )
  values (
    (payload ->> 'type')::public.financial_entry_type,
    nullif(payload ->> 'category_id', '')::uuid,
    btrim(payload ->> 'description'),
    (payload ->> 'competence_date')::date,
    nullif(payload ->> 'due_date', '')::date,
    (payload ->> 'amount')::numeric,
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_entry_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'financial_entry',
    new_entry_id,
    'financial_entry.created',
    jsonb_build_object('type', payload ->> 'type', 'amount', (payload ->> 'amount')::numeric)
  );

  if coalesce((payload ->> 'settle_now')::boolean, false) then
    perform public.settle_financial_entry(jsonb_build_object(
      'financial_entry_id', new_entry_id,
      'amount', (payload ->> 'settlement_amount')::numeric,
      'settled_at', coalesce(nullif(payload ->> 'settled_at', ''), now()::text),
      'payment_method', coalesce(nullif(payload ->> 'payment_method', ''), 'pix'),
      'cash_account_id', nullif(payload ->> 'cash_account_id', ''),
      'notes', nullif(payload ->> 'settlement_notes', '')
    ));
  end if;

  return new_entry_id;
end;
$$;

create or replace function public.update_financial_entry(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_entry public.financial_entries%rowtype;
  active_settled numeric(12,2);
  new_amount numeric(12,2) := (payload ->> 'amount')::numeric;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update financial entries.' using errcode = '42501';
  end if;

  select *
  into target_entry
  from public.financial_entries
  where id = (payload ->> 'financial_entry_id')::uuid
  for update;

  if not found then
    raise exception 'Financial entry not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2)
  into active_settled
  from public.financial_settlements
  where financial_entry_id = target_entry.id
    and status = 'active';

  if new_amount < active_settled then
    raise exception 'New amount cannot be lower than active settlements.' using errcode = '23514';
  end if;

  update public.financial_entries
  set
    category_id = nullif(payload ->> 'category_id', '')::uuid,
    description = btrim(payload ->> 'description'),
    competence_date = (payload ->> 'competence_date')::date,
    due_date = nullif(payload ->> 'due_date', '')::date,
    amount = new_amount,
    notes = nullif(btrim(coalesce(payload ->> 'notes', '')), '')
  where id = target_entry.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'financial_entry',
    target_entry.id,
    'financial_entry.updated',
    jsonb_build_object('old_amount', target_entry.amount, 'new_amount', new_amount)
  );

  return target_entry.id;
end;
$$;

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
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can settle financial entries.' using errcode = '42501';
  end if;

  select *
  into target_entry
  from public.financial_entries
  where id = (payload ->> 'financial_entry_id')::uuid
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

  select coalesce(sum(amount), 0)::numeric(12,2)
  into paid_so_far
  from public.financial_settlements
  where financial_entry_id = target_entry.id
    and status = 'active';

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

  financial_entry_id := target_entry.id;
  settlement_id := new_settlement_id;
  settled_amount := paid_so_far + settlement_amount;
  balance := greatest(target_entry.amount - settled_amount, 0)::numeric(12,2);
  computed_status := case
    when balance <= 0 and target_entry.type = 'income' then 'received'
    when balance <= 0 and target_entry.type = 'expense' then 'paid'
    when settled_amount > 0 and balance > 0 then 'partial'
    when balance > 0 and target_entry.due_date is not null and target_entry.due_date < current_date then 'overdue'
    else 'pending'
  end;
  return next;
end;
$$;

create or replace function public.reverse_financial_settlement(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_settlement public.financial_settlements%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can reverse financial settlements.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Reversal reason is required.' using errcode = '23514';
  end if;

  select *
  into target_settlement
  from public.financial_settlements
  where id = (payload ->> 'financial_settlement_id')::uuid
  for update;

  if not found then
    raise exception 'Financial settlement not found.' using errcode = 'P0002';
  end if;

  if target_settlement.status = 'reversed' then
    raise exception 'Financial settlement is already reversed.' using errcode = '23514';
  end if;

  update public.financial_settlements
  set
    status = 'reversed',
    reversed_at = now(),
    reversed_by = actor_id,
    reversal_reason = reason_text
  where id = target_settlement.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'financial_settlement',
    target_settlement.id,
    'financial_settlement.reversed',
    jsonb_build_object('financial_entry_id', target_settlement.financial_entry_id, 'amount', target_settlement.amount, 'reason', reason_text)
  );

  return target_settlement.id;
end;
$$;

create or replace function public.cancel_financial_entry(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_entry public.financial_entries%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  active_settled numeric(12,2);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can cancel financial entries.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Cancellation reason is required.' using errcode = '23514';
  end if;

  select *
  into target_entry
  from public.financial_entries
  where id = (payload ->> 'financial_entry_id')::uuid
  for update;

  if not found then
    raise exception 'Financial entry not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2)
  into active_settled
  from public.financial_settlements
  where financial_entry_id = target_entry.id
    and status = 'active';

  if active_settled > 0 then
    raise exception 'Reverse active settlements before cancelling this entry.' using errcode = '23514';
  end if;

  update public.financial_entries
  set
    lifecycle_status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = actor_id,
    cancellation_reason = reason_text
  where id = target_entry.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'financial_entry',
    target_entry.id,
    'financial_entry.cancelled',
    jsonb_build_object('reason', reason_text, 'amount', target_entry.amount)
  );

  return target_entry.id;
end;
$$;

create or replace function public.create_financial_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_category_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create financial categories.' using errcode = '42501';
  end if;

  insert into public.financial_categories (name, type)
  values (btrim(payload ->> 'name'), (payload ->> 'type')::public.financial_entry_type)
  returning id into new_category_id;

  return new_category_id;
end;
$$;

create or replace function public.update_financial_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_id uuid := (payload ->> 'category_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update financial categories.' using errcode = '42501';
  end if;

  update public.financial_categories
  set
    name = btrim(payload ->> 'name'),
    is_active = coalesce((payload ->> 'is_active')::boolean, is_active)
  where id = target_id;

  if not found then
    raise exception 'Financial category not found.' using errcode = 'P0002';
  end if;

  return target_id;
end;
$$;

create or replace function public.create_cash_account(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_account_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create cash accounts.' using errcode = '42501';
  end if;

  insert into public.cash_accounts (name, type)
  values (btrim(payload ->> 'name'), coalesce(nullif(payload ->> 'type', '')::public.cash_account_type, 'bank'))
  returning id into new_account_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'cash_account', new_account_id, 'cash_account.created', '{}'::jsonb);

  return new_account_id;
end;
$$;

create or replace function public.create_recurring_financial_rule(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_rule_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create recurring financial rules.' using errcode = '42501';
  end if;

  insert into public.recurring_financial_rules (
    type,
    category_id,
    description,
    amount,
    due_day,
    start_date,
    end_date,
    created_by
  )
  values (
    (payload ->> 'type')::public.financial_entry_type,
    nullif(payload ->> 'category_id', '')::uuid,
    btrim(payload ->> 'description'),
    (payload ->> 'amount')::numeric,
    (payload ->> 'due_day')::smallint,
    public.normalize_reference_month((payload ->> 'start_date')::date),
    nullif(payload ->> 'end_date', '')::date,
    actor_id
  )
  returning id into new_rule_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'recurring_financial_rule', new_rule_id, 'recurring_rule.created', jsonb_build_object('amount', (payload ->> 'amount')::numeric));

  return new_rule_id;
end;
$$;

create or replace function public.update_recurring_financial_rule(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_id uuid := (payload ->> 'recurring_rule_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update recurring financial rules.' using errcode = '42501';
  end if;

  update public.recurring_financial_rules
  set
    category_id = nullif(payload ->> 'category_id', '')::uuid,
    description = btrim(payload ->> 'description'),
    amount = (payload ->> 'amount')::numeric,
    due_day = (payload ->> 'due_day')::smallint,
    start_date = public.normalize_reference_month((payload ->> 'start_date')::date),
    end_date = nullif(payload ->> 'end_date', '')::date,
    is_active = coalesce((payload ->> 'is_active')::boolean, is_active)
  where id = target_id;

  if not found then
    raise exception 'Recurring financial rule not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'recurring_financial_rule', target_id, 'recurring_rule.updated', '{}'::jsonb);

  return target_id;
end;
$$;

create or replace function public.disable_recurring_financial_rule(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_id uuid := (payload ->> 'recurring_rule_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can disable recurring financial rules.' using errcode = '42501';
  end if;

  update public.recurring_financial_rules
  set is_active = false
  where id = target_id;

  if not found then
    raise exception 'Recurring financial rule not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'recurring_financial_rule', target_id, 'recurring_rule.disabled', '{}'::jsonb);

  return target_id;
end;
$$;

create or replace function public.ensure_recurring_financial_entries(p_reference_month date)
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
    raise exception 'Only owners can generate recurring financial entries.' using errcode = '42501';
  end if;

  select count(*)::integer
  into existing_count
  from public.financial_entries
  where recurring_rule_id is not null
    and competence_date = target_month
    and lifecycle_status = 'active';

  with inserted as (
    insert into public.financial_entries (
      type,
      category_id,
      recurring_rule_id,
      description,
      competence_date,
      due_date,
      amount,
      notes,
      created_by
    )
    select
      r.type,
      r.category_id,
      r.id,
      r.description,
      target_month,
      public.monthly_fee_due_date(target_month, r.due_day),
      r.amount,
      'Gerado automaticamente a partir de recorrencia mensal.',
      actor_id
    from public.recurring_financial_rules r
    where r.is_active
      and r.frequency = 'monthly'
      and r.start_date <= month_end
      and (r.end_date is null or r.end_date >= target_month)
      and not exists (
        select 1
        from public.financial_entries fe
        where fe.recurring_rule_id = r.id
          and fe.competence_date = target_month
          and fe.lifecycle_status = 'active'
      )
    on conflict do nothing
    returning id, recurring_rule_id, amount, type
  ),
  audit_insert as (
    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    select
      actor_id,
      'financial_entry',
      inserted.id,
      'financial_entry.created',
      jsonb_build_object('source', 'recurring_rule', 'recurring_rule_id', inserted.recurring_rule_id, 'amount', inserted.amount, 'type', inserted.type)
    from inserted
    returning 1
  )
  select count(*)::integer into generated_count from audit_insert;

  reference_month := target_month;
  return next;
end;
$$;

comment on function public.finance_cash_flow_rows(date, date) is
  'Internal consolidated cash-flow projection. Tuition payments are counted once from payments; payment_allocations are only descriptive links and never extra cash.';
comment on function public.get_finance_month_summary(date) is
  'Month summary reconciled from the same cash-flow and obligations projections used by lists.';
comment on function public.settle_financial_entry(jsonb) is
  'Transactional settlement creation. Locks the entry and recalculates balance in the database to prevent concurrent overpayment.';
comment on function public.ensure_recurring_financial_entries(date) is
  'Idempotently generates one monthly financial entry per active recurring rule for the requested month.';

alter function public.finance_month_bounds(date) owner to postgres;
alter function public.finance_entry_financial_rows(date, date, public.financial_entry_type) owner to postgres;
alter function public.finance_cash_flow_rows(date, date) owner to postgres;
alter function public.list_financial_entries(date, date, text, text, text, uuid, integer, integer) owner to postgres;
alter function public.list_finance_cash_flow(date, date, text, uuid, uuid, integer, integer) owner to postgres;
alter function public.list_finance_receivables(date, integer, integer) owner to postgres;
alter function public.list_finance_payables(date, integer, integer) owner to postgres;
alter function public.get_finance_month_summary(date) owner to postgres;
alter function public.create_financial_entry(jsonb) owner to postgres;
alter function public.update_financial_entry(jsonb) owner to postgres;
alter function public.settle_financial_entry(jsonb) owner to postgres;
alter function public.reverse_financial_settlement(jsonb) owner to postgres;
alter function public.cancel_financial_entry(jsonb) owner to postgres;
alter function public.create_financial_category(jsonb) owner to postgres;
alter function public.update_financial_category(jsonb) owner to postgres;
alter function public.create_cash_account(jsonb) owner to postgres;
alter function public.create_recurring_financial_rule(jsonb) owner to postgres;
alter function public.update_recurring_financial_rule(jsonb) owner to postgres;
alter function public.disable_recurring_financial_rule(jsonb) owner to postgres;
alter function public.ensure_recurring_financial_entries(date) owner to postgres;

alter function public.list_financial_entries(date, date, text, text, text, uuid, integer, integer) security definer;
alter function public.list_finance_cash_flow(date, date, text, uuid, uuid, integer, integer) security definer;
alter function public.list_finance_receivables(date, integer, integer) security definer;
alter function public.list_finance_payables(date, integer, integer) security definer;
alter function public.get_finance_month_summary(date) security definer;

revoke all on function public.finance_month_bounds(date) from public, anon, authenticated;
revoke all on function public.finance_entry_financial_rows(date, date, public.financial_entry_type) from public, anon, authenticated;
revoke all on function public.finance_cash_flow_rows(date, date) from public, anon, authenticated;
revoke all on function public.list_financial_entries(date, date, text, text, text, uuid, integer, integer) from public, anon;
revoke all on function public.list_finance_cash_flow(date, date, text, uuid, uuid, integer, integer) from public, anon;
revoke all on function public.list_finance_receivables(date, integer, integer) from public, anon;
revoke all on function public.list_finance_payables(date, integer, integer) from public, anon;
revoke all on function public.get_finance_month_summary(date) from public, anon;
revoke all on function public.create_financial_entry(jsonb) from public, anon;
revoke all on function public.update_financial_entry(jsonb) from public, anon;
revoke all on function public.settle_financial_entry(jsonb) from public, anon;
revoke all on function public.reverse_financial_settlement(jsonb) from public, anon;
revoke all on function public.cancel_financial_entry(jsonb) from public, anon;
revoke all on function public.create_financial_category(jsonb) from public, anon;
revoke all on function public.update_financial_category(jsonb) from public, anon;
revoke all on function public.create_cash_account(jsonb) from public, anon;
revoke all on function public.create_recurring_financial_rule(jsonb) from public, anon;
revoke all on function public.update_recurring_financial_rule(jsonb) from public, anon;
revoke all on function public.disable_recurring_financial_rule(jsonb) from public, anon;
revoke all on function public.ensure_recurring_financial_entries(date) from public, anon;

grant execute on function public.list_financial_entries(date, date, text, text, text, uuid, integer, integer) to authenticated;
grant execute on function public.list_finance_cash_flow(date, date, text, uuid, uuid, integer, integer) to authenticated;
grant execute on function public.list_finance_receivables(date, integer, integer) to authenticated;
grant execute on function public.list_finance_payables(date, integer, integer) to authenticated;
grant execute on function public.get_finance_month_summary(date) to authenticated;
grant execute on function public.create_financial_entry(jsonb) to authenticated;
grant execute on function public.update_financial_entry(jsonb) to authenticated;
grant execute on function public.settle_financial_entry(jsonb) to authenticated;
grant execute on function public.reverse_financial_settlement(jsonb) to authenticated;
grant execute on function public.cancel_financial_entry(jsonb) to authenticated;
grant execute on function public.create_financial_category(jsonb) to authenticated;
grant execute on function public.update_financial_category(jsonb) to authenticated;
grant execute on function public.create_cash_account(jsonb) to authenticated;
grant execute on function public.create_recurring_financial_rule(jsonb) to authenticated;
grant execute on function public.update_recurring_financial_rule(jsonb) to authenticated;
grant execute on function public.disable_recurring_financial_rule(jsonb) to authenticated;
grant execute on function public.ensure_recurring_financial_entries(date) to authenticated;
