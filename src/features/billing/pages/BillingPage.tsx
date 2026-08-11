import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { BillingFeeList } from '@/features/billing/components/BillingFeeList'
import { BillingFilters } from '@/features/billing/components/BillingFilters'
import { MonthlyFeeDetailDrawer } from '@/features/billing/components/MonthlyFeeDetailDrawer'
import { PaymentDrawer } from '@/features/billing/components/PaymentDrawer'
import {
  useBillingMonthSummary,
  useEnsureMonthlyFees,
  useMonthlyFeesList,
} from '@/features/billing/hooks/useBilling'
import type { MonthlyFeeListRow, MonthlyFeeStatus } from '@/features/billing/types/billingTypes'
import {
  addMonths,
  formatReferenceMonth,
  getCurrentReferenceMonth,
} from '@/features/billing/utils/billingDates'
import { formatMoney } from '@/features/billing/utils/billingFormat'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'

const PAGE_SIZE = 20

export default function BillingPage() {
  const currentMonth = useMemo(() => getCurrentReferenceMonth(), [])
  const [referenceMonth, setReferenceMonth] = useState(currentMonth)
  const [status, setStatus] = useState<MonthlyFeeStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [paymentFee, setPaymentFee] = useState<MonthlyFeeListRow | null>(null)
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search, 320)
  const filters = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      referenceMonth,
      search: debouncedSearch,
      status,
    }),
    [debouncedSearch, page, referenceMonth, status],
  )
  const feesQuery = useMonthlyFeesList(filters)
  const summaryQuery = useBillingMonthSummary(referenceMonth)
  const ensureMutation = useEnsureMonthlyFees(referenceMonth)
  const { notify } = useToast()
  const fees = feesQuery.data?.fees ?? []
  const totalCount = feesQuery.data?.totalCount ?? 0
  const totalPages = feesQuery.data?.totalPages ?? 1
  const summary = summaryQuery.data
  const isInitialLoading = feesQuery.isLoading && !feesQuery.data
  const hasFilters = debouncedSearch.trim().length > 0 || status !== 'all'

  function changeMonth(value: string) {
    setReferenceMonth(value)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: MonthlyFeeStatus) {
    setStatus(value)
    setPage(1)
  }

  async function generateFees() {
    try {
      const result = await ensureMutation.mutateAsync()
      notify({
        title: result.generated_count > 0 ? 'Mensalidades geradas.' : 'Mensalidades ja estavam geradas.',
        description:
          result.generated_count > 0
            ? `${result.generated_count} cobranca${result.generated_count === 1 ? '' : 's'} criada${result.generated_count === 1 ? '' : 's'}.`
            : 'A geracao e idempotente e nao duplicou cobrancas.',
        tone: 'success',
      })
    } catch (error) {
      notify({
        title: 'Nao foi possivel gerar mensalidades.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              isLoading={ensureMutation.isPending}
              leftIcon={<Wand2 className="h-4 w-4" aria-hidden />}
              onClick={() => void generateFees()}
            >
              Gerar mensalidades
            </Button>
            <Button
              isLoading={feesQuery.isFetching || summaryQuery.isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onClick={() => {
                void feesQuery.refetch()
                void summaryQuery.refetch()
              }}
              variant="secondary"
            >
              Atualizar
            </Button>
          </div>
        }
        description="Gere cobrancas mensais, registre pagamentos parciais, acompanhe saldos e trate reversoes com historico."
        title="Mensalidades"
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
              onChange={(event) => changeMonth(`${event.target.value}-01`)}
              type="month"
              value={referenceMonth.slice(0, 7)}
            />
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Previsto" value={formatMoney(summary?.expected_amount)} />
          <SummaryItem label="Recebido" value={formatMoney(summary?.received_amount)} />
          <SummaryItem label="Pendente" value={formatMoney(summary?.pending_amount)} />
          <SummaryItem label="Vencido" value={formatMoney(summary?.overdue_amount)} tone="danger" />
        </dl>
      </section>

      <BillingFilters
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        search={search}
        status={status}
      />

      {isInitialLoading ? <BillingSkeleton /> : null}

      {feesQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar mensalidades."
          description={getUserSafeErrorMessage(feesQuery.error)}
          onRetry={() => void feesQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !feesQuery.isError && fees.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? null : (
              <Button
                isLoading={ensureMutation.isPending}
                leftIcon={<Wand2 className="h-4 w-4" aria-hidden />}
                onClick={() => void generateFees()}
              >
                Gerar mensalidades de {formatReferenceMonth(referenceMonth)}
              </Button>
            )
          }
          description={
            hasFilters
              ? 'Ajuste a busca ou o filtro de status para ver outras cobrancas.'
              : 'A geracao usa apenas planos financeiros ativos. Alunos sem plano nao recebem valor inventado.'
          }
          title={hasFilters ? 'Nenhuma mensalidade encontrada.' : 'Nenhuma mensalidade gerada neste mes.'}
        />
      ) : null}

      {!feesQuery.isError && fees.length > 0 ? (
        <div className="space-y-3">
          <BillingFeeList fees={fees} onOpenFee={setSelectedFeeId} onRegisterPayment={setPaymentFee} />
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}, {totalCount} mensalidade{totalCount === 1 ? '' : 's'}.
            </p>
            <Pagination
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              page={page}
              totalPages={totalPages}
            />
          </div>
        </div>
      ) : null}

      <PaymentDrawer fee={paymentFee} onClose={() => setPaymentFee(null)} />
      <MonthlyFeeDetailDrawer monthlyFeeId={selectedFeeId} onClose={() => setSelectedFeeId(null)} />
    </div>
  )
}

function SummaryItem({ label, tone, value }: { label: string; tone?: 'danger'; value: string }) {
  return (
    <div className={tone === 'danger' ? 'rounded border border-danger/30 bg-danger/5 p-3' : 'rounded border border-border bg-background p-3'}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone === 'danger' ? 'mt-1 text-2xl font-semibold text-danger' : 'mt-1 text-2xl font-semibold text-foreground'}>{value}</dd>
    </div>
  )
}

function BillingSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="h-28 rounded-md border border-border bg-surface shadow-subtle" key={index} />
      ))}
    </div>
  )
}
