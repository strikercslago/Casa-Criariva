import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors/AppError'
import {
  getStudentInitials,
  STUDENT_PHOTO_MAX_INPUT_BYTES,
  validateStudentPhotoFile,
} from '@/features/students/utils/studentPhoto'

describe('studentPhoto', () => {
  it('builds stable initials from preferred or full name', () => {
    expect(getStudentInitials({ full_name: 'Ana Beatriz Silva', preferred_name: 'Aninha' })).toBe('AN')
    expect(getStudentInitials({ full_name: 'Joao Pedro' })).toBe('JP')
    expect(getStudentInitials({ full_name: null, preferred_name: null })).toBe('AL')
  })

  it('accepts supported image files under the limit', () => {
    const file = new File(['image'], 'foto.webp', { type: 'image/webp' })

    expect(() => validateStudentPhotoFile(file)).not.toThrow()
  })

  it('rejects unsupported files', () => {
    const file = new File(['svg'], 'foto.svg', { type: 'image/svg+xml' })

    expect(() => validateStudentPhotoFile(file)).toThrow(AppError)
    expect(() => validateStudentPhotoFile(file)).toThrow('Formato de imagem nao suportado.')
  })

  it('rejects oversized files before processing', () => {
    const file = new File([new Uint8Array(STUDENT_PHOTO_MAX_INPUT_BYTES + 1)], 'foto.png', {
      type: 'image/png',
    })

    expect(() => validateStudentPhotoFile(file)).toThrow('A imagem e muito grande.')
  })
})
