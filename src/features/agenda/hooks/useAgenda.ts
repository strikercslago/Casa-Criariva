import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSessionAttendance,
  listAgendaSessions,
  saveSessionAttendance,
  updateSessionStatus,
} from '@/features/agenda/api/agendaApi'
import { agendaKeys } from '@/features/agenda/hooks/agendaKeys'
import type { AttendanceSaveRecord } from '@/features/agenda/types/agendaTypes'
import { student360Keys } from '@/features/students/hooks/student360Keys'

const AGENDA_STALE_TIME_MS = 60_000

export function useAgendaSessions(filters: { endDate: string; startDate: string }) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listAgendaSessions(filters.startDate, filters.endDate),
    queryKey: agendaKeys.sessions.list(filters),
    staleTime: AGENDA_STALE_TIME_MS,
  })
}

export function useSessionAttendance(sessionId: string | null) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryFn: () => getSessionAttendance(sessionId ?? ''),
    queryKey: agendaKeys.attendance.detail(sessionId ?? 'none'),
    staleTime: AGENDA_STALE_TIME_MS,
  })
}

export function useSaveSessionAttendance(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (records: AttendanceSaveRecord[]) => saveSessionAttendance(sessionId, records),
    onSuccess: (_sessionId, records) => {
      invalidateSession(queryClient, sessionId)
      records.forEach((record) => {
        void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(record.student_id) })
      })
    },
  })
}

export function useUpdateSessionStatus(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ notes, status }: { notes: string | null; status: 'cancelled' | 'planned' }) =>
      updateSessionStatus(sessionId, status, notes),
    onSuccess: () => invalidateSession(queryClient, sessionId),
  })
}

function invalidateSession(queryClient: ReturnType<typeof useQueryClient>, sessionId: string) {
  void queryClient.invalidateQueries({ queryKey: agendaKeys.sessions.lists() })
  void queryClient.invalidateQueries({ queryKey: agendaKeys.attendance.detail(sessionId) })
}
