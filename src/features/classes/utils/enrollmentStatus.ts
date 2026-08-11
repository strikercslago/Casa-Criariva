import type { EnrollmentStatus } from '@/features/classes/types/classTypes'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  active: 'Ativa',
  ended: 'Encerrada',
  paused: 'Pausada',
}

const enrollmentStatusTones: Record<EnrollmentStatus, BadgeTone> = {
  active: 'success',
  ended: 'neutral',
  paused: 'warning',
}

export function getEnrollmentStatusLabel(status: EnrollmentStatus) {
  return enrollmentStatusLabels[status]
}

export function getEnrollmentStatusTone(status: EnrollmentStatus) {
  return enrollmentStatusTones[status]
}
