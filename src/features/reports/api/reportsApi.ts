import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type {
  AttendanceByClassRow,
  AttendanceByStudentRow,
  AttendanceReport,
  ClassesReport,
  ClassesReportRow,
  DashboardAttentionItem,
  DashboardOperations,
  DashboardToday,
  EventsReport,
  EventsReportRow,
  FinancialReport,
  FinancialReportCashFlowRow,
  FinancialReportCategoryRow,
  InventoryLowStockRow,
  InventoryMovementReportRow,
  InventoryReport,
  StudentAgeBandRow,
  StudentClassDistributionRow,
  StudentsReport,
} from '@/features/reports/types/reportsTypes'

const REPORTS_TIMEOUT_MS = 14_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function getDashboardToday(day: string): Promise<DashboardToday> {
  const rows = await rpcRows<DashboardToday>('get_dashboard_today', { p_day: day })
  return rows[0] ?? emptyDashboardToday(day)
}

export async function getDashboardAttention(day: string): Promise<DashboardAttentionItem[]> {
  return rpcRows<DashboardAttentionItem>('get_dashboard_attention', { p_day: day })
}

export async function getDashboardOperations(referenceMonth: string): Promise<DashboardOperations> {
  const rows = await rpcRows<DashboardOperations>('get_dashboard_operations', { p_reference_month: referenceMonth })
  return rows[0] ?? emptyDashboardOperations(referenceMonth)
}

export async function getFinancialReport(startDate: string, endDate: string): Promise<FinancialReport> {
  const rows = await rpcRows<FinancialReport>('get_financial_report', { p_end_date: endDate, p_start_date: startDate })
  const row = rows[0] ?? emptyFinancialReport(startDate, endDate)
  return {
    ...row,
    cash_flow_rows: parseArray<FinancialReportCashFlowRow>(row.cash_flow_rows),
    expenses_by_category: parseArray<FinancialReportCategoryRow>(row.expenses_by_category),
  }
}

export async function getStudentsReport(startDate: string, endDate: string): Promise<StudentsReport> {
  const rows = await rpcRows<StudentsReport>('get_students_report', { p_end_date: endDate, p_start_date: startDate })
  const row = rows[0] ?? emptyStudentsReport(startDate, endDate)
  return {
    ...row,
    age_bands: parseArray<StudentAgeBandRow>(row.age_bands),
    class_distribution: parseArray<StudentClassDistributionRow>(row.class_distribution),
  }
}

export async function getClassesReport(): Promise<ClassesReport> {
  const rows = await rpcRows<ClassesReport>('get_classes_report', {})
  const row = rows[0] ?? emptyClassesReport()
  return {
    ...row,
    classes: parseArray<ClassesReportRow>(row.classes),
  }
}

export async function getAttendanceReport(startDate: string, endDate: string): Promise<AttendanceReport> {
  const rows = await rpcRows<AttendanceReport>('get_attendance_report', { p_end_date: endDate, p_start_date: startDate })
  const row = rows[0] ?? emptyAttendanceReport(startDate, endDate)
  return {
    ...row,
    by_class: parseArray<AttendanceByClassRow>(row.by_class),
    by_student: parseArray<AttendanceByStudentRow>(row.by_student),
  }
}

export async function getEventsReport(startDate: string, endDate: string): Promise<EventsReport> {
  const rows = await rpcRows<EventsReport>('get_events_report', { p_end_date: endDate, p_start_date: startDate })
  const row = rows[0] ?? emptyEventsReport(startDate, endDate)
  return {
    ...row,
    events: parseArray<EventsReportRow>(row.events),
  }
}

export async function getInventoryReport(startDate: string, endDate: string): Promise<InventoryReport> {
  const rows = await rpcRows<InventoryReport>('get_inventory_report', { p_end_date: endDate, p_start_date: startDate })
  const row = rows[0] ?? emptyInventoryReport(startDate, endDate)
  return {
    ...row,
    low_stock_materials: parseArray<InventoryLowStockRow>(row.low_stock_materials),
    movement_rows: parseArray<InventoryMovementReportRow>(row.movement_rows),
  }
}

