import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the persistent shell', async () => {
    render(<App />)

    expect(await screen.findByText('Casa Criativa Gestao')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegacao principal' })).toBeInTheDocument()
  })
})
