import type { Database } from '@/lib/supabase/database.types'

export type FinancialEntryType = Database['public']['Enums']['financial_entry_type']
export type PaymentMethod = Database['public']['Enums']['payment_method']

export type FinanceSummary = Database['public']['Functions']['get_finance_month_summary']['Returns'][number]
export type FinanceCashFlowRow = Database['public']['Functions']['list_finance_cash_flow']['Returns'][number]
export type FinancialEntryRow = Database['public']['Functions']['list_financial_entries']['Returns'][number]
export type FinanceObligationRow = Database['public']['Functions']['list_finance_receivables']['Returns'][number]
export type FinancialCategory = Database['public']['Tables']['financial_categories']['Row']
export type CashAccount = Database['public']['Tables']['cash_accounts']['Row']
export type RecurringFinancialRule = Database['public']['Tables']['recurring_financial_rules']['Row']

export type FinancialEntryStatus = 'all' | 'pending' | 'overdue' | 'partial' | 'paid' | 'received' | 'cancelled'
export type CashFlowDirectionFilter = 'all' | 'income' | 'expense'
export type FinanceTab = 'overview' | 'entries' | 'receivables' | 'payables'

export type FinancialEntriesFilters = {
  categoryId: string | null
  endDate: string
  page: number
  pageSize: number
  search: string
  startDate: string
  status: FinancialEntryStatus
  type: FinancialEntryType | 'all'
}

export type FinanceCashFlowFilters = {
  cashAccountId: string | null
  categoryId: string | null
  direction: CashFlowDirectionFilter
  endDate: string
  page: number
  pageSize: number
  startDate: string
}

export type FinancePagedResult<TRow> = {
  rows: TRow[]
  totalCount: number
  totalPages: number
}

export type CreateFinancialEntryInput = {
  amount: number
  cashAccountId?: string | null
  categoryId?: string | null
  competenceDate: string
  description: string
  dueDate?: string | null
  notes?: string
  paymentMethod?: PaymentMethod
  settleNow?: boolean
  settledAt?: string
  settlementAmount?: number
  settlementNotes?: string
  type: FinancialEntryType
}

export type UpdateFinancialEntryInput = Omit<CreateFinancialEntryInput, 'cashAccountId' | 'paymentMethod' | 'settleNow' | 'settledAt' | 'settlementAmount' | 'settlementNotes' | 'type'> & {
  financialEntryId: string
}

export type SettleFinancialEntryInput = {
  amount: number
  cashAccountId?: string | null
  financialEntryId: string
  notes?: string
  paymentMethod: PaymentMethod
  settledAt: string
}

export type ReverseFinancialSettlementInput = {
  financialSettlementId: string
  reason: string
}

export type CancelFinancialEntryInput = {
  financialEntryId: string
  reason: string
}

export type CreateRecurringFinancialRuleInput = {
  amount: number
  categoryId?: string | null
  description: string
  dueDay: number
  endDate?: string | null
  startDate: string
  type: FinancialEntryType
}

export type UpdateRecurringFinancialRuleInput = CreateRecurringFinancialRuleInput & {
  isActive: boolean
  recurringRuleId: string
}

export type EnsureRecurringFinancialEntriesResult =
  Database['public']['Functions']['ensure_recurring_financial_entries']['Returns'][number]