async function rpcRows<TRow>(name: string, args: Record<string, unknown>): Promise<TRow[]> {
  const supabase = getClient()
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: Json | null; error: { message: string } | null }>
  const { data, error } = await withTimeout(
    rpc(name, args),
    REPORTS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw new AppError('unknown', error.message)
  }

  return (data ?? []) as TRow[]
}

function parseArray<TRow>(value: unknown): TRow[] {
  return Array.isArray(value) ? (value as TRow[]) : []
}

function emptyDashboardToday(day: string): DashboardToday {
  return {
    day_date: day,
    events_today_count: 0,
    expected_students: 0,
    next_event_id: '',
    next_event_name: '',
    next_event_start: '',
    next_session_class_name: '',
    next_session_expected_students: 0,
    next_session_id: '',
    next_session_start: '',
    pending_sessions_count: 0,
    sessions_count: 0,
  }
}

function emptyDashboardOperations(referenceMonth: string): DashboardOperations {
  return {
    active_classes_count: 0,
    active_students_count: 0,
    archived_students_count: 0,
    attendance_absent_count: 0,
    attendance_excused_count: 0,
    attendance_pending_sessions: 0,
    attendance_present_count: 0,
    attendance_rate: 0,
    available_spots: 0,
    cash_in: 0,
    cash_out: 0,
    class_active_enrollments: 0,
    class_occupancy_rate: 0,
    class_total_capacity: 0,
    full_classes_count: 0,
    low_stock_count: 0,
    net_students_change: 0,
    new_students_count: 0,
    next_event_date: '',
    next_event_id: '',
    next_event_name: '',
    out_of_stock_count: 0,
    overdue_billing_amount: 0,
    overdue_billing_count: 0,
    payable_amount: 0,
    receivable_amount: 0,
    reference_month: referenceMonth,
    result_amount: 0,
    upcoming_events_count: 0,
  }
}

function emptyFinancialReport(startDate: string, endDate: string): FinancialReport {
  return {
    cash_flow_rows: [],
    cash_in: 0,
    cash_out: 0,
    end_date: endDate,
    expenses_by_category: [],
    other_income: 0,
    payable_amount: 0,
    previous_cash_in: 0,
    previous_cash_out: 0,
    previous_result_amount: 0,
    receivable_amount: 0,
    result_amount: 0,
    start_date: startDate,
    tuition_received: 0,
  }
}

function emptyStudentsReport(startDate: string, endDate: string): StudentsReport {
  return { active_students_count: 0, age_bands: [], archived_students_count: 0, class_distribution: [], end_date: endDate, net_students_change: 0, new_students_count: 0, start_date: startDate }
}

function emptyClassesReport(): ClassesReport {
  return { active_classes_count: 0, available_spots: 0, class_active_enrollments: 0, class_occupancy_rate: 0, class_total_capacity: 0, classes: [], full_classes_count: 0 }
}

function emptyAttendanceReport(startDate: string, endDate: string): AttendanceReport {
  return { absent_count: 0, attendance_rate: 0, by_class: [], by_student: [], end_date: endDate, excused_count: 0, pending_sessions_count: 0, present_count: 0, sessions_count: 0, start_date: startDate }
}

function emptyEventsReport(startDate: string, endDate: string): EventsReport {
  return { confirmed_count: 0, end_date: endDate, events: [], events_count: 0, expected_revenue: 0, occupancy_rate: 0, receivable_amount: 0, received_amount: 0, registrations_count: 0, start_date: startDate, total_capacity: 0 }
}

function emptyInventoryReport(startDate: string, endDate: string): InventoryReport {
  return { active_materials_count: 0, consumption_quantity: 0, end_date: endDate, loss_quantity: 0, low_stock_count: 0, low_stock_materials: [], movement_rows: [], out_of_stock_count: 0, purchased_quantity: 0, purchases_amount: 0, start_date: startDate }
}
