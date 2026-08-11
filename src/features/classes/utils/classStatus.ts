import type { ClassStatus } from '@/features/classes/types/classTypes'

const classStatusLabels: Record<ClassStatus, string> = {
  active: 'Ativa',
  archived: 'Arquivada',
  inactive: 'Inativa',
}

export function getClassStatusLabel(status: ClassStatus) {
  return classStatusLabels[status]
}
