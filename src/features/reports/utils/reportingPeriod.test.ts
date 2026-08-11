import { describe, expect, it } from 'vitest'
import { buildCsv } from '@/features/reports/utils/csvExport'
import { formatPeriod, getComparisonLabel, normalizePeriod } from '@/features/reports/utils/reportingPeriod'

describe('reporting helpers', () => {
  it('normalizes inverted date ranges', () => {
    expect(normalizePeriod({ endDate: '2026-08-01', preset: 'custom', startDate: '2026-08-31' })).toEqual({
      endDate: '2026-08-31',
      preset: 'custom',
      startDate: '2026-08-01',
    })
  })

  it('formats periods and honest comparisons', () => {
    expect(formatPeriod({ endDate: '2026-08-31', startDate: '2026-08-01' })).toBe('01/08/2026 a 31/08/2026')
    expect(getComparisonLabel(120, 100)).toBe('+20,0% vs periodo anterior')
    expect(getComparisonLabel(120, 0)).toBe('Sem base comparavel')
  })

  it('exports CSV with BOM and escaped quotes', () => {
    const csv = buildCsv([{ amount: 10, name: 'Aula "Artes"' }], [
      { header: 'Nome', value: (row) => row.name },
      { header: 'Valor', value: (row) => row.amount },
    ])

    expect(csv).toContain('\ufeff"Nome";"Valor"')
    expect(csv).toContain('"Aula ""Artes""";"10"')
  })
})
