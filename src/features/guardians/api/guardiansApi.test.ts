import { describe, expect, it } from 'vitest'
import {
  toCreateGuardianPayload,
  toGuardianRelationshipPayload,
} from '@/features/guardians/api/guardiansApi'
import { getCreateGuardianDefaults } from '@/features/guardians/schemas/guardianSchema'

describe('guardians api payloads', () => {
  it('builds a standalone guardian payload without student relationship data', () => {
    const values = getCreateGuardianDefaults()
    values.full_name = '  Maria da Silva  '
    values.phone = '(54) 99999-9999'

    expect(toCreateGuardianPayload(values)).toEqual({
      guardian: {
        email: null,
        full_name: 'Maria da Silva',
        notes: null,
        phone: '(54) 99999-9999',
      },
      student_link: null,
    })
  })

  it('builds relationship payloads without editing guardian contact fields', () => {
    expect(
      toGuardianRelationshipPayload('guardian-1', {
        can_pick_up: true,
        is_emergency_contact: true,
        is_financial_responsible: false,
        is_primary_contact: true,
        relationship: '  Mae  ',
        student_id: 'student-1',
      }),
    ).toEqual({
      can_pick_up: true,
      guardian_id: 'guardian-1',
      is_emergency_contact: true,
      is_financial_responsible: false,
      is_primary_contact: true,
      relationship: 'Mae',
      student_id: 'student-1',
    })
  })
})
