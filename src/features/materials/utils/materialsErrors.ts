import { AppError } from '@/lib/errors/AppError'

type SupabaseLikeError = {
  code?: string
  message?: string
}

export function mapMaterialsError(error: SupabaseLikeError) {
  if (error.code === '42501') return new AppError('auth', 'Voce nao tem permissao para gerenciar materiais.')
  if (error.code === '23505') return new AppError('validation', 'Ja existe um registro com esses dados.')
  if (error.code === '23514') return new AppError('validation', error.message ?? 'Revise os dados informados.')
  if (error.code === 'P0002') return new AppError('not-found', 'Registro nao encontrado.')

  return new AppError('network', 'Nao foi possivel concluir a operacao de materiais.', error.message)
}
