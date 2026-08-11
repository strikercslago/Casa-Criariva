import { Badge } from '@/shared/components/ui/Badge'
import type { FinanceObligationRow } from '@/features/finance/types/financeTypes'
import { formatShortDate } from '@/features/finance/utils/financeDates'
import {
  formatMoney,
  getFinancialStatusLabel,
  getFinancialStatusTone,
  getOverdueLabel,
} from '@/features/finance/utils/financeFormat'

type FinanceObligationListProps = {
  rows: FinanceObligationRow[]
}

export function FinanceObligationList({ rows }: FinanceObligationListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle lg:block">
        <div className="grid grid-cols-[minmax(220px,1.4fr)_130px_130px_130px_130px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Item</span>
          <span>Origem</span>
          <span>Vencimento</span>
          <span>Total</span>
          <span>Liquidado</span>
          <span>Saldo</span>
        </div>
        {rows.map((row) => (
          <article
            className="grid grid-cols-[minmax(220px,1.4fr)_130px_130px_130px_130px_120px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={row.item_id}
          >
            <ObligationTitle row={row} />
            <span className="text-sm text-muted-foreground">{row.source_type === 'monthly_fee' ? 'Mensalidade' : 'Manual'}</span>
            <span className="text-sm text-foreground">{row.due_date ? formatShortDate(row.due_date) : '-'}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(row.amount)}</span>
            <span className="text-sm text-foreground">{formatMoney(row.settled_amount)}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(row.balance)}</span>
          </article>
        ))}
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={row.item_id}>
            <ObligationTitle row={row} />
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Total" value={formatMoney(row.amount)} />
              <Summary label="Liquidado" value={formatMoney(row.settled_amount)} />
              <Summary label="Saldo" value={formatMoney(row.balance)} />
            </dl>
          </article>
        ))}
      </div>
    </div>
  )
}

function ObligationTitle({ row }: { row: FinanceObligationRow }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="truncate font-semibold text-foreground">{row.description}</h2>
        <Badge tone={getFinancialStatusTone(row.computed_status)}>{getFinancialStatusLabel(row.computed_status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {row.source_type === 'monthly_fee' ? 'Mensalidade' : 'Lancamento manual'}
        {row.due_date ? ` - vence ${formatShortDate(row.due_date)}` : ''}
      </p>
      {getOverdueLabel(row.days_overdue) ? <p className="mt-1 text-sm font-medium text-danger">{getOverdueLabel(row.days_overdue)}</p> : null}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  )
}
