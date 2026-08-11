export const agendaKeys = {
  all: ['agenda'] as const,
  attendance: {
    detail: (sessionId: string) => [...agendaKeys.all, 'attendance', sessionId] as const,
  },
  sessions: {
    list: (filters: { endDate: string; startDate: string }) => [...agendaKeys.all, 'sessions', filters] as const,
    lists: () => [...agendaKeys.all, 'sessions'] as const,
  },
}
