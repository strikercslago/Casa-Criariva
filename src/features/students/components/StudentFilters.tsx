import { SearchInput } from '@/shared/components/ui/SearchInput'
import { cn } from '@/shared/utils/cn'
import type { StudentStatusFilter } from '@/features/students/types/studentTypes'
import { studentStatusOptions } from '@/features/students/utils/studentStatus'

type StudentFiltersProps = {
  search: string
  status: StudentStatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: StudentStatusFilter) => void
}

export function StudentFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: StudentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full lg:max-w-md">
        <SearchInput
          label="Buscar aluno"
          name="student-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome"
          value={search}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Filtro de status">
        {studentStatusOptions.map((option) => (
          <button
            aria-selected={status === option.value}
            className={cn(
              'min-h-10 whitespace-nowrap rounded border px-3 text-sm font-medium transition-colors',
              status === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
