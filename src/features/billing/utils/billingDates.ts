import { createDateFormatter } from '@/app/config/localization'

const monthFormatter = createDateFormatter({
  month: 'long',
  year: 'numeric',
})

const shortDateFormatter = createDateFormatter({
  day: '2-digit',
  month: '2-digit',
})

const dateTimeFormatter = createDateFormatter({
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getCurrentReferenceMonth(now = new Date()) {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

export function addMonths(referenceMonth: string, months: number) {
  const date = parseIsoDate(referenceMonth)
  date.setMonth(date.getMonth() + months, 1)
  return toIsoDate(date)
}

export function formatReferenceMonth(referenceMonth: string) {
  const label = monthFormatter.format(parseIsoDate(referenceMonth))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(parseIsoDate(value.slice(0, 10)))
}

export function formatPaymentDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function toLocalDateTimeInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function toPaymentTimestamp(value: string) {
  const date = new Date(value)
  return date.toISOString()
}
