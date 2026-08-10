import { describe, expect, it } from 'vitest'
import {
  getRestoreStatus,
  getStudentStatusLabel,
  getStudentStatusTone,
} from './studentStatus'

describe('studentStatus', () => {
  it('formats status labels and tones', () => {
    expect(getStudentStatusLabel('active')).toBe('Ativo')
    expect(getStudentStatusTone('archived')).toBe('neutral')
  })

  it('restores archived students to active', () => {
    expect(getRestoreStatus()).toBe('active')
  })
})
