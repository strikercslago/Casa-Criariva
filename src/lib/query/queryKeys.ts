export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
    profile: (userId: string) => ['profile', userId] as const,
    roles: (userId: string) => ['roles', userId] as const,
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
