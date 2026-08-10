import { describe, expect, it } from 'vitest'
import { getEnrollmentWizardDefaults } from '@/features/students/schemas/enrollmentWizardSchema'
import { toCompleteEnrollmentPayload } from '@/features/students/api/student360Api'

describe('toCompleteEnrollmentPayload', () => {
  it('builds an atomic enrollment payload with related data', () => {
    const values = getEnrollmentWizardDefaults()
    values.student.full_name = '  Ana Beatriz  '
    values.student.enrollment_date = '2026-03-05'
    values.guardians = [
      {
        can_pick_up: true,
        email: 'mae@example.com',
        full_name: '  Maria Mae  ',
        guardian_id: null,
        is_emergency_contact: true,
        is_financial_responsible: true,
        is_primary_contact: true,
        notes: null,
        phone: '11999990000',
        relationship: 'Mae',
      },
    ]
    values.class_step.mode = 'quick'
    values.class_step.quick_name = 'Turma Jardim'
    values.class_step.quick_weekdays = ['1', '3']
    values.billing.enabled = true
    values.billing.base_amount = '500'
    values.billing.discount_amount = '50'

    const payload = toCompleteEnrollmentPayload(values)

    expect(payload.student.full_name).toBe('Ana Beatriz')
    expect(payload.guardians[0]).toMatchObject({
      guardian: { full_name: 'Maria Mae', phone: '11999990000' },
      guardian_id: null,
      is_financial_responsible: true,
    })
    expect(payload.class).toMatchObject({
      quick_create: {
        name: 'Turma Jardim',
        schedules: [
          { end_time: '15:30', start_time: '14:00', weekday: 1 },
          { end_time: '15:30', start_time: '14:00', weekday: 3 },
        ],
      },
    })
    expect(payload.billing_plan).toMatchObject({ base_amount: 500, discount_amount: 50 })
  })

  it('omits nested guardian data when reusing an existing guardian', () => {
    const values = getEnrollmentWizardDefaults()
    values.student.full_name = 'Pedro'
    values.guardians = [
      {
        can_pick_up: true,
        email: null,
        full_name: 'Responsavel existente',
        guardian_id: 'guardian-1',
        is_emergency_contact: true,
        is_financial_responsible: true,
        is_primary_contact: true,
        notes: null,
        phone: '11988887777',
        relationship: 'Pai',
      },
    ]

    const payload = toCompleteEnrollmentPayload(values)

    expect(payload.guardians[0]).toEqual({
      can_pick_up: true,
      guardian_id: 'guardian-1',
      is_emergency_contact: true,
      is_financial_responsible: true,
      is_primary_contact: true,
      relationship: 'Pai',
    })
    expect(JSON.stringify(payload)).not.toContain('undefined')
  })
})
