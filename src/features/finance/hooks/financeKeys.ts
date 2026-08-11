import type { FinanceCashFlowFilters, FinancialEntriesFilters } from '@/features/finance/types/financeTypes'

export const financeKeys = {
  accounts: () => [...financeKeys.all, 'accounts'] as const,
  all: ['finance'] as const,
  cashFlow: (filters: FinanceCashFlowFilters) => [...financeKeys.all, 'cash-flow', filters] as const,
  categories: () => [...financeKeys.all, 'categories'] as const,
  entries: (filters: FinancialEntriesFilters) => [...financeKeys.all, 'entries', filters] as const,
  payables: (filters: { page: number; pageSize: number; referenceMonth: string }) =>
    [...financeKeys.all, 'payables', filters] as const,
  receivables: (filters: { page: number; pageSize: number; referenceMonth: string }) =>
    [...financeKeys.all, 'receivables', filters] as const,
  recurringRules: () => [...financeKeys.all, 'recurring-rules'] as const,
  summary: (month: string) => [...financeKeys.all, 'summary', month] as const,
}
