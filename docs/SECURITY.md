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
- Local and remote Supabase Auth config keep global signup disabled. The email/password provider is enabled so existing dashboard-created users can sign in.
- A fake public signup attempt returned blocked and did not create a user.
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

`user_roles` policies avoid RLS recursion by using small `SECURITY DEFINER` helper functions with explicit `search_path`. `has_role()` is owned by `postgres` and sets `row_security = off` internally so it can check role membership without recursively invoking `user_roles` policies.

## Manual Bootstrap Boundary

No owner is created automatically. The first owner was assigned only after an administrative user existed in Supabase Auth.

## RLS Verification

- Anonymous API reads of `profiles` and `user_roles`: blocked with `401` / `42501`.
- `has_role(created_user, owner)`: returned `true`.
- Simulated authenticated owner query could read owner-visible profiles.

## Students Security

- `public.students` has RLS enabled.
- Anonymous REST reads of `students` are blocked: `401`.
- Owner policies are limited to `SELECT`, `INSERT` and `UPDATE`.
- Archiving and restoring are normal updates; physical delete is not granted to the frontend role.
- Teacher access is not granted in Phase 3.
- Admin access is deferred until a real admin workflow exists.
- Owner RLS uses `current_user_is_owner()`, which delegates to the existing `has_role()` helper with recursion protection.
- A rollback-only owner simulation inserted and archived a temporary student through RLS successfully, then left `0` residual rows.

Students policies:

- `students_select_owner`: owners can read students.
- `students_insert_owner`: owners can create students.
- `students_update_owner`: owners can edit, archive and restore students.

Frontend safety:

- Student API functions never use service role keys.
- `.env.local` remains ignored.
- Development auth/network diagnostics log status, path and duration only; they do not log passwords, tokens, API keys, request bodies or emails.

## Student 360 Security

- New private tables have RLS enabled: `guardians`, `student_guardians`, `classes`, `class_schedules`, `enrollments`, `student_billing_plans` and `audit_events`.
- Direct anonymous REST reads of the new tables are blocked with `401` / PostgreSQL `42501`.
- Policies are owner-only for authenticated users. `audit_events` grants only `SELECT` directly to authenticated users.
- The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; no service role is used in the browser.
- `complete_student_enrollment(payload jsonb)` is `SECURITY DEFINER` with fixed `search_path`, owner validation, no dynamic SQL and no exposed audit insert grant.
- A forced invalid schedule inside the RPC failed on `class_schedules_time_order`; follow-up counts for student, guardian, class, enrollment, billing plan and audit event were all `0`, confirming atomic rollback.

## Guardians Security

- Phase 4 does not expose service role, database password, secret keys or access tokens.
- `.env.local` remains ignored and contains only browser-safe Supabase configuration.
- Existing RLS remains enabled on `guardians`, `student_guardians`, `students` and `audit_events`.
- Anonymous REST access to `guardians` is blocked with `401` / PostgreSQL `42501`.
- New guardian RPCs validate `auth.uid()` and `current_user_is_owner()`, use fixed `search_path = public` and no dynamic SQL.
- `audit_events` still has no direct frontend insert grant; guardian actions write audit events through the secured RPCs.
- Owner simulation validated create, edit, link, relationship update, unlink and phone search inside a rollback transaction with `0` residual rows.

## Classes Security

- Phase 5 does not expose service role, database password, secret keys or access tokens.
- Existing RLS remains enabled on `classes`, `class_schedules`, `enrollments`, `students` and `audit_events`.
- Anonymous REST access to `classes`, `class_schedules` and `enrollments` is blocked with `401` / PostgreSQL `42501`.
- Anonymous RPC access to `list_classes` is blocked with `401` / PostgreSQL `42501`.
- Class RPCs validate `auth.uid()` and `current_user_is_owner()`, use fixed `search_path = public` and no dynamic SQL.
- `audit_events` still has no direct frontend insert grant; class/enrollment actions write audit events through secured RPCs.
- Owner simulation validated create, list, add student, transfer, end enrollment, schedule update, archive/restore, overlap rejection and transfer rollback to a full class inside a rollback transaction with `0` residual class rows.

## Agenda And Attendance Security

- `class_sessions` and `attendance_records` have RLS enabled.
- Anonymous REST access to both tables is blocked with `401` / PostgreSQL `42501`.
- Anonymous RPC access to `list_agenda_sessions` and `save_session_attendance` is blocked with `401` / PostgreSQL `42501`.
- Agenda/attendance RPCs validate `auth.uid()` and `current_user_is_owner()`, use fixed `search_path = public` and no dynamic SQL.
- `save_session_attendance` records one consolidated audit event instead of one audit row per student.
- Owner simulation validated idempotent session materialization, expected students by enrollment dates, batch attendance save, cancelled-session rejection and rollback with `0` residual rows.

## Billing And Payments Security

- `monthly_fees`, `payments` and `payment_allocations` have RLS enabled.
- Anonymous REST access to all three tables is blocked with `401` / PostgreSQL `42501`.
- Anonymous RPC access to `list_monthly_fees`, `ensure_monthly_fees` and `register_payment` is blocked with `401` / PostgreSQL `42501`.
- Billing write RPCs validate `auth.uid()` and `current_user_is_owner()`, use fixed `search_path = public` and no dynamic SQL.
- Read RPCs are `SECURITY DEFINER` only so the internal projection `monthly_fee_financial_rows` can remain private; they still validate owner access.
- `register_payment` locks the monthly fee row and recalculates received amount in the database before accepting money, preventing stale frontend balances and concurrent overpayment.
- Payments are not deleted by the application. Corrections use `reverse_payment` with a required reason, preserving `payments` and `payment_allocations`.
- `cancel_monthly_fee` refuses cancellation while received payments remain active.
- Owner rollback simulation validated idempotent generation, due-date clamping, snapshot amounts, partial payment, full payment, overpayment rejection, reversal, preserved payment history, cancel-with-active-payment rejection and rollback with `0` residual rows.
