alter function public.has_role(uuid, public.app_role) owner to postgres;
alter function public.current_user_is_owner() owner to postgres;

comment on function public.has_role(uuid, public.app_role) is
  'SECURITY DEFINER helper owned by postgres to avoid recursive RLS checks on user_roles.';
comment on function public.current_user_is_owner() is
  'Owner authorization helper backed by has_role(auth.uid(), owner).';
