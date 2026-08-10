export type AppErrorCode =
  | 'auth'
  | 'permission'
  | 'network'
  | 'validation'
  | 'not-found'
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly technicalMessage?: string

  constructor(code: AppErrorCode, userMessage: string, technicalMessage?: string) {
    super(userMessage)
    this.name = 'AppError'
    this.code = code
    this.technicalMessage = technicalMessage
  }
}

export function getUserSafeErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    return error.message
  }

  return 'Algo saiu do esperado. Tente novamente.'
}
