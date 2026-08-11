import type { MonthlyFeeListRow, MonthlyFeeStatus, PaymentMethod } from '@/features/billing/types/billingTypes'

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  style: 'currency',
})

export const billingStatusOptions: Array<{ label: string; value: MonthlyFeeStatus }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Vencidas', value: 'overdue' },
  { label: 'Parciais', value: 'partial' },
  { label: 'Pagas', value: 'paid' },
  { label: 'Canceladas', value: 'cancelled' },
]

export const paymentMethodOptions: Array<{ label: string; value: PaymentMethod }> = [
  { label: 'PIX', value: 'pix' },
  { label: 'Dinheiro', value: 'cash' },
  { label: 'Cartao', value: 'card' },
  { label: 'Transferencia', value: 'bank_transfer' },
  { label: 'Outro', value: 'other' },
]

export const paymentMethodLabels: Record<PaymentMethod, string> = Object.fromEntries(
  paymentMethodOptions.map((option) => [option.value, option.label]),
) as Record<PaymentMethod, string>

export function formatMoney(value: number | string | null | undefined) {
  return moneyFormatter.format(Number(value ?? 0))
}

export function getMonthlyFeeStatusLabel(fee: Pick<MonthlyFeeListRow, 'computed_status' | 'is_partial'>) {
  if (fee.computed_status === 'overdue' && fee.is_partial) {
    return 'Vencida - Parcial'
  }

  const labels: Record<string, string> = {
    cancelled: 'Cancelada',
    overdue: 'Vencida',
    paid: 'Paga',
    partial: 'Parcial',
    pending: 'Pendente',
  }

  return labels[fee.computed_status] ?? fee.computed_status
}

export function getMonthlyFeeStatusTone(fee: Pick<MonthlyFeeListRow, 'computed_status' | 'is_partial'>) {
  if (fee.computed_status === 'paid') {
    return 'success' as const
  }

  if (fee.computed_status === 'cancelled') {
    return 'neutral' as const
  }

  if (fee.computed_status === 'overdue') {
    return 'danger' as const
  }

  if (fee.computed_status === 'partial' || fee.is_partial) {
    return 'warning' as const
  }

  return 'primary' as const
}

export function getOverdueLabel(daysOverdue: number) {
  if (daysOverdue <= 0) {
    return null
  }

  return `Vencida ha ${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}`
}
