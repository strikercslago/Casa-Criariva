import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function SearchInput({ className, label, id, ...props }: SearchInputProps) {
  const inputId = id ?? props.name

  return (
    <label className="relative block" htmlFor={inputId}>
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        className={cn(
          'h-10 w-full rounded border border-border bg-surface py-2 pl-9 pr-3 text-sm shadow-subtle placeholder:text-muted-foreground',
          className,
        )}
        id={inputId}
        type="search"
        {...props}
      />
    </label>
  )
}
