import type { Badge } from '@/shared/components/ui/Badge'
import type {
  CashFlowDirectionFilter,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
} from '@/features/finance/types/financeTypes'
import { formatMoney, paymentMethodLabels, paymentMethodOptions } from '@/features/billing/utils/billingFormat'

export { formatMoney, paymentMethodLabels, paymentMethodOptions }

type BadgeTone = NonNullable<Parameters<typeof Badge>[0]['tone']>

export const financialEntryTypeOptions: Array<{ label: string; value: FinancialEntryType | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Receitas', value: 'income' },
  { label: 'Despesas', value: 'expense' },
]

export const financialEntryStatusOptions: Array<{ label: string; value: FinancialEntryStatus }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Vencidos', value: 'overdue' },
  { label: 'Parciais', value: 'partial' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Recebidos', value: 'received' },
  { label: 'Cancelados', value: 'cancelled' },
]

export const cashFlowDirectionOptions: Array<{ label: string; value: CashFlowDirectionFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Entradas', value: 'income' },
  { label: 'Saidas', value: 'expense' },
]

export const paymentMethodLabelMap = paymentMethodLabels as Record<PaymentMethod, string>

export function getEntryTypeLabel(type: FinancialEntryType | string) {
  return type === 'income' ? 'Receita' : 'Despesa'
}

export function getDirectionLabel(direction: string) {
  return direction === 'income' ? 'Entrada' : 'Saida'
}

export function getFinancialStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    overdue: 'Vencido',
    paid: 'Pago',
    partial: 'Parcial',
    pending: 'Pendente',
    received: 'Recebido',
  }

  return labels[status] ?? status
}

export function getFinancialStatusTone(status: string): BadgeTone {
  if (status === 'paid' || status === 'received') {
    return 'success'
  }

  if (status === 'overdue') {
    return 'danger'
  }

  if (status === 'partial') {
    return 'warning'
  }

  if (status === 'cancelled') {
    return 'neutral'
  }

  return 'primary'
}

export function getDirectionTone(direction: string): BadgeTone {
  return direction === 'income' ? 'success' : 'danger'
}

export function getSourceLabel(sourceType: string) {
  if (sourceType === 'tuition_payment') return 'Mensalidade'
  if (sourceType === 'event_registration') return 'Evento'
  if (sourceType === 'material_purchase') return 'Compra de materiais'
  return 'Lancamento manual'
}

export function getOverdueLabel(daysOverdue: number) {
  if (daysOverdue <= 0) {
    return null
  }

  return `Vencido ha ${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}`
}
