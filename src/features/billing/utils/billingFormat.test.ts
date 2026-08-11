import { describe, expect, it } from 'vitest'
import { getMonthlyFeeStatusLabel, getMonthlyFeeStatusTone, getOverdueLabel } from './billingFormat'

describe('billingFormat', () => {
  it('shows partial overdue fees as overdue with partial indication', () => {
    const fee = { computed_status: 'overdue', is_partial: true }

    expect(getMonthlyFeeStatusLabel(fee)).toBe('Vencida - Parcial')
    expect(getMonthlyFeeStatusTone(fee)).toBe('danger')
  })

  it('formats overdue day labels without relying only on color', () => {
    expect(getOverdueLabel(1)).toBe('Vencida ha 1 dia')
    expect(getOverdueLabel(8)).toBe('Vencida ha 8 dias')
    expect(getOverdueLabel(0)).toBeNull()
  })
})
