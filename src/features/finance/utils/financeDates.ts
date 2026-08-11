import { addMonths, getCurrentReferenceMonth, parseIsoDate, toIsoDate } from '@/features/billing/utils/billingDates'

export { addMonths, formatReferenceMonth, formatShortDate, getCurrentReferenceMonth, toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/billing/utils/billingDates'

export function getReferenceMonthEnd(referenceMonth: string) {
  const nextMonth = parseIsoDate(addMonths(referenceMonth, 1))
  nextMonth.setDate(0)
  return toIsoDate(nextMonth)
}

export function toMonthInputValue(referenceMonth = getCurrentReferenceMonth()) {
  return referenceMonth.slice(0, 7)
}

export function fromMonthInputValue(value: string) {
  return `${value}-01`
}
