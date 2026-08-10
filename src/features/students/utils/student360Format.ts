import type { ClassScheduleRow } from '@/features/students/types/student360Types'

const weekdayLabels: Record<number, string> = {
  1: 'Segunda',
  2: 'Terca',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sabado',
  7: 'Domingo',
}

const shortWeekdayLabels: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
  7: 'Dom',
}

export function getWeekdayLabel(weekday: number) {
  return weekdayLabels[weekday] ?? String(weekday)
}

export function getShortWeekdayLabel(weekday: number) {
  return shortWeekdayLabels[weekday] ?? String(weekday)
}

export function formatMoney(value: number | string | null) {
  const numericValue = typeof value === 'string' ? Number(value) : value

  if (numericValue === null || Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(numericValue)
}

export function formatTime(value: string) {
  return value.slice(0, 5)
}

export function formatSchedules(schedules: Array<Pick<ClassScheduleRow, 'end_time' | 'start_time' | 'weekday'>>) {
  if (schedules.length === 0) {
    return 'Horario nao informado'
  }

  return schedules
    .slice()
    .sort((first, second) => first.weekday - second.weekday || first.start_time.localeCompare(second.start_time))
    .map((schedule) => `${getShortWeekdayLabel(schedule.weekday)} ${formatTime(schedule.start_time)}-${formatTime(schedule.end_time)}`)
    .join(', ')
}

export function calculateAge(birthDate: string | null, now = new Date()) {
  if (!birthDate) {
    return null
  }

  const birth = new Date(`${birthDate}T00:00:00`)
  let age = now.getFullYear() - birth.getFullYear()
  const hasBirthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())

  if (!hasBirthdayPassed) {
    age -= 1
  }

  return age >= 0 ? age : null
}

export function normalizePhoneForWhatsApp(phone: string | null) {
  if (!phone) {
    return null
  }

  const digits = phone.replace(/\D/g, '')

  if (digits.length < 10) {
    return null
  }

  return digits.startsWith('55') ? digits : `55${digits}`
}
