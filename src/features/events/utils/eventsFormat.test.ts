import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  formatMoney,
  getEventStatusLabel,
  getEventStatusTone,
  getFinanceStatusLabel,
  getFinanceStatusTone,
  getRegistrationStatusLabel,
  getRegistrationStatusTone,
} from '@/features/events/utils/eventsFormat'

describe('eventsFormat', () => {
  it('formats event and registration statuses', () => {
    expect(getEventStatusLabel('open')).toBe('Aberto')
    expect(getEventStatusTone('cancelled')).toBe('danger')
    expect(getRegistrationStatusLabel('waitlisted')).toBe('Lista de espera')
    expect(getRegistrationStatusTone('confirmed')).toBe('success')
  })

  it('formats finance statuses and dates', () => {
    expect(getFinanceStatusLabel('free')).toBe('Gratuito')
    expect(getFinanceStatusTone('partial')).toBe('warning')
    expect(formatMoney(120).replace(/\s/u, ' ')).toBe('R$ 120,00')
    expect(formatDateRange('2026-08-11', '2026-08-13')).toBe('11/08/2026 a 13/08/2026')
  })
})
