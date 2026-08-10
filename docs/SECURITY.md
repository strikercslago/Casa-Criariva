# Security

Security is enforced in the interface and in the database. Hiding a button is never considered authorization.

## Supabase

- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are allowed in the frontend.
- Service role, database passwords and administrative tokens must never enter client code.
- One browser Supabase client is created lazily in `src/lib/supabase/client.ts`.
- `.env.local` stays ignored by Git.

## Auth Strategy

`AuthProvider` is centralized. It performs the initial session lookup once, listens for Supabase auth changes and exposes status to the app. Route-level features must not call auth repeatedly just to know the current user.

Planned roles:

- `owner`
- `admin`
- `teacher`

## RLS Strategy

Policies should be small, auditable and supported by indexes. Complex per-row policy queries should be avoided unless no safer design exists.

## Logging

Future monitoring must not log passwords, tokens, keys or unnecessary sensitive data.

## Current Audit Notes

The local Node runtime is 18.20.8. React Router releases that fully clear the 2026 advisory currently require Node 20, so this foundation keeps React Router 6.30.4 and records the residual npm audit warning for upgrade planning.

## Auth Foundation

- `.env.local` is ignored by Git and contains only browser-safe Supabase values.
- No service role, database password, secret key or administrative token is used in frontend code.
- Public signup UI was not implemented.
- Local Supabase config sets signup disabled for local Auth.
- Remote `profiles` and `user_roles` reject anonymous reads: both returned `401` with PostgreSQL code `42501` in the unauthenticated RLS check.

## RLS Policies

`profiles`:

- `profiles_select_own`: authenticated users can read their own profile.
- `profiles_select_owner`: owners can read profiles.
- `profiles_update_owner`: owners can update profiles.

`user_roles`:

- `user_roles_select_own`: authenticated users can read their own roles.
- `user_roles_select_owner`: owners can read all roles.
- `user_roles_insert_owner`: owners can assign roles.
- `user_roles_update_owner`: owners can update roles.
- `user_roles_delete_owner`: owners can remove roles.

`user_roles` policies avoid RLS recursion by using small `SECURITY DEFINER` helper functions with explicit `search_path`.

## Manual Bootstrap Boundary

No owner is created automatically. The first owner must be assigned only after an administrative user exists in Supabase Auth.
