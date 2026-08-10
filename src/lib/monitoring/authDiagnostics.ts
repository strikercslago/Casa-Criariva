type AuthDiagnosticStep =
  | 'A.signInWithPassword'
  | 'B.session'
  | 'C.profile'
  | 'D.roles'
  | 'E.protectedRoute'
  | 'F.dashboard'
  | 'network.supabase'

type AuthDiagnosticOutcome = 'start' | 'success' | 'error' | 'redirect' | 'allow' | 'render'

type AuthDiagnosticDetails = {
  authEvent?: string
  authStatus?: string
  code?: string | number
  count?: number
  durationMs?: number
  hasMessage?: boolean
  hasSession?: boolean
  hasUser?: boolean
  method?: string
  message?: string
  name?: string
  path?: string
  status?: string | number
  table?: 'profiles' | 'user_roles'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function sanitizeAuthError(error: unknown): AuthDiagnosticDetails {
  if (!error) {
    return {}
  }

  if (!isRecord(error)) {
    return {
      message: String(error),
    }
  }

  const details: AuthDiagnosticDetails = {
    hasMessage: typeof error.message === 'string',
  }

  if (typeof error.name === 'string') {
    details.name = error.name
  }

  if (typeof error.message === 'string') {
    details.message = error.message
  }

  if (typeof error.status === 'string' || typeof error.status === 'number') {
    details.status = error.status
  }

  if (typeof error.code === 'string' || typeof error.code === 'number') {
    details.code = error.code
  }

  return details
}

export function logAuthDiagnostic(
  step: AuthDiagnosticStep,
  outcome: AuthDiagnosticOutcome,
  details: AuthDiagnosticDetails = {},
) {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return
  }

  console.info(
    '[auth:diagnostic]',
    JSON.stringify({
      step,
      outcome,
      ...details,
    }),
  )
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.href
  }

  return input.url
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method
  }

  if (typeof input !== 'string' && !(input instanceof URL)) {
    return input.method
  }

  return 'GET'
}

export function createSupabaseDiagnosticFetch(supabaseUrl: string): typeof fetch | undefined {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return undefined
  }

  const supabaseOrigin = new URL(supabaseUrl).origin

  return async (input, init) => {
    const requestUrl = getRequestUrl(input)
    const parsedUrl = new URL(requestUrl, window.location.origin)

    if (parsedUrl.origin !== supabaseOrigin) {
      return fetch(input, init)
    }

    const startedAt = performance.now()

    try {
      const response = await fetch(input, init)

      logAuthDiagnostic('network.supabase', response.ok ? 'success' : 'error', {
        durationMs: Math.round(performance.now() - startedAt),
        method: getRequestMethod(input, init),
        path: parsedUrl.pathname,
        status: response.status,
      })

      return response
    } catch (error) {
      logAuthDiagnostic('network.supabase', 'error', {
        durationMs: Math.round(performance.now() - startedAt),
        method: getRequestMethod(input, init),
        path: parsedUrl.pathname,
        ...sanitizeAuthError(error),
      })

      throw error
    }
  }
}
