import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClassesList } from './ClassesList'

const classItem = {
  active_enrollments: 10,
  available_spots: 0,
  capacity: 10,
  class_id: 'class-1',
  created_at: '2026-08-11T12:00:00Z',
  description: 'Turma de artes visuais',
  is_full: true,
  name: 'Artes 1',
  schedules: [{ class_id: 'class-1', created_at: '2026-08-11T12:00:00Z', end_time: '15:30:00', id: 'schedule-1', start_time: '14:00:00', weekday: 2 }],
  status: 'active' as const,
  updated_at: '2026-08-11T12:00:00Z',
}

describe('ClassesList', () => {
  it('renders capacity, schedules and opens a class', async () => {
    const user = userEvent.setup()
    const onOpenClass = vi.fn()
    const onPrefetchClass = vi.fn()

    render(<ClassesList classes={[classItem]} onOpenClass={onOpenClass} onPrefetchClass={onPrefetchClass} />)

    expect(screen.getByText('Artes 1')).toBeInTheDocument()
    expect(screen.getByText('Ter 14:00-15:30')).toBeInTheDocument()
    expect(screen.getByText('10 de 10 alunos')).toBeInTheDocument()
    expect(screen.getByText('Turma cheia')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver turma' }))

    expect(onOpenClass).toHaveBeenCalledWith('class-1')
  })
})
