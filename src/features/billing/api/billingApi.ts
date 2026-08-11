import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type {
  BillingListFilters,
  BillingListResult,
  BillingMonthSummary,
  CancelMonthlyFeeInput,
  EnsureMonthlyFeesResult,
  MonthlyFeeDetailRow,
  MonthlyFeeListRow,
  PaymentHistoryItem,
  RegisterPaymentInput,
  RegisterPaymentResult,
  ReversePaymentInput,
  StudentBillingPlanSnapshot,
  StudentBillingSnapshot,
  UpdateMonthlyFeeInput,
} from '@/features/billing/types/billingTypes'
import { isPaymentHistoryArray } from '@/features/billing/types/billingTypes'
import { mapBillingError } from '@/features/billing/utils/billingErrors'

const BILLING_TIMEOUT_MS = 12_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listMonthlyFees(filters: BillingListFilters): Promise<BillingListResult> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('list_monthly_fees', {
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_reference_month: filters.referenceMonth,
      p_search: filters.search.trim(),
      p_status_filter: filters.status,
    }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  const fees = (data ?? []) as MonthlyFeeListRow[]
  const totalCount = fees[0]?.total_count ?? 0

  return {
    fees,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  }
}

export async function getBillingMonthSummary(referenceMonth: string): Promise<BillingMonthSummary> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('get_billing_month_summary', { p_reference_month: referenceMonth }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  return (
    data?.[0] ?? {
      active_fees_count: 0,
      cancelled_fees_count: 0,
      expected_amount: 0,
      overdue_amount: 0,
      overdue_fees_count: 0,
      paid_fees_count: 0,
      partial_fees_count: 0,
      pending_amount: 0,
      received_amount: 0,
      reference_month: referenceMonth,
    }
  )
}

export async function ensureMonthlyFees(referenceMonth: string): Promise<EnsureMonthlyFeesResult> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('ensure_monthly_fees', { p_reference_month: referenceMonth }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  return data?.[0] ?? { existing_count: 0, generated_count: 0, reference_month: referenceMonth }
}

export async function getMonthlyFeeDetail(monthlyFeeId: string): Promise<MonthlyFeeDetailRow> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('get_monthly_fee_detail', { p_monthly_fee_id: monthlyFeeId }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  const row = data?.[0]

  if (!row) {
    throw new AppError('not-found', 'Mensalidade nao encontrada.')
  }

  return {
    ...row,
    payments: parsePaymentHistory(row.payments),
  }
}

export async function registerPayment(input: RegisterPaymentInput): Promise<RegisterPaymentResult> {
  const supabase = getClient()
  const payload = {
    amount: input.amount,
    monthly_fee_id: input.monthlyFeeId,
    notes: input.notes?.trim() || null,
    paid_at: input.paidAt,
    payer_guardian_id: input.payerGuardianId ?? null,
    payment_method: input.paymentMethod,
  }

  const { data, error } = await withTimeout(
    supabase.rpc('register_payment', { payload: payload as unknown as Json }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  return data?.[0] ?? { amount_paid: 0, balance: 0, computed_status: 'pending', monthly_fee_id: input.monthlyFeeId, payment_id: '' }
}

export async function reversePayment(input: ReversePaymentInput) {
  const supabase = getClient()
  const payload = {
    payment_id: input.paymentId,
    reason: input.reason.trim(),
  }

  const { error } = await withTimeout(
    supabase.rpc('reverse_payment', { payload: payload as unknown as Json }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }
}

export async function cancelMonthlyFee(input: CancelMonthlyFeeInput) {
  const supabase = getClient()
  const payload = {
    monthly_fee_id: input.monthlyFeeId,
    reason: input.reason.trim(),
  }

  const { error } = await withTimeout(
    supabase.rpc('cancel_monthly_fee', { payload: payload as unknown as Json }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }
}

export async function updateMonthlyFeeAmount(input: UpdateMonthlyFeeInput) {
  const supabase = getClient()
  const payload = {
    base_amount: input.baseAmount,
    discount_amount: input.discountAmount,
    monthly_fee_id: input.monthlyFeeId,
    notes: input.notes,
    reason: input.reason.trim(),
  }

  const { error } = await withTimeout(
    supabase.rpc('update_monthly_fee_amount', { payload: payload as unknown as Json }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }
}

export async function getStudentBillingSnapshot({
  page,
  pageSize,
  referenceMonth,
  studentId,
}: {
  page: number
  pageSize: number
  referenceMonth: string
  studentId: string
}): Promise<StudentBillingSnapshot> {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.rpc('get_student_billing_snapshot', {
      p_page: page,
      p_page_size: pageSize,
      p_reference_month: referenceMonth,
      p_student_id: studentId,
    }),
    BILLING_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapBillingError(error)
  }

  const row = data?.[0]

  return {
    billing_plan: parseBillingPlan(row?.billing_plan),
    current_fee: parseNullableObject<MonthlyFeeListRow>(row?.current_fee),
    recent_fees: parseArray<MonthlyFeeListRow>(row?.recent_fees),
    student_id: row?.student_id ?? studentId,
    total_count: row?.total_count ?? 0,
  }
}

function parsePaymentHistory(value: Json): PaymentHistoryItem[] {
  return isPaymentHistoryArray(value) ? value : []
}

function parseArray<TValue>(value: Json | undefined): TValue[] {
  return Array.isArray(value) ? (value as TValue[]) : []
}

function parseNullableObject<TValue>(value: Json | undefined): TValue | null {
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
    return value as TValue
  }

  return null
}

function parseBillingPlan(value: Json | undefined): StudentBillingPlanSnapshot | null {
  return parseNullableObject<StudentBillingPlanSnapshot>(value)
}
