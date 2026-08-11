create or replace function public.assert_class_schedules_valid(schedules jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  schedule_item jsonb;
  conflict_count integer;
begin
  if schedules is null or jsonb_typeof(schedules) = 'null' then
    return;
  end if;

  if jsonb_typeof(schedules) <> 'array' then
    raise exception 'Schedules must be an array.' using errcode = '22023';
  end if;

  for schedule_item in select value from jsonb_array_elements(schedules) loop
    if (schedule_item ->> 'weekday')::smallint not between 1 and 7 then
      raise exception 'Weekday must be between 1 and 7.' using errcode = '23514';
    end if;

    if (schedule_item ->> 'end_time')::time <= (schedule_item ->> 'start_time')::time then
      raise exception 'Schedule end time must be after start time.' using errcode = '23514';
    end if;
  end loop;

  with normalized as (
    select
      (value ->> 'weekday')::smallint as weekday,
      (value ->> 'start_time')::time as start_time,
      (value ->> 'end_time')::time as end_time,
      row_number() over () as row_number
    from jsonb_array_elements(schedules)
  )
  select count(*)
  into conflict_count
  from normalized first
  join normalized second
    on first.row_number < second.row_number
   and first.weekday = second.weekday
   and first.start_time < second.end_time
   and second.start_time < first.end_time;

  if conflict_count > 0 then
    raise exception 'Schedules overlap for the same class.' using errcode = '23514';
  end if;
end;
$$;

comment on function public.assert_class_schedules_valid(jsonb) is
  'Validates same-class recurring schedule payloads: ISO weekday 1-7, end_time > start_time and no overlap.';

create or replace function public.list_classes(
  p_search text default '',
  p_status_filter text default 'all',
  p_capacity_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  class_id uuid,
  name text,
  description text,
  capacity integer,
  status public.class_status,
  created_at timestamptz,
  updated_at timestamptz,
  active_enrollments bigint,
  available_spots integer,
  is_full boolean,
  schedules jsonb,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_search, '')), '') as search_text,
      case when p_status_filter in ('active', 'inactive', 'archived') then p_status_filter else 'all' end as status_filter,
      case when p_capacity_filter in ('with_spots', 'full') then p_capacity_filter else 'all' end as capacity_filter,
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 20), 1), 50) as page_size
  ),
  active_counts as (
    select class_id, count(*)::bigint as active_enrollments
    from public.enrollments
    where status = 'active'
    group by class_id
  ),
  filtered as (
    select
      c.id,
      c.name,
      c.description,
      c.capacity,
      c.status,
      c.created_at,
      c.updated_at,
      coalesce(ac.active_enrollments, 0) as active_enrollments,
      case
        when c.capacity is null then null
        else greatest(c.capacity - coalesce(ac.active_enrollments, 0)::integer, 0)
      end as available_spots,
      c.capacity is not null and coalesce(ac.active_enrollments, 0) >= c.capacity as is_full
    from public.classes c
    cross join params p
    left join active_counts ac on ac.class_id = c.id
    where (
      p.search_text is null
      or c.name ilike '%' || p.search_text || '%'
    )
    and (
      p.status_filter = 'all'
      or c.status::text = p.status_filter
    )
    and (
      p.capacity_filter = 'all'
      or (p.capacity_filter = 'with_spots' and (c.capacity is null or coalesce(ac.active_enrollments, 0) < c.capacity))
      or (p.capacity_filter = 'full' and c.capacity is not null and coalesce(ac.active_enrollments, 0) >= c.capacity)
    )
  ),
  paged as (
    select filtered.*, count(*) over () as total_count
    from filtered
    cross join params p
    order by filtered.name asc, filtered.id asc
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select
    paged.id as class_id,
    paged.name,
    paged.description,
    paged.capacity,
    paged.status,
    paged.created_at,
    paged.updated_at,
    paged.active_enrollments,
    paged.available_spots,
    paged.is_full,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'class_id', cs.class_id,
            'weekday', cs.weekday,
            'start_time', cs.start_time,
            'end_time', cs.end_time,
            'created_at', cs.created_at
          )
          order by cs.weekday asc, cs.start_time asc, cs.id asc
        )
        from public.class_schedules cs
        where cs.class_id = paged.id
      ),
      '[]'::jsonb
    ) as schedules,
    paged.total_count
  from paged;
