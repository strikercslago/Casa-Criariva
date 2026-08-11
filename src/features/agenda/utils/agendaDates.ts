import { createDateFormatter } from '@/app/config/localization'

const longDateFormatter = createDateFormatter({
  day: 'numeric',
  month: 'long',
  weekday: 'long',
})

const shortDateFormatter = createDateFormatter({
  day: '2-digit',
  month: '2-digit',
  weekday: 'short',
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

export function addDays(value: string, days: number) {
  const date = parseIsoDate(value)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function getWeekRange(value: string) {
  const date = parseIsoDate(value)
  const isoDay = date.getDay() === 0 ? 7 : date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - (isoDay - 1))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { endDate: toIsoDate(end), startDate: toIsoDate(start) }
}

export function formatLongAgendaDate(value: string) {
  return longDateFormatter.format(parseIsoDate(value))
}

export function formatShortAgendaDate(value: string) {
  return shortDateFormatter.format(parseIsoDate(value))
}

export function formatAgendaRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatLongAgendaDate(startDate)
  }

  return `${formatShortAgendaDate(startDate)} a ${formatShortAgendaDate(endDate)}`
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`
}
