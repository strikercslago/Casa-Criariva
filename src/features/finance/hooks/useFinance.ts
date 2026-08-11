import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelFinancialEntry,
  createFinancialEntry,
  createRecurringFinancialRule,
  disableRecurringFinancialRule,
  ensureRecurringFinancialEntries,
  getFinanceMonthSummary,
  listCashAccounts,
  listFinanceCashFlow,
  listFinancePayables,
  listFinanceReceivables,
  listFinancialCategories,
  listFinancialEntries,
  listRecurringFinancialRules,
  reverseFinancialSettlement,
  settleFinancialEntry,
  updateFinancialEntry,
  updateRecurringFinancialRule,
} from '@/features/finance/api/financeApi'
import { financeKeys } from '@/features/finance/hooks/financeKeys'
import type { FinanceCashFlowFilters, FinancialEntriesFilters } from '@/features/finance/types/financeTypes'

const FINANCE_STALE_TIME_MS = 60_000

export function useFinanceMonthSummary(referenceMonth: string) {
  return useQuery({
    queryFn: () => getFinanceMonthSummary(referenceMonth),
    queryKey: financeKeys.summary(referenceMonth),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useFinanceCashFlow(filters: FinanceCashFlowFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listFinanceCashFlow(filters),
    queryKey: financeKeys.cashFlow(filters),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useFinancialEntries(filters: FinancialEntriesFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listFinancialEntries(filters),
    queryKey: financeKeys.entries(filters),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useFinanceReceivables(referenceMonth: string, page: number, pageSize: number) {
  const filters = { page, pageSize, referenceMonth }

  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listFinanceReceivables(referenceMonth, page, pageSize),
    queryKey: financeKeys.receivables(filters),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useFinancePayables(referenceMonth: string, page: number, pageSize: number) {
  const filters = { page, pageSize, referenceMonth }

  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listFinancePayables(referenceMonth, page, pageSize),
    queryKey: financeKeys.payables(filters),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useFinancialCategories() {
  return useQuery({
    queryFn: listFinancialCategories,
    queryKey: financeKeys.categories(),
    staleTime: FINANCE_STALE_TIME_MS * 5,
  })
}

export function useCashAccounts() {
  return useQuery({
    queryFn: listCashAccounts,
    queryKey: financeKeys.accounts(),
    staleTime: FINANCE_STALE_TIME_MS * 5,
  })
}

export function useRecurringFinancialRules() {
  return useQuery({
    queryFn: listRecurringFinancialRules,
    queryKey: financeKeys.recurringRules(),
    staleTime: FINANCE_STALE_TIME_MS,
  })
}

export function useCreateFinancialEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createFinancialEntry,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useUpdateFinancialEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateFinancialEntry,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useSettleFinancialEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: settleFinancialEntry,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useReverseFinancialSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reverseFinancialSettlement,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useCancelFinancialEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelFinancialEntry,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useCreateRecurringFinancialRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurringFinancialRule,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useUpdateRecurringFinancialRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurringFinancialRule,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useDisableRecurringFinancialRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disableRecurringFinancialRule,
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function useEnsureRecurringFinancialEntries(referenceMonth: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ensureRecurringFinancialEntries(referenceMonth),
    onSuccess: () => invalidateFinance(queryClient),
  })
}

export function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: financeKeys.all })
}
