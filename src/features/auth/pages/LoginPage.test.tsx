import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const signInWithPassword = vi.hoisted(() => vi.fn())

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    signInWithPassword,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
  })

  it('submits credentials and navigates after success', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValueOnce({ errorMessage: null })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'senha-segura',
    })
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('shows friendly errors without leaking technical messages', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValueOnce({ errorMessage: 'E-mail ou senha incorretos.' })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Senha'), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
    expect(screen.queryByText(/AuthApiError|Failed to fetch|stack/i)).not.toBeInTheDocument()
  })
})
