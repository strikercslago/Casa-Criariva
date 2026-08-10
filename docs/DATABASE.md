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
| TBD | TBD | TBD | TBD |
