import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Nao foi possivel carregar esta area.',
  description = 'Os dados exibidos podem estar desatualizados. Tente novamente em alguns instantes.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger/5 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          {onRetry ? (
            <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
