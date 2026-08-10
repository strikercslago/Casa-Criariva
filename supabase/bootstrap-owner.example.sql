-- Run this manually in Supabase SQL Editor only after creating the first admin user.
-- Replace the placeholder UUID with the auth.users.id of that user.
-- Do not commit real user identifiers in migrations.

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'owner')
on conflict (user_id, role) do nothing;
