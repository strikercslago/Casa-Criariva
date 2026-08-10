import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Input({ className, id, label, error, ...props }: InputProps) {
  const inputId = id ?? props.name
  const errorId = error && inputId ? `${inputId}-error` : undefined

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-10 rounded border border-border bg-surface px-3 text-sm text-foreground shadow-subtle transition-colors placeholder:text-muted-foreground',
          'focus-visible:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
          error && 'border-danger',
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? (
        <span className="text-xs font-medium text-danger" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  )
}
