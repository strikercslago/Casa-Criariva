import type { Database, Json } from '@/lib/supabase/database.types'

export type MonthlyFeeStatus = 'all' | 'pending' | 'overdue' | 'partial' | 'paid' | 'cancelled'
export type PaymentMethod = Database['public']['Enums']['payment_method']

export type MonthlyFeeListRow = Database['public']['Functions']['list_monthly_fees']['Returns'][number]
export type BillingMonthSummary = Database['public']['Functions']['get_billing_month_summary']['Returns'][number]
export type MonthlyFeeDetailRow = Database['public']['Functions']['get_monthly_fee_detail']['Returns'][number] & {
  payments: PaymentHistoryItem[]
}

export type EnsureMonthlyFeesResult = Database['public']['Functions']['ensure_monthly_fees']['Returns'][number]
export type RegisterPaymentResult = Database['public']['Functions']['register_payment']['Returns'][number]

export type BillingListFilters = {
  page: number
  pageSize: number
  referenceMonth: string
  search: string
  status: MonthlyFeeStatus
}

export type BillingListResult = {
  fees: MonthlyFeeListRow[]
  totalCount: number
  totalPages: number
}

export type RegisterPaymentInput = {
  monthlyFeeId: string
  amount: number
  paidAt: string
  paymentMethod: PaymentMethod
  payerGuardianId?: string | null
  notes?: string | null
  studentId?: string
  referenceMonth?: string
}

export type ReversePaymentInput = {
  monthlyFeeId: string
  paymentId: string
  reason: string
  studentId?: string
  referenceMonth?: string
}

export type CancelMonthlyFeeInput = {
  monthlyFeeId: string
  reason: string
  referenceMonth: string
  studentId: string
}

export type UpdateMonthlyFeeInput = {
  monthlyFeeId: string
  baseAmount: number
  discountAmount: number
  notes: string | null
  reason: string
  referenceMonth: string
  studentId: string
}

export type PaymentHistoryItem = {
  allocation_id: string
  amount: number
  created_at: string
  notes: string | null
  paid_at: string
  payment_id: string
  payment_method: PaymentMethod
  received_by: string
  reversal_reason: string | null
  reversed_at: string | null
  reversed_by: string | null
  status: 'received' | 'reversed'
}

export type StudentBillingSnapshot = {
  student_id: string
  billing_plan: StudentBillingPlanSnapshot | null
  current_fee: MonthlyFeeListRow | null
  recent_fees: MonthlyFeeListRow[]
  total_count: number
}

export type StudentBillingPlanSnapshot = {
  id: string
  auto_generate_fees: boolean
  base_amount: number
  billing_start_date: string
  discount_amount: number
  due_day: number
  financial_guardian_id: string | null
  financial_guardian_name: string | null
  financial_guardian_phone: string | null
  status: string
}

export function isPaymentHistoryArray(value: Json): value is PaymentHistoryItem[] {
  return Array.isArray(value)
}
