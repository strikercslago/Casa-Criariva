import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/15 text-amber-700',
  danger: 'border-danger/30 bg-danger/10 text-danger',
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center whitespace-nowrap rounded border px-2 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
