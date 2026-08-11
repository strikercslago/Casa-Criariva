export const settingsKeys = {
  all: ['settings'] as const,
  application: () => [...settingsKeys.all, 'application'] as const,
  users: () => [...settingsKeys.all, 'users'] as const,
  audit: (filters: { action?: string; entityType?: string; page?: number }) =>
    [...settingsKeys.all, 'audit', filters] as const,
}
