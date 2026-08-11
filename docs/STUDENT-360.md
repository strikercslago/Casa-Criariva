# Student 360

Student 360 is the complete student profile introduced in Phase 3.5. It extends the existing students module without changing the list query into a joined or heavy view.

## Enrollment Flow

The wide wizard has five steps:

1. `Aluno`
2. `Responsaveis`
3. `Turma`
4. `Mensalidade`
5. `Revisar`

Minimum required data is student name and enrollment date. Responsible parties, class and billing are optional. The review step shows fallback warnings when optional areas are missing.

The wizard keeps all data local until completion. The only persistence action is the `complete_student_enrollment` RPC, so a failure rolls back the full enrollment.

## Profile Tabs

The detail drawer renders `Student360Profile` with:

- `Visao geral`
- `Responsaveis`
- `Matriculas`
- `Frequencia`
- `Financeiro`
- `Historico`

Students created before Phase 3.5 can have no related rows. Those tabs render empty-state messages instead of failing or hiding the profile.

## Data Boundaries

`students` remains narrow and owns only student identity/status fields. Related data is normalized:

- `guardians` and `student_guardians` for responsible parties;
- `classes`, `class_schedules` and `enrollments` for class placement;
- `student_billing_plans` for monthly billing setup;
- `audit_events` for the administrative timeline.

The list page does not join these tables. Related data is queried only when the student profile or wizard needs it.

## Verification

- TypeScript, lint, unit tests, production build and Playwright E2E passed after the implementation.
- Remote migration `20260810235000_student_360_foundation.sql` is applied.
- RLS is enabled on all new tables.
- Anonymous REST access is blocked.
- Forced RPC failure leaves zero residual student, guardian, class, enrollment, billing or audit rows.

## Guardians Module Consistency

Phase 4 edits `guardians` and `student_guardians` directly through owner-secured RPCs. Student 360 reads those same tables, so changes made in `/responsaveis` appear in the student profile after TanStack Query invalidation.

Student history labels include guardian events created by Phase 4:

- `guardian.linked_to_student`
- `guardian.relationship_updated`
- `guardian.unlinked_from_student`

## Classes Module Consistency

Phase 5 edits `classes`, `class_schedules` and `enrollments` through owner-secured RPCs. Student 360 reads the same `enrollments` table, so adding, transferring or ending a class enrollment in `/turmas` appears in the student's `Matriculas` tab after TanStack Query invalidation.

Student history labels include class enrollment events created by Phase 5:

- `enrollment.created`
- `enrollment.ended`
- `enrollment.transferred`

## Attendance Consistency

Phase 6 adds a `Frequencia` tab to Student 360. It reads `attendance_records` joined to `class_sessions` and `classes`, showing the student's attendance history and presence rate.

Attendance changes from `/agenda` invalidate the affected Student 360 relation cache, so the student profile reflects saved attendance without a browser reload.

## Billing Consistency

Phase 7 expands the `Financeiro` tab. The initial Student 360 relation load still includes billing plans for the overview, but generated monthly fees and payment history are loaded through `get_student_billing_snapshot` only when the Financeiro tab is opened.

The tab shows:

- active billing plan summary;
- current-month monthly fee status when generated;
- paid amount and remaining balance;
- latest generated monthly fees, paged;
- `Ver todas` navigation to `/mensalidades`;
- `Registrar pagamento` for the current fee when it has balance.

Payment changes from `/mensalidades` invalidate the affected Student 360 billing snapshot and relation cache, so the Financeiro tab reflects confirmed database state without a browser reload.
