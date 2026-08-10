create or replace function public.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = check_role
  );
$$;

alter function public.has_role(uuid, public.app_role) owner to postgres;

comment on function public.has_role(uuid, public.app_role) is
  'SECURITY DEFINER helper owned by postgres with row_security disabled internally to avoid recursive RLS checks on user_roles.';
