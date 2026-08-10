import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudentFilters } from './StudentFilters'

function ControlledFilters({
  onSearchChange,
  onStatusChange,
}: {
  onSearchChange: (value: string) => void
  onStatusChange: (value: 'all' | 'active' | 'inactive' | 'archived') => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'archived'>('active')

  return (
    <StudentFilters
      onSearchChange={(value) => {
        setSearch(value)
        onSearchChange(value)
      }}
      onStatusChange={(value) => {
        setStatus(value)
        onStatusChange(value)
      }}
      search={search}
      status={status}
    />
  )
}

describe('StudentFilters', () => {
  it('emits search and status changes', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onStatusChange = vi.fn()

    render(<ControlledFilters onSearchChange={onSearchChange} onStatusChange={onStatusChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'Ana')
    await user.click(screen.getByRole('tab', { name: 'Arquivados' }))

    expect(onSearchChange).toHaveBeenLastCalledWith('Ana')
    expect(onStatusChange).toHaveBeenCalledWith('archived')
  })
})
