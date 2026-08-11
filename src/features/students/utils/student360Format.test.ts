import { describe, expect, it } from 'vitest'
import {
  getBillingPlanStatusLabel,
  getBillingPlanStatusTone,
} from '@/features/students/utils/student360Format'

describe('student360Format', () => {
  it('formats billing plan statuses for operational users', () => {
    expect(getBillingPlanStatusLabel('active')).toBe('Ativo')
    expect(getBillingPlanStatusLabel('paused')).toBe('Pausado')
    expect(getBillingPlanStatusLabel('ended')).toBe('Encerrado')
  })

  it('maps billing plan statuses to badge tones', () => {
    expect(getBillingPlanStatusTone('active')).toBe('success')
    expect(getBillingPlanStatusTone('paused')).toBe('warning')
    expect(getBillingPlanStatusTone('ended')).toBe('neutral')
  })
})
