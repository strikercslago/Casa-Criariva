import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type {
  CashAccount,
  CreateFinancialEntryInput,
  CreateRecurringFinancialRuleInput,
  EnsureRecurringFinancialEntriesResult,
  FinanceCashFlowFilters,
  FinanceCashFlowRow,
  FinanceObligationRow,
  FinancePagedResult,
  FinanceSummary,
  FinancialCategory,
  FinancialEntriesFilters,
  FinancialEntryRow,
  RecurringFinancialRule,
  ReverseFinancialSettlementInput,
  SettleFinancialEntryInput,
  CancelFinancialEntryInput,
  UpdateFinancialEntryInput,
  UpdateRecurringFinancialRuleInput,
} from '@/features/finance/types/financeTypes'
import { mapFinanceError } from '@/features/finance/utils/financeErrors'

const FINANCE_TIMEOUT_MS = 12_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function getFinanceMonthSummary(referenceMonth: string): Promise<FinanceSummary> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('get_finance_month_summary', { p_reference_month: referenceMonth }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return (
    data?.[0] ?? {
      cash_in: 0,
      cash_movements_count: 0,
      cash_out: 0,
      payable_amount: 0,
      receivable_amount: 0,
      reference_month: referenceMonth,
      result_amount: 0,
    }
  )
}

export async function listFinanceCashFlow(filters: FinanceCashFlowFilters): Promise<FinancePagedResult<FinanceCashFlowRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_finance_cash_flow', {
      p_cash_account_id: filters.cashAccountId ?? undefined,
      p_category_id: filters.categoryId ?? undefined,
      p_direction_filter: filters.direction,
      p_end_date: filters.endDate,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_start_date: filters.startDate,
    }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return toPagedResult((data ?? []) as FinanceCashFlowRow[], filters.pageSize)
}

export async function listFinancialEntries(filters: FinancialEntriesFilters): Promise<FinancePagedResult<FinancialEntryRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_financial_entries', {
      p_category_id: filters.categoryId ?? undefined,
      p_end_date: filters.endDate,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_start_date: filters.startDate,
      p_status_filter: filters.status,
      p_type_filter: filters.type,
    }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return toPagedResult((data ?? []) as FinancialEntryRow[], filters.pageSize)
}

export async function listFinanceReceivables(referenceMonth: string, page: number, pageSize: number) {
  return listObligations('list_finance_receivables', referenceMonth, page, pageSize)
}

export async function listFinancePayables(referenceMonth: string, page: number, pageSize: number) {
  return listObligations('list_finance_payables', referenceMonth, page, pageSize)
}

export async function listFinancialCategories(): Promise<FinancialCategory[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('financial_categories').select('*').order('type', { ascending: true }).order('name', { ascending: true }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return (data ?? []) as FinancialCategory[]
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('cash_accounts').select('*').order('name', { ascending: true }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return (data ?? []) as CashAccount[]
}

export async function listRecurringFinancialRules(): Promise<RecurringFinancialRule[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('recurring_financial_rules').select('*').order('is_active', { ascending: false }).order('description', { ascending: true }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return (data ?? []) as RecurringFinancialRule[]
}

export async function createFinancialEntry(input: CreateFinancialEntryInput) {
  const payload = {
    amount: input.amount,
    cash_account_id: input.cashAccountId ?? null,
    category_id: input.categoryId ?? null,
    competence_date: input.competenceDate,
    description: input.description.trim(),
    due_date: input.dueDate ?? null,
    notes: input.notes?.trim() || null,
    payment_method: input.paymentMethod,
    settle_now: input.settleNow ?? false,
    settled_at: input.settledAt,
    settlement_amount: input.settlementAmount,
    settlement_notes: input.settlementNotes?.trim() || null,
    type: input.type,
  }

  return runPayloadRpc<string>('create_financial_entry', payload)
}

export async function updateFinancialEntry(input: UpdateFinancialEntryInput) {
  const payload = {
    amount: input.amount,
    category_id: input.categoryId ?? null,
    competence_date: input.competenceDate,
    description: input.description.trim(),
    due_date: input.dueDate ?? null,
    financial_entry_id: input.financialEntryId,
    notes: input.notes?.trim() || null,
  }

  return runPayloadRpc<string>('update_financial_entry', payload)
}

export async function settleFinancialEntry(input: SettleFinancialEntryInput) {
  const payload = {
    amount: input.amount,
    cash_account_id: input.cashAccountId ?? null,
    financial_entry_id: input.financialEntryId,
    notes: input.notes?.trim() || null,
    payment_method: input.paymentMethod,
    settled_at: input.settledAt,
  }

  return runPayloadRpc('settle_financial_entry', payload)
}

export async function reverseFinancialSettlement(input: ReverseFinancialSettlementInput) {
  return runPayloadRpc<string>('reverse_financial_settlement', {
    financial_settlement_id: input.financialSettlementId,
    reason: input.reason.trim(),
  })
}

export async function cancelFinancialEntry(input: CancelFinancialEntryInput) {
  return runPayloadRpc<string>('cancel_financial_entry', {
    financial_entry_id: input.financialEntryId,
    reason: input.reason.trim(),
  })
}

export async function createRecurringFinancialRule(input: CreateRecurringFinancialRuleInput) {
  const payload = recurringRulePayload(input)
  return runPayloadRpc<string>('create_recurring_financial_rule', payload)
}

export async function updateRecurringFinancialRule(input: UpdateRecurringFinancialRuleInput) {
  const payload = {
    ...recurringRulePayload(input),
    is_active: input.isActive,
    recurring_rule_id: input.recurringRuleId,
  }

  return runPayloadRpc<string>('update_recurring_financial_rule', payload)
}

export async function disableRecurringFinancialRule(recurringRuleId: string) {
  return runPayloadRpc<string>('disable_recurring_financial_rule', { recurring_rule_id: recurringRuleId })
}

export async function ensureRecurringFinancialEntries(referenceMonth: string): Promise<EnsureRecurringFinancialEntriesResult> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('ensure_recurring_financial_entries', { p_reference_month: referenceMonth }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return data?.[0] ?? { existing_count: 0, generated_count: 0, reference_month: referenceMonth }
}

async function listObligations(
  rpcName: 'list_finance_payables' | 'list_finance_receivables',
  referenceMonth: string,
  page: number,
  pageSize: number,
): Promise<FinancePagedResult<FinanceObligationRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc(rpcName, {
      p_page: page,
      p_page_size: pageSize,
      p_reference_month: referenceMonth,
    }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return toPagedResult((data ?? []) as FinanceObligationRow[], pageSize)
}

async function runPayloadRpc<TReturn>(rpcName: string, payload: Record<string, unknown>): Promise<TReturn> {
  const supabase = getClient()
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { payload: Json },
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
  const { data, error } = await withTimeout(
    rpc(rpcName, { payload: payload as unknown as Json }),
    FINANCE_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) {
    throw mapFinanceError(error)
  }

  return data as TReturn
}

function recurringRulePayload(input: CreateRecurringFinancialRuleInput) {
  return {
    amount: input.amount,
    category_id: input.categoryId ?? null,
    description: input.description.trim(),
    due_day: input.dueDay,
    end_date: input.endDate ?? null,
    start_date: input.startDate,
    type: input.type,
  }
}

function toPagedResult<TRow extends { total_count: number }>(rows: TRow[], pageSize: number): FinancePagedResult<TRow> {
  const totalCount = rows[0]?.total_count ?? 0

  return {
    rows,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}
