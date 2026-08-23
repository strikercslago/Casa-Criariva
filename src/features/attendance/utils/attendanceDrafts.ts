import type {
  AttendanceDraftRecord,
  AttendanceSaveRecord,
  AttendanceStatus,
  SessionAttendanceRow,
} from '@/features/agenda/types/agendaTypes'

export type AttendanceDrafts = Record<string, AttendanceDraftRecord>

export type AttendanceSummary = {
  absent: number
  excused: number
  present: number
  recorded: number
  total: number
  unrecorded: number
}

export function createAttendanceDrafts(rows: SessionAttendanceRow[]): AttendanceDrafts {
  return Object.fromEntries(
    rows.map((row) => [
      row.student_id,
      {
        notes: row.attendance_notes ?? '',
        status: row.attendance_status ?? '',
        studentId: row.student_id,
      },
    ]),
  )
}

export function createAttendanceSnapshot(drafts: AttendanceDrafts) {
  return JSON.stringify(
    Object.values(drafts)
      .slice()
      .sort((first, second) => first.studentId.localeCompare(second.studentId))
      .map((draft) => ({
        notes: draft.notes,
        status: draft.status,
        studentId: draft.studentId,
      })),
  )
}

export function getAttendanceSummary(drafts: AttendanceDrafts): AttendanceSummary {
  return Object.values(drafts).reduce<AttendanceSummary>(
    (summary, draft) => {
      summary.total += 1

      if (!draft.status) {
        summary.unrecorded += 1
        return summary
      }

      summary.recorded += 1
      summary[draft.status] += 1
      return summary
    },
    {
      absent: 0,
      excused: 0,
      present: 0,
      recorded: 0,
      total: 0,
      unrecorded: 0,
    },
  )
}

export function markUnrecordedPresent(drafts: AttendanceDrafts): AttendanceDrafts {
  return Object.fromEntries(
    Object.entries(drafts).map(([studentId, draft]) => [
      studentId,
      draft.status ? draft : { ...draft, status: 'present' },
    ]),
  )
}

export function setAttendanceStatus(
  drafts: AttendanceDrafts,
  studentId: string,
  status: AttendanceStatus,
): AttendanceDrafts {
  const draft = drafts[studentId]

  if (!draft) {
    return drafts
  }

  return {
    ...drafts,
    [studentId]: { ...draft, status },
  }
}

export function setAttendanceNotes(
  drafts: AttendanceDrafts,
  studentId: string,
  notes: string,
): AttendanceDrafts {
  const draft = drafts[studentId]

  if (!draft) {
    return drafts
  }

  return {
    ...drafts,
    [studentId]: { ...draft, notes },
  }
}

export function hasAttendanceChanges(drafts: AttendanceDrafts, snapshot: string) {
  return createAttendanceSnapshot(drafts) !== snapshot
}

export function toAttendanceSaveRecords(drafts: AttendanceDrafts): AttendanceSaveRecord[] {
  return Object.values(drafts)
    .filter((draft): draft is AttendanceDraftRecord & { status: AttendanceStatus } => Boolean(draft.status))
    .map((draft) => ({
      notes: draft.notes.trim() || null,
      status: draft.status,
      student_id: draft.studentId,
    }))
}
