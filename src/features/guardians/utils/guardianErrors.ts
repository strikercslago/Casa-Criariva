import type { PostgrestError } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'

type ErrorLike = Error | PostgrestError

export function mapGuardiansError(error: ErrorLike) {
  const message = error.message.toLowerCase()
  const code = 'code' in error ? error.code : undefined

  if (message.includes('timeout')) {
    return new AppError('network', 'A consulta demorou demais. Tente novamente.', error.message)
  }

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level')) {
    return new AppError(
      'permission',
      'Voce nao tem permissao para executar esta acao.',
      error.message,
    )
  }

  if (code === 'PGRST116' || code === 'P0002') {
    return new AppError('not-found', 'Responsavel nao encontrado.', error.message)
  }

  if (code === '23514' || code === '22P02') {
    return new AppError(
      'validation',
      'Revise os dados do responsavel e tente novamente.',
      error.message,
    )
  }

  if (code === '23503') {
    return new AppError(
      'validation',
      'Nao foi possivel encontrar o aluno selecionado.',
      error.message,
    )
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return new AppError('network', 'Nao foi possivel conectar ao Supabase.', error.message)
  }

  return new AppError('unknown', 'Nao foi possivel concluir a operacao.', error.message)
}
