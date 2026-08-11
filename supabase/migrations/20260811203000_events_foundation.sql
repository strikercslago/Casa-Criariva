create type public.event_type as enum ('colony', 'workshop', 'special_activity', 'other');
create type public.event_status as enum ('draft', 'open', 'closed', 'completed', 'cancelled');
create type public.event_registration_status as enum ('pending', 'confirmed', 'waitlisted', 'cancelled');
create type public.event_registration_type as enum ('full_event', 'selected_sessions');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type public.event_type not null default 'other',
  description text,
  status public.event_status not null default 'draft',
  capacity integer,
  base_price numeric(12,2) not null default 0,
  registration_start_date date,
  registration_end_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  constraint events_name_clean check (
    name = btrim(name)
    and char_length(name) between 2 and 160
  ),
  constraint events_capacity_positive check (capacity is null or capacity > 0),
  constraint events_base_price_nonnegative check (base_price >= 0),
  constraint events_registration_window_order check (
    registration_start_date is null
    or registration_end_date is null
    or registration_end_date >= registration_start_date
  ),
  constraint events_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint events_cancellation_reason_required check (
    status <> 'cancelled'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and char_length(btrim(cancellation_reason)) between 4 and 500
    )
  )
);

create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  capacity_override integer,
  price_override numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_sessions_time_order check (end_time > start_time),
  constraint event_sessions_capacity_positive check (capacity_override is null or capacity_override > 0),
  constraint event_sessions_price_nonnegative check (price_override is null or price_override >= 0),
  constraint event_sessions_notes_length check (notes is null or char_length(notes) <= 1000)
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  guest_full_name text,
  guest_birth_date date,
  guardian_id uuid references public.guardians(id) on delete set null,
  status public.event_registration_status not null default 'pending',
  registration_type public.event_registration_type not null default 'full_event',
  base_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  final_amount numeric(12,2) generated always as (base_amount - discount_amount) stored,
  financial_due_date date,
  financial_entry_id uuid unique references public.financial_entries(id) on delete restrict,
  notes text,
  registered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  constraint event_registrations_participant_present check (
    (student_id is not null and guest_full_name is null)
    or (student_id is null and guest_full_name is not null)
  ),
  constraint event_registrations_guest_name_clean check (
    guest_full_name is null
    or (
      guest_full_name = btrim(guest_full_name)
      and char_length(guest_full_name) between 2 and 160
    )
  ),
  constraint event_registrations_guest_birth_date_not_future check (
    guest_birth_date is null
    or guest_birth_date <= current_date
  ),
  constraint event_registrations_amounts_valid check (
    base_amount >= 0
    and discount_amount >= 0
    and discount_amount <= base_amount
  ),
  constraint event_registrations_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint event_registrations_cancellation_reason_required check (
    status <> 'cancelled'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and char_length(btrim(cancellation_reason)) between 4 and 500
    )
  )
);

create table public.event_registration_sessions (
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  session_id uuid not null references public.event_sessions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (registration_id, session_id)
);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_sessions_set_updated_at
before update on public.event_sessions
for each row execute function public.set_updated_at();

create trigger event_registrations_set_updated_at
before update on public.event_registrations
for each row execute function public.set_updated_at();

create index events_status_type_date_idx
on public.events (status, event_type, created_at desc, id);

create index events_name_trgm_idx
on public.events using gin (name extensions.gin_trgm_ops);

create unique index event_sessions_event_datetime_uidx
on public.event_sessions (event_id, session_date, start_time, end_time);

create index event_sessions_event_date_idx
on public.event_sessions (event_id, session_date, start_time, id);

create index event_registrations_event_status_idx
on public.event_registrations (event_id, status, created_at desc, id);

create index event_registrations_student_idx
on public.event_registrations (student_id)
where student_id is not null;

create index event_registrations_guardian_idx
on public.event_registrations (guardian_id)
where guardian_id is not null;

