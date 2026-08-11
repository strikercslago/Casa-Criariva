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
     and e.status in ('active', 'ended')
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
   and e.status in ('active', 'ended')
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
    and e.status in ('active', 'ended')
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
        and e.status in ('active', 'ended')
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

alter function public.list_agenda_sessions(date, date) owner to postgres;
alter function public.get_session_attendance(uuid) owner to postgres;
alter function public.save_session_attendance(jsonb) owner to postgres;

revoke all on function public.list_agenda_sessions(date, date) from public, anon;
revoke all on function public.get_session_attendance(uuid) from public, anon;
revoke all on function public.save_session_attendance(jsonb) from public, anon;

grant execute on function public.list_agenda_sessions(date, date) to authenticated;
grant execute on function public.get_session_attendance(uuid) to authenticated;
grant execute on function public.save_session_attendance(jsonb) to authenticated;
