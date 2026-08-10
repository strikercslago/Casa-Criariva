import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudentForm } from './StudentForm'

describe('StudentForm', () => {
  it('shows friendly validation and submits normalized values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <StudentForm
        isSubmitting={false}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.clear(screen.getByLabelText(/^Nome completo/))
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))
    expect(await screen.findByText('Informe o nome do aluno.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Nome completo/), '  Ana Beatriz  ')
    await user.type(screen.getByLabelText('Nome preferido'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Ana Beatriz',
        preferred_name: 'Ana',
      }),
    )
  })
})
