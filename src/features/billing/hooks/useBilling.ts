import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelMonthlyFee,
  ensureMonthlyFees,
  getBillingMonthSummary,
  getMonthlyFeeDetail,
  getStudentBillingSnapshot,
  listMonthlyFees,
  registerPayment,
  reversePayment,
  updateMonthlyFeeAmount,
} from '@/features/billing/api/billingApi'
import { billingKeys } from '@/features/billing/hooks/billingKeys'
import type { BillingListFilters } from '@/features/billing/types/billingTypes'
import { financeKeys } from '@/features/finance/hooks/financeKeys'
import { dashboardKeys, reportsKeys } from '@/features/reports/hooks/reportsKeys'
import { student360Keys } from '@/features/students/hooks/student360Keys'

const BILLING_STALE_TIME_MS = 60_000

export function useMonthlyFeesList(filters: BillingListFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listMonthlyFees(filters),
    queryKey: billingKeys.monthlyFees.list(filters),
    staleTime: BILLING_STALE_TIME_MS,
  })
}

export function useBillingMonthSummary(referenceMonth: string) {
  return useQuery({
    queryFn: () => getBillingMonthSummary(referenceMonth),
    queryKey: billingKeys.summaries.month(referenceMonth),
    staleTime: BILLING_STALE_TIME_MS,
  })
}

export function useMonthlyFeeDetail(monthlyFeeId: string | null) {
  return useQuery({
    enabled: Boolean(monthlyFeeId),
    queryFn: () => getMonthlyFeeDetail(monthlyFeeId ?? ''),
    queryKey: billingKeys.monthlyFees.detail(monthlyFeeId ?? 'none'),
    staleTime: BILLING_STALE_TIME_MS,
  })
}

export function useEnsureMonthlyFees(referenceMonth: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ensureMonthlyFees(referenceMonth),
    onSuccess: () => {
      invalidateMonth(queryClient, referenceMonth)
    },
  })
}

export function useRegisterPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: registerPayment,
    onSuccess: (_result, variables) => {
      invalidateFee(queryClient, variables.monthlyFeeId, variables.referenceMonth, variables.studentId)
    },
  })
}

export function useReversePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reversePayment,
    onSuccess: (_result, variables) => {
      invalidateFee(queryClient, variables.monthlyFeeId, variables.referenceMonth, variables.studentId)
    },
  })
}

export function useCancelMonthlyFee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelMonthlyFee,
    onSuccess: (_result, variables) => {
      invalidateFee(queryClient, variables.monthlyFeeId, variables.referenceMonth, variables.studentId)
    },
  })
}

export function useUpdateMonthlyFeeAmount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMonthlyFeeAmount,
    onSuccess: (_result, variables) => {
      invalidateFee(queryClient, variables.monthlyFeeId, variables.referenceMonth, variables.studentId)
    },
  })
}

export function useStudentBillingSnapshot({
  page,
  pageSize,
  referenceMonth,
  studentId,
}: {
  page: number
  pageSize: number
  referenceMonth: string
  studentId: string | null
}) {
  return useQuery({
    enabled: Boolean(studentId),
    placeholderData: keepPreviousData,
    queryFn: () => getStudentBillingSnapshot({ page, pageSize, referenceMonth, studentId: studentId ?? '' }),
    queryKey: billingKeys.student.snapshot(studentId ?? 'none', referenceMonth, page, pageSize),
    staleTime: BILLING_STALE_TIME_MS,
  })
}

function invalidateFee(
  queryClient: ReturnType<typeof useQueryClient>,
  monthlyFeeId: string,
  referenceMonth?: string,
  studentId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: billingKeys.monthlyFees.detail(monthlyFeeId) })
  void queryClient.invalidateQueries({ queryKey: billingKeys.payments.forFee(monthlyFeeId) })

  if (referenceMonth) {
    invalidateMonth(queryClient, referenceMonth)
  } else {
    void queryClient.invalidateQueries({ queryKey: billingKeys.monthlyFees.lists() })
    void queryClient.invalidateQueries({ queryKey: billingKeys.summaries.all() })
  }

  if (studentId) {
    void queryClient.invalidateQueries({ queryKey: billingKeys.student.snapshots(studentId) })
    void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
  }
}

function invalidateMonth(queryClient: ReturnType<typeof useQueryClient>, referenceMonth: string) {
  void queryClient.invalidateQueries({ queryKey: billingKeys.monthlyFees.lists() })
  void queryClient.invalidateQueries({ queryKey: billingKeys.summaries.month(referenceMonth) })
  void queryClient.invalidateQueries({ queryKey: financeKeys.all })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.operationsRoot() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.attentionRoot() })
  void queryClient.invalidateQueries({ queryKey: reportsKeys.all })
}
