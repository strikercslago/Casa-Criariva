import type { GuardianListFilters } from '@/features/guardians/types/guardianTypes'

export const guardiansKeys = {
  all: ['guardians'] as const,
  details: () => [...guardiansKeys.all, 'detail'] as const,
  detail: (id: string) => [...guardiansKeys.details(), id] as const,
  lists: () => [...guardiansKeys.all, 'list'] as const,
  list: (filters: GuardianListFilters) => [...guardiansKeys.lists(), filters] as const,
  students: {
    search: (search: string) => [...guardiansKeys.all, 'students', 'search', search] as const,
  },
  duplicates: (phone: string | null, email: string | null) =>
    [...guardiansKeys.all, 'duplicates', { email, phone }] as const,
}
