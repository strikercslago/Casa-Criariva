import type { Database } from '@/lib/supabase/database.types'
import type { StudentFormValues } from '@/features/students/schemas/studentSchema'
import type { StudentRow } from '@/features/students/types/studentTypes'

export type GuardianRow = Database['public']['Tables']['guardians']['Row']
export type ClassRow = Database['public']['Tables']['classes']['Row']
export type ClassScheduleRow = Database['public']['Tables']['class_schedules']['Row']
export type EnrollmentRow = Database['public']['Tables']['enrollments']['Row']
export type StudentBillingPlanRow = Database['public']['Tables']['student_billing_plans']['Row']
export type AuditEventRow = Database['public']['Tables']['audit_events']['Row']

export type StudentGuardianLink = Database['public']['Tables']['student_guardians']['Row'] & {
  guardian: GuardianRow | null
}

export type ClassWithSchedules = ClassRow & {
  class_schedules: ClassScheduleRow[]
}

export type EnrollmentWithClass = EnrollmentRow & {
  class: ClassWithSchedules | null
}

export type BillingPlanWithGuardian = StudentBillingPlanRow & {
  financial_guardian: GuardianRow | null
}

export type Student360Data = {
  guardians: StudentGuardianLink[]
  enrollments: EnrollmentWithClass[]
  billingPlans: BillingPlanWithGuardian[]
  auditEvents: AuditEventRow[]
}

export type EnrollmentGuardianInput = {
  guardian_id?: string | null
  guardian?: {
    full_name: string
    phone: string | null
    email: string | null
    notes: string | null
  }
  relationship: string
  is_primary_contact: boolean
  is_financial_responsible: boolean
  can_pick_up: boolean
  is_emergency_contact: boolean
}

export type EnrollmentClassInput =
  | null
  | {
      class_id?: string | null
      quick_create?: {
        capacity: number | null
        name: string
        schedules: Array<{
          end_time: string
          start_time: string
          weekday: number
        }>
      }
      start_date: string
    }

export type EnrollmentBillingPlanInput =
  | null
  | {
      auto_generate_fees: boolean
      base_amount: number
      billing_start_date: string
      discount_amount: number
      discount_reason: string | null
      due_day: number
      financial_guardian_id: string | null
    }

export type CompleteEnrollmentPayload = {
  billing_plan: EnrollmentBillingPlanInput
  class: EnrollmentClassInput
  guardians: EnrollmentGuardianInput[]
  student: Pick<
    StudentFormValues,
    'birth_date' | 'enrollment_date' | 'full_name' | 'notes' | 'preferred_name'
  >
}

export type CompleteEnrollmentResult = {
  studentId: string
}

export type Student360Summary = {
  student: StudentRow
  relations: Student360Data
}
