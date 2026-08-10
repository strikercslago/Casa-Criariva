import { describe, expect, it } from 'vitest'
import { studentFormSchema } from './studentSchema'

describe('studentFormSchema', () => {
  it('trims names and accepts a minimal active student', () => {
    const result = studentFormSchema.parse({
      birth_date: '',
      enrollment_date: '2026-03-05',
      full_name: '  Ana Beatriz  ',
      notes: '',
      preferred_name: ' Ana ',
      status: 'active',
    })

    expect(result.full_name).toBe('Ana Beatriz')
    expect(result.preferred_name).toBe('Ana')
    expect(result.birth_date).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('rejects empty names', () => {
    const result = studentFormSchema.safeParse({
      birth_date: '',
      enrollment_date: '2026-03-05',
      full_name: ' ',
      notes: '',
      preferred_name: '',
      status: 'active',
    })

    expect(result.success).toBe(false)
  })

  it('rejects future birth dates', () => {
    const result = studentFormSchema.safeParse({
      birth_date: '2999-01-01',
      enrollment_date: '2026-03-05',
      full_name: 'Ana Beatriz',
      notes: '',
      preferred_name: '',
      status: 'active',
    })

    expect(result.success).toBe(false)
  })
})
