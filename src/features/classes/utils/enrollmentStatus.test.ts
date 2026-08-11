import { describe, expect, it } from 'vitest'
import { getEnrollmentStatusLabel, getEnrollmentStatusTone } from '@/features/classes/utils/enrollmentStatus'

describe('enrollmentStatus', () => {
  it('formats enrollment statuses for operational users', () => {
    expect(getEnrollmentStatusLabel('active')).toBe('Ativa')
    expect(getEnrollmentStatusLabel('paused')).toBe('Pausada')
    expect(getEnrollmentStatusLabel('ended')).toBe('Encerrada')
  })

  it('maps enrollment statuses to badge tones', () => {
    expect(getEnrollmentStatusTone('active')).toBe('success')
    expect(getEnrollmentStatusTone('paused')).toBe('warning')
    expect(getEnrollmentStatusTone('ended')).toBe('neutral')
  })
})