$$;

comment on function public.list_classes(text, text, text, integer, integer) is
  'Paged class list with recurring schedules, active enrollment counts and derived capacity values. Avoids N+1 list loading.';

create or replace function public.create_class_with_schedules(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  class_payload jsonb := coalesce(payload -> 'class', '{}'::jsonb);
  schedules_payload jsonb := coalesce(payload -> 'schedules', '[]'::jsonb);
  new_class_id uuid;
  schedule_item jsonb;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create classes.' using errcode = '42501';
  end if;

  perform public.assert_class_schedules_valid(schedules_payload);

  insert into public.classes (name, description, capacity, status)
  values (
    btrim(class_payload ->> 'name'),
    nullif(btrim(coalesce(class_payload ->> 'description', '')), ''),
    nullif(class_payload ->> 'capacity', '')::integer,
    coalesce(nullif(class_payload ->> 'status', '')::public.class_status, 'active')
  )
  returning id into new_class_id;

  for schedule_item in select value from jsonb_array_elements(schedules_payload) loop
    insert into public.class_schedules (class_id, weekday, start_time, end_time)
    values (
      new_class_id,
      (schedule_item ->> 'weekday')::smallint,
      (schedule_item ->> 'start_time')::time,
      (schedule_item ->> 'end_time')::time
    );
  end loop;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'class',
    new_class_id,
    'class.created',
    jsonb_build_object('schedule_count', jsonb_array_length(schedules_payload))
  );

  return new_class_id;
end;
$$;

create or replace function public.update_class_with_schedules(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_class_id uuid := (payload ->> 'class_id')::uuid;
  class_payload jsonb := coalesce(payload -> 'class', '{}'::jsonb);
  schedules_payload jsonb := coalesce(payload -> 'schedules', '[]'::jsonb);
  active_count integer;
  requested_capacity integer;
  schedule_item jsonb;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update classes.' using errcode = '42501';
  end if;

  perform public.assert_class_schedules_valid(schedules_payload);

  requested_capacity := nullif(class_payload ->> 'capacity', '')::integer;

  select count(*)::integer
  into active_count
  from public.enrollments
  where class_id = target_class_id
    and status = 'active';

  update public.classes
  set
    name = btrim(class_payload ->> 'name'),
    description = nullif(btrim(coalesce(class_payload ->> 'description', '')), ''),
    capacity = requested_capacity,
    status = coalesce(nullif(class_payload ->> 'status', '')::public.class_status, status)
  where id = target_class_id;

  if not found then
    raise exception 'Class not found.' using errcode = 'P0002';
  end if;

  delete from public.class_schedules where class_id = target_class_id;

  for schedule_item in select value from jsonb_array_elements(schedules_payload) loop
    insert into public.class_schedules (class_id, weekday, start_time, end_time)
    values (
      target_class_id,
      (schedule_item ->> 'weekday')::smallint,
      (schedule_item ->> 'start_time')::time,
      (schedule_item ->> 'end_time')::time
    );
  end loop;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'class',
      target_class_id,
      'class.updated',
      jsonb_build_object('active_enrollments', active_count, 'capacity', requested_capacity)
    ),
    (
      actor_id,
      'class',
      target_class_id,
      'class.schedule_changed',
      jsonb_build_object('schedule_count', jsonb_array_length(schedules_payload))
    );

  return target_class_id;
end;
$$;

