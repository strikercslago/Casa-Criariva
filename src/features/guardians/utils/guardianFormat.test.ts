import { describe, expect, it } from 'vitest'
import {
  getGuardianRoleLabels,
  normalizePhoneDigits,
  normalizePhoneForWhatsApp,
} from '@/features/guardians/utils/guardianFormat'

describe('guardian format helpers', () => {
  it('normalizes phone digits without changing the stored value', () => {
    expect(normalizePhoneDigits('(54) 99999-9999')).toBe('54999999999')
    expect(normalizePhoneForWhatsApp('(54) 99999-9999')).toBe('5554999999999')
  })

  it('keeps relationship flags separate from guardian contact data', () => {
    expect(
      getGuardianRoleLabels({
        can_pick_up: true,
        is_emergency_contact: false,
        is_financial_responsible: true,
        is_primary_contact: true,
      }),
    ).toEqual(['Principal', 'Financeiro', 'Retirada autorizada'])
  })
})
