import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, PublicOnlyRoute } from './AuthGuards'

const authState = vi.hoisted(() => ({
  status: 'unauthenticated',
}))

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    status: authState.status,
    errorMessage: null,
  }),
}))

describe('AuthGuards', () => {
  it('redirects unauthenticated users from protected routes', async () => {
    authState.status = 'unauthenticated'

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<h1>Inicio</h1>} />
          </Route>
          <Route path="/login" element={<h1>Entrar</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('redirects authenticated users away from login', async () => {
    authState.status = 'authenticated'

    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/login']}
      >
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<h1>Entrar</h1>} />
          </Route>
          <Route path="/" element={<h1>Inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })
})
