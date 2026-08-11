create type public.class_session_status as enum ('planned', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'excused');

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  schedule_id uuid references public.class_schedules(id) on delete set null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  status public.class_session_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_sessions_time_order check (end_time > start_time),
  constraint class_sessions_notes_length check (
    notes is null
    or char_length(notes) <= 1000
  )
);

comment on table public.class_sessions is
  'Concrete class occurrences. Stores session_date/start_time/end_time so historical sessions do not change when recurring schedules are edited.';
comment on column public.class_sessions.schedule_id is
  'Nullable source recurring schedule. Extra/manual sessions can have no schedule_id.';

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status public.attendance_status not null,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_notes_length check (
    notes is null
    or char_length(notes) <= 1000
  )
);

comment on table public.attendance_records is
  'Attendance decision for one expected student in one concrete class session.';

create trigger class_sessions_set_updated_at
before update on public.class_sessions
for each row execute function public.set_updated_at();

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create unique index class_sessions_recurring_occurrence_uidx
on public.class_sessions (class_id, schedule_id, session_date)
where schedule_id is not null;

create unique index class_sessions_manual_occurrence_uidx
on public.class_sessions (class_id, session_date, start_time, end_time)
where schedule_id is null;

create index class_sessions_date_time_idx
on public.class_sessions (session_date, start_time, id);

create index class_sessions_class_date_idx
on public.class_sessions (class_id, session_date);

create unique index attendance_records_session_student_uidx
on public.attendance_records (session_id, student_id);

create index attendance_records_student_session_idx
on public.attendance_records (student_id, session_id);

comment on index public.class_sessions_recurring_occurrence_uidx is
  'Makes ensure_class_sessions idempotent for recurring schedule occurrences.';
comment on index public.class_sessions_manual_occurrence_uidx is
  'Prevents duplicate extra/manual sessions for the same class, date and time.';
comment on index public.class_sessions_date_time_idx is
  'Supports agenda day/week windows ordered by date and time.';
comment on index public.class_sessions_class_date_idx is
  'Supports class detail/history and expected roster checks by class/date.';
comment on index public.attendance_records_session_student_uidx is
  'Prevents duplicate attendance for the same student in the same session and supports session detail.';
comment on index public.attendance_records_student_session_idx is
  'Supports Student 360 attendance history by student.';

alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;

revoke all on table public.class_sessions from anon, authenticated;
revoke all on table public.attendance_records from anon, authenticated;

grant select, insert, update, delete on table public.class_sessions to authenticated;
grant select, insert, update, delete on table public.attendance_records to authenticated;

create policy "class_sessions_owner_all"
on public.class_sessions
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "attendance_records_owner_all"
on public.attendance_records
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create or replace function public.assert_attendance_window(start_date date, end_date date)
returns void
language plpgsql
set search_path = public
as $$
begin
  if start_date is null or end_date is null then
    raise exception 'Date range is required.' using errcode = '22023';
  end if;

  if end_date < start_date then
    raise exception 'End date must be on or after start date.' using errcode = '22023';
  end if;

  if end_date - start_date > 62 then
    raise exception 'Date range cannot exceed 63 days.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.ensure_class_sessions(p_start_date date, p_end_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  created_count integer;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can materialize class sessions.' using errcode = '42501';
  end if;

  perform public.assert_attendance_window(p_start_date, p_end_date);

  with inserted as (
    insert into public.class_sessions (class_id, schedule_id, session_date, start_time, end_time, status)
    select
      cs.class_id,
      cs.id,
      date_item::date,
      cs.start_time,
      cs.end_time,
      'planned'::public.class_session_status
    from generate_series(p_start_date, p_end_date, interval '1 day') as date_item
    join public.class_schedules cs
      on cs.weekday = extract(isodow from date_item)::smallint
    join public.classes c
      on c.id = cs.class_id
     and c.status = 'active'
    on conflict (class_id, schedule_id, session_date) where schedule_id is not null do nothing
    returning id, class_id, session_date, start_time, end_time
  ),
  audit_insert as (
    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    select
      actor_id,
      'class_session',
      inserted.id,
      'session.created',
      jsonb_build_object(
        'class_id', inserted.class_id,
        'session_date', inserted.session_date,
        'start_time', inserted.start_time,
        'end_time', inserted.end_time,
        'source', 'recurring'
      )
    from inserted
    returning 1
  )
  select count(*)::integer into created_count from inserted;

  return created_count;
end;
$$;

