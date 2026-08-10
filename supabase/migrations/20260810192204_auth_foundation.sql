create type public.app_role as enum ('owner', 'admin', 'teacher');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 160),
  constraint profiles_avatar_url_length check (
    avatar_url is null
    or char_length(avatar_url) <= 2048
  )
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role)
);

comment on table public.profiles is 'Administrative profile for authenticated users.';
comment on table public.user_roles is 'Application roles used by Casa Criativa Gestao authorization.';
comment on constraint user_roles_pkey on public.user_roles is
  'Composite primary key prevents duplicate roles per user and supports has_role(user_id, role).';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create or replace function public.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = check_role
  );
$$;

create or replace function public.current_user_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role((select auth.uid()), 'owner'::public.app_role);
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.current_user_is_owner() to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_select_owner"
on public.profiles
for select
to authenticated
using (public.current_user_is_owner());

create policy "profiles_update_owner"
on public.profiles
for update
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_roles_select_owner"
on public.user_roles
for select
to authenticated
using (public.current_user_is_owner());

create policy "user_roles_insert_owner"
on public.user_roles
for insert
to authenticated
with check (public.current_user_is_owner());

create policy "user_roles_update_owner"
on public.user_roles
for update
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "user_roles_delete_owner"
on public.user_roles
for delete
to authenticated
using (public.current_user_is_owner());