create or replace function public.add_student_to_class(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_class_id uuid := (payload ->> 'class_id')::uuid;
  target_student_id uuid := (payload ->> 'student_id')::uuid;
  start_on date := coalesce((payload ->> 'start_date')::date, current_date);
  class_capacity integer;
  active_count integer;
  new_enrollment_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can enroll students.' using errcode = '42501';
  end if;

  select capacity into class_capacity
  from public.classes
  where id = target_class_id
    and status <> 'archived';

  if not found then
    raise exception 'Class not found or archived.' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into active_count
  from public.enrollments
  where class_id = target_class_id
    and status = 'active';

  if class_capacity is not null and active_count >= class_capacity then
    raise exception 'Class capacity reached.' using errcode = '23514';
  end if;

  insert into public.enrollments (student_id, class_id, start_date, status)
  values (target_student_id, target_class_id, start_on, 'active')
  returning id into new_enrollment_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'class',
      target_class_id,
      'enrollment.created',
      jsonb_build_object('student_id', target_student_id, 'enrollment_id', new_enrollment_id)
    ),
    (
      actor_id,
      'student',
      target_student_id,
      'enrollment.created',
      jsonb_build_object('class_id', target_class_id, 'enrollment_id', new_enrollment_id)
    );

  return new_enrollment_id;
end;
$$;

create or replace function public.end_class_enrollment(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_enrollment_id uuid := (payload ->> 'enrollment_id')::uuid;
  end_on date := coalesce((payload ->> 'end_date')::date, current_date);
  target_class_id uuid;
  target_student_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can end enrollments.' using errcode = '42501';
  end if;

  update public.enrollments
  set status = 'ended', end_date = end_on
  where id = target_enrollment_id
    and status = 'active'
  returning class_id, student_id into target_class_id, target_student_id;

  if not found then
    raise exception 'Active enrollment not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'class',
      target_class_id,
      'enrollment.ended',
      jsonb_build_object('student_id', target_student_id, 'enrollment_id', target_enrollment_id)
    ),
    (
      actor_id,
      'student',
      target_student_id,
      'enrollment.ended',
      jsonb_build_object('class_id', target_class_id, 'enrollment_id', target_enrollment_id)
    );

  return target_enrollment_id;
end;
$$;

create or replace function public.transfer_student_class(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  current_enrollment_id uuid := (payload ->> 'enrollment_id')::uuid;
  target_class_id uuid := (payload ->> 'target_class_id')::uuid;
  transfer_on date := coalesce((payload ->> 'transfer_date')::date, current_date);
  source_class_id uuid;
  target_student_id uuid;
  target_capacity integer;
  target_active_count integer;
  new_enrollment_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can transfer students.' using errcode = '42501';
  end if;

  select class_id, student_id
  into source_class_id, target_student_id
  from public.enrollments
  where id = current_enrollment_id
    and status = 'active';

  if not found then
    raise exception 'Active enrollment not found.' using errcode = 'P0002';
  end if;

  if source_class_id = target_class_id then
    raise exception 'Target class must be different.' using errcode = '23514';
  end if;

  select capacity
  into target_capacity
  from public.classes
  where id = target_class_id
    and status <> 'archived';

  if not found then
    raise exception 'Target class not found or archived.' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into target_active_count
  from public.enrollments
  where class_id = target_class_id
    and status = 'active';

  if target_capacity is not null and target_active_count >= target_capacity then
    raise exception 'Target class capacity reached.' using errcode = '23514';
  end if;

  update public.enrollments
  set status = 'ended', end_date = transfer_on
  where id = current_enrollment_id;

  insert into public.enrollments (student_id, class_id, start_date, status)
  values (target_student_id, target_class_id, transfer_on, 'active')
  returning id into new_enrollment_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'class',
      source_class_id,
      'enrollment.transferred',
      jsonb_build_object('student_id', target_student_id, 'to_class_id', target_class_id, 'old_enrollment_id', current_enrollment_id, 'new_enrollment_id', new_enrollment_id)
    ),
    (
      actor_id,
      'class',
      target_class_id,
      'enrollment.transferred',
      jsonb_build_object('student_id', target_student_id, 'from_class_id', source_class_id, 'old_enrollment_id', current_enrollment_id, 'new_enrollment_id', new_enrollment_id)
    ),
    (
      actor_id,
      'student',
      target_student_id,
      'enrollment.transferred',
      jsonb_build_object('from_class_id', source_class_id, 'to_class_id', target_class_id, 'old_enrollment_id', current_enrollment_id, 'new_enrollment_id', new_enrollment_id)
    );

  return new_enrollment_id;
