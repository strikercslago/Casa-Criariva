set check_function_bodies = off;

create or replace function public.validate_event_registration_session_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_event_id uuid;
  session_event_id uuid;
begin
  select event_id into registration_event_id
  from public.event_registrations
  where id = new.registration_id;

  select event_id into session_event_id
  from public.event_sessions
  where id = new.session_id;

  if registration_event_id is null or session_event_id is null or registration_event_id <> session_event_id then
    raise exception 'Registration session must belong to the same event.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_event_registration_session_event_trigger on public.event_registration_sessions;
create trigger validate_event_registration_session_event_trigger
before insert or update on public.event_registration_sessions
for each row execute function public.validate_event_registration_session_event();

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
  limited_session_spots as (
    select
      es.event_id,
      min(greatest(coalesce(es.capacity_override, e.capacity) - coalesce(confirmed.used_spots, 0), 0))::integer as available_spots
    from public.event_sessions es
    join public.events e on e.id = es.event_id
    left join lateral (
      select count(*)::integer as used_spots
      from public.event_registrations er
      where er.event_id = es.event_id
        and er.status = 'confirmed'
        and (
          er.registration_type = 'full_event'
          or exists (
            select 1
            from public.event_registration_sessions ers
            where ers.registration_id = er.id
              and ers.session_id = es.id
          )
        )
    ) confirmed on true
    where coalesce(es.capacity_override, e.capacity) is not null
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
      coalesce(
        lss.available_spots,
        case
          when e.capacity is null then null
          else greatest(e.capacity - coalesce(rf.confirmed_count, 0)::integer, 0)
        end
      ) as available_spots,
      count(*) over () as total_count
    from event_rows e
    left join session_summary ss on ss.event_id = e.id
    left join registration_finance rf on rf.event_id = e.id
    left join limited_session_spots lss on lss.event_id = e.id
    order by coalesce(ss.first_session_date, e.created_at::date) desc, e.created_at desc
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
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
  target_student_id uuid := nullif(payload ->> 'student_id', '')::uuid;
  target_guest_full_name text := nullif(btrim(coalesce(payload ->> 'guest_full_name', '')), '');
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

  if target_student_id is null and target_guest_full_name is not null and target_guardian_id is null then
    raise exception 'External participants require a guardian.' using errcode = '23514';
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
    target_student_id,
    target_guest_full_name,
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

comment on function public.validate_event_registration_session_event() is
  'Ensures direct inserts in event_registration_sessions cannot attach sessions from another event.';
