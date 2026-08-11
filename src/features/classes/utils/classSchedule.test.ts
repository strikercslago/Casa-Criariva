import { describe, expect, it } from 'vitest'
import { formatClassSchedules, getWeekdayLabel, hasScheduleOverlap } from './classSchedule'

describe('classSchedule utils', () => {
  it('formats schedules using ISO weekdays sorted by day and time', () => {
    expect(
      formatClassSchedules([
        { end_time: '16:30:00', start_time: '15:00:00', weekday: 4 },
        { end_time: '10:00:00', start_time: '09:00:00', weekday: 1 },
      ]),
    ).toBe('Seg 09:00-10:00, Qui 15:00-16:30')
  })

  it('detects overlapping schedules on the same weekday only', () => {
    expect(
      hasScheduleOverlap([
        { end_time: '10:30', start_time: '09:00', weekday: 2 },
        { end_time: '11:00', start_time: '10:00', weekday: 2 },
      ]),
    ).toBe(true)

    expect(
      hasScheduleOverlap([
        { end_time: '10:30', start_time: '09:00', weekday: 2 },
        { end_time: '11:00', start_time: '10:00', weekday: 3 },
      ]),
    ).toBe(false)
  })

  it('labels ISO weekdays from Monday to Sunday', () => {
    expect(getWeekdayLabel(1)).toBe('Segunda')
    expect(getWeekdayLabel(7)).toBe('Domingo')
  })
})
