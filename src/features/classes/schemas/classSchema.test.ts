import { describe, expect, it } from 'vitest'
import { classFormSchema, getClassFormDefaults } from './classSchema'

describe('classFormSchema', () => {
  it('accepts a class with no capacity limit and recurring schedules', () => {
    const values = getClassFormDefaults()
    values.name = 'Turma Criativa'
    values.capacity = ''

    const result = classFormSchema.safeParse(values)

    expect(result.success).toBe(true)
  })

  it('rejects invalid capacity and overlapping schedules', () => {
    const result = classFormSchema.safeParse({
      capacity: '0',
      description: null,
      name: 'Turma A',
      schedules: [
        { end_time: '10:30', start_time: '09:00', weekday: 1 },
        { end_time: '11:00', start_time: '10:00', weekday: 1 },
      ],
      status: 'active',
    })

    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.format())).toContain('Existe conflito de horario')
    expect(JSON.stringify(result.error?.format())).toContain('Use um numero inteiro')
  })
})
