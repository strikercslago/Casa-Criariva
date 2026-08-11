import type { ClassListItem } from '@/features/classes/types/classTypes'

export function getAvailableSpots(capacity: number | null, activeEnrollments: number) {
  return capacity === null ? null : Math.max(capacity - activeEnrollments, 0)
}

export function isClassFull(capacity: number | null, activeEnrollments: number) {
  return capacity !== null && activeEnrollments >= capacity
}

export function formatCapacity(classItem: Pick<ClassListItem, 'active_enrollments' | 'capacity'>) {
  return classItem.capacity === null
    ? `${classItem.active_enrollments} alunos`
    : `${classItem.active_enrollments} de ${classItem.capacity} alunos`
}

export function formatAvailableSpots(capacity: number | null, activeEnrollments: number) {
  const available = getAvailableSpots(capacity, activeEnrollments)

  if (available === null) {
    return 'Sem limite definido'
  }

  return `${available} vaga${available === 1 ? '' : 's'} disponivel${available === 1 ? '' : 'is'}`
}
