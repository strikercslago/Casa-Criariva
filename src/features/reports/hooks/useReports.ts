import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getAttendanceReport,
  getClassesReport,
  getDashboardAttention,
  getDashboardOperations,
  getDashboardToday,
  getEventsReport,
  getFinancialReport,
  getInventoryReport,
  getStudentsReport,
} from '@/features/reports/api/reportsApi'
import { dashboardKeys, reportsKeys } from '@/features/reports/hooks/reportsKeys'
import type { ReportsPeriod } from '@/features/reports/types/reportsTypes'

const DASHBOARD_TODAY_STALE_MS = 60_000
const DASHBOARD_SUMMARY_STALE_MS = 120_000
const REPORTS_STALE_MS = 180_000

export function useDashboardToday(date: string) {
  return useQuery({
    queryFn: () => getDashboardToday(date),
    queryKey: dashboardKeys.today(date),
    staleTime: DASHBOARD_TODAY_STALE_MS,
  })
}

export function useDashboardAttention(date: string) {
  return useQuery({
    queryFn: () => getDashboardAttention(date),
    queryKey: dashboardKeys.attention(date),
    staleTime: DASHBOARD_TODAY_STALE_MS,
  })
}

export function useDashboardOperations(referenceMonth: string) {
  return useQuery({
    queryFn: () => getDashboardOperations(referenceMonth),
    queryKey: dashboardKeys.operations(referenceMonth),
    staleTime: DASHBOARD_SUMMARY_STALE_MS,
  })
}

export function useFinancialReport(period: ReportsPeriod) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => getFinancialReport(period.startDate, period.endDate),
    queryKey: reportsKeys.financial(period),
    staleTime: REPORTS_STALE_MS,
  })
}

export function useStudentsReport(period: ReportsPeriod) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => getStudentsReport(period.startDate, period.endDate),
    queryKey: reportsKeys.students(period),
    staleTime: REPORTS_STALE_MS,
  })
}

export function useClassesReport() {
  return useQuery({
    queryFn: getClassesReport,
    queryKey: reportsKeys.classes(),
    staleTime: REPORTS_STALE_MS,
  })
}

export function useAttendanceReport(period: ReportsPeriod) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => getAttendanceReport(period.startDate, period.endDate),
    queryKey: reportsKeys.attendance(period),
    staleTime: REPORTS_STALE_MS,
  })
}

export function useEventsReport(period: ReportsPeriod) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => getEventsReport(period.startDate, period.endDate),
    queryKey: reportsKeys.events(period),
    staleTime: REPORTS_STALE_MS,
  })
}

export function useInventoryReport(period: ReportsPeriod) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => getInventoryReport(period.startDate, period.endDate),
    queryKey: reportsKeys.inventory(period),
    staleTime: REPORTS_STALE_MS,
  })
}