create index event_registrations_guest_name_trgm_idx
on public.event_registrations using gin (guest_full_name extensions.gin_trgm_ops)
where guest_full_name is not null;

create index event_registrations_financial_entry_idx
on public.event_registrations (financial_entry_id)
where financial_entry_id is not null;

create index event_registration_sessions_session_idx
on public.event_registration_sessions (session_id, registration_id);

comment on table public.events is
  'Operational events, workshops and holiday colonies. Events are not class sessions.';
comment on table public.event_sessions is
  'Dates and times belonging to an event. A one-day event still has one session.';
comment on table public.event_registrations is
  'One child registration for one event. Existing students and external guests are both supported.';
comment on column public.event_registrations.financial_entry_id is
  'Optional one-to-one link to the finance receivable generated for this paid confirmed registration.';

alter table public.events enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_registration_sessions enable row level security;

revoke all on table public.events from anon, authenticated;
revoke all on table public.event_sessions from anon, authenticated;
revoke all on table public.event_registrations from anon, authenticated;
revoke all on table public.event_registration_sessions from anon, authenticated;

grant select, insert, update on table public.events to authenticated;
grant select, insert, update on table public.event_sessions to authenticated;
grant select, insert, update on table public.event_registrations to authenticated;
grant select, insert, update, delete on table public.event_registration_sessions to authenticated;

create policy "events_owner_all"
on public.events
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "event_sessions_owner_all"
on public.event_sessions
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "event_registrations_owner_all"
on public.event_registrations
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "event_registration_sessions_owner_all"
on public.event_registration_sessions
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create or replace function public.event_participant_name(
  p_student_id uuid,
  p_guest_full_name text
)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select s.full_name from public.students s where s.id = p_student_id),
    p_guest_full_name
  );
$$;

create or replace function public.assert_event_capacity_available(
  p_event_id uuid,
  p_registration_type public.event_registration_type,
  p_session_ids uuid[] default array[]::uuid[],
  p_excluding_registration_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  event_session_count integer;
  target_session_id uuid;
  target_capacity integer;
  confirmed_count integer;
begin
  if not public.current_user_is_owner() then
    raise exception 'Only owners can validate event capacity.' using errcode = '42501';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  perform 1
  from public.event_sessions es
  where es.event_id = p_event_id
  order by es.session_date, es.start_time, es.id
  for update;

  select count(*)::integer
  into event_session_count
  from public.event_sessions es
  where es.event_id = p_event_id;

  if event_session_count = 0 then
    if target_event.capacity is null then
      return;
    end if;

    select count(*)::integer
    into confirmed_count
    from public.event_registrations er
    where er.event_id = p_event_id
      and er.status = 'confirmed'
      and (p_excluding_registration_id is null or er.id <> p_excluding_registration_id);

    if confirmed_count >= target_event.capacity then
      raise exception 'Event capacity is full.' using errcode = '23514';
    end if;

    return;
  end if;

  if p_registration_type = 'selected_sessions' and coalesce(array_length(p_session_ids, 1), 0) = 0 then
    raise exception 'Selected sessions are required.' using errcode = '23514';
  end if;

  if p_registration_type = 'selected_sessions' and exists (
    select 1
    from unnest(p_session_ids) selected(session_id)
    left join public.event_sessions es on es.id = selected.session_id and es.event_id = p_event_id
    where es.id is null
  ) then
    raise exception 'Selected session does not belong to this event.' using errcode = '23514';
  end if;

  for target_session_id, target_capacity in
    select
      es.id,
      coalesce(es.capacity_override, target_event.capacity)
    from public.event_sessions es
    where es.event_id = p_event_id
      and (
        p_registration_type = 'full_event'
        or es.id = any(p_session_ids)
      )
  loop
    if target_capacity is null then
      continue;
    end if;

    select count(distinct er.id)::integer
    into confirmed_count
    from public.event_registrations er
    where er.event_id = p_event_id
      and er.status = 'confirmed'
      and (p_excluding_registration_id is null or er.id <> p_excluding_registration_id)
      and (
        er.registration_type = 'full_event'
        or exists (
          select 1
          from public.event_registration_sessions ers
          where ers.registration_id = er.id
            and ers.session_id = target_session_id
        )
      );

    if confirmed_count >= target_capacity then
      raise exception 'Event session capacity is full.' using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function public.ensure_event_registration_financial_entry(
  p_registration_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_registration public.event_registrations%rowtype;
  target_event public.events%rowtype;
  participant_name text;
  category_id uuid;
  new_financial_entry_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create event receivables.' using errcode = '42501';
  end if;

  select *
  into target_registration
  from public.event_registrations
  where id = p_registration_id
  for update;

  if not found then
    raise exception 'Event registration not found.' using errcode = 'P0002';
  end if;

  if target_registration.status <> 'confirmed' then
    return target_registration.financial_entry_id;
  end if;

  if target_registration.final_amount <= 0 then
    return null;
  end if;

  if target_registration.financial_entry_id is not null then
    return target_registration.financial_entry_id;
  end if;

  select *
  into target_event
  from public.events
  where id = target_registration.event_id;

  participant_name := public.event_participant_name(target_registration.student_id, target_registration.guest_full_name);

  select id
  into category_id
  from public.financial_categories
  where type = 'income'
    and lower(name) = lower('Eventos')
  limit 1;

  if category_id is null then
    insert into public.financial_categories (name, type)
    values ('Eventos', 'income')
    returning id into category_id;
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
    'income',
    category_id,
    'Evento - ' || target_event.name || ' - ' || participant_name,
    date_trunc('month', coalesce(target_registration.financial_due_date, target_registration.created_at::date))::date,
    coalesce(target_registration.financial_due_date, target_registration.created_at::date),
    target_registration.final_amount,
    'Gerado automaticamente a partir da inscricao em evento.',
    actor_id
  )
  returning id into new_financial_entry_id;

  update public.event_registrations
  set financial_entry_id = new_financial_entry_id
  where id = target_registration.id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'event_registration',
    target_registration.id,
    'event.registration_financial_entry_created',
    jsonb_build_object('financial_entry_id', new_financial_entry_id, 'amount', target_registration.final_amount)
  );

  return new_financial_entry_id;
