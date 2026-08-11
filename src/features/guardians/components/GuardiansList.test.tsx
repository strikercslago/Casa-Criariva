import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GuardiansList } from '@/features/guardians/components/GuardiansList'

describe('GuardiansList', () => {
  it('renders summary data and opens a selected guardian', async () => {
    const user = userEvent.setup()
    const onOpenGuardian = vi.fn()
    const onPrefetchGuardian = vi.fn()

    render(
      <GuardiansList
        guardians={[
          {
            can_pick_up: true,
            created_at: '2026-08-11T00:00:00Z',
            email: 'maria@example.com',
            full_name: 'Maria da Silva',
            guardian_id: 'guardian-1',
            is_emergency_contact: false,
            is_financial_responsible: true,
            is_primary_contact: true,
            linked_students: [
              {
                can_pick_up: true,
                full_name: 'Ana Carolina',
                id: 'student-1',
                is_emergency_contact: false,
                is_financial_responsible: true,
                is_primary_contact: true,
                preferred_name: null,
                relationship: 'Mae',
                status: 'active',
              },
            ],
            notes: null,
            phone: '(54) 99999-9999',
            students_count: 1,
            updated_at: '2026-08-11T00:00:00Z',
          },
        ]}
        onOpenGuardian={onOpenGuardian}
        onPrefetchGuardian={onPrefetchGuardian}
      />,
    )

    expect(screen.getAllByText('Maria da Silva')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Ana Carolina')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Financeiro')[0]).toBeInTheDocument()

    await user.hover(screen.getAllByText('Maria da Silva')[0])
    await user.click(screen.getAllByRole('button', { name: /Abrir Maria da Silva/ })[0])

    expect(onPrefetchGuardian).toHaveBeenCalledWith('guardian-1')
    expect(onOpenGuardian).toHaveBeenCalledWith('guardian-1')
  })
})
