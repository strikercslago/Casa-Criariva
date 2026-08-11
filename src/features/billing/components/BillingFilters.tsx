import { Search } from 'lucide-react'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import type { MonthlyFeeStatus } from '@/features/billing/types/billingTypes'
import { billingStatusOptions } from '@/features/billing/utils/billingFormat'

type BillingFiltersProps = {
  onSearchChange: (value: string) => void
  onStatusChange: (value: MonthlyFeeStatus) => void
  search: string
  status: MonthlyFeeStatus
}

export function BillingFilters({ onSearchChange, onStatusChange, search, status }: BillingFiltersProps) {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Buscar aluno ou responsavel</span>
        <span className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            aria-label="Buscar aluno ou responsavel"
            className="h-10 w-full rounded border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-subtle focus-visible:border-primary"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome do aluno ou responsavel"
            role="searchbox"
            type="search"
            value={search}
          />
        </span>
      </label>

      <div className="overflow-x-auto">
        <Tabs>
          {billingStatusOptions.map((filter) => (
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
    </section>
  )
}
