import { describe, expect, it } from 'vitest'
import {
  formatQuantity,
  getFinanceStatusLabel,
  getMovementLabel,
  getPurchaseStatusLabel,
  getStockStatusLabel,
  getStockStatusTone,
  getUnitLabel,
} from '@/features/materials/utils/materialsFormat'
import { getSourceLabel } from '@/features/finance/utils/financeFormat'

describe('materialsFormat', () => {
  it('labels inventory status, movements and units', () => {
    expect(getUnitLabel('bottle')).toBe('Frasco')
    expect(getStockStatusLabel('low')).toBe('Estoque baixo')
    expect(getStockStatusTone('out')).toBe('danger')
    expect(getMovementLabel('adjustment_out')).toBe('Ajuste -')
    expect(formatQuantity(2.75)).toBe('2,75')
  })

  it('labels purchases and finance integration', () => {
    expect(getPurchaseStatusLabel('received')).toBe('Recebida')
    expect(getFinanceStatusLabel('pending')).toBe('A pagar')
    expect(getSourceLabel('material_purchase')).toBe('Compra de materiais')
  })
})
