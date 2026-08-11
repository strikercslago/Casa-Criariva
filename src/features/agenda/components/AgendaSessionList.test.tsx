import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AgendaSessionList } from './AgendaSessionList'
import type { AgendaSession } from '@/features/agenda/types/agendaTypes'

const session: AgendaSession = {
  absent_count: 0,
  attendance_state: 'pending',
  class_id: 'class-1',
  class_name: 'Artes 1',
  end_time: '15:30:00',
  excused_count: 0,
  expected_students: 6,
  notes: null,
  present_count: 0,
  recorded_count: 0,
  schedule_id: 'schedule-1',
  session_date: '2026-08-11',
  session_id: 'session-1',
  start_time: '14:00:00',
  status: 'planned',
}

describe('AgendaSessionList', () => {
  it('renders operational session data and opens a session', async () => {
    const user = userEvent.setup()
    const onOpenSession = vi.fn()

    render(<AgendaSessionList onOpenSession={onOpenSession} sessions={[session]} showDates />)

    expect(screen.getByText('14:00 - 15:30')).toBeInTheDocument()
    expect(screen.getByText('Artes 1')).toBeInTheDocument()
    expect(screen.getByText('Frequencia pendente')).toBeInTheDocument()
    expect(screen.getByText('6 alunos esperados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir aula' }))

    expect(onOpenSession).toHaveBeenCalledWith('session-1')
  })
})
