import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/app/config/env'
import { createTimeoutError, getAuthErrorMessage } from '@/app/providers/authErrors'
import { logAuthDiagnostic, sanitizeAuthError } from '@/lib/monitoring/authDiagnostics'
import { queryKeys } from '@/lib/query/queryKeys'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { AppRole, Profile } from '@/lib/supabase/types'
import { withTimeout } from '@/shared/utils/withTimeout'

type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated' | 'unconfigured' | 'error'

type AuthState = {
  status: AuthStatus
  session: Session | null
  user: User | null
  errorMessage: string | null
}

type AuthContextValue = AuthState & {
  isReady: boolean
  profile: Profile | null
  roles: AppRole[]
  isAccountLoading: boolean
  accountErrorMessage: string | null
  signInWithPassword: (credentials: LoginCredentials) => Promise<{ errorMessage: string | null }>
  signOut: () => Promise<void>
  refetchAccount: () => Promise<void>
}

export type LoginCredentials = {
  email: string
  password: string
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_TIMEOUT_MS = 12_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({
    status: isSupabaseConfigured ? 'checking' : 'unconfigured',
    session: null,
    user: null,
    errorMessage: null,
  })

  useEffect(() => {
    const supabase = getSupabaseClient()

    if (!supabase) {
      return
    }

    const client = supabase
    let isMounted = true

    async function bootstrapSession() {
      const startedAt = performance.now()
      logAuthDiagnostic('B.session', 'start')

      const result = await withTimeout(client.auth.getSession(), AUTH_TIMEOUT_MS, createTimeoutError)
        .then(({ data, error }) => ({
          data,
          error,
          errorMessage: getAuthErrorMessage(error),
        }))
        .catch((error: Error) => ({
          data: null,
          error,
          errorMessage: getAuthErrorMessage(error),
        }))

      const durationMs = Math.round(performance.now() - startedAt)

      if (!isMounted) {
        return
      }

      if (result.errorMessage || !result.data) {
        logAuthDiagnostic('B.session', 'error', {
          durationMs,
          ...sanitizeAuthError(result.error),
        })

        setState({
          status: 'error',
          session: null,
          user: null,
          errorMessage: result.errorMessage,
        })
        return
      }

      logAuthDiagnostic('B.session', 'success', {
        durationMs,
        hasSession: Boolean(result.data.session),
        hasUser: Boolean(result.data.session?.user),
      })

      setState({
        status: result.data.session ? 'authenticated' : 'unauthenticated',
        session: result.data.session,
        user: result.data.session?.user ?? null,
        errorMessage: null,
      })
    }

    void bootstrapSession()

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      logAuthDiagnostic('B.session', 'success', {
        authEvent: event,
        hasSession: Boolean(session),
        hasUser: Boolean(session?.user),
      })

      setState({
        status: session ? 'authenticated' : 'unauthenticated',
        session,
        user: session?.user ?? null,
        errorMessage: null,
      })

      if (!session) {
        queryClient.clear()
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [queryClient])

  const profileQuery = useQuery({
    queryKey: state.user ? queryKeys.auth.profile(state.user.id) : ['profile', 'anonymous'],
    enabled: state.status === 'authenticated' && Boolean(state.user),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const supabase = getSupabaseClient()

      if (!supabase || !state.user) {
        throw new Error('Supabase nao configurado.')
      }

      const startedAt = performance.now()
      logAuthDiagnostic('C.profile', 'start', { table: 'profiles' })

      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_active, created_at, updated_at')
          .eq('id', state.user.id)
          .maybeSingle(),
        AUTH_TIMEOUT_MS,
        createTimeoutError,
      )

      const durationMs = Math.round(performance.now() - startedAt)

      if (error) {
        logAuthDiagnostic('C.profile', 'error', {
          durationMs,
          table: 'profiles',
          ...sanitizeAuthError(error),
        })
        throw error
      }

      logAuthDiagnostic('C.profile', 'success', {
        durationMs,
        count: data ? 1 : 0,
        table: 'profiles',
      })

      return data
    },
  })

  const rolesQuery = useQuery({
    queryKey: state.user ? queryKeys.auth.roles(state.user.id) : ['roles', 'anonymous'],
    enabled: state.status === 'authenticated' && Boolean(state.user),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const supabase = getSupabaseClient()

      if (!supabase || !state.user) {
        throw new Error('Supabase nao configurado.')
      }

      const startedAt = performance.now()
      logAuthDiagnostic('D.roles', 'start', { table: 'user_roles' })

      const { data, error } = await withTimeout(
        supabase.from('user_roles').select('role').eq('user_id', state.user.id).order('role'),
        AUTH_TIMEOUT_MS,
        createTimeoutError,
      )

      const durationMs = Math.round(performance.now() - startedAt)

      if (error) {
        logAuthDiagnostic('D.roles', 'error', {
          durationMs,
          table: 'user_roles',
          ...sanitizeAuthError(error),
        })
        throw error
      }

      logAuthDiagnostic('D.roles', 'success', {
        count: data.length,
        durationMs,
        table: 'user_roles',
      })

      return data.map((row) => row.role)
    },
  })

  const signInWithPassword = useCallback(
    async ({ email, password }: LoginCredentials) => {
      const supabase = getSupabaseClient()

      if (!supabase) {
        return {
          errorMessage: 'Supabase ainda nao esta configurado neste ambiente.',
        }
      }

      const startedAt = performance.now()
      logAuthDiagnostic('A.signInWithPassword', 'start')

      const result = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        createTimeoutError,
      )
        .then(({ data, error }) => ({
          data,
          error,
          errorMessage: getAuthErrorMessage(error),
        }))
        .catch((error: Error) => ({
          data: null,
          error,
          errorMessage: getAuthErrorMessage(error),
        }))

      const durationMs = Math.round(performance.now() - startedAt)

      if (result.errorMessage || !result.data) {
        logAuthDiagnostic('A.signInWithPassword', 'error', {
          durationMs,
          ...sanitizeAuthError(result.error),
        })

        return { errorMessage: result.errorMessage ?? 'Nao foi possivel entrar.' }
      }

      logAuthDiagnostic('A.signInWithPassword', 'success', {
        durationMs,
        hasSession: Boolean(result.data.session),
        hasUser: Boolean(result.data.user),
      })

      setState({
        status: result.data.session ? 'authenticated' : 'unauthenticated',
        session: result.data.session,
        user: result.data.session?.user ?? null,
        errorMessage: null,
      })

      return { errorMessage: null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()

    if (!supabase) {
      setState((current) => ({ ...current, status: 'unconfigured' }))
      return
    }

    const result = await withTimeout(
      supabase.auth.signOut(),
      AUTH_TIMEOUT_MS,
      createTimeoutError,
    )
      .then(({ error }) => ({ errorMessage: getAuthErrorMessage(error) }))
      .catch((error: Error) => ({ errorMessage: getAuthErrorMessage(error) }))

    if (result.errorMessage) {
      setState((current) => ({
        ...current,
        status: 'error',
        errorMessage: result.errorMessage,
      }))
      return
    }

    queryClient.clear()
    setState({
      status: 'unauthenticated',
      session: null,
      user: null,
      errorMessage: null,
    })
  }, [queryClient])

  const refetchAccount = useCallback(async () => {
    await Promise.all([profileQuery.refetch(), rolesQuery.refetch()])
  }, [profileQuery, rolesQuery])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isReady: state.status !== 'checking',
      profile: profileQuery.data ?? null,
      roles: rolesQuery.data ?? [],
      isAccountLoading: profileQuery.isFetching || rolesQuery.isFetching,
      accountErrorMessage:
        profileQuery.error || rolesQuery.error
          ? 'Nao foi possivel atualizar perfil e permissoes.'
          : null,
      signInWithPassword,
      signOut,
      refetchAccount,
    }),
    [
      profileQuery.data,
      profileQuery.error,
      profileQuery.isFetching,
      refetchAccount,
      rolesQuery.data,
      rolesQuery.error,
      rolesQuery.isFetching,
      signInWithPassword,
      signOut,
      state,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
