import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudentsList } from './StudentsList'

describe('StudentsList', () => {
  it('renders list rows without notes and opens a selected student', async () => {
    const user = userEvent.setup()
    const onOpenStudent = vi.fn()

    render(
      <StudentsList
        onOpenStudent={onOpenStudent}
        students={[
          {
            birth_date: '2018-08-12',
            enrollment_date: '2026-03-05',
            full_name: 'Ana Beatriz',
            id: 'student-1',
            preferred_name: 'Ana',
            status: 'active',
          },
        ]}
      />,
    )

    expect(screen.getAllByText('Ana Beatriz')[0]).toBeInTheDocument()
    expect(screen.getAllByText('05/03/2026')[0]).toBeInTheDocument()
    expect(screen.queryByText(/observacao/i)).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Abrir/ })[0])

    expect(onOpenStudent).toHaveBeenCalledWith('student-1')
  })
})
