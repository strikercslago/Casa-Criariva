import { AppError } from '@/lib/errors/AppError'

type SupabaseLikeError = {
  code?: string
  message?: string
}

export function mapEventsError(error: SupabaseLikeError) {
  if (error.code === '42501') {
    return new AppError('permission', 'Voce nao tem permissao para alterar eventos.', error.message)
  }

  if (error.code === '23514') {
    return new AppError('validation', 'Confira capacidade, valores, datas e status antes de continuar.', error.message)
  }

  if (error.code === '23505') {
    return new AppError('validation', 'Ja existe um registro equivalente para este evento.', error.message)
  }

  if (error.code === 'P0002') {
    return new AppError('not-found', 'Evento ou inscricao nao encontrado.', error.message)
  }

  return new AppError('unknown', 'Nao foi possivel concluir a operacao de eventos.', error.message)
}
