import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('redirects unauthenticated users to login', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText(/Cadastro publico nao esta disponivel/)).toBeInTheDocument()
  })
})
