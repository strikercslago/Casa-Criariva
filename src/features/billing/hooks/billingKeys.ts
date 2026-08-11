import type { BillingListFilters } from '@/features/billing/types/billingTypes'

export const billingKeys = {
  all: ['billing'] as const,
  monthlyFees: {
    all: () => [...billingKeys.all, 'monthly-fees'] as const,
    detail: (monthlyFeeId: string) => [...billingKeys.monthlyFees.all(), 'detail', monthlyFeeId] as const,
    lists: () => [...billingKeys.monthlyFees.all(), 'list'] as const,
    list: (filters: BillingListFilters) => [...billingKeys.monthlyFees.lists(), filters] as const,
  },
  payments: {
    all: () => [...billingKeys.all, 'payments'] as const,
    forFee: (monthlyFeeId: string) => [...billingKeys.payments.all(), 'fee', monthlyFeeId] as const,
  },
  summaries: {
    all: () => [...billingKeys.all, 'summaries'] as const,
    month: (referenceMonth: string) => [...billingKeys.summaries.all(), referenceMonth] as const,
  },
  student: {
    all: () => [...billingKeys.all, 'student'] as const,
    snapshot: (studentId: string, referenceMonth: string, page: number, pageSize: number) =>
      [...billingKeys.student.all(), studentId, referenceMonth, page, pageSize] as const,
    snapshots: (studentId: string) => [...billingKeys.student.all(), studentId] as const,
  },
}
