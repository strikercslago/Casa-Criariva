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

Student photo upload is optional and intentionally runs after the enrollment RPC succeeds. The frontend validates JPEG, PNG or WebP, optimizes the selected image in the browser to a 512x512 WebP, uploads it to the private `student-photos` Storage bucket and then updates `students.photo_path`. If this post-enrollment upload fails, the student remains enrolled and the UI tells the user the photo can be added later.

Only the object path is stored in `students.photo_path`; image bytes, base64 and signed URLs are never saved in relational tables.

## Profile Tabs

The detail drawer renders `Student360Profile` with:

- `Visao geral`
- `Responsaveis`
- `Matriculas`
- `Frequencia`
- `Financeiro`
- `Historico`

Students created before Phase 3.5 can have no related rows. Those tabs render empty-state messages instead of failing or hiding the profile.

The profile header shows the student photo when `photo_path` is present and falls back to initials when it is absent or unavailable. Owner/admin users can add, replace and remove a photo through the profile. Replacing uploads the new object before updating the row; the previous object is removed in best effort after the row points to the new path. Removing clears `photo_path` first and then attempts physical cleanup without breaking the profile if Storage cleanup fails.

## Data Boundaries

`students` remains narrow and owns only student identity/status fields. Related data is normalized:

- `guardians` and `student_guardians` for responsible parties;
- `classes`, `class_schedules` and `enrollments` for class placement;
- `student_billing_plans` for monthly billing setup;
- `audit_events` for the administrative timeline.

The list page does not join these tables. Related data is queried only when the student profile or wizard needs it.

Student photos keep the same boundary: list, class detail, attendance and Student 360 read only the lightweight `photo_path` and request temporary signed URLs per path through TanStack Query. Finance, reports, inventory and billing views do not load student photos.

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

## Events Consistency

Phase 9 stores existing-student event participation in `event_registrations.student_id`. The events module is the operational surface for now; Student 360 keeps its existing tabs unchanged in this phase.

The database model is ready for a future detail-only Student 360 section that lists a student's confirmed, waitlisted and cancelled event registrations without changing the students list query.
