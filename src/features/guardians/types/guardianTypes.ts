import type { Database, Json } from '@/lib/supabase/database.types'
import type { StudentListItem } from '@/features/students/types/studentTypes'

export type GuardianRow = Database['public']['Tables']['guardians']['Row']
export type StudentGuardianRow = Database['public']['Tables']['student_guardians']['Row']
export type AuditEventRow = Database['public']['Tables']['audit_events']['Row']

export type GuardianRoleFilter = 'all' | 'financial' | 'primary' | 'pickup' | 'emergency'

export type GuardianListFilters = {
  page: number
  pageSize: number
  search: string
  role: GuardianRoleFilter
}

export type GuardianLinkedStudentSummary = Pick<
  StudentListItem,
  'full_name' | 'id' | 'preferred_name' | 'status'
> &
  Pick<
    StudentGuardianRow,
    | 'can_pick_up'
    | 'is_emergency_contact'
    | 'is_financial_responsible'
    | 'is_primary_contact'
    | 'relationship'
  >

export type GuardianListItem = Pick<
  GuardianRow,
  'created_at' | 'email' | 'full_name' | 'notes' | 'phone' | 'updated_at'
> & {
  guardian_id: string
  students_count: number
  is_primary_contact: boolean
  is_financial_responsible: boolean
  can_pick_up: boolean
  is_emergency_contact: boolean
  linked_students: GuardianLinkedStudentSummary[]
}

export type GuardianListResult = {
  guardians: GuardianListItem[]
  totalCount: number
  totalPages: number
}

export type GuardianStudentLink = StudentGuardianRow & {
  student: StudentListItem | null
}

export type GuardianDetail = GuardianRow & {
  links: GuardianStudentLink[]
  auditEvents: AuditEventRow[]
}

export type GuardianContactPayload = {
  full_name: string
  phone: string | null
  email: string | null
  notes: string | null
}

export type GuardianRelationshipPayload = {
  guardian_id: string
  student_id: string
  relationship: string
  is_primary_contact: boolean
  is_financial_responsible: boolean
  can_pick_up: boolean
  is_emergency_contact: boolean
}

export type CreateGuardianPayload = {
  guardian: GuardianContactPayload
  student_link: Omit<GuardianRelationshipPayload, 'guardian_id'> | null
}

export type JsonPayload = Json
