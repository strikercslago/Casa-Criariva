import { describe, expect, it } from 'vitest'
import { attendanceStateLabels, calculateAttendanceRate, getSessionCompletionLabel } from './agendaFormat'

describe('agendaFormat', () => {
  it('distinguishes pending attendance from absences', () => {
    expect(attendanceStateLabels.pending).toBe('Frequencia pendente')
    expect(getSessionCompletionLabel(6, 0)).toBe('0 de 6 alunos registrados')
  })

  it('calculates attendance rate only from recorded rows', () => {
    expect(
      calculateAttendanceRate([
        { attendance_status: 'present' },
        { attendance_status: 'absent' },
        { attendance_status: 'excused' },
        { attendance_status: null },
      ]),
    ).toBe(33)
    expect(calculateAttendanceRate([{ attendance_status: null }])).toBeNull()
  })
})
