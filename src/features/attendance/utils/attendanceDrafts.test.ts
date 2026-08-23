import { describe, expect, it } from 'vitest'
import type { SessionAttendanceRow } from '@/features/agenda/types/agendaTypes'
import {
  createAttendanceDrafts,
  createAttendanceSnapshot,
  getAttendanceSummary,
  hasAttendanceChanges,
  markUnrecordedPresent,
  setAttendanceNotes,
  setAttendanceStatus,
  toAttendanceSaveRecords,
} from '@/features/attendance/utils/attendanceDrafts'

describe('attendanceDrafts', () => {
  it('creates drafts from saved attendance rows and keeps unrecorded students empty', () => {
    const drafts = createAttendanceDrafts([
      row({ attendance_status: 'present', student_id: 'student-1' }),
      row({ attendance_status: null, student_id: 'student-2' }),
    ])

    expect(drafts['student-1'].status).toBe('present')
    expect(drafts['student-2'].status).toBe('')
  })

  it('marks only unrecorded students as present', () => {
    const drafts = markUnrecordedPresent(
      createAttendanceDrafts([
        row({ attendance_status: 'absent', student_id: 'student-1' }),
        row({ attendance_status: 'excused', student_id: 'student-2' }),
        row({ attendance_status: null, student_id: 'student-3' }),
      ]),
    )

    expect(drafts['student-1'].status).toBe('absent')
    expect(drafts['student-2'].status).toBe('excused')
    expect(drafts['student-3'].status).toBe('present')
  })

  it('calculates counters including unrecorded students', () => {
    const summary = getAttendanceSummary(
      createAttendanceDrafts([
        row({ attendance_status: 'present', student_id: 'student-1' }),
        row({ attendance_status: 'absent', student_id: 'student-2' }),
        row({ attendance_status: 'excused', student_id: 'student-3' }),
        row({ attendance_status: null, student_id: 'student-4' }),
      ]),
    )

    expect(summary).toEqual({
      absent: 1,
      excused: 1,
      present: 1,
      recorded: 3,
      total: 4,
      unrecorded: 1,
    })
  })

  it('builds save records only for students with a selected status', () => {
    const drafts = createAttendanceDrafts([
      row({ attendance_notes: '  ok  ', attendance_status: 'present', student_id: 'student-1' }),
      row({ attendance_status: null, student_id: 'student-2' }),
    ])

    expect(toAttendanceSaveRecords(drafts)).toEqual([
      { notes: 'ok', status: 'present', student_id: 'student-1' },
    ])
  })

  it('detects unsaved status and note changes', () => {
    const drafts = createAttendanceDrafts([row({ attendance_status: null, student_id: 'student-1' })])
    const snapshot = createAttendanceSnapshot(drafts)
    const withStatus = setAttendanceStatus(drafts, 'student-1', 'present')
    const withNotes = setAttendanceNotes(drafts, 'student-1', 'Chegou mais tarde')

    expect(hasAttendanceChanges(drafts, snapshot)).toBe(false)
    expect(hasAttendanceChanges(withStatus, snapshot)).toBe(true)
    expect(hasAttendanceChanges(withNotes, snapshot)).toBe(true)
  })
})

function row(
  overrides: Partial<SessionAttendanceRow> & Pick<SessionAttendanceRow, 'student_id'>,
): SessionAttendanceRow {
  return {
    attendance_id: overrides.attendance_status ? `attendance-${overrides.student_id}` : null,
    attendance_notes: null,
    attendance_status: null,
    class_id: 'class-1',
    class_name: 'Artes',
    enrollment_id: `enrollment-${overrides.student_id}`,
    end_time: '15:30:00',
    preferred_name: null,
    recorded_at: null,
    recorded_by: null,
    session_date: '2026-08-23',
    session_id: 'session-1',
    session_notes: null,
    session_status: 'planned',
    start_time: '14:00:00',
    student_name: 'Aluno',
    student_photo_path: null,
    ...overrides,
  }
}