create or replace function public.list_agenda_sessions(p_start_date date, p_end_date date)
returns table (
  session_id uuid,
  class_id uuid,
  class_name text,
  schedule_id uuid,
  session_date date,
  start_time time,
  end_time time,
  status public.class_session_status,
  notes text,
  expected_students bigint,
  recorded_count bigint,
  present_count bigint,
  absent_count bigint,
  excused_count bigint,
  attendance_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can list agenda sessions.' using errcode = '42501';
  end if;

  perform public.ensure_class_sessions(p_start_date, p_end_date);

  return query
  with expected_counts as (
    select
      s.id as session_id,
      count(e.id)::bigint as expected_students
    from public.class_sessions s
    left join public.enrollments e
      on e.class_id = s.class_id
     and e.status <> 'cancelled'
     and e.start_date <= s.session_date
     and (e.end_date is null or e.end_date >= s.session_date)
    where s.session_date between p_start_date and p_end_date
    group by s.id
  ),
  attendance_counts as (
    select
      ar.session_id,
      count(*)::bigint as recorded_count,
      count(*) filter (where ar.status = 'present')::bigint as present_count,
      count(*) filter (where ar.status = 'absent')::bigint as absent_count,
      count(*) filter (where ar.status = 'excused')::bigint as excused_count
    from public.attendance_records ar
    group by ar.session_id
  )
  select
    s.id,
    s.class_id,
    c.name,
    s.schedule_id,
    s.session_date,
    s.start_time,
    s.end_time,
    s.status,
    s.notes,
    coalesce(ec.expected_students, 0),
    coalesce(ac.recorded_count, 0),
    coalesce(ac.present_count, 0),
    coalesce(ac.absent_count, 0),
    coalesce(ac.excused_count, 0),
    case
      when s.status = 'cancelled' then 'cancelled'
      when coalesce(ec.expected_students, 0) = 0 then 'no_students'
      when coalesce(ac.recorded_count, 0) >= coalesce(ec.expected_students, 0) then 'recorded'
      else 'pending'
    end
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  left join expected_counts ec on ec.session_id = s.id
  left join attendance_counts ac on ac.session_id = s.id
  where s.session_date between p_start_date and p_end_date
  order by s.session_date asc, s.start_time asc, c.name asc, s.id asc;
end;
$$;

create or replace function public.get_session_attendance(p_session_id uuid)
returns table (
  session_id uuid,
  class_id uuid,
  class_name text,
  session_date date,
  start_time time,
  end_time time,
  session_status public.class_session_status,
  session_notes text,
  student_id uuid,
  student_name text,
  preferred_name text,
  enrollment_id uuid,
  attendance_id uuid,
  attendance_status public.attendance_status,
  attendance_notes text,
  recorded_by uuid,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can read session attendance.' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.class_id,
    c.name,
    s.session_date,
    s.start_time,
    s.end_time,
    s.status,
    s.notes,
    st.id,
    st.full_name,
    st.preferred_name,
    e.id,
    ar.id,
    ar.status,
    ar.notes,
    ar.recorded_by,
    ar.updated_at
  from public.class_sessions s
  join public.classes c on c.id = s.class_id
  join public.enrollments e
    on e.class_id = s.class_id
   and e.status <> 'cancelled'
   and e.start_date <= s.session_date
   and (e.end_date is null or e.end_date >= s.session_date)
  join public.students st on st.id = e.student_id
  left join public.attendance_records ar
    on ar.session_id = s.id
   and ar.student_id = st.id
  where s.id = p_session_id
  order by st.full_name asc, st.id asc;
end;
$$;

create or replace function public.save_session_attendance(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_session_id uuid := (payload ->> 'session_id')::uuid;
  records_payload jsonb := coalesce(payload -> 'records', '[]'::jsonb);
  record_item jsonb;
  target_class_id uuid;
  target_session_date date;
  target_status public.class_session_status;
  target_student_id uuid;
  target_status_value public.attendance_status;
  target_notes text;
  expected_count integer;
  previous_count integer;
  present_count integer := 0;
  absent_count integer := 0;
  excused_count integer := 0;
  audit_action text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can save attendance.' using errcode = '42501';
  end if;

  if jsonb_typeof(records_payload) <> 'array' then
    raise exception 'Records must be an array.' using errcode = '22023';
  end if;

  select class_id, session_date, status
  into target_class_id, target_session_date, target_status
  from public.class_sessions
  where id = target_session_id;

  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;

  if target_status = 'cancelled' then
    raise exception 'Cannot record attendance for a cancelled session.' using errcode = '23514';
  end if;

  select count(*)::integer
  into expected_count
  from public.enrollments e
  where e.class_id = target_class_id
    and e.status <> 'cancelled'
    and e.start_date <= target_session_date
    and (e.end_date is null or e.end_date >= target_session_date);

  if jsonb_array_length(records_payload) = 0 and expected_count > 0 then
    raise exception 'Attendance records are required.' using errcode = '22023';
  end if;

  select count(*)::integer
  into previous_count
  from public.attendance_records
  where session_id = target_session_id;

  for record_item in select value from jsonb_array_elements(records_payload) loop
    target_student_id := (record_item ->> 'student_id')::uuid;
    target_status_value := (record_item ->> 'status')::public.attendance_status;
    target_notes := nullif(btrim(coalesce(record_item ->> 'notes', '')), '');

    if not exists (
      select 1
      from public.enrollments e
      where e.class_id = target_class_id
        and e.student_id = target_student_id
        and e.status <> 'cancelled'
        and e.start_date <= target_session_date
        and (e.end_date is null or e.end_date >= target_session_date)
    ) then
      raise exception 'Student is not expected for this session.' using errcode = '23514';
    end if;

    insert into public.attendance_records (session_id, student_id, status, notes, recorded_by)
    values (target_session_id, target_student_id, target_status_value, target_notes, actor_id)
    on conflict (session_id, student_id)
    do update set
      status = excluded.status,
      notes = excluded.notes,
      recorded_by = excluded.recorded_by;

    present_count := present_count + case when target_status_value = 'present' then 1 else 0 end;
    absent_count := absent_count + case when target_status_value = 'absent' then 1 else 0 end;
    excused_count := excused_count + case when target_status_value = 'excused' then 1 else 0 end;
  end loop;

  update public.class_sessions
  set status = 'completed'
  where id = target_session_id
    and status <> 'cancelled';

  audit_action := case when previous_count = 0 then 'attendance.recorded' else 'attendance.updated' end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'class_session',
    target_session_id,
    audit_action,
    jsonb_build_object(
      'class_id', target_class_id,
      'expected_students', expected_count,
      'total_present', present_count,
      'total_absent', absent_count,
      'total_excused', excused_count
    )
  );

  return target_session_id;
end;
$$;

create or replace function public.update_class_session_status(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_session_id uuid := (payload ->> 'session_id')::uuid;
  next_status public.class_session_status := (payload ->> 'status')::public.class_session_status;
  next_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  target_class_id uuid;
  event_action text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update sessions.' using errcode = '42501';
  end if;

  if next_status not in ('planned', 'cancelled') then
    raise exception 'Only planned/cancelled transitions are supported here.' using errcode = '23514';
  end if;

  update public.class_sessions
  set status = next_status,
      notes = next_notes
  where id = target_session_id
  returning class_id into target_class_id;

  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;

  event_action := case when next_status = 'cancelled' then 'session.cancelled' else 'session.restored' end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'class_session',
    target_session_id,
    event_action,
    jsonb_build_object('class_id', target_class_id)
  );

  return target_session_id;
end;
$$;

create or replace function public.create_extra_class_session(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_class_id uuid := (payload ->> 'class_id')::uuid;
  session_on date := (payload ->> 'session_date')::date;
  starts_at time := (payload ->> 'start_time')::time;
  ends_at time := (payload ->> 'end_time')::time;
  session_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  new_session_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create extra sessions.' using errcode = '42501';
  end if;

  if ends_at <= starts_at then
    raise exception 'Session end time must be after start time.' using errcode = '23514';
  end if;

  if not exists (select 1 from public.classes where id = target_class_id and status <> 'archived') then
    raise exception 'Class not found or archived.' using errcode = 'P0002';
  end if;

  insert into public.class_sessions (class_id, schedule_id, session_date, start_time, end_time, status, notes)
  values (target_class_id, null, session_on, starts_at, ends_at, 'planned', session_notes)
  on conflict (class_id, session_date, start_time, end_time) where schedule_id is null do update
  set notes = excluded.notes
  returning id into new_session_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'class_session',
    new_session_id,
    'session.created',
    jsonb_build_object('class_id', target_class_id, 'session_date', session_on, 'source', 'extra')
  );

  return new_session_id;
end;
$$;

comment on function public.ensure_class_sessions(date, date) is
  'Materializes recurring class sessions only for the requested date window. Re-running is idempotent.';
comment on function public.list_agenda_sessions(date, date) is
  'Ensures and returns agenda sessions for a date window with expected student and attendance counts.';
comment on function public.get_session_attendance(uuid) is
  'Returns expected students for one session based on enrollment dates plus any recorded attendance.';
comment on function public.save_session_attendance(jsonb) is
  'Saves attendance records for a session in one transaction and writes one consolidated audit event.';
comment on function public.update_class_session_status(jsonb) is
  'Cancels or restores a concrete class session without deleting history.';
comment on function public.create_extra_class_session(jsonb) is
  'Creates a manual extra class session without requiring a recurring schedule.';

alter function public.assert_attendance_window(date, date) owner to postgres;
alter function public.ensure_class_sessions(date, date) owner to postgres;
alter function public.list_agenda_sessions(date, date) owner to postgres;
alter function public.get_session_attendance(uuid) owner to postgres;
alter function public.save_session_attendance(jsonb) owner to postgres;
alter function public.update_class_session_status(jsonb) owner to postgres;
alter function public.create_extra_class_session(jsonb) owner to postgres;

revoke all on function public.assert_attendance_window(date, date) from public, anon, authenticated;
revoke all on function public.ensure_class_sessions(date, date) from public, anon;
revoke all on function public.list_agenda_sessions(date, date) from public, anon;
revoke all on function public.get_session_attendance(uuid) from public, anon;
revoke all on function public.save_session_attendance(jsonb) from public, anon;
revoke all on function public.update_class_session_status(jsonb) from public, anon;
revoke all on function public.create_extra_class_session(jsonb) from public, anon;

grant execute on function public.ensure_class_sessions(date, date) to authenticated;
grant execute on function public.list_agenda_sessions(date, date) to authenticated;
grant execute on function public.get_session_attendance(uuid) to authenticated;
grant execute on function public.save_session_attendance(jsonb) to authenticated;
grant execute on function public.update_class_session_status(jsonb) to authenticated;
grant execute on function public.create_extra_class_session(jsonb) to authenticated;
