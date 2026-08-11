import type { ReportsPeriod } from '@/features/reports/types/reportsTypes'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  attention: (date: string) => [...dashboardKeys.all, 'attention', date] as const,
  attentionRoot: () => [...dashboardKeys.all, 'attention'] as const,
  operations: (referenceMonth: string) => [...dashboardKeys.all, 'operations', referenceMonth] as const,
  operationsRoot: () => [...dashboardKeys.all, 'operations'] as const,
  today: (date: string) => [...dashboardKeys.all, 'today', date] as const,
  todayRoot: () => [...dashboardKeys.all, 'today'] as const,
}

export const reportsKeys = {
  all: ['reports'] as const,
  attendance: (period: ReportsPeriod) => [...reportsKeys.all, 'attendance', period] as const,
  classes: () => [...reportsKeys.all, 'classes'] as const,
  events: (period: ReportsPeriod) => [...reportsKeys.all, 'events', period] as const,
  financial: (period: ReportsPeriod) => [...reportsKeys.all, 'financial', period] as const,
  inventory: (period: ReportsPeriod) => [...reportsKeys.all, 'inventory', period] as const,
  students: (period: ReportsPeriod) => [...reportsKeys.all, 'students', period] as const,
}
