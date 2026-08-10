import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { withTimeout } from '@/shared/utils/withTimeout'
import type { EnrollmentWizardValues } from '@/features/students/schemas/enrollmentWizardSchema'
import type {
  BillingPlanWithGuardian,
  ClassWithSchedules,
  CompleteEnrollmentPayload,
  CompleteEnrollmentResult,
  EnrollmentWithClass,
  GuardianRow,
  Student360Data,
  StudentGuardianLink,
} from '@/features/students/types/student360Types'
import { mapStudentsError } from '@/features/students/utils/studentsErrors'

const STUDENT_360_TIMEOUT_MS = 12_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function searchGuardianCandidates({
  email,
  phone,
}: {
  email?: string | null
  phone?: string | null
}): Promise<GuardianRow[]> {
  const supabase = getClient()
  const filters: string[] = []

  if (phone && phone.trim().length >= 8) {
    filters.push(`phone.eq.${phone.trim()}`)
  }

  if (email && email.trim().length > 0) {
    filters.push(`email.eq.${email.trim().toLowerCase()}`)
  }

  if (filters.length === 0) {
    return []
  }

  const { data, error } = await withTimeout(
    supabase
      .from('guardians')
      .select('id, full_name, phone, email, notes, created_at, updated_at')
      .or(filters.join(','))
      .limit(5),
    STUDENT_360_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapStudentsError(error)
  }

  return (data ?? []) as GuardianRow[]
}

export async function listClassesForEnrollment(): Promise<ClassWithSchedules[]> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase
      .from('classes')
      .select(
        'id, name, description, capacity, status, created_at, updated_at, class_schedules(id, class_id, weekday, start_time, end_time, created_at)',
      )
      .eq('status', 'active')
      .order('name', { ascending: true }),
    STUDENT_360_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapStudentsError(error)
  }

  return (data ?? []) as ClassWithSchedules[]
}

export async function getStudent360Data(studentId: string): Promise<Student360Data> {
  const supabase = getClient()

  const [guardiansResult, enrollmentsResult, billingResult, auditResult] = await Promise.all([
    withTimeout(
      supabase
        .from('student_guardians')
        .select(
          'student_id, guardian_id, relationship, is_primary_contact, is_financial_responsible, can_pick_up, is_emergency_contact, created_at, guardian:guardians(id, full_name, phone, email, notes, created_at, updated_at)',
        )
        .eq('student_id', studentId),
      STUDENT_360_TIMEOUT_MS,
      createTimeoutError,
    ),
    withTimeout(
      supabase
        .from('enrollments')
        .select(
          'id, student_id, class_id, start_date, end_date, status, created_at, updated_at, class:classes(id, name, description, capacity, status, created_at, updated_at, class_schedules(id, class_id, weekday, start_time, end_time, created_at))',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
      STUDENT_360_TIMEOUT_MS,
      createTimeoutError,
    ),
    withTimeout(
      supabase
        .from('student_billing_plans')
        .select(
          'id, student_id, financial_guardian_id, base_amount, discount_amount, discount_reason, due_day, billing_start_date, auto_generate_fees, status, created_at, updated_at, financial_guardian:guardians(id, full_name, phone, email, notes, created_at, updated_at)',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
      STUDENT_360_TIMEOUT_MS,
      createTimeoutError,
    ),
    withTimeout(
      supabase
        .from('audit_events')
        .select('id, actor_user_id, entity_type, entity_id, action, metadata, created_at')
        .eq('entity_type', 'student')
        .eq('entity_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50),
      STUDENT_360_TIMEOUT_MS,
      createTimeoutError,
    ),
  ])

  const firstError =
    guardiansResult.error ?? enrollmentsResult.error ?? billingResult.error ?? auditResult.error

  if (firstError) {
    throw mapStudentsError(firstError)
  }

  return {
    auditEvents: auditResult.data ?? [],
    billingPlans: (billingResult.data ?? []) as BillingPlanWithGuardian[],
    enrollments: (enrollmentsResult.data ?? []) as EnrollmentWithClass[],
    guardians: (guardiansResult.data ?? []) as StudentGuardianLink[],
  }
}

export async function completeStudentEnrollment(
  values: EnrollmentWizardValues,
): Promise<CompleteEnrollmentResult> {
  const supabase = getClient()
  const payload = toCompleteEnrollmentPayload(values)

  const { data, error } = await withTimeout(
    supabase.rpc('complete_student_enrollment', { payload }),
    STUDENT_360_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapStudentsError(error)
  }

  return { studentId: data }
}

export function toCompleteEnrollmentPayload(values: EnrollmentWizardValues): CompleteEnrollmentPayload {
  const guardians = values.guardians.map((guardian) => {
    const common = {
      can_pick_up: guardian.can_pick_up,
      is_emergency_contact: guardian.is_emergency_contact,
      is_financial_responsible: guardian.is_financial_responsible,
      is_primary_contact: guardian.is_primary_contact,
      relationship: guardian.relationship.trim(),
    }

    if (guardian.guardian_id) {
      return {
        ...common,
        guardian_id: guardian.guardian_id,
      }
    }

    return {
      ...common,
      guardian: {
        email: guardian.email,
        full_name: guardian.full_name.trim(),
        notes: guardian.notes,
        phone: guardian.phone.trim(),
      },
      guardian_id: null,
    }
  })

  const classPayload =
    values.class_step.mode === 'none'
      ? null
      : values.class_step.mode === 'existing'
        ? {
            class_id: values.class_step.class_id,
            start_date: values.class_step.start_date,
          }
        : {
            quick_create: {
              capacity:
                values.class_step.quick_capacity.trim().length > 0
                  ? Number(values.class_step.quick_capacity)
                  : null,
              name: values.class_step.quick_name.trim(),
              schedules: values.class_step.quick_weekdays.map((weekday) => ({
                end_time: values.class_step.quick_end_time,
                start_time: values.class_step.quick_start_time,
                weekday: Number(weekday),
              })),
            },
            start_date: values.class_step.start_date,
          }

  const billingPayload = values.billing.enabled
    ? {
        auto_generate_fees: values.billing.auto_generate_fees,
        base_amount: Number(values.billing.base_amount),
        billing_start_date: values.billing.billing_start_date,
        discount_amount: Number(values.billing.discount_amount || '0'),
        discount_reason: values.billing.discount_reason,
        due_day: Number(values.billing.due_day),
        financial_guardian_id: values.billing.financial_guardian_id,
      }
    : null

  return {
    billing_plan: billingPayload,
    class: classPayload,
    guardians,
    student: {
      birth_date: values.student.birth_date,
      enrollment_date: values.student.enrollment_date,
      full_name: values.student.full_name.trim(),
      notes: values.student.notes,
      preferred_name: values.student.preferred_name,
    },
  }
}
