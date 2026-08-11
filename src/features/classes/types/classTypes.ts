import type { Database, Json } from '@/lib/supabase/database.types'
import type { StudentListItem } from '@/features/students/types/studentTypes'

export type ClassStatus = Database['public']['Enums']['class_status']
export type EnrollmentStatus = Database['public']['Enums']['enrollment_status']
export type ClassRow = Database['public']['Tables']['classes']['Row']
export type ClassScheduleRow = Database['public']['Tables']['class_schedules']['Row']
export type EnrollmentRow = Database['public']['Tables']['enrollments']['Row']
export type AuditEventRow = Database['public']['Tables']['audit_events']['Row']

export type ClassStatusFilter = 'all' | ClassStatus
export type ClassCapacityFilter = 'all' | 'with_spots' | 'full'

export type ClassListFilters = {
  capacity: ClassCapacityFilter
  page: number
  pageSize: number
  search: string
  status: ClassStatusFilter
}

export type ClassListItem = Pick<
  ClassRow,
  'capacity' | 'created_at' | 'description' | 'name' | 'status' | 'updated_at'
> & {
  active_enrollments: number
  available_spots: number | null
  class_id: string
  is_full: boolean
  schedules: ClassScheduleRow[]
}

export type ClassListResult = {
  classes: ClassListItem[]
  totalCount: number
  totalPages: number
}

export type EnrollmentWithStudent = EnrollmentRow & {
  student: StudentListItem | null
}

export type ClassDetail = ClassRow & {
  auditEvents: AuditEventRow[]
  class_schedules: ClassScheduleRow[]
  enrollments: EnrollmentWithStudent[]
}

export type ClassPayload = {
  capacity: number | null
  description: string | null
  name: string
  status: ClassStatus
}

export type ClassSchedulePayload = {
  end_time: string
  start_time: string
  weekday: number
}

export type ClassWithSchedulesPayload = {
  class: ClassPayload
  schedules: ClassSchedulePayload[]
}

export type JsonPayload = Json
