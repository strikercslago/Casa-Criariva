import type { AuthError } from '@supabase/supabase-js'

export function getAuthErrorMessage(error: AuthError | Error | null) {
  if (!error) {
    return null
  }

  const message = error.message.toLowerCase()
  const status = 'status' in error ? error.status : undefined

  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.'
  }

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'E-mail ou senha incorretos.'
  }

  if (
    message.includes('email logins are disabled') ||
    message.includes('email provider is disabled') ||
    message.includes('provider is disabled')
  ) {
    return 'Login por e-mail esta desativado no Supabase.'
  }

  if (status === 429 || message.includes('too many requests') || message.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
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
