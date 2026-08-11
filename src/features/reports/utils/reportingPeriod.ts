import { createDateFormatter, createNumberFormatter } from '@/app/config/localization'
import { addMonths, getCurrentReferenceMonth, getReferenceMonthEnd } from '@/features/finance/utils/financeDates'
import { parseIsoDate, toIsoDate } from '@/features/billing/utils/billingDates'
import type { PeriodPreset, ReportsPeriod } from '@/features/reports/types/reportsTypes'

export const periodPresetOptions: Array<{ label: string; value: PeriodPreset }> = [
  { label: 'Este mes', value: 'current_month' },
  { label: 'Mes anterior', value: 'previous_month' },
  { label: 'Ultimos 3 meses', value: 'last_3_months' },
  { label: 'Este ano', value: 'current_year' },
  { label: 'Personalizado', value: 'custom' },
]

export function getPeriodFromPreset(preset: PeriodPreset, today = new Date()): ReportsPeriod {
  const currentMonth = getCurrentReferenceMonth(today)

  if (preset === 'previous_month') {
    const startDate = addMonths(currentMonth, -1)
    return { endDate: getReferenceMonthEnd(startDate), preset, startDate }
  }

  if (preset === 'last_3_months') {
    return { endDate: toIsoDate(today), preset, startDate: addMonths(currentMonth, -2) }
  }

  if (preset === 'current_year') {
    return { endDate: toIsoDate(today), preset, startDate: `${today.getFullYear()}-01-01` }
  }

  return { endDate: toIsoDate(today), preset, startDate: currentMonth }
}

export function normalizePeriod(period: ReportsPeriod): ReportsPeriod {
  if (period.startDate <= period.endDate) return period
  return { ...period, endDate: period.startDate, startDate: period.endDate }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return createDateFormatter().format(parseIsoDate(value.slice(0, 10)))
}

export function formatPeriod(period: Pick<ReportsPeriod, 'endDate' | 'startDate'>) {
  return `${formatDate(period.startDate)} a ${formatDate(period.endDate)}`
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Sem base'
  return `${createNumberFormatter({ maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Number(value))}%`
}

export function getComparisonLabel(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return 'Sem base comparavel'
  const diff = ((current - previous) / Math.abs(previous)) * 100
  const sign = diff > 0 ? '+' : ''
  return `${sign}${createNumberFormatter({ maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(diff)}% vs periodo anterior`
}

export function formatTime(value: string | null | undefined) {
  if (!value) return '-'
  return value.slice(0, 5)
}
