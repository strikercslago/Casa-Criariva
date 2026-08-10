import type { StudentStatus, StudentStatusFilter } from '@/features/students/types/studentTypes'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

export const studentStatusOptions: Array<{ label: string; value: StudentStatusFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'active' },
  { label: 'Inativos', value: 'inactive' },
  { label: 'Arquivados', value: 'archived' },
]

export const editableStudentStatusOptions: Array<{ label: string; value: StudentStatus }> = [
  { label: 'Ativo', value: 'active' },
  { label: 'Inativo', value: 'inactive' },
]

const statusLabels: Record<StudentStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  archived: 'Arquivado',
}

const statusTones: Record<StudentStatus, BadgeTone> = {
  active: 'success',
  inactive: 'warning',
  archived: 'neutral',
}

export function getStudentStatusLabel(status: StudentStatus) {
  return statusLabels[status]
}

export function getStudentStatusTone(status: StudentStatus) {
  return statusTones[status]
}

export function getRestoreStatus(): StudentStatus {
  return 'active'
}
