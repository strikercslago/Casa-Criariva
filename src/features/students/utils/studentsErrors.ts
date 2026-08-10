import type { PostgrestError } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'

type ErrorLike = Error | PostgrestError

export function mapStudentsError(error: ErrorLike) {
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

  if (code === 'PGRST116') {
    return new AppError('not-found', 'Aluno nao encontrado.', error.message)
  }

  if (code === '23514' || code === '22P02') {
    return new AppError(
      'validation',
      'Revise os dados do aluno e tente novamente.',
      error.message,
    )
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return new AppError('network', 'Nao foi possivel conectar ao Supabase.', error.message)
  }

  return new AppError('unknown', 'Nao foi possivel concluir a operacao.', error.message)
}
