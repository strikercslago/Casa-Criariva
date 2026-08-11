import type { ClassListFilters } from '@/features/classes/types/classTypes'

export const classesKeys = {
  all: ['classes'] as const,
  details: () => [...classesKeys.all, 'detail'] as const,
  detail: (id: string) => [...classesKeys.details(), id] as const,
  lists: () => [...classesKeys.all, 'list'] as const,
  list: (filters: ClassListFilters) => [...classesKeys.lists(), filters] as const,
  students: (id: string) => [...classesKeys.detail(id), 'students'] as const,
  schedules: (id: string) => [...classesKeys.detail(id), 'schedules'] as const,
  searchStudents: (search: string) => [...classesKeys.all, 'student-search', search] as const,
}
