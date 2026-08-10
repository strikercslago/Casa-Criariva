create extension if not exists pg_trgm with schema extensions;

create type public.student_status as enum ('active', 'inactive', 'archived');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  birth_date date,
  enrollment_date date not null default current_date,
  status public.student_status not null default 'active',
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint students_full_name_clean check (
    full_name = btrim(full_name)
    and char_length(full_name) between 2 and 160
  ),
  constraint students_preferred_name_clean check (
    preferred_name is null
    or (
      preferred_name = btrim(preferred_name)
      and char_length(preferred_name) between 1 and 80
    )
  ),
  constraint students_birth_date_not_future check (
    birth_date is null
    or birth_date <= current_date
  ),
  constraint students_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  ),
  constraint students_archive_consistency check (
    (
      status = 'archived'::public.student_status
      and archived_at is not null
    )
    or (
      status <> 'archived'::public.student_status
      and archived_at is null
    )
  )
);

comment on table public.students is
  'Student records for Casa Criativa. Guardians, classes and finance are modeled in future modules.';
comment on column public.students.full_name is
  'Legal/display name. Stored trimmed and never empty.';
comment on column public.students.preferred_name is
  'Optional short name used in the interface.';
comment on column public.students.status is
  'active, inactive or archived. Normal UI archives instead of deleting.';
comment on column public.students.notes is
  'Internal notes loaded only in student detail/edit flows.';
comment on column public.students.created_by is
  'Administrative user that created the record when available.';
comment on constraint students_archive_consistency on public.students is
  'Archived students must have archived_at; active and inactive students must not.';

create trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

create index students_status_full_name_idx
on public.students (status, full_name, id);

comment on index public.students_status_full_name_idx is
  'Supports paginated list queries filtered by status and ordered by student name.';

create index students_full_name_trgm_idx
on public.students
using gin (full_name extensions.gin_trgm_ops);

comment on index public.students_full_name_trgm_idx is
  'Supports responsive ILIKE name search without loading all students in the browser.';

alter table public.students enable row level security;

revoke all on table public.students from anon, authenticated;
grant select, insert, update on table public.students to authenticated;

create policy "students_select_owner"
on public.students
for select
to authenticated
using (public.current_user_is_owner());

create policy "students_insert_owner"
on public.students
for insert
to authenticated
with check (public.current_user_is_owner());

create policy "students_update_owner"
on public.students
for update
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

comment on policy "students_select_owner" on public.students is
  'Owners can read student records. Teacher and admin access is intentionally deferred.';
comment on policy "students_insert_owner" on public.students is
  'Owners can create student records.';
comment on policy "students_update_owner" on public.students is
  'Owners can edit, archive and restore student records through updates.';
