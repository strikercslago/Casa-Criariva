import type { Badge } from '@/shared/components/ui/Badge'
import { createDateFormatter } from '@/app/config/localization'
import { formatMoney, paymentMethodOptions } from '@/features/billing/utils/billingFormat'
import type { EventRegistrationStatus, EventStatus, EventType, PaymentMethod } from '@/features/events/types/eventsTypes'

export { formatMoney, paymentMethodOptions }

type BadgeTone = NonNullable<Parameters<typeof Badge>[0]['tone']>

export const eventTypeOptions: Array<{ label: string; value: EventType | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Colonia', value: 'colony' },
  { label: 'Oficina', value: 'workshop' },
  { label: 'Atividade especial', value: 'special_activity' },
  { label: 'Outro', value: 'other' },
]

export const eventStatusOptions: Array<{ label: string; value: EventStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Aberto', value: 'open' },
  { label: 'Fechado', value: 'closed' },
  { label: 'Concluido', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
]

export const registrationStatusOptions: Array<{ label: string; value: EventRegistrationStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Confirmados', value: 'confirmed' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Lista de espera', value: 'waitlisted' },
  { label: 'Cancelados', value: 'cancelled' },
]

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank_transfer: 'Transferencia',
  card: 'Cartao',
  cash: 'Dinheiro',
  other: 'Outro',
  pix: 'PIX',
}

export function getEventTypeLabel(type: EventType | string) {
  const labels: Record<string, string> = {
    colony: 'Colonia',
    other: 'Outro',
    special_activity: 'Atividade especial',
    workshop: 'Oficina',
  }

  return labels[type] ?? type
}

export function getEventStatusLabel(status: EventStatus | string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    closed: 'Fechado',
    completed: 'Concluido',
    draft: 'Rascunho',
    open: 'Aberto',
  }

  return labels[status] ?? status
}

export function getEventStatusTone(status: EventStatus | string): BadgeTone {
  if (status === 'open') return 'success'
  if (status === 'draft') return 'neutral'
  if (status === 'closed') return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'primary'
}

export function getRegistrationStatusLabel(status: EventRegistrationStatus | string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelada',
    confirmed: 'Confirmada',
    pending: 'Pendente',
    waitlisted: 'Lista de espera',
  }

  return labels[status] ?? status
}

export function getRegistrationStatusTone(status: EventRegistrationStatus | string): BadgeTone {
  if (status === 'confirmed') return 'success'
  if (status === 'waitlisted') return 'warning'
  if (status === 'cancelled') return 'danger'
  return 'primary'
}

export function getFinanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    free: 'Gratuito',
    paid: 'Pago',
    partial: 'Parcial',
    pending: 'Pendente',
  }

  return labels[status] ?? status
}

export function getFinanceStatusTone(status: string): BadgeTone {
  if (status === 'paid' || status === 'free') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'cancelled') return 'neutral'
  return 'primary'
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return createDateFormatter({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

export function formatDateRange(first: string | null, last: string | null) {
  if (!first && !last) return 'Datas nao informadas'
  if (first === last || !last) return formatDate(first)
  return `${formatDate(first)} a ${formatDate(last)}`
}

export function formatTime(value: string) {
  return value.slice(0, 5)
}
