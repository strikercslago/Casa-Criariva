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

  it('maps unconfirmed email to a direct action message', () => {
    expect(getAuthErrorMessage(new Error('Email not confirmed'))).toBe(
      'Confirme seu e-mail antes de entrar.',
    )
  })

  it('maps disabled email provider errors to a configuration message', () => {
    expect(getAuthErrorMessage(new Error('Email logins are disabled'))).toBe(
      'Login por e-mail esta desativado no Supabase.',
    )
  })
})
