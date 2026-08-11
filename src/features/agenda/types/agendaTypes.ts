import type { Database } from '@/lib/supabase/database.types'

export type ClassSessionStatus = Database['public']['Enums']['class_session_status']
export type AttendanceStatus = Database['public']['Enums']['attendance_status']
export type ClassSessionRow = Database['public']['Tables']['class_sessions']['Row']
export type AttendanceRecordRow = Database['public']['Tables']['attendance_records']['Row']

export type AgendaAttendanceState = 'cancelled' | 'no_students' | 'pending' | 'recorded'

export type AgendaSession = {
  absent_count: number
  attendance_state: AgendaAttendanceState
  class_id: string
  class_name: string
  end_time: string
  excused_count: number
  expected_students: number
  notes: string | null
  present_count: number
  recorded_count: number
  schedule_id: string | null
  session_date: string
  session_id: string
  start_time: string
  status: ClassSessionStatus
}

export type SessionAttendanceRow = {
  attendance_id: string | null
  attendance_notes: string | null
  attendance_status: AttendanceStatus | null
  class_id: string
  class_name: string
  enrollment_id: string
  end_time: string
  preferred_name: string | null
  recorded_at: string | null
  recorded_by: string | null
  session_date: string
  session_id: string
  session_notes: string | null
  session_status: ClassSessionStatus
  start_time: string
  student_id: string
  student_name: string
}

export type AttendanceDraftRecord = {
  notes: string
  status: AttendanceStatus | ''
  studentId: string
}

export type AttendanceSaveRecord = {
  notes: string | null
  status: AttendanceStatus
  student_id: string
}
