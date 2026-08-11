import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/FormControls'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchInput } from '@/shared/components/ui/SearchInput'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { FinanceCashFlowList } from '@/features/finance/components/FinanceCashFlowList'
import { FinanceEntryDrawer } from '@/features/finance/components/FinanceEntryDrawer'
import { FinanceEntryList } from '@/features/finance/components/FinanceEntryList'
import { FinanceObligationList } from '@/features/finance/components/FinanceObligationList'
import { FinancialSettlementDrawer } from '@/features/finance/components/FinancialSettlementDrawer'
import { RecurringRulesPanel } from '@/features/finance/components/RecurringRulesPanel'
import {
  useCancelFinancialEntry,
  useCashAccounts,
  useFinanceCashFlow,
  useFinanceMonthSummary,
  useFinancePayables,
  useFinanceReceivables,
  useFinancialCategories,
  useFinancialEntries,
  useRecurringFinancialRules,
  useReverseFinancialSettlement,
} from '@/features/finance/hooks/useFinance'
import type {
  CashFlowDirectionFilter,
  FinanceCashFlowRow,
  FinanceTab,
  FinancialEntryRow,
  FinancialEntryStatus,
  FinancialEntryType,
} from '@/features/finance/types/financeTypes'
import {
  addMonths,
  formatReferenceMonth,
  fromMonthInputValue,
  getCurrentReferenceMonth,
  getReferenceMonthEnd,
  toMonthInputValue,
} from '@/features/finance/utils/financeDates'
import {
  cashFlowDirectionOptions,
  financialEntryStatusOptions,
  financialEntryTypeOptions,
  formatMoney,
} from '@/features/finance/utils/financeFormat'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'

const PAGE_SIZE = 12
const OVERVIEW_CASH_FLOW_SIZE = 8