end;
$$;

create or replace function public.list_events(
  p_status_filter text default 'all',
  p_type_filter text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  event_id uuid,
  name text,
  event_type public.event_type,
  status public.event_status,
  capacity integer,
  base_price numeric,
  registration_start_date date,
  registration_end_date date,
  session_count bigint,
  first_session_date date,
  last_session_date date,
  confirmed_count bigint,
  waitlisted_count bigint,
  expected_revenue numeric,
  received_amount numeric,
  receivable_amount numeric,
  available_spots integer,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with event_rows as (
    select e.*
    from public.events e
    where public.current_user_is_owner()
      and (p_status_filter = 'all' or e.status::text = p_status_filter)
      and (p_type_filter = 'all' or e.event_type::text = p_type_filter)
      and (
        btrim(coalesce(p_search, '')) = ''
        or e.name ilike '%' || btrim(p_search) || '%'
      )
  ),
  registration_finance as (
    select
      er.event_id,
      count(*) filter (where er.status = 'confirmed')::bigint as confirmed_count,
      count(*) filter (where er.status = 'waitlisted')::bigint as waitlisted_count,
      coalesce(sum(er.final_amount) filter (where er.status = 'confirmed'), 0)::numeric(12,2) as expected_revenue,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as received_amount
    from public.event_registrations er
    left join public.financial_settlements fs on fs.financial_entry_id = er.financial_entry_id
    group by er.event_id
  ),
  session_summary as (
    select
      es.event_id,
      count(*)::bigint as session_count,
      min(es.session_date) as first_session_date,
      max(es.session_date) as last_session_date
    from public.event_sessions es
    group by es.event_id
  ),
  paged as (
    select
      e.id as event_id,
      e.name,
      e.event_type,
      e.status,
      e.capacity,
      e.base_price,
      e.registration_start_date,
      e.registration_end_date,
      coalesce(ss.session_count, 0)::bigint as session_count,
      ss.first_session_date,
      ss.last_session_date,
      coalesce(rf.confirmed_count, 0)::bigint as confirmed_count,
      coalesce(rf.waitlisted_count, 0)::bigint as waitlisted_count,
      coalesce(rf.expected_revenue, 0)::numeric(12,2) as expected_revenue,
      coalesce(rf.received_amount, 0)::numeric(12,2) as received_amount,
      greatest(coalesce(rf.expected_revenue, 0) - coalesce(rf.received_amount, 0), 0)::numeric(12,2) as receivable_amount,
      case
        when e.capacity is null then null
        else greatest(e.capacity - coalesce(rf.confirmed_count, 0)::integer, 0)
      end as available_spots,
      count(*) over () as total_count
    from event_rows e
    left join session_summary ss on ss.event_id = e.id
    left join registration_finance rf on rf.event_id = e.id
    order by coalesce(ss.first_session_date, e.created_at::date) desc, e.created_at desc
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
$$;

create or replace function public.get_event_finance_summary(p_event_id uuid)
returns table (
  event_id uuid,
  expected_revenue numeric,
  received_amount numeric,
  receivable_amount numeric,
  paid_count bigint,
  partial_count bigint,
  pending_count bigint,
  free_count bigint
)
language sql
stable
set search_path = public
as $$
  with rows as (
    select
      er.id,
      er.final_amount,
      er.status,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as received
    from public.event_registrations er
    left join public.financial_settlements fs on fs.financial_entry_id = er.financial_entry_id
    where er.event_id = p_event_id
      and er.status <> 'cancelled'
      and public.current_user_is_owner()
    group by er.id, er.final_amount, er.status
  )
  select
    p_event_id,
    coalesce(sum(final_amount) filter (where status = 'confirmed'), 0)::numeric(12,2),
    coalesce(sum(received), 0)::numeric(12,2),
    greatest(coalesce(sum(final_amount) filter (where status = 'confirmed'), 0) - coalesce(sum(received), 0), 0)::numeric(12,2),
    count(*) filter (where final_amount > 0 and received >= final_amount)::bigint,
    count(*) filter (where final_amount > 0 and received > 0 and received < final_amount)::bigint,
    count(*) filter (where final_amount > 0 and received = 0 and status = 'confirmed')::bigint,
    count(*) filter (where final_amount = 0 and status = 'confirmed')::bigint
  from rows;
$$;

create or replace function public.list_event_registrations(
  p_event_id uuid,
  p_status_filter text default 'all',
  p_finance_filter text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  registration_id uuid,
  event_id uuid,
  participant_name text,
  student_id uuid,
  guest_full_name text,
  guest_birth_date date,
  guardian_id uuid,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  status public.event_registration_status,
  registration_type public.event_registration_type,
  selected_sessions_count bigint,
  selected_sessions jsonb,
  base_amount numeric,
  discount_amount numeric,
  final_amount numeric,
  received_amount numeric,
  balance numeric,
  finance_status text,
  financial_due_date date,
  financial_entry_id uuid,
  notes text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with settlement_summary as (
    select
      er.id as registration_id,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as received_amount
    from public.event_registrations er
    left join public.financial_settlements fs on fs.financial_entry_id = er.financial_entry_id
    where er.event_id = p_event_id
    group by er.id
  ),
  session_summary as (
    select
      ers.registration_id,
      count(*)::bigint as selected_sessions_count,
      jsonb_agg(
        jsonb_build_object(
          'session_id', es.id,
          'session_date', es.session_date,
          'start_time', es.start_time,
          'end_time', es.end_time
        )
        order by es.session_date, es.start_time
      ) as selected_sessions
    from public.event_registration_sessions ers
    join public.event_sessions es on es.id = ers.session_id
    group by ers.registration_id
  ),
  rows as (
    select
      er.id as registration_id,
      er.event_id,
      public.event_participant_name(er.student_id, er.guest_full_name) as participant_name,
      er.student_id,
      er.guest_full_name,
      er.guest_birth_date,
      er.guardian_id,
      g.full_name as guardian_name,
      g.phone as guardian_phone,
      g.email as guardian_email,
      er.status,
      er.registration_type,
      coalesce(ss.selected_sessions_count, 0)::bigint as selected_sessions_count,
      coalesce(ss.selected_sessions, '[]'::jsonb) as selected_sessions,
      er.base_amount,
      er.discount_amount,
      er.final_amount,
      coalesce(fs.received_amount, 0)::numeric(12,2) as received_amount,
      greatest(er.final_amount - coalesce(fs.received_amount, 0), 0)::numeric(12,2) as balance,
      case
        when er.status = 'cancelled' then 'cancelled'
        when er.final_amount = 0 then 'free'
        when coalesce(fs.received_amount, 0) >= er.final_amount then 'paid'
        when coalesce(fs.received_amount, 0) > 0 then 'partial'
        else 'pending'
      end as finance_status,
      er.financial_due_date,
      er.financial_entry_id,
      er.notes,
      er.created_at
    from public.event_registrations er
    left join public.guardians g on g.id = er.guardian_id
    left join settlement_summary fs on fs.registration_id = er.id
    left join session_summary ss on ss.registration_id = er.id
    where er.event_id = p_event_id
      and public.current_user_is_owner()
  ),
  filtered as (
    select *
    from rows
    where (p_status_filter = 'all' or status::text = p_status_filter)
      and (
        p_finance_filter = 'all'
        or finance_status = p_finance_filter
        or (p_finance_filter = 'financial_pending' and balance > 0 and status = 'confirmed')
      )
      and (
        btrim(coalesce(p_search, '')) = ''
        or participant_name ilike '%' || btrim(p_search) || '%'
        or guardian_name ilike '%' || btrim(p_search) || '%'
        or guardian_phone ilike '%' || btrim(p_search) || '%'
      )
  ),
  paged as (
    select filtered.*, count(*) over () as total_count
    from filtered
    order by created_at desc nulls last, participant_name asc
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
$$;

create or replace function public.create_event(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_event_id uuid;
  session_item jsonb;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create events.' using errcode = '42501';
  end if;

  insert into public.events (
    name,
    event_type,
    description,
    status,
    capacity,
    base_price,
    registration_start_date,
    registration_end_date,
    notes,
    created_by
  )
  values (
    btrim(payload ->> 'name'),
    coalesce(nullif(payload ->> 'event_type', ''), 'other')::public.event_type,
    nullif(btrim(coalesce(payload ->> 'description', '')), ''),
    coalesce(nullif(payload ->> 'status', ''), 'draft')::public.event_status,
    nullif(payload ->> 'capacity', '')::integer,
    coalesce((payload ->> 'base_price')::numeric, 0),
    nullif(payload ->> 'registration_start_date', '')::date,
    nullif(payload ->> 'registration_end_date', '')::date,
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_event_id;

  for session_item in
    select value from jsonb_array_elements(coalesce(payload -> 'sessions', '[]'::jsonb))
  loop
    insert into public.event_sessions (
      event_id,
      session_date,
      start_time,
      end_time,
      capacity_override,
      price_override,
      notes
    )
    values (
      new_event_id,
      (session_item ->> 'session_date')::date,
      (session_item ->> 'start_time')::time,
      (session_item ->> 'end_time')::time,
      nullif(session_item ->> 'capacity_override', '')::integer,
      nullif(session_item ->> 'price_override', '')::numeric,
      nullif(btrim(coalesce(session_item ->> 'notes', '')), '')
    );
  end loop;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'event', new_event_id, 'event.created', jsonb_build_object('status', payload ->> 'status'));

  return new_event_id;
end;
$$;

create or replace function public.update_event_status(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_event_id uuid := (payload ->> 'event_id')::uuid;
  target_status public.event_status := (payload ->> 'status')::public.event_status;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  action_name text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update events.' using errcode = '42501';
  end if;

  if target_status = 'cancelled' and char_length(reason_text) < 4 then
    raise exception 'Cancellation reason is required.' using errcode = '23514';
  end if;

  update public.events
  set
    status = target_status,
    cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
    cancelled_by = case when target_status = 'cancelled' then actor_id else cancelled_by end,
    cancellation_reason = case when target_status = 'cancelled' then reason_text else cancellation_reason end
  where id = target_event_id;

  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  action_name := case target_status
    when 'open' then 'event.opened'
    when 'closed' then 'event.closed'
    when 'completed' then 'event.completed'
    when 'cancelled' then 'event.cancelled'
    else 'event.updated'
  end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'event', target_event_id, action_name, jsonb_build_object('reason', nullif(reason_text, '')));

  return target_event_id;
end;
$$;

create or replace function public.create_event_registration(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_event public.events%rowtype;
  target_status public.event_registration_status := coalesce(nullif(payload ->> 'status', ''), 'pending')::public.event_registration_status;
  target_registration_type public.event_registration_type := coalesce(nullif(payload ->> 'registration_type', ''), 'full_event')::public.event_registration_type;
  target_session_ids uuid[] := array(
    select value::uuid
    from jsonb_array_elements_text(coalesce(payload -> 'session_ids', '[]'::jsonb))
  );
  target_guardian_id uuid := nullif(payload ->> 'guardian_id', '')::uuid;
  guardian_payload jsonb := payload -> 'guardian';
  new_registration_id uuid;
  session_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create event registrations.' using errcode = '42501';
  end if;

  select *
  into target_event
  from public.events
  where id = (payload ->> 'event_id')::uuid
  for update;

  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  if target_event.status <> 'open' and target_status in ('pending', 'confirmed') then
    raise exception 'Event is not open for registrations.' using errcode = '23514';
  end if;

  if target_status = 'confirmed' then
    perform public.assert_event_capacity_available(target_event.id, target_registration_type, target_session_ids, null);
  end if;

  if target_guardian_id is null and guardian_payload is not null and jsonb_typeof(guardian_payload) = 'object' then
    insert into public.guardians (full_name, phone, email, notes)
    values (
      btrim(guardian_payload ->> 'full_name'),
      nullif(btrim(coalesce(guardian_payload ->> 'phone', '')), ''),
      nullif(btrim(coalesce(guardian_payload ->> 'email', '')), ''),
      nullif(btrim(coalesce(guardian_payload ->> 'notes', '')), '')
    )
    returning id into target_guardian_id;
  end if;

  insert into public.event_registrations (
    event_id,
    student_id,
    guest_full_name,
    guest_birth_date,
    guardian_id,
    status,
    registration_type,
    base_amount,
    discount_amount,
    financial_due_date,
    notes,
    registered_by
  )
  values (
    target_event.id,
    nullif(payload ->> 'student_id', '')::uuid,
    nullif(btrim(coalesce(payload ->> 'guest_full_name', '')), ''),
    nullif(payload ->> 'guest_birth_date', '')::date,
    target_guardian_id,
    target_status,
    target_registration_type,
    coalesce(nullif(payload ->> 'base_amount', '')::numeric, target_event.base_price),
    coalesce(nullif(payload ->> 'discount_amount', '')::numeric, 0),
    coalesce(nullif(payload ->> 'financial_due_date', '')::date, current_date),
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_registration_id;

  if target_registration_type = 'selected_sessions' then
    foreach session_id in array target_session_ids loop
      insert into public.event_registration_sessions (registration_id, session_id)
      values (new_registration_id, session_id);
    end loop;
  end if;

  if target_status = 'confirmed' then
    perform public.ensure_event_registration_financial_entry(new_registration_id);
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'event_registration',
    new_registration_id,
    case
      when target_status = 'confirmed' then 'event.registration_confirmed'
      when target_status = 'waitlisted' then 'event.registration_waitlisted'
      else 'event.registration_created'
    end,
    jsonb_build_object('event_id', target_event.id, 'status', target_status, 'registration_type', target_registration_type)
  );

  return new_registration_id;
end;
$$;

create or replace function public.confirm_event_registration(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_registration public.event_registrations%rowtype;
  target_session_ids uuid[];
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can confirm event registrations.' using errcode = '42501';
  end if;

  select *
  into target_registration
  from public.event_registrations
  where id = (payload ->> 'registration_id')::uuid
  for update;

  if not found then
    raise exception 'Event registration not found.' using errcode = 'P0002';
  end if;

  if target_registration.status = 'confirmed' then
    perform public.ensure_event_registration_financial_entry(target_registration.id);
    return target_registration.id;
  end if;

  if target_registration.status = 'cancelled' then
    raise exception 'Cannot confirm a cancelled registration.' using errcode = '23514';
  end if;

  select coalesce(array_agg(session_id), array[]::uuid[])
  into target_session_ids
  from public.event_registration_sessions
  where registration_id = target_registration.id;

  perform public.assert_event_capacity_available(
    target_registration.event_id,
    target_registration.registration_type,
    target_session_ids,
    target_registration.id
  );

  update public.event_registrations
  set status = 'confirmed'
  where id = target_registration.id;

  perform public.ensure_event_registration_financial_entry(target_registration.id);

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'event_registration',
    target_registration.id,
    'event.registration_confirmed',
    jsonb_build_object('event_id', target_registration.event_id)
  );

  return target_registration.id;
end;
$$;

create or replace function public.cancel_event_registration(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_registration public.event_registrations%rowtype;
  reason_text text := btrim(coalesce(payload ->> 'reason', ''));
  received_amount numeric(12,2);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can cancel event registrations.' using errcode = '42501';
  end if;

  if char_length(reason_text) < 4 then
    raise exception 'Cancellation reason is required.' using errcode = '23514';
  end if;

  select *
  into target_registration
  from public.event_registrations
  where id = (payload ->> 'registration_id')::uuid
  for update;

  if not found then
    raise exception 'Event registration not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(fs.amount), 0)::numeric(12,2)
  into received_amount
  from public.financial_settlements fs
  where fs.financial_entry_id = target_registration.financial_entry_id
    and fs.status = 'active';

  if received_amount > 0 then
    raise exception 'This registration has recorded payments and requires explicit financial handling.' using errcode = '23514';
  end if;

  update public.event_registrations
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = actor_id,
    cancellation_reason = reason_text
  where id = target_registration.id;

  if target_registration.financial_entry_id is not null then
    update public.financial_entries
    set
      lifecycle_status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = actor_id,
      cancellation_reason = reason_text
    where id = target_registration.financial_entry_id
      and lifecycle_status = 'active';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'event_registration',
    target_registration.id,
    'event.registration_cancelled',
    jsonb_build_object('event_id', target_registration.event_id, 'reason', reason_text)
  );

  return target_registration.id;
end;
$$;

create or replace function public.settle_event_registration(payload jsonb)
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
  target_registration public.event_registrations%rowtype;
  result_row record;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can settle event registrations.' using errcode = '42501';
  end if;

  select *
  into target_registration
  from public.event_registrations
  where id = (payload ->> 'registration_id')::uuid
  for update;

  if not found then
    raise exception 'Event registration not found.' using errcode = 'P0002';
  end if;

  if target_registration.status <> 'confirmed' then
    raise exception 'Only confirmed registrations can be paid.' using errcode = '23514';
  end if;

  if target_registration.final_amount <= 0 then
    raise exception 'Free registrations do not have a receivable.' using errcode = '23514';
  end if;

  perform public.ensure_event_registration_financial_entry(target_registration.id);

  select er.*
  into target_registration
  from public.event_registrations er
  where er.id = target_registration.id;

  select *
  into result_row
  from public.settle_financial_entry(jsonb_build_object(
    'financial_entry_id', target_registration.financial_entry_id,
    'amount', (payload ->> 'amount')::numeric,
    'settled_at', coalesce(nullif(payload ->> 'settled_at', ''), now()::text),
    'payment_method', coalesce(nullif(payload ->> 'payment_method', ''), 'pix'),
    'cash_account_id', nullif(payload ->> 'cash_account_id', ''),
    'notes', nullif(payload ->> 'notes', '')
  ));

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'event_registration',
    target_registration.id,
    'event.registration_payment_recorded',
    jsonb_build_object('financial_entry_id', target_registration.financial_entry_id, 'settlement_id', result_row.settlement_id)
  );

  financial_entry_id := result_row.financial_entry_id;
  settlement_id := result_row.settlement_id;
  settled_amount := result_row.settled_amount;
  balance := result_row.balance;
  computed_status := result_row.computed_status;
  return next;
end;
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
      case when er.id is not null then 'event_registration' else 'financial_settlement' end::text as source_type,
      coalesce(er.id, fs.id) as source_id,
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
    left join public.event_registrations er on er.financial_entry_id = fe.id
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

comment on function public.finance_cash_flow_rows(date, date) is
  'Internal consolidated cash-flow projection. Tuition payments and event registration settlements are counted exactly once from their real money rows.';

alter function public.event_participant_name(uuid, text) owner to postgres;
alter function public.assert_event_capacity_available(uuid, public.event_registration_type, uuid[], uuid) owner to postgres;
alter function public.ensure_event_registration_financial_entry(uuid) owner to postgres;
alter function public.list_events(text, text, text, integer, integer) owner to postgres;
alter function public.get_event_finance_summary(uuid) owner to postgres;
alter function public.list_event_registrations(uuid, text, text, text, integer, integer) owner to postgres;
alter function public.create_event(jsonb) owner to postgres;
alter function public.update_event_status(jsonb) owner to postgres;
alter function public.create_event_registration(jsonb) owner to postgres;
alter function public.confirm_event_registration(jsonb) owner to postgres;
alter function public.cancel_event_registration(jsonb) owner to postgres;
alter function public.settle_event_registration(jsonb) owner to postgres;
alter function public.finance_cash_flow_rows(date, date) owner to postgres;

revoke all on function public.event_participant_name(uuid, text) from public, anon, authenticated;
revoke all on function public.assert_event_capacity_available(uuid, public.event_registration_type, uuid[], uuid) from public, anon, authenticated;
revoke all on function public.ensure_event_registration_financial_entry(uuid) from public, anon, authenticated;
revoke all on function public.list_events(text, text, text, integer, integer) from public, anon;
revoke all on function public.get_event_finance_summary(uuid) from public, anon;
revoke all on function public.list_event_registrations(uuid, text, text, text, integer, integer) from public, anon;
revoke all on function public.create_event(jsonb) from public, anon;
revoke all on function public.update_event_status(jsonb) from public, anon;
revoke all on function public.create_event_registration(jsonb) from public, anon;
revoke all on function public.confirm_event_registration(jsonb) from public, anon;
revoke all on function public.cancel_event_registration(jsonb) from public, anon;
revoke all on function public.settle_event_registration(jsonb) from public, anon;
revoke all on function public.finance_cash_flow_rows(date, date) from public, anon, authenticated;

grant execute on function public.list_events(text, text, text, integer, integer) to authenticated;
grant execute on function public.get_event_finance_summary(uuid) to authenticated;
grant execute on function public.list_event_registrations(uuid, text, text, text, integer, integer) to authenticated;
grant execute on function public.create_event(jsonb) to authenticated;
grant execute on function public.update_event_status(jsonb) to authenticated;
grant execute on function public.create_event_registration(jsonb) to authenticated;
grant execute on function public.confirm_event_registration(jsonb) to authenticated;
grant execute on function public.cancel_event_registration(jsonb) to authenticated;
grant execute on function public.settle_event_registration(jsonb) to authenticated;
