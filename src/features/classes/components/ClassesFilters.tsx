import { Search } from 'lucide-react'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import type { ClassCapacityFilter, ClassStatusFilter } from '@/features/classes/types/classTypes'

const statusFilters: Array<{ label: string; value: ClassStatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Inativas', value: 'inactive' },
  { label: 'Arquivadas', value: 'archived' },
]

const capacityFilters: Array<{ label: string; value: ClassCapacityFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Com vagas', value: 'with_spots' },
  { label: 'Lotadas', value: 'full' },
]

type ClassesFiltersProps = {
  capacity: ClassCapacityFilter
  onCapacityChange: (value: ClassCapacityFilter) => void
  onSearchChange: (value: string) => void
  onStatusChange: (value: ClassStatusFilter) => void
  search: string
  status: ClassStatusFilter
}

export function ClassesFilters({
  capacity,
  onCapacityChange,
  onSearchChange,
  onStatusChange,
  search,
  status,
}: ClassesFiltersProps) {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Buscar turma</span>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            aria-label="Buscar turma"
            className="h-10 w-full rounded border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-subtle focus-visible:border-primary"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome da turma"
            role="searchbox"
            type="search"
            value={search}
          />
        </span>
      </label>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto">
          <Tabs>
            {statusFilters.map((filter) => (
              <TabButton
                isActive={status === filter.value}
                key={filter.value}
                onClick={() => onStatusChange(filter.value)}
                role="tab"
              >
                {filter.label}
              </TabButton>
            ))}
          </Tabs>
        </div>
        <div className="overflow-x-auto">
          <Tabs>
            {capacityFilters.map((filter) => (
              <TabButton
                isActive={capacity === filter.value}
                key={filter.value}
                onClick={() => onCapacityChange(filter.value)}
                role="tab"
              >
                {filter.label}
              </TabButton>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  )
}
