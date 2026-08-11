import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type {
  AgendaSession,
  AttendanceSaveRecord,
  ClassSessionStatus,
  SessionAttendanceRow,
} from '@/features/agenda/types/agendaTypes'
import { mapAgendaError } from '@/features/agenda/utils/agendaErrors'

const AGENDA_TIMEOUT_MS = 12_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listAgendaSessions(startDate: string, endDate: string): Promise<AgendaSession[]> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('list_agenda_sessions', {
      p_end_date: endDate,
      p_start_date: startDate,
    }),
    AGENDA_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapAgendaError(error)
  }

  return (data ?? []).map((row) => ({
    ...row,
    absent_count: Number(row.absent_count),
    excused_count: Number(row.excused_count),
    expected_students: Number(row.expected_students),
    present_count: Number(row.present_count),
    recorded_count: Number(row.recorded_count),
  })) as AgendaSession[]
}

export async function getSessionAttendance(sessionId: string): Promise<SessionAttendanceRow[]> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('get_session_attendance', { p_session_id: sessionId }),
    AGENDA_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapAgendaError(error)
  }

  return (data ?? []) as SessionAttendanceRow[]
}

export async function saveSessionAttendance(sessionId: string, records: AttendanceSaveRecord[]) {
  const supabase = getClient()
  const payload = { records, session_id: sessionId }

  const { data, error } = await withTimeout(
    supabase.rpc('save_session_attendance', { payload: payload as unknown as Json }),
    AGENDA_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapAgendaError(error)
  }

  return data
}

export async function updateSessionStatus(sessionId: string, status: Extract<ClassSessionStatus, 'cancelled' | 'planned'>, notes: string | null) {
  const supabase = getClient()
  const payload = { notes, session_id: sessionId, status }

  const { data, error } = await withTimeout(
    supabase.rpc('update_class_session_status', { payload: payload as unknown as Json }),
    AGENDA_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapAgendaError(error)
  }

  return data
}
