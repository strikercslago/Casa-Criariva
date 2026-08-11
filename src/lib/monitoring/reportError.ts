type ErrorContext = Record<string, unknown>

const sensitiveKeys = ['authorization', 'password', 'refresh_token', 'access_token', 'secret', 'token']

function sanitizeValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))
        ? '[redacted]'
        : sanitizeValue(entry),
    ]),
  )
}

export function reportError(error: unknown, context: ErrorContext = {}) {
  const payload = {
    context: sanitizeValue(context),
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'UnknownError',
  }

  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.error('[app:error]', payload)
  }
}
