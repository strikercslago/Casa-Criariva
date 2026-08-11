import { describe, expect, it } from 'vitest'
import {
  getDirectionLabel,
  getDirectionTone,
  getFinancialStatusLabel,
  getFinancialStatusTone,
  getSourceLabel,
} from '@/features/finance/utils/financeFormat'

describe('financeFormat', () => {
  it('labels financial statuses and tones', () => {
    expect(getFinancialStatusLabel('received')).toBe('Recebido')
    expect(getFinancialStatusLabel('paid')).toBe('Pago')
    expect(getFinancialStatusTone('overdue')).toBe('danger')
    expect(getFinancialStatusTone('partial')).toBe('warning')
    expect(getFinancialStatusTone('received')).toBe('success')
  })

  it('labels cash-flow direction and source without duplicating concepts', () => {
    expect(getDirectionLabel('income')).toBe('Entrada')
    expect(getDirectionTone('expense')).toBe('danger')
    expect(getSourceLabel('tuition_payment')).toBe('Mensalidade')
    expect(getSourceLabel('event_registration')).toBe('Evento')
    expect(getSourceLabel('material_purchase')).toBe('Compra de materiais')
    expect(getSourceLabel('financial_settlement')).toBe('Lancamento manual')
  })
})
