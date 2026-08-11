import type { AgendaAttendanceState, AttendanceStatus, SessionAttendanceRow } from '@/features/agenda/types/agendaTypes'

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  absent: 'Faltou',
  excused: 'Falta justificada',
  present: 'Presente',
}

export const attendanceStateLabels: Record<AgendaAttendanceState, string> = {
  cancelled: 'Cancelada',
  no_students: 'Sem alunos esperados',
  pending: 'Frequencia pendente',
  recorded: 'Frequencia registrada',
}

export function calculateAttendanceRate(records: Array<Pick<SessionAttendanceRow, 'attendance_status'>>) {
  const recorded = records.filter((record) => record.attendance_status)

  if (recorded.length === 0) {
    return null
  }

  const present = recorded.filter((record) => record.attendance_status === 'present').length
  return Math.round((present / recorded.length) * 100)
}

export function getSessionCompletionLabel(expected: number, recorded: number) {
  if (expected === 0) {
    return 'Nenhum aluno esperado'
  }

  return `${recorded} de ${expected} aluno${expected === 1 ? '' : 's'} registrado${expected === 1 ? '' : 's'}`
}
