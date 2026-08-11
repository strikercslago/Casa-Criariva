# Agenda And Attendance

Phase 6 adds the operational Agenda and Attendance foundation. It does not record attendance on recurring schedules or enrollments directly.

## Domain Model

- `class_schedules`: recurring weekday/time rule.
- `class_sessions`: concrete class occurrence on a real date, with copied start/end time for immutable history.
- `attendance_records`: one attendance decision for one student in one session.

## Database

Migrations:

- `20260811150000_agenda_attendance_foundation.sql`
- `20260811153000_fix_attendance_expected_enrollments.sql`

Created:

- Enum `class_session_status`: `planned`, `completed`, `cancelled`.
- Enum `attendance_status`: `present`, `absent`, `excused`.
- Table `class_sessions`.
- Table `attendance_records`.

Important constraints:

- Recurring sessions are unique by `(class_id, schedule_id, session_date)` when `schedule_id` is present.
- Extra/manual sessions are unique by `(class_id, session_date, start_time, end_time)` when `schedule_id` is null.
- Attendance is unique by `(session_id, student_id)`.

## Materialization

`ensure_class_sessions(start_date, end_date)` creates recurring sessions only inside the requested window. The function is idempotent and caps the window at 63 days.

`list_agenda_sessions(start_date, end_date)` calls `ensure_class_sessions` and returns the agenda with expected student count and attendance totals.

## Expected Students

Expected students are derived from enrollment dates:

- `enrollment.start_date <= session_date`
- `enrollment.end_date is null or enrollment.end_date >= session_date`
- `enrollment.status in ('active', 'ended')`

This preserves transfer history and avoids marking students absent before they joined a class.

## Attendance

Pending attendance means no row exists yet. The system does not auto-create absences. `save_session_attendance` saves the provided rows in one transaction and refuses cancelled sessions.

Audit is consolidated at session level:

- `session.created`
- `session.cancelled`
- `session.restored`
- `attendance.recorded`
- `attendance.updated`

## Frontend

`/agenda` opens on today, supports day/week navigation, lists classes by time, opens a session drawer, marks present/absent/excused, marks all present and saves in one RPC. Student 360 includes a `Frequencia` tab with history and presence rate.
