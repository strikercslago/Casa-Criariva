import type { ReactNode } from 'react'

type TooltipProps = {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs font-medium text-background shadow-elevated group-hover:block group-focus-within:block"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  )
}
