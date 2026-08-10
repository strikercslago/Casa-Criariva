import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/app/config/env'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/database.types'

type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated' | 'unconfigured' | 'error'

type AuthState = {
  status: AuthStatus
  session: Session | null
  user: User | null
  roles: UserRole[]
  errorMessage: string | null
}

type AuthContextValue = AuthState & {
  isReady: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: isSupabaseConfigured ? 'checking' : 'unconfigured',
    session: null,
    user: null,
    roles: [],
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
      const { data, error } = await client.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setState({
          status: 'error',
          session: null,
          user: null,
          roles: [],
          errorMessage: 'Nao foi possivel validar a sessao.',
        })
        return
      }

      setState({
        status: data.session ? 'authenticated' : 'unauthenticated',
        session: data.session,
        user: data.session?.user ?? null,
        roles: data.session ? ['owner'] : [],
        errorMessage: null,
      })
    }

    void bootstrapSession()

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setState({
        status: session ? 'authenticated' : 'unauthenticated',
        session,
        user: session?.user ?? null,
        roles: session ? ['owner'] : [],
        errorMessage: null,
      })
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()

    if (!supabase) {
      setState((current) => ({ ...current, status: 'unconfigured' }))
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        errorMessage: 'Nao foi possivel sair da conta.',
      }))
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isReady: state.status !== 'checking',
      signOut,
    }),
    [signOut, state],
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
