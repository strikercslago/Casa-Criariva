import { describe, expect, it } from 'vitest'
import { addDays, formatAgendaRange, formatTimeRange, getWeekRange } from './agendaDates'

describe('agendaDates', () => {
  it('navigates dates and computes ISO week ranges', () => {
    expect(addDays('2026-08-11', 1)).toBe('2026-08-12')
    expect(getWeekRange('2026-08-11')).toEqual({ endDate: '2026-08-16', startDate: '2026-08-10' })
  })

  it('formats date ranges and time ranges', () => {
    expect(formatAgendaRange('2026-08-11', '2026-08-11')).toContain('11 de agosto')
    expect(formatAgendaRange('2026-08-10', '2026-08-16')).toContain('a')
    expect(formatTimeRange('14:00:00', '15:30:00')).toBe('14:00 - 15:30')
  })
})
