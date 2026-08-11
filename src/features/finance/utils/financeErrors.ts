import { AppError } from '@/lib/errors/AppError'

type SupabaseLikeError = {
  code?: string
  message?: string
}

export function mapFinanceError(error: SupabaseLikeError) {
  if (error.code === '42501') {
    return new AppError('permission', 'Voce nao tem permissao para alterar o financeiro.', error.message)
  }

  if (error.code === '23514') {
    return new AppError('validation', 'Confira os valores, datas e saldos antes de continuar.', error.message)
  }

  if (error.code === '23505') {
    return new AppError('validation', 'Ja existe um registro financeiro equivalente.', error.message)
  }

  if (error.code === 'P0002') {
    return new AppError('not-found', 'Registro financeiro nao encontrado.', error.message)
  }

  return new AppError('unknown', 'Nao foi possivel concluir a operacao financeira.', error.message)
}
