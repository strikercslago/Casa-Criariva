import type { AuthError } from '@supabase/supabase-js'

export function getAuthErrorMessage(error: AuthError | Error | null) {
  if (!error) {
    return null
  }

  const message = error.message.toLowerCase()

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('email not confirmed')
  ) {
    return 'E-mail ou senha incorretos.'
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch')
  ) {
    return 'Nao foi possivel conectar. Verifique sua conexao e tente novamente.'
  }

  return 'Nao foi possivel concluir a autenticacao. Tente novamente.'
}

export function createTimeoutError() {
  return new Error('timeout')
}
