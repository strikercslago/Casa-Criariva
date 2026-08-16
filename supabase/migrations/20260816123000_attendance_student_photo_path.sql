drop function if exists public.get_session_attendance(uuid);

create function public.get_session_attendance(p_session_id uuid)
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
  student_photo_path text,
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
    st.photo_path,
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

comment on function public.get_session_attendance(uuid) is
  'Returns expected attendance rows for a class session, including the private student photo object path for signed URL generation.';

alter function public.get_session_attendance(uuid) owner to postgres;

revoke all on function public.get_session_attendance(uuid) from public, anon;
grant execute on function public.get_session_attendance(uuid) to authenticated;
