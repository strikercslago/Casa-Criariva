import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'

type PaginationProps = {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, onPrevious, onNext }: PaginationProps) {
  return (
    <nav className="flex items-center gap-2" aria-label="Paginacao">
      <IconButton label="Pagina anterior" disabled={page <= 1} onClick={onPrevious}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </IconButton>
      <span className="min-w-24 text-center text-sm text-muted-foreground">
        {page} de {totalPages}
      </span>
      <IconButton label="Proxima pagina" disabled={page >= totalPages} onClick={onNext}>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </IconButton>
    </nav>
  )
}
