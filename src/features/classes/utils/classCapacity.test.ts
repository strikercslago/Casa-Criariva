import { describe, expect, it } from 'vitest'
import { formatAvailableSpots, formatCapacity, getAvailableSpots, isClassFull } from './classCapacity'

describe('classCapacity utils', () => {
  it('handles limited capacity', () => {
    expect(getAvailableSpots(10, 4)).toBe(6)
    expect(isClassFull(10, 10)).toBe(true)
    expect(formatCapacity({ active_enrollments: 4, capacity: 10 })).toBe('4 de 10 alunos')
    expect(formatAvailableSpots(10, 9)).toBe('1 vaga disponivel')
  })

  it('handles unlimited capacity', () => {
    expect(getAvailableSpots(null, 12)).toBeNull()
    expect(isClassFull(null, 12)).toBe(false)
    expect(formatCapacity({ active_enrollments: 12, capacity: null })).toBe('12 alunos')
    expect(formatAvailableSpots(null, 12)).toBe('Sem limite definido')
  })
})
