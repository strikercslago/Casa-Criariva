# Database

Supabase will own PostgreSQL, Auth, Storage and RLS. No remote database changes were made in this phase.

## Initial Model

The first schema should be small and added by domain. Planned entities:

- `profiles`
- `user_roles`
- `students`
- `guardians`
- `student_guardians`
- `classes`
- `class_students`
- `class_sessions`
- `attendance`
- `monthly_fees`
- `payments`
- `financial_categories`
- `financial_transactions`
- `events`
- `event_enrollments`
- `materials`
- `material_movements`
- `ideas`

## Rules

- Every private table must enable RLS.
- Primary keys, foreign keys, `not null`, `unique`, `check`, defaults and timestamps must be explicit.
- Indexes must be tied to real queries, joins, ordering, RLS predicates or foreign keys.
- List views should select only columns used by the list.
- Detail views should load full records only when the user opens them.
- Financial values must use decimal/numeric database types, never frontend float arithmetic as source of truth.
- Pure dates and timestamps must be modeled separately.

## Index Documentation Template

| Table | Columns | Benefited query | Justification |
| --- | --- | --- | --- |
| `profiles` | `id` primary key | `select ... from profiles where id = auth.uid()` | Supports own-profile reads and FK to `auth.users`. |
| `user_roles` | `(user_id, role)` primary key | `has_role(auth.uid(), 'owner')` and `select role from user_roles where user_id = auth.uid()` | Prevents duplicate roles and supports RLS role checks without an additional redundant `user_id` index. |

## Applied Auth Foundation

Migrations:

- `20260810192204_auth_foundation.sql`
- `20260810205929_fix_rls_function_owners.sql`
- `20260810210313_fix_has_role_row_security.sql`

Created:

- Enum `public.app_role`: `owner`, `admin`, `teacher`.
- Table `public.profiles`.
- Table `public.user_roles`.
- Function `public.set_updated_at()`.
- Function `public.handle_new_auth_user()`.
- Function `public.has_role(uuid, public.app_role)`.
- Function `public.current_user_is_owner()`.
- Trigger `profiles_set_updated_at`.
- Trigger `on_auth_user_created_create_profile`.

No student, guardian, class, billing, finance, event, material or idea tables were created in this phase.

## Bootstrap Owner

The first owner was assigned after the admin Auth user was manually created:

- `public.profiles` contains the created user profile.
- `public.user_roles` contains one `owner` row for the created admin user.
- No owner assignment exists in a migration.
