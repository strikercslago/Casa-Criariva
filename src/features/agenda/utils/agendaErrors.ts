import type { PostgrestError } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'

type ErrorLike = Error | PostgrestError

export function mapAgendaError(error: ErrorLike) {
  const message = error.message.toLowerCase()
  const code = 'code' in error ? error.code : undefined

  if (message.includes('timeout')) {
    return new AppError('network', 'A consulta demorou demais. Tente novamente.', error.message)
  }

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level')) {
    return new AppError('permission', 'Voce nao tem permissao para executar esta acao.', error.message)
  }

  if (code === 'PGRST116' || code === 'P0002') {
    return new AppError('not-found', 'Aula nao encontrada.', error.message)
  }

  if (code === '23514' || code === '22023' || code === '22P02') {
    return new AppError('validation', 'Revise a aula ou a frequencia e tente novamente.', error.message)
  }

  if (code === '23505') {
    return new AppError('validation', 'Esta aula ou frequencia ja foi registrada.', error.message)
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return new AppError('network', 'Nao foi possivel conectar ao Supabase.', error.message)
  }

  return new AppError('unknown', 'Nao foi possivel atualizar a agenda ou frequencia.', error.message)
}
