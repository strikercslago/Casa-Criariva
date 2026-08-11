import type { Database, Json } from '@/lib/supabase/database.types'

export type DashboardToday = Database['public']['Functions']['get_dashboard_today']['Returns'][number]
export type DashboardAttentionItem = Database['public']['Functions']['get_dashboard_attention']['Returns'][number]
export type DashboardOperations = Database['public']['Functions']['get_dashboard_operations']['Returns'][number]

export type FinancialReport = Omit<Database['public']['Functions']['get_financial_report']['Returns'][number], 'cash_flow_rows' | 'expenses_by_category'> & {
  cash_flow_rows: FinancialReportCashFlowRow[]
  expenses_by_category: FinancialReportCategoryRow[]
}
export type StudentsReport = Omit<Database['public']['Functions']['get_students_report']['Returns'][number], 'age_bands' | 'class_distribution'> & {
  age_bands: StudentAgeBandRow[]
  class_distribution: StudentClassDistributionRow[]
}
export type ClassesReport = Omit<Database['public']['Functions']['get_classes_report']['Returns'][number], 'classes'> & {
  classes: ClassesReportRow[]
}
export type AttendanceReport = Omit<Database['public']['Functions']['get_attendance_report']['Returns'][number], 'by_class' | 'by_student'> & {
  by_class: AttendanceByClassRow[]
  by_student: AttendanceByStudentRow[]
}
export type EventsReport = Omit<Database['public']['Functions']['get_events_report']['Returns'][number], 'events'> & {
  events: EventsReportRow[]
}
export type InventoryReport = Omit<Database['public']['Functions']['get_inventory_report']['Returns'][number], 'low_stock_materials' | 'movement_rows'> & {
  low_stock_materials: InventoryLowStockRow[]
  movement_rows: InventoryMovementReportRow[]
}

export type ReportsPeriod = {
  endDate: string
  preset: PeriodPreset
  startDate: string
}

export type PeriodPreset = 'current_month' | 'previous_month' | 'last_3_months' | 'current_year' | 'custom'
export type ReportType = 'monthly' | 'financial' | 'students' | 'classes' | 'attendance' | 'events' | 'inventory'

export type FinancialReportCategoryRow = {
  amount: number
  category_name: string
}

export type FinancialReportCashFlowRow = {
  amount: number
  category_name: string | null
  date: string
  description: string
  direction: 'income' | 'expense'
  source_type: string
}

export type StudentClassDistributionRow = {
  active_students: number
  class_name: string
}

export type StudentAgeBandRow = {
  age_band: string
  student_count: number
}

export type ClassesReportRow = {
  active_enrollments: number
  available_spots: number | null
  capacity: number | null
  class_id: string
  is_full: boolean
  name: string
  occupancy_rate: number | null
  schedules: Json
}

export type AttendanceByClassRow = {
  absent_count: number
  attendance_rate: number | null
  class_id: string
  class_name: string
  excused_count: number
  pending_sessions_count: number
  present_count: number
  sessions_count: number
}

export type AttendanceByStudentRow = {
  absent_count: number
  attendance_rate: number | null
  excused_count: number
  present_count: number
  recorded_classes: number
  student_id: string
  student_name: string
}

export type EventsReportRow = {
  capacity: number | null
  confirmed_count: number
  event_id: string
  expected_revenue: number
  first_session_date: string
  last_session_date: string
  name: string
  receivable_amount: number
  received_amount: number
  registrations_count: number
  status: string
}

export type InventoryLowStockRow = {
  current_stock: number
  material_id: string
  minimum_stock: number
  name: string
  stock_status: 'out' | 'low' | 'ok'
  unit: string
}

export type InventoryMovementReportRow = {
  date: string
  material_name: string
  movement_type: string
  quantity: number
  unit: string
  unit_cost: number | null
}
