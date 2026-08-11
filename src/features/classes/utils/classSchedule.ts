import type { ClassSchedulePayload, ClassScheduleRow } from '@/features/classes/types/classTypes'

export const weekdayOptions = [
  { label: 'Segunda', shortLabel: 'Seg', value: 1 },
  { label: 'Terca', shortLabel: 'Ter', value: 2 },
  { label: 'Quarta', shortLabel: 'Qua', value: 3 },
  { label: 'Quinta', shortLabel: 'Qui', value: 4 },
  { label: 'Sexta', shortLabel: 'Sex', value: 5 },
  { label: 'Sabado', shortLabel: 'Sab', value: 6 },
  { label: 'Domingo', shortLabel: 'Dom', value: 7 },
] as const

export function getWeekdayLabel(weekday: number) {
  return weekdayOptions.find((option) => option.value === weekday)?.label ?? String(weekday)
}

export function getShortWeekdayLabel(weekday: number) {
  return weekdayOptions.find((option) => option.value === weekday)?.shortLabel ?? String(weekday)
}

export function formatTime(value: string) {
  return value.slice(0, 5)
}

export function formatClassSchedules(
  schedules: Array<Pick<ClassScheduleRow | ClassSchedulePayload, 'end_time' | 'start_time' | 'weekday'>>,
) {
  if (schedules.length === 0) {
    return 'Horario nao informado'
  }

  return schedules
    .slice()
    .sort((first, second) => first.weekday - second.weekday || first.start_time.localeCompare(second.start_time))
    .map((schedule) => `${getShortWeekdayLabel(schedule.weekday)} ${formatTime(schedule.start_time)}-${formatTime(schedule.end_time)}`)
    .join(', ')
}

export function hasScheduleOverlap(schedules: ClassSchedulePayload[]) {
  return schedules.some((first, firstIndex) =>
    schedules.some(
      (second, secondIndex) =>
        firstIndex < secondIndex &&
        first.weekday === second.weekday &&
        first.start_time < second.end_time &&
        second.start_time < first.end_time,
    ),
  )
}