export default function FinancePage() {
  const currentMonth = useMemo(() => getCurrentReferenceMonth(), [])
  const [referenceMonth, setReferenceMonth] = useState(currentMonth)
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')
  const [entryPage, setEntryPage] = useState(1)
  const [cashFlowPage, setCashFlowPage] = useState(1)
  const [receivablePage, setReceivablePage] = useState(1)
  const [payablePage, setPayablePage] = useState(1)
  const [entryType, setEntryType] = useState<FinancialEntryType | 'all'>('all')
  const [entryStatus, setEntryStatus] = useState<FinancialEntryStatus>('all')
  const [direction, setDirection] = useState<CashFlowDirectionFilter>('all')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [isEntryDrawerOpen, setIsEntryDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FinancialEntryRow | null>(null)
  const [settlementEntry, setSettlementEntry] = useState<FinancialEntryRow | null>(null)
  const debouncedSearch = useDebouncedValue(search, 320)
  const startDate = referenceMonth
  const endDate = getReferenceMonthEnd(referenceMonth)
  const summaryQuery = useFinanceMonthSummary(referenceMonth)
  const categoriesQuery = useFinancialCategories()
  const accountsQuery = useCashAccounts()
  const recurringRulesQuery = useRecurringFinancialRules()
  const reverseSettlementMutation = useReverseFinancialSettlement()
  const cancelEntryMutation = useCancelFinancialEntry()
  const { notify } = useToast()
  const categories = categoriesQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  const recurringRules = recurringRulesQuery.data ?? []
  const entriesFilters = useMemo(
    () => ({
      categoryId: categoryId || null,
      endDate,
      page: entryPage,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      startDate,
      status: entryStatus,
      type: entryType,
    }),
    [categoryId, debouncedSearch, endDate, entryPage, entryStatus, entryType, startDate],
  )
  const cashFlowFilters = useMemo(
    () => ({
      cashAccountId: null,
      categoryId: categoryId || null,
      direction,
      endDate,
      page: activeTab === 'overview' ? 1 : cashFlowPage,
      pageSize: activeTab === 'overview' ? OVERVIEW_CASH_FLOW_SIZE : PAGE_SIZE,
      startDate,
    }),
    [activeTab, cashFlowPage, categoryId, direction, endDate, startDate],
  )
  const entriesQuery = useFinancialEntries(entriesFilters)
  const cashFlowQuery = useFinanceCashFlow(cashFlowFilters)
  const receivablesQuery = useFinanceReceivables(referenceMonth, receivablePage, PAGE_SIZE)
  const payablesQuery = useFinancePayables(referenceMonth, payablePage, PAGE_SIZE)
  const summary = summaryQuery.data

  function changeMonth(value: string) {
    setReferenceMonth(value)
    setEntryPage(1)
    setCashFlowPage(1)
    setReceivablePage(1)
    setPayablePage(1)
  }

  function openCreateDrawer() {
    setEditingEntry(null)
    setIsEntryDrawerOpen(true)
  }

  function openEditDrawer(entry: FinancialEntryRow) {
    setEditingEntry(entry)
    setIsEntryDrawerOpen(true)
  }

  async function reverseSettlement(movement: FinanceCashFlowRow) {
    const reason = window.prompt('Motivo da reversao')

    if (!reason?.trim()) {
      return
    }

    try {
      await reverseSettlementMutation.mutateAsync({ financialSettlementId: movement.movement_id, reason })
      notify({ title: 'Liquidacao revertida.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel reverter.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function cancelEntry(entry: FinancialEntryRow) {
    const reason = window.prompt('Motivo do cancelamento')

    if (!reason?.trim()) {
      return
    }

    try {
      await cancelEntryMutation.mutateAsync({ financialEntryId: entry.entry_id, reason })
      notify({ title: 'Lancamento cancelado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel cancelar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={openCreateDrawer}>
              Novo lancamento
            </Button>
            <Button
              isLoading={summaryQuery.isFetching || entriesQuery.isFetching || cashFlowQuery.isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onClick={() => {
                void summaryQuery.refetch()
                void entriesQuery.refetch()
                void cashFlowQuery.refetch()
                void receivablesQuery.refetch()
                void payablesQuery.refetch()
              }}
              variant="secondary"
            >
              Atualizar
            </Button>
          </div>
        }
        description="Entradas, saidas, obrigacoes e caixa consolidado sem duplicar recebimentos de mensalidades."
        title="Financeiro"
      />

      <section className="grid gap-3 rounded-md border border-border bg-surface p-4 shadow-subtle">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Mes de referencia
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{formatReferenceMonth(referenceMonth)}</h2>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <IconButton label="Mes anterior" onClick={() => changeMonth(addMonths(referenceMonth, -1))}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </IconButton>
            <Button onClick={() => changeMonth(currentMonth)} variant="secondary">
              Mes atual
            </Button>
            <IconButton label="Proximo mes" onClick={() => changeMonth(addMonths(referenceMonth, 1))}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconButton>
            <Input
              className="w-44"
              label="Selecionar mes"
              onChange={(event) => changeMonth(fromMonthInputValue(event.target.value))}
              type="month"
              value={toMonthInputValue(referenceMonth)}
            />
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label="Entradas recebidas" tone="success" value={formatMoney(summary?.cash_in)} />
          <SummaryItem label="Saidas pagas" tone="danger" value={formatMoney(summary?.cash_out)} />
          <SummaryItem label="Resultado" tone={Number(summary?.result_amount ?? 0) < 0 ? 'danger' : 'success'} value={formatMoney(summary?.result_amount)} />
          <SummaryItem label="A receber" value={formatMoney(summary?.receivable_amount)} />
          <SummaryItem label="A pagar" value={formatMoney(summary?.payable_amount)} />
        </dl>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs>
          <TabButton isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Visao geral
          </TabButton>
          <TabButton isActive={activeTab === 'entries'} onClick={() => setActiveTab('entries')}>
            Lancamentos
          </TabButton>
          <TabButton isActive={activeTab === 'receivables'} onClick={() => setActiveTab('receivables')}>
            A receber
          </TabButton>
          <TabButton isActive={activeTab === 'payables'} onClick={() => setActiveTab('payables')}>
            A pagar
          </TabButton>
        </Tabs>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_160px_160px]">
          <SearchInput label="Buscar lancamentos" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" value={search} />
          <Select label="Categoria" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {activeTab === 'overview' ? (
            <Select label="Fluxo" onChange={(event) => setDirection(event.target.value as CashFlowDirectionFilter)} value={direction}>
              {cashFlowDirectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            <Select label="Tipo" onChange={(event) => setEntryType(event.target.value as FinancialEntryType | 'all')} value={entryType}>
              {financialEntryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <MainPanel
            error={cashFlowQuery.error}
            isError={cashFlowQuery.isError}
            isLoading={cashFlowQuery.isLoading && !cashFlowQuery.data}
            onRetry={() => void cashFlowQuery.refetch()}
            title="Nao foi possivel carregar o fluxo de caixa."
          >
            {cashFlowQuery.data?.rows.length ? (
              <FinanceCashFlowList movements={cashFlowQuery.data.rows} onReverseSettlement={(movement) => void reverseSettlement(movement)} />
            ) : (
              <EmptyState description="Nenhuma entrada ou saida liquidada neste mes." title="Sem movimentos de caixa." />
            )}
          </MainPanel>
          <RecurringRulesPanel categories={categories} referenceMonth={referenceMonth} rules={recurringRules} />
        </div>
      ) : null}

      {activeTab === 'entries' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select label="Status" onChange={(event) => setEntryStatus(event.target.value as FinancialEntryStatus)} value={entryStatus}>
              {financialEntryStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <MainPanel
            error={entriesQuery.error}
            isError={entriesQuery.isError}
            isLoading={entriesQuery.isLoading && !entriesQuery.data}
            onRetry={() => void entriesQuery.refetch()}
            title="Nao foi possivel carregar lancamentos."
          >
            {entriesQuery.data?.rows.length ? (
              <>
                <FinanceEntryList entries={entriesQuery.data.rows} onCancel={(entry) => void cancelEntry(entry)} onEdit={openEditDrawer} onSettle={setSettlementEntry} />
                <PagedFooter page={entryPage} setPage={setEntryPage} totalCount={entriesQuery.data.totalCount} totalPages={entriesQuery.data.totalPages} unit="lancamento" />
              </>
            ) : (
              <EmptyState action={<Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={openCreateDrawer}>Novo lancamento</Button>} description="Nenhum lancamento manual encontrado para os filtros atuais." title="Sem lancamentos." />
            )}
          </MainPanel>
        </div>
      ) : null}

      {activeTab === 'receivables' ? (
        <MainPanel
          error={receivablesQuery.error}
          isError={receivablesQuery.isError}
          isLoading={receivablesQuery.isLoading && !receivablesQuery.data}
          onRetry={() => void receivablesQuery.refetch()}
          title="Nao foi possivel carregar valores a receber."
        >
          {receivablesQuery.data?.rows.length ? (
            <>
              <FinanceObligationList rows={receivablesQuery.data.rows} />
              <PagedFooter page={receivablePage} setPage={setReceivablePage} totalCount={receivablesQuery.data.totalCount} totalPages={receivablesQuery.data.totalPages} unit="item" />
            </>
          ) : (
            <EmptyState description="Nao ha mensalidades ou receitas manuais em aberto neste mes." title="Nada a receber." />
          )}
        </MainPanel>
      ) : null}

      {activeTab === 'payables' ? (
        <MainPanel
          error={payablesQuery.error}
          isError={payablesQuery.isError}
          isLoading={payablesQuery.isLoading && !payablesQuery.data}
          onRetry={() => void payablesQuery.refetch()}
          title="Nao foi possivel carregar valores a pagar."
        >
          {payablesQuery.data?.rows.length ? (
            <>
              <FinanceObligationList rows={payablesQuery.data.rows} />
              <PagedFooter page={payablePage} setPage={setPayablePage} totalCount={payablesQuery.data.totalCount} totalPages={payablesQuery.data.totalPages} unit="item" />
            </>
          ) : (
            <EmptyState description="Nao ha despesas em aberto neste mes." title="Nada a pagar." />
          )}
        </MainPanel>
      ) : null}

      <FinanceEntryDrawer
        accounts={accounts}
        categories={categories}
        editingEntry={editingEntry}
        isOpen={isEntryDrawerOpen}
        onClose={() => {
          setIsEntryDrawerOpen(false)
          setEditingEntry(null)
        }}
        referenceMonth={referenceMonth}
      />
      <FinancialSettlementDrawer accounts={accounts} entry={settlementEntry} onClose={() => setSettlementEntry(null)} />
    </div>
  )
}

function SummaryItem({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'success' | 'danger'
  value: string
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/30 bg-success/5 text-success'
      : tone === 'danger'
        ? 'border-danger/30 bg-danger/5 text-danger'
        : 'border-border bg-background text-foreground'

  return (
    <div className={`rounded border p-3 ${toneClass}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function MainPanel({
  children,
  error,
  isError,
  isLoading,
  onRetry,
  title,
}: {
  children: ReactNode
  error: unknown
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  title: string
}) {
  if (isLoading) {
    return <div className="h-72 rounded-md border border-border bg-surface shadow-subtle" />
  }

  if (isError) {
    return <ErrorState description={getUserSafeErrorMessage(error)} onRetry={onRetry} title={title} />
  }

  return <>{children}</>
}

function PagedFooter({
  page,
  setPage,
  totalCount,
  totalPages,
  unit,
}: {
  page: number
  setPage: (page: number) => void
  totalCount: number
  totalPages: number
  unit: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages}, {totalCount} {unit}
        {totalCount === 1 ? '' : 's'}.
      </p>
      <Pagination
        onNext={() => setPage(Math.min(totalPages, page + 1))}
        onPrevious={() => setPage(Math.max(1, page - 1))}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