end;
$$;

create or replace function public.update_class_status(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_class_id uuid := (payload ->> 'class_id')::uuid;
  next_status public.class_status := (payload ->> 'status')::public.class_status;
  active_count integer;
  event_action text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update class status.' using errcode = '42501';
  end if;

  select count(*)::integer
  into active_count
  from public.enrollments
  where class_id = target_class_id
    and status = 'active';

  if next_status = 'archived' and active_count > 0 then
    raise exception 'Class has active enrollments.' using errcode = '23514';
  end if;

  update public.classes
  set status = next_status
  where id = target_class_id;

  if not found then
    raise exception 'Class not found.' using errcode = 'P0002';
  end if;

  event_action := case
    when next_status = 'archived' then 'class.archived'
    when next_status = 'active' then 'class.restored'
    else 'class.updated'
  end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'class',
    target_class_id,
    event_action,
    jsonb_build_object('status', next_status, 'active_enrollments', active_count)
  );

  return target_class_id;
end;
$$;

comment on function public.create_class_with_schedules(jsonb) is
  'Creates a class and recurring schedules atomically while writing class audit history.';
comment on function public.update_class_with_schedules(jsonb) is
  'Updates class configuration and replaces recurring schedules atomically; enrollment records are not edited here.';
comment on function public.add_student_to_class(jsonb) is
  'Creates one active enrollment after class capacity and duplicate-active constraints are enforced.';
comment on function public.end_class_enrollment(jsonb) is
  'Ends an active enrollment without deleting history.';
comment on function public.transfer_student_class(jsonb) is
  'Transfers a student atomically by ending the current enrollment and creating a new active enrollment.';
comment on function public.update_class_status(jsonb) is
  'Archives/restores/inactivates a class; archiving is blocked while active enrollments exist.';

alter function public.assert_class_schedules_valid(jsonb) owner to postgres;
alter function public.list_classes(text, text, text, integer, integer) owner to postgres;
alter function public.create_class_with_schedules(jsonb) owner to postgres;
alter function public.update_class_with_schedules(jsonb) owner to postgres;
alter function public.add_student_to_class(jsonb) owner to postgres;
alter function public.end_class_enrollment(jsonb) owner to postgres;
alter function public.transfer_student_class(jsonb) owner to postgres;
alter function public.update_class_status(jsonb) owner to postgres;

revoke all on function public.assert_class_schedules_valid(jsonb) from public, anon;
revoke all on function public.list_classes(text, text, text, integer, integer) from public, anon;
revoke all on function public.create_class_with_schedules(jsonb) from public, anon;
revoke all on function public.update_class_with_schedules(jsonb) from public, anon;
revoke all on function public.add_student_to_class(jsonb) from public, anon;
revoke all on function public.end_class_enrollment(jsonb) from public, anon;
revoke all on function public.transfer_student_class(jsonb) from public, anon;
revoke all on function public.update_class_status(jsonb) from public, anon;

grant execute on function public.list_classes(text, text, text, integer, integer) to authenticated;
grant execute on function public.create_class_with_schedules(jsonb) to authenticated;
grant execute on function public.update_class_with_schedules(jsonb) to authenticated;
grant execute on function public.add_student_to_class(jsonb) to authenticated;
grant execute on function public.end_class_enrollment(jsonb) to authenticated;
grant execute on function public.transfer_student_class(jsonb) to authenticated;
grant execute on function public.update_class_status(jsonb) to authenticated;
