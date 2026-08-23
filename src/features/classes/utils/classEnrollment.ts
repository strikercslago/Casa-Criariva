import type { EnrollmentWithStudent } from '@/features/classes/types/classTypes'

export function isCurrentClassEnrollment(enrollment: Pick<EnrollmentWithStudent, 'end_date' | 'start_date' | 'status'>, todayIso: string) {
  if (enrollment.status === 'paused') {
    return false
  }

  if (enrollment.status === 'ended' && (!enrollment.end_date || enrollment.end_date <= todayIso)) {
    return false
  }

  return enrollment.start_date <= todayIso && (!enrollment.end_date || enrollment.end_date >= todayIso)
}

export function splitClassEnrollments(enrollments: EnrollmentWithStudent[], todayIso: string) {
  return enrollments.reduce(
    (groups, enrollment) => {
      if (isCurrentClassEnrollment(enrollment, todayIso)) {
        groups.current.push(enrollment)
      } else {
        groups.history.push(enrollment)
      }

      return groups
    },
    { current: [] as EnrollmentWithStudent[], history: [] as EnrollmentWithStudent[] },
  )
}

export function sortCurrentClassEnrollments(enrollments: EnrollmentWithStudent[]) {
  return enrollments.slice().sort((first, second) => {
    const firstName = first.student?.full_name ?? ''
    const secondName = second.student?.full_name ?? ''

    return firstName.localeCompare(secondName) || first.start_date.localeCompare(second.start_date)
  })
}

export function sortClassEnrollmentHistory(enrollments: EnrollmentWithStudent[]) {
  return enrollments.slice().sort((first, second) => {
    const endOrder = (second.end_date ?? '').localeCompare(first.end_date ?? '')

    if (endOrder !== 0) {
      return endOrder
    }

    return second.start_date.localeCompare(first.start_date)
  })
}
