import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { logAuthDiagnostic } from '@/lib/monitoring/authDiagnostics'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { RouteSkeleton } from '@/shared/components/feedback/RouteSkeleton'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (auth.status === 'checking') {
      return
    }

    logAuthDiagnostic(
      'E.protectedRoute',
      auth.status === 'authenticated' ? 'allow' : 'redirect',
      { authStatus: auth.status },
    )
  }, [auth.status])

  if (auth.status === 'checking') {
    return (
      <main className="min-h-screen bg-background p-6">
        <RouteSkeleton />
      </main>
    )
  }

  if (auth.status === 'error') {
    return (
      <main className="min-h-screen bg-background p-6">
        <ErrorState
          title="Nao foi possivel validar sua sessao."
          description={auth.errorMessage ?? 'Tente novamente em alguns instantes.'}
        />
      </main>
    )
  }

  if (auth.status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const auth = useAuth()

  if (auth.status === 'checking') {
    return (
      <main className="min-h-screen bg-background p-6">
        <RouteSkeleton />
      </main>
    )
  }

  if (auth.status === 'authenticated') {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
