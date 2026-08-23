import { describe, expect, it } from 'vitest'
import type { EnrollmentWithStudent } from '@/features/classes/types/classTypes'
import {
  isCurrentClassEnrollment,
  sortClassEnrollmentHistory,
  sortCurrentClassEnrollments,
  splitClassEnrollments,
} from '@/features/classes/utils/classEnrollment'

describe('classEnrollment', () => {
  const today = '2026-08-23'

  it('keeps active enrollments visible only when valid today', () => {
    expect(isCurrentClassEnrollment(enrollment({ status: 'active', start_date: '2026-08-01' }), today)).toBe(true)
    expect(isCurrentClassEnrollment(enrollment({ status: 'active', start_date: '2026-08-24' }), today)).toBe(false)
    expect(
      isCurrentClassEnrollment(enrollment({ end_date: '2026-08-22', status: 'active', start_date: '2026-08-01' }), today),
    ).toBe(false)
  })

  it('does not show immediately ended enrollments in the current list', () => {
    expect(
      isCurrentClassEnrollment(enrollment({ end_date: '2026-08-23', status: 'ended', start_date: '2026-08-01' }), today),
    ).toBe(false)
  })

  it('keeps scheduled future endings visible until they are no longer current', () => {
    expect(
      isCurrentClassEnrollment(enrollment({ end_date: '2026-08-30', status: 'ended', start_date: '2026-08-01' }), today),
    ).toBe(true)
  })

  it('splits current and historical enrollments', () => {
    const groups = splitClassEnrollments(
      [
        enrollment({ id: 'current', status: 'active', start_date: '2026-08-01' }),
        enrollment({ end_date: '2026-08-22', id: 'history', status: 'ended', start_date: '2026-08-01' }),
      ],
      today,
    )

    expect(groups.current.map((item) => item.id)).toEqual(['current'])
    expect(groups.history.map((item) => item.id)).toEqual(['history'])
  })

  it('sorts current enrollments by student name and history by most recent end date', () => {
    const current = sortCurrentClassEnrollments([
      enrollment({ id: 'bruno', studentName: 'Bruno Lima' }),
      enrollment({ id: 'ana', studentName: 'Ana Carolina' }),
    ])
    const history = sortClassEnrollmentHistory([
      enrollment({ end_date: '2026-07-10', id: 'old' }),
      enrollment({ end_date: '2026-08-10', id: 'recent' }),
    ])

    expect(current.map((item) => item.id)).toEqual(['ana', 'bruno'])
    expect(history.map((item) => item.id)).toEqual(['recent', 'old'])
  })
})

function enrollment(
  overrides: Partial<EnrollmentWithStudent> & { studentName?: string } = {},
): EnrollmentWithStudent {
  return {
    class_id: 'class-1',
    created_at: '2026-08-01T12:00:00Z',
    end_date: null,
    id: overrides.id ?? 'enrollment-1',
    start_date: '2026-08-01',
    status: 'active',
    student: {
      birth_date: '2018-01-01',
      enrollment_date: '2026-08-01',
      full_name: overrides.studentName ?? 'Aluno',
      id: overrides.student_id ?? 'student-1',
      photo_path: null,
      preferred_name: null,
      status: 'active',
    },
    student_id: overrides.student_id ?? 'student-1',
    updated_at: '2026-08-01T12:00:00Z',
    ...overrides,
  }
}
