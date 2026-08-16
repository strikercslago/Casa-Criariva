import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type { StudentListItem } from '@/features/students/types/studentTypes'
import type { ClassFormValues } from '@/features/classes/schemas/classSchema'
import type {
  ClassDetail,
  ClassListFilters,
  ClassListItem,
  ClassListResult,
  ClassScheduleRow,
  ClassWithSchedulesPayload,
  EnrollmentWithStudent,
} from '@/features/classes/types/classTypes'
import { mapClassesError } from '@/features/classes/utils/classesErrors'

const CLASSES_TIMEOUT_MS = 12_000
const STUDENT_SEARCH_SELECT = 'id, full_name, preferred_name, photo_path, birth_date, enrollment_date, status'

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listClasses(filters: ClassListFilters): Promise<ClassListResult> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('list_classes', {
      p_capacity_filter: filters.capacity,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_status_filter: filters.status,
    }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  const classes = (data ?? []).map(mapClassListItem)
  const totalCount = classes[0]?.totalCount ?? 0

  return {
    classes,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  }
}

export async function getClassDetail(classId: string): Promise<ClassDetail> {
  const supabase = getClient()

  const [classResult, auditResult] = await Promise.all([
    withTimeout(
      supabase
        .from('classes')
        .select(
          'id, name, description, capacity, status, created_at, updated_at, class_schedules(id, class_id, weekday, start_time, end_time, created_at), enrollments(id, student_id, class_id, start_date, end_date, status, created_at, updated_at, student:students(id, full_name, preferred_name, photo_path, birth_date, enrollment_date, status))',
        )
        .eq('id', classId)
        .maybeSingle(),
      CLASSES_TIMEOUT_MS,
      createTimeoutError,
    ),
    withTimeout(
      supabase
        .from('audit_events')
        .select('id, actor_user_id, entity_type, entity_id, action, metadata, created_at')
        .eq('entity_type', 'class')
        .eq('entity_id', classId)
        .order('created_at', { ascending: false })
        .limit(50),
      CLASSES_TIMEOUT_MS,
      createTimeoutError,
    ),
  ])

  const firstError = classResult.error ?? auditResult.error

  if (firstError) {
    throw mapClassesError(firstError)
  }

  if (!classResult.data) {
    throw new AppError('not-found', 'Turma nao encontrada.')
  }

  const classData = classResult.data as ClassDetail

  return {
    ...classData,
    auditEvents: auditResult.data ?? [],
    class_schedules: classData.class_schedules ?? [],
    enrollments: (classData.enrollments ?? []) as EnrollmentWithStudent[],
  }
}

export async function searchStudentsForClassEnrollment(search: string): Promise<StudentListItem[]> {
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

  const { data, error } = await withTimeout(query, CLASSES_TIMEOUT_MS, createTimeoutError)

  if (error) {
    throw mapClassesError(error)
  }

  return (data ?? []) as StudentListItem[]
}

export async function createClass(values: ClassFormValues) {
  const supabase = getClient()
  const payload = toClassWithSchedulesPayload(values)

  const { data, error } = await withTimeout(
    supabase.rpc('create_class_with_schedules', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export async function updateClass(classId: string, values: ClassFormValues) {
  const supabase = getClient()
  const payload = { class_id: classId, ...toClassWithSchedulesPayload(values) }

  const { data, error } = await withTimeout(
    supabase.rpc('update_class_with_schedules', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export async function addStudentToClass(classId: string, studentId: string, startDate: string) {
  const supabase = getClient()
  const payload = { class_id: classId, start_date: startDate, student_id: studentId }

  const { data, error } = await withTimeout(
    supabase.rpc('add_student_to_class', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export async function endClassEnrollment(enrollmentId: string, endDate: string) {
  const supabase = getClient()
  const payload = { end_date: endDate, enrollment_id: enrollmentId }

  const { data, error } = await withTimeout(
    supabase.rpc('end_class_enrollment', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export async function transferStudentClass(enrollmentId: string, targetClassId: string, transferDate: string) {
  const supabase = getClient()
  const payload = {
    enrollment_id: enrollmentId,
    target_class_id: targetClassId,
    transfer_date: transferDate,
  }

  const { data, error } = await withTimeout(
    supabase.rpc('transfer_student_class', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export async function updateClassStatus(classId: string, status: 'active' | 'inactive' | 'archived') {
  const supabase = getClient()
  const payload = { class_id: classId, status }

  const { data, error } = await withTimeout(
    supabase.rpc('update_class_status', { payload: payload as unknown as Json }),
    CLASSES_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapClassesError(error)
  }

  return data
}

export function toClassWithSchedulesPayload(values: ClassFormValues): ClassWithSchedulesPayload {
  return {
    class: {
      capacity: values.capacity.trim().length > 0 ? Number(values.capacity) : null,
      description: values.description?.trim() || null,
      name: values.name.trim(),
      status: values.status,
    },
    schedules: values.schedules.map((schedule) => ({
      end_time: schedule.end_time,
      start_time: schedule.start_time,
      weekday: Number(schedule.weekday),
    })),
  }
}

function mapClassListItem(row: {
  active_enrollments: number
  available_spots: number | null
  capacity: number | null
  class_id: string
  created_at: string
  description: string | null
  is_full: boolean
  name: string
  schedules: Json
  status: ClassListItem['status']
  total_count: number
  updated_at: string
}): ClassListItem & { totalCount: number } {
  return {
    active_enrollments: row.active_enrollments,
    available_spots: row.available_spots,
    capacity: row.capacity,
    class_id: row.class_id,
    created_at: row.created_at,
    description: row.description,
    is_full: row.is_full,
    name: row.name,
    schedules: parseSchedules(row.schedules),
    status: row.status,
    totalCount: row.total_count,
    updated_at: row.updated_at,
  }
}

function parseSchedules(value: Json): ClassScheduleRow[] {
  return Array.isArray(value) ? (value as ClassScheduleRow[]) : []
}
