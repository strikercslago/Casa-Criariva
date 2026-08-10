import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { cn } from '@/shared/utils/cn'

type OverlayProps = {
  isOpen: boolean
  title: string
  children: ReactNode
  onClose: () => void
  side?: 'center' | 'right' | 'wide'
}

export function Overlay({ isOpen, title, children, onClose, side = 'center' }: OverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/35 p-3" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className={cn(
          'fixed bg-surface shadow-elevated',
          side === 'right' &&
            'bottom-0 right-0 top-0 w-full max-w-md overflow-y-auto border-l border-border',
          side === 'wide' &&
            'bottom-0 left-0 right-0 top-0 overflow-y-auto sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md sm:border sm:border-border',
          side === 'center' &&
            'left-1/2 top-1/2 w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-border',
        )}
        role="dialog"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <IconButton label="Fechar" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
        </header>
        <div className="p-4">{children}</div>
      </section>
    </div>
  )
}
