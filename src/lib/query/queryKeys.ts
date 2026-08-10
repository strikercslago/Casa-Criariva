export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
  },
  students: {
    lists: () => ['students'] as const,
    list: (filters: { search?: string; page?: number }) => ['students', filters] as const,
    detail: (id: string) => ['student', id] as const,
  },
}
