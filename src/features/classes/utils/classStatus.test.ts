import { describe, expect, it } from 'vitest'
import { getClassStatusLabel } from '@/features/classes/utils/classStatus'

describe('classStatus', () => {
  it('formats class statuses for operational users', () => {
    expect(getClassStatusLabel('active')).toBe('Ativa')
    expect(getClassStatusLabel('inactive')).toBe('Inativa')
    expect(getClassStatusLabel('archived')).toBe('Arquivada')
  })
})
