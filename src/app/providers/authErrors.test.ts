import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from './authErrors'

describe('getAuthErrorMessage', () => {
  it('maps invalid credentials to a friendly message', () => {
    expect(getAuthErrorMessage(new Error('Invalid login credentials'))).toBe(
      'E-mail ou senha incorretos.',
    )
  })

  it('maps network errors to a friendly message', () => {
    expect(getAuthErrorMessage(new Error('Failed to fetch'))).toBe(
      'Nao foi possivel conectar. Verifique sua conexao e tente novamente.',
    )
  })
})
