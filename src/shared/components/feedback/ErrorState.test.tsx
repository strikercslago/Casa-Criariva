import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders a retry action without technical details', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(<ErrorState description="Nao foi possivel atualizar os dados." onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/PostgrestError|stack trace|Failed to fetch/i)).not.toBeInTheDocument()
  })
})
