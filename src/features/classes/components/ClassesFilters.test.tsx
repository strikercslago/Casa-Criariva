import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ClassesFilters } from './ClassesFilters'
import type { ClassCapacityFilter, ClassStatusFilter } from '@/features/classes/types/classTypes'

describe('ClassesFilters', () => {
  it('emits search, status and capacity changes', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onStatusChange = vi.fn()
    const onCapacityChange = vi.fn()

    function ControlledFilters() {
      const [search, setSearch] = useState('')
      const [status, setStatus] = useState<ClassStatusFilter>('active')
      const [capacity, setCapacity] = useState<ClassCapacityFilter>('all')

      return (
        <ClassesFilters
          capacity={capacity}
          onCapacityChange={(value) => {
            setCapacity(value)
            onCapacityChange(value)
          }}
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

    render(<ControlledFilters />)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar turma' }), 'ballet')
    await user.click(screen.getByRole('tab', { name: 'Arquivadas' }))
    await user.click(screen.getByRole('tab', { name: 'Lotadas' }))

    expect(onSearchChange).toHaveBeenLastCalledWith('ballet')
    expect(onStatusChange).toHaveBeenCalledWith('archived')
    expect(onCapacityChange).toHaveBeenCalledWith('full')
  })
})
