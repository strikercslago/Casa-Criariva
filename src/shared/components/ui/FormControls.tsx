import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/shared/utils/cn'

export function Textarea({
  className,
  label,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const inputId = id ?? props.name

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor={inputId}>
      <span>{label}</span>
      <textarea
        className={cn(
          'min-h-24 rounded border border-border bg-surface px-3 py-2 text-sm shadow-subtle placeholder:text-muted-foreground',
          className,
        )}
        id={inputId}
        {...props}
      />
    </label>
  )
}

export function Select({
  className,
  label,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const inputId = id ?? props.name

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor={inputId}>
      <span>{label}</span>
      <select
        className={cn('h-10 rounded border border-border bg-surface px-3 text-sm shadow-subtle', className)}
        id={inputId}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const inputId = id ?? props.name

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
      <input
        className={cn('h-4 w-4 rounded border-border accent-primary', className)}
        id={inputId}
        type="checkbox"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}

export function Switch({
  label,
  checked,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
      <input className="peer sr-only" checked={checked} type="checkbox" role="switch" {...props} />
      <span
        className={cn(
          'relative h-6 w-11 rounded-full border border-border bg-muted transition-colors peer-checked:bg-primary',
          className,
        )}
      >
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-subtle transition-transform peer-checked:translate-x-5" />
      </span>
      <span>{label}</span>
    </label>
  )
}
