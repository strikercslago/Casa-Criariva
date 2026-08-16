alter table public.students
add column if not exists photo_path text;

alter table public.students
drop constraint if exists students_photo_path_format;

alter table public.students
add constraint students_photo_path_format
check (
  photo_path is null
  or photo_path = id::text || '/avatar.webp'
  or photo_path ~ ('^' || id::text || '/avatar-[0-9]+\.webp$')
);

comment on column public.students.photo_path is
  'Private Supabase Storage object path in the student-photos bucket. Signed URLs are never persisted.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "student_photos_staff_read" on storage.objects;
create policy "student_photos_staff_read"
on storage.objects
for select to authenticated
using (
  bucket_id = 'student-photos'
  and public.current_user_can_teach()
  and exists (
    select 1
    from public.students s
    where s.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "student_photos_operations_insert" on storage.objects;
create policy "student_photos_operations_insert"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'student-photos'
  and public.current_user_can_manage_operations()
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar-[0-9]+\.webp$'
  and exists (
    select 1
    from public.students s
    where s.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "student_photos_operations_update" on storage.objects;
create policy "student_photos_operations_update"
on storage.objects
for update to authenticated
using (
  bucket_id = 'student-photos'
  and public.current_user_can_manage_operations()
  and exists (
    select 1
    from public.students s
    where s.id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'student-photos'
  and public.current_user_can_manage_operations()
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar-[0-9]+\.webp$'
  and exists (
    select 1
    from public.students s
    where s.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "student_photos_operations_delete" on storage.objects;
create policy "student_photos_operations_delete"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'student-photos'
  and public.current_user_can_manage_operations()
  and exists (
    select 1
    from public.students s
    where s.id::text = (storage.foldername(name))[1]
  )
);
