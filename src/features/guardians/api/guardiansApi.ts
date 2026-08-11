import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type { StudentListItem } from '@/features/students/types/studentTypes'
import type {
  CreateGuardianValues,
  GuardianContactValues,
  GuardianRelationshipValues,
} from '@/features/guardians/schemas/guardianSchema'
import type {
  CreateGuardianPayload,
  GuardianDetail,
  GuardianLinkedStudentSummary,
  GuardianListFilters,
  GuardianListItem,
  GuardianListResult,
  GuardianRelationshipPayload,
  GuardianRow,
  GuardianStudentLink,
} from '@/features/guardians/types/guardianTypes'
import { normalizePhoneDigits } from '@/features/guardians/utils/guardianFormat'
import { mapGuardiansError } from '@/features/guardians/utils/guardianErrors'

const GUARDIANS_TIMEOUT_MS = 12_000
const STUDENT_SEARCH_SELECT = 'id, full_name, preferred_name, birth_date, enrollment_date, status'

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listGuardians(filters: GuardianListFilters): Promise<GuardianListResult> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('list_guardians', {
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_role_filter: filters.role,
      p_search: filters.search.trim(),
    }),
    GUARDIANS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapGuardiansError(error)
  }

  const guardians = (data ?? []).map(mapGuardianListItem)
  const totalCount = guardians[0]?.totalCount ?? 0

  return {
    guardians,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  }
}

export async function getGuardianDetail(guardianId: string): Promise<GuardianDetail> {
  const supabase = getClient()

  const [guardianResult, auditResult] = await Promise.all([
    withTimeout(
      supabase
        .from('guardians')
        .select(
          'id, full_name, phone, email, notes, created_at, updated_at, student_guardians(student_id, guardian_id, relationship, is_primary_contact, is_financial_responsible, can_pick_up, is_emergency_contact, created_at, student:students(id, full_name, preferred_name, birth_date, enrollment_date, status))',
        )
        .eq('id', guardianId)
        .maybeSingle(),
      GUARDIANS_TIMEOUT_MS,
      createTimeoutError,
    ),
    withTimeout(
      supabase
        .from('audit_events')
        .select('id, actor_user_id, entity_type, entity_id, action, metadata, created_at')
        .eq('entity_type', 'guardian')
        .eq('entity_id', guardianId)
        .order('created_at', { ascending: false })
        .limit(50),
      GUARDIANS_TIMEOUT_MS,
      createTimeoutError,
    ),
  ])

  const firstError = guardianResult.error ?? auditResult.error

  if (firstError) {
    throw mapGuardiansError(firstError)
  }

  if (!guardianResult.data) {
    throw new AppError('not-found', 'Responsavel nao encontrado.')
  }

  const guardian = guardianResult.data as GuardianRow & {
    student_guardians: GuardianStudentLink[]
  }

  return {
    ...guardian,
    auditEvents: auditResult.data ?? [],
    links: guardian.student_guardians ?? [],
  }
}

export async function searchGuardianDuplicates({
  currentGuardianId,
  email,
  phone,
}: {
  currentGuardianId?: string | null
  email?: string | null
  phone?: string | null
}): Promise<GuardianListItem[]> {
  const search = email?.trim() || normalizePhoneDigits(phone ?? null)

  if (!search || search.length < 3) {
    return []
  }

  const result = await listGuardians({ page: 1, pageSize: 5, role: 'all', search })

  return result.guardians.filter((guardian) => guardian.guardian_id !== currentGuardianId)
}

export async function searchStudentsForGuardianLink(search: string): Promise<StudentListItem[]> {
  const supabase = getClient()
  const normalizedSearch = search.trim()

  let query = supabase
    .from('students')
    .select(STUDENT_SEARCH_SELECT)
    .neq('status', 'archived')
    .order('full_name', { ascending: true })
    .limit(8)

  if (normalizedSearch.length > 0) {
    query = query.ilike('full_name', `%${normalizedSearch}%`)
  }

  const { data, error } = await withTimeout(query, GUARDIANS_TIMEOUT_MS, createTimeoutError)

  if (error) {
    throw mapGuardiansError(error)
  }

  return (data ?? []) as StudentListItem[]
}

