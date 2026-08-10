import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('fires clicks', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={onClick}>Salvar</Button>)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('prevents clicks while loading', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button isLoading onClick={onClick}>
        Salvar
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
