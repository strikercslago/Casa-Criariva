import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'

const getSession = vi.hoisted(() => vi.fn())
const onAuthStateChange = vi.hoisted(() => vi.fn())
const signOut = vi.hoisted(() => vi.fn())

vi.mock('@/app/config/env', () => ({
  isSupabaseConfigured: true,
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession,
      onAuthStateChange,
      signOut,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: 'user-1',
                full_name: 'Admin',
                avatar_url: null,
                is_active: true,
                created_at: '2026-08-10T00:00:00Z',
                updated_at: '2026-08-10T00:00:00Z',
              },
              error: null,
            }),
          order: () => Promise.resolve({ data: [{ role: 'owner' }], error: null }),
        }),
      }),
    }),
  }),
}))

function renderWithQuery(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>)
}

function AuthConsumer() {
  const auth = useAuth()

  return (
    <div>
      <p>Status: {auth.status}</p>
      <p>Roles: {auth.roles.join(', ') || 'none'}</p>
      <button type="button" onClick={() => void auth.signOut()}>
        Sair
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  it('loads session once and fetches account data through queries', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-1' },
        },
      },
      error: null,
    })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    renderWithQuery(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(await screen.findByText('Status: authenticated')).toBeInTheDocument()
    expect(await screen.findByText('Roles: owner')).toBeInTheDocument()
    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('signs out without leaving private state visible', async () => {
    const user = userEvent.setup()
    getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-1' },
        },
      },
      error: null,
    })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    signOut.mockResolvedValueOnce({ error: null })

    renderWithQuery(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await screen.findByText('Status: authenticated')
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByText('Status: unauthenticated')).toBeInTheDocument())
  })
})