export async function createGuardian(values: CreateGuardianValues): Promise<string> {
  const supabase = getClient()
  const payload = toCreateGuardianPayload(values)

  const { data, error } = await withTimeout(
    supabase.rpc('create_guardian_with_optional_student', { payload: payload as unknown as Json }),
    GUARDIANS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapGuardiansError(error)
  }

  return data
}

export async function updateGuardianContact(
  guardianId: string,
  values: GuardianContactValues,
): Promise<string> {
  const supabase = getClient()
  const payload = {
    guardian_id: guardianId,
    ...toGuardianContactPayload(values),
  }

  const { data, error } = await withTimeout(
    supabase.rpc('update_guardian_contact', { payload: payload as unknown as Json }),
    GUARDIANS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapGuardiansError(error)
  }

  return data
}

export async function upsertGuardianStudentLink(
  guardianId: string,
  values: GuardianRelationshipValues,
): Promise<void> {
  const supabase = getClient()
  const payload = toGuardianRelationshipPayload(guardianId, values)

  const { error } = await withTimeout(
    supabase.rpc('upsert_guardian_student_link', { payload: payload as unknown as Json }),
    GUARDIANS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapGuardiansError(error)
  }
}

export async function unlinkGuardianStudent(guardianId: string, studentId: string): Promise<void> {
  const supabase = getClient()
  const payload = { guardian_id: guardianId, student_id: studentId }

  const { error } = await withTimeout(
    supabase.rpc('unlink_guardian_student', { payload: payload as unknown as Json }),
    GUARDIANS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapGuardiansError(error)
  }
}

export function toGuardianContactPayload(values: GuardianContactValues) {
  return {
    email: values.email,
    full_name: values.full_name.trim(),
    notes: values.notes,
    phone: values.phone,
  }
}

export function toCreateGuardianPayload(values: CreateGuardianValues): CreateGuardianPayload {
  return {
    guardian: toGuardianContactPayload(values),
    student_link: values.link_now
      ? {
          can_pick_up: values.student_link.can_pick_up,
          is_emergency_contact: values.student_link.is_emergency_contact,
          is_financial_responsible: values.student_link.is_financial_responsible,
          is_primary_contact: values.student_link.is_primary_contact,
          relationship: values.student_link.relationship.trim(),
          student_id: values.student_link.student_id,
        }
      : null,
  }
}

export function toGuardianRelationshipPayload(
  guardianId: string,
  values: GuardianRelationshipValues,
): GuardianRelationshipPayload {
  return {
    can_pick_up: values.can_pick_up,
    guardian_id: guardianId,
    is_emergency_contact: values.is_emergency_contact,
    is_financial_responsible: values.is_financial_responsible,
    is_primary_contact: values.is_primary_contact,
    relationship: values.relationship.trim(),
    student_id: values.student_id,
  }
}

function mapGuardianListItem(row: {
  can_pick_up: boolean
  created_at: string
  email: string | null
  full_name: string
  guardian_id: string
  is_emergency_contact: boolean
  is_financial_responsible: boolean
  is_primary_contact: boolean
  linked_students: Json
  notes: string | null
  phone: string | null
  students_count: number
  total_count: number
  updated_at: string
}): GuardianListItem & { totalCount: number } {
  return {
    can_pick_up: row.can_pick_up,
    created_at: row.created_at,
    email: row.email,
    full_name: row.full_name,
    guardian_id: row.guardian_id,
    is_emergency_contact: row.is_emergency_contact,
    is_financial_responsible: row.is_financial_responsible,
    is_primary_contact: row.is_primary_contact,
    linked_students: parseLinkedStudents(row.linked_students),
    notes: row.notes,
    phone: row.phone,
    students_count: row.students_count,
    totalCount: row.total_count,
    updated_at: row.updated_at,
  }
}

function parseLinkedStudents(value: Json): GuardianLinkedStudentSummary[] {
  return Array.isArray(value) ? (value as GuardianLinkedStudentSummary[]) : []
}
