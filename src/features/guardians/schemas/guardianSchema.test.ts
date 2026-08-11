import { describe, expect, it } from 'vitest'
import {
  createGuardianSchema,
  getCreateGuardianDefaults,
  guardianContactSchema,
} from '@/features/guardians/schemas/guardianSchema'

describe('guardian schemas', () => {
  it('allows optional phone and email for standalone guardians', () => {
    const result = guardianContactSchema.safeParse({
      email: '',
      full_name: 'Maria da Silva',
      notes: '',
      phone: '',
    })

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ email: null, notes: null, phone: null })
  })

  it('requires a selected student only when linking now', () => {
    const standalone = getCreateGuardianDefaults()
    standalone.full_name = 'Maria da Silva'

    expect(createGuardianSchema.safeParse(standalone).success).toBe(true)

    const linked = { ...standalone, link_now: true }
    expect(createGuardianSchema.safeParse(linked).success).toBe(false)
  })
})
