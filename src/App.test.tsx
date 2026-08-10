import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.resetModules()
  })

  it('redirects unauthenticated users to login', async () => {
    const { default: App } = await import('./App')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText(/Cadastro publico nao esta disponivel/)).toBeInTheDocument()
  }, 10_000)
})
