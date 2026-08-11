import { describe, expect, it } from 'vitest'
import { toClassWithSchedulesPayload } from './classesApi'

describe('toClassWithSchedulesPayload', () => {
  it('normalizes form values for classes RPC payloads', () => {
    const payload = toClassWithSchedulesPayload({
      capacity: '12',
      description: ' Turma de artes ',
      name: '  Turma Artes  ',
      schedules: [{ end_time: '15:30', start_time: '14:00', weekday: 2 }],
      status: 'active',
    })

    expect(payload).toEqual({
      class: {
        capacity: 12,
        description: 'Turma de artes',
        name: 'Turma Artes',
        status: 'active',
      },
      schedules: [{ end_time: '15:30', start_time: '14:00', weekday: 2 }],
    })
  })

  it('sends null capacity when the class has no limit', () => {
    const payload = toClassWithSchedulesPayload({
      capacity: '',
      description: null,
      name: 'Livre',
      schedules: [],
      status: 'inactive',
    })

    expect(payload.class.capacity).toBeNull()
  })
})
