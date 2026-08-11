import type { Badge } from '@/shared/components/ui/Badge'
import { formatMoney, paymentMethodOptions } from '@/features/billing/utils/billingFormat'
import type { InventoryMovementType, MaterialUnit, PurchaseStatus } from '@/features/materials/types/materialsTypes'

export { formatMoney, paymentMethodOptions }

type BadgeTone = NonNullable<Parameters<typeof Badge>[0]['tone']>

export const materialUnitOptions: Array<{ label: string; value: MaterialUnit }> = [
  { label: 'Unidade', value: 'unit' },
  { label: 'Pacote', value: 'package' },
  { label: 'Caixa', value: 'box' },
  { label: 'Folha', value: 'sheet' },
  { label: 'Rolo', value: 'roll' },
  { label: 'Litro', value: 'liter' },
  { label: 'Mililitro', value: 'milliliter' },
  { label: 'Quilo', value: 'kilogram' },
  { label: 'Grama', value: 'gram' },
  { label: 'Metro', value: 'meter' },
  { label: 'Frasco', value: 'bottle' },
  { label: 'Outro', value: 'other' },
]

export const purchaseStatusOptions: Array<{ label: string; value: PurchaseStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Recebidas', value: 'received' },
  { label: 'Canceladas', value: 'cancelled' },
]

export function getUnitLabel(unit: MaterialUnit | string) {
  return materialUnitOptions.find((option) => option.value === unit)?.label ?? unit
}

export function getStockStatusLabel(status: string) {
  if (status === 'out') return 'Sem estoque'
  if (status === 'low') return 'Estoque baixo'
  return 'OK'
}

export function getStockStatusTone(status: string): BadgeTone {
  if (status === 'out') return 'danger'
  if (status === 'low') return 'warning'
  return 'success'
}

export function getMovementLabel(type: InventoryMovementType | string) {
  const labels: Record<string, string> = {
    adjustment_in: 'Ajuste +',
    adjustment_out: 'Ajuste -',
    consumption: 'Consumo',
    initial_stock: 'Estoque inicial',
    loss: 'Perda',
    purchase: 'Compra',
    return: 'Devolucao',
  }

  return labels[type] ?? type
}

export function getPurchaseStatusLabel(status: PurchaseStatus | string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelada',
    draft: 'Rascunho',
    received: 'Recebida',
  }

  return labels[status] ?? status
}

export function getPurchaseStatusTone(status: PurchaseStatus | string): BadgeTone {
  if (status === 'received') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

export function getFinanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    draft: 'Sem financeiro',
    paid: 'Pago',
    partial: 'Parcial',
    pending: 'A pagar',
  }

  return labels[status] ?? status
}

export function getFinanceStatusTone(status: string): BadgeTone {
  if (status === 'paid') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'cancelled' || status === 'draft') return 'neutral'
  return 'primary'
}

export function formatQuantity(value: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3, minimumFractionDigits: 0 }).format(Number(value ?? 0))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit' }).format(new Date(value))
}
