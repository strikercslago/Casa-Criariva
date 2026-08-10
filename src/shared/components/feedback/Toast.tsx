import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'

type ToastTone = 'info' | 'success' | 'error'

type ToastMessage = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type ToastContextValue = {
  notify: (message: Omit<ToastMessage, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const remove = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  const notify = useCallback(
    (message: Omit<ToastMessage, 'id'>) => {
      const id = crypto.randomUUID()
      setMessages((current) => [...current.slice(-2), { ...message, id }])
      window.setTimeout(() => remove(id), 4_500)
    },
    [remove],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 grid w-[calc(100vw-2rem)] max-w-sm gap-2"
      >
        {messages.map((message) => {
          const Icon = icons[message.tone]

          return (
            <div
              className="rounded-md border border-border bg-surface p-3 shadow-elevated"
              key={message.id}
            >
              <div className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{message.title}</p>
                  {message.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{message.description}</p>
                  ) : null}
                </div>
                <IconButton label="Fechar aviso" className="h-8 w-8" onClick={() => remove(message.id)}>
                  <X className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
