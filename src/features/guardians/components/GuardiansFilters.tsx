import { Search } from 'lucide-react'
import { Tabs, TabButton } from '@/shared/components/ui/Tabs'
import type { GuardianRoleFilter } from '@/features/guardians/types/guardianTypes'

const roleFilters: Array<{ label: string; value: GuardianRoleFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Financeiros', value: 'financial' },
  { label: 'Principais', value: 'primary' },
  { label: 'Retirada', value: 'pickup' },
  { label: 'Emergencia', value: 'emergency' },
]

type GuardiansFiltersProps = {
  onRoleChange: (value: GuardianRoleFilter) => void
  onSearchChange: (value: string) => void
  role: GuardianRoleFilter
  search: string
}

export function GuardiansFilters({ onRoleChange, onSearchChange, role, search }: GuardiansFiltersProps) {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Buscar responsavel</span>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            aria-label="Buscar responsavel"
            className="h-10 w-full rounded border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-subtle focus-visible:border-primary"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome, telefone ou e-mail"
            role="searchbox"
            type="search"
            value={search}
          />
        </span>
      </label>

      <div className="overflow-x-auto">
        <Tabs>
          {roleFilters.map((filter) => (
            <TabButton
              isActive={role === filter.value}
              key={filter.value}
              onClick={() => onRoleChange(filter.value)}
              role="tab"
            >
              {filter.label}
            </TabButton>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
