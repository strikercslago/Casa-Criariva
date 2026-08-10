import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export function Tabs({ children }: { children: ReactNode }) {
  return <div className="inline-flex rounded border border-border bg-muted p-1">{children}</div>
}

export function TabButton({
  className,
  isActive,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  return (
    <button
      className={cn(
        'h-8 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors',
        isActive && 'bg-surface text-foreground shadow-subtle',
        className,
      )}
      type="button"
      {...props}
    />
  )
}
