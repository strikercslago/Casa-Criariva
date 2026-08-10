import type { HTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className={cn('w-full min-w-[640px] border-collapse text-sm', className)} {...props} />
      </div>
    </div>
  )
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('border-b border-border px-3 py-3 text-left font-semibold', className)} {...props} />
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-3 py-3 text-muted-foreground', className)} {...props} />
}
