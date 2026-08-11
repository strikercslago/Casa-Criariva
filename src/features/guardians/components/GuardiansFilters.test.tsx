import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GuardianRoleFilter } from '@/features/guardians/types/guardianTypes'
import { GuardiansFilters } from '@/features/guardians/components/GuardiansFilters'

function ControlledFilters({
  onRoleChange,
  onSearchChange,
}: {
  onRoleChange: (value: GuardianRoleFilter) => void
  onSearchChange: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<GuardianRoleFilter>('all')

  return (
    <GuardiansFilters
      onRoleChange={(value) => {
        setRole(value)
        onRoleChange(value)
      }}
      onSearchChange={(value) => {
        setSearch(value)
        onSearchChange(value)
      }}
      role={role}
      search={search}
    />
  )
}

describe('GuardiansFilters', () => {
  it('emits search and operational role filters', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onRoleChange = vi.fn()

    render(<ControlledFilters onRoleChange={onRoleChange} onSearchChange={onSearchChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar responsavel' }), 'Maria')
    await user.click(screen.getByRole('tab', { name: 'Financeiros' }))

    expect(onSearchChange).toHaveBeenLastCalledWith('Maria')
    expect(onRoleChange).toHaveBeenCalledWith('financial')
  })
})
