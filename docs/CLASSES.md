# Classes

Phase 5 turns `/turmas` into the operational classes module. It uses the existing Student 360 schema: `classes`, `class_schedules`, `enrollments`, `students` and `audit_events`.

## Scope

Implemented:

- paginated list with search, status filters and capacity filters;
- schedule display and editing with ISO weekdays (`1 = Monday`, `7 = Sunday`);
- class create/edit with recurring schedules;
- capacity and occupancy calculation;
- full-class detection;
- add active students to a class;
- prevent duplicate active enrollment for the same student and class;
- transfer a student from one class to another atomically;
- end an enrollment without deleting history;
- class audit history;
- archive/restore class status, with archiving blocked while active enrollments exist;
- Student 360 cache invalidation and profile sync.

Not implemented in this phase: agenda, attendance, lesson sessions, finance and billing changes.

## Database

Migration:

- `20260811130000_classes_management_functions.sql`

No new table was created. The phase adds owner-secured functions:

- `list_classes(text, text, text, integer, integer)`
- `create_class_with_schedules(jsonb)`
- `update_class_with_schedules(jsonb)`
- `add_student_to_class(jsonb)`
- `end_class_enrollment(jsonb)`
- `transfer_student_class(jsonb)`
- `update_class_status(jsonb)`

The helper `assert_class_schedules_valid(jsonb)` validates same-class schedule payloads and is not granted to browser roles.

## Rules

- `capacity = null` means no class limit.
- `capacity > 0` means active enrollments cannot exceed the limit for add/transfer.
- Editing capacity below current occupancy is allowed, but the UI warns and the class remains full until seats are free.
- Duplicate active enrollment for the same student/class is blocked by the existing partial unique index.
- A student may have active enrollments in different classes.
- Transfer ends the source enrollment and creates the target enrollment in one RPC.
- Archive is blocked while the class has active enrollments.

## Frontend

Domain files live under `src/features/classes`:

- `api`: Supabase RPC/REST operations and payload normalization.
- `hooks`: TanStack Query keys, list/detail hooks and mutation invalidation.
- `schemas`: Zod validation for class and enrollment action forms.
- `types`: database-backed class, schedule, enrollment and audit types.
- `utils`: schedule formatting, capacity calculation and error mapping.
- `components`: filters, list, form, create drawer, detail drawer and student action forms.
- `pages`: route orchestration for `/turmas` and `/turmas/:classId`.

`/turmas` uses one list RPC for cold load. Opening a class loads only that class detail and recent class audit events. Row hover/focus prefetches class detail.

## Verification

- Anonymous REST/RPC access to classes surfaces is blocked with `401` / PostgreSQL `42501`.
- Remote owner-simulated rollback transaction validated create, list, add student, transfer, end enrollment, update schedules, archive/restore, schedule overlap rejection and transfer rollback to a full class.
- The asserted rollback left `0` residual `ZZZ VALIDACAO TURMAS%` rows.
- Unit/component tests cover schedule utilities, capacity utilities, form validation, payload mapping, filters and list rendering.
- Playwright covers login, class creation, add student, transfer, Student 360 sync, end enrollment and archive/restore.
