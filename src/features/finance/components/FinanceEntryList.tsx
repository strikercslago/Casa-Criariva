import { ArrowRight, Ban, CreditCard, Pencil } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { FinancialEntryRow } from '@/features/finance/types/financeTypes'
import { formatShortDate } from '@/features/finance/utils/financeDates'
import {
  formatMoney,
  getEntryTypeLabel,
  getFinancialStatusLabel,
  getFinancialStatusTone,
  getOverdueLabel,
} from '@/features/finance/utils/financeFormat'

type FinanceEntryListProps = {
  entries: FinancialEntryRow[]
  onCancel: (entry: FinancialEntryRow) => void
  onEdit: (entry: FinancialEntryRow) => void
  onSettle: (entry: FinancialEntryRow) => void
}

export function FinanceEntryList({ entries, onCancel, onEdit, onSettle }: FinanceEntryListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle xl:block">
        <div className="grid grid-cols-[110px_minmax(220px,1.4fr)_130px_120px_120px_120px_220px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Tipo</span>
          <span>Lancamento</span>
          <span>Vencimento</span>
          <span>Valor</span>
          <span>Liquidado</span>
          <span>Saldo</span>
          <span className="text-right">Acoes</span>
        </div>
        {entries.map((entry) => (
          <article
            className="grid grid-cols-[110px_minmax(220px,1.4fr)_130px_120px_120px_120px_220px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={entry.entry_id}
          >
            <Badge tone={entry.type === 'income' ? 'success' : 'danger'}>{getEntryTypeLabel(entry.type)}</Badge>
            <EntryTitle entry={entry} />
            <span className="text-sm text-foreground">{entry.due_date ? formatShortDate(entry.due_date) : '-'}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(entry.amount)}</span>
            <span className="text-sm text-foreground">{formatMoney(entry.settled_amount)}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(entry.balance)}</span>
            <div className="flex justify-end gap-2">
              <Button
                disabled={entry.balance <= 0 || entry.lifecycle_status === 'cancelled'}
                leftIcon={<CreditCard className="h-4 w-4" aria-hidden />}
                onClick={() => onSettle(entry)}
                size="sm"
                variant="secondary"
              >
                Liquidar
              </Button>
              <Button leftIcon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => onEdit(entry)} size="sm" variant="secondary">
                Editar
              </Button>
              <Button
                disabled={entry.lifecycle_status === 'cancelled' || entry.settled_amount > 0}
                leftIcon={<Ban className="h-4 w-4" aria-hidden />}
                onClick={() => onCancel(entry)}
                size="sm"
                variant="secondary"
              >
                Cancelar
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:hidden">
        {entries.map((entry) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={entry.entry_id}>
            <div className="flex items-start justify-between gap-3">
              <EntryTitle entry={entry} />
              <Badge tone={entry.type === 'income' ? 'success' : 'danger'}>{getEntryTypeLabel(entry.type)}</Badge>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Valor" value={formatMoney(entry.amount)} />
              <Summary label="Liquidado" value={formatMoney(entry.settled_amount)} />
              <Summary label="Saldo" value={formatMoney(entry.balance)} />
            </dl>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button
                disabled={entry.balance <= 0 || entry.lifecycle_status === 'cancelled'}
                leftIcon={<CreditCard className="h-4 w-4" aria-hidden />}
                onClick={() => onSettle(entry)}
                variant="secondary"
              >
                Liquidar
              </Button>
              <Button leftIcon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => onEdit(entry)} variant="secondary">
                Editar
              </Button>
              <Button
                disabled={entry.lifecycle_status === 'cancelled' || entry.settled_amount > 0}
                leftIcon={<Ban className="h-4 w-4" aria-hidden />}
                onClick={() => onCancel(entry)}
                variant="secondary"
              >
                Cancelar
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function EntryTitle({ entry }: { entry: FinancialEntryRow }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h2 className="truncate font-semibold text-foreground">{entry.description}</h2>
        <Badge tone={getFinancialStatusTone(entry.computed_status)}>{getFinancialStatusLabel(entry.computed_status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {entry.category_name ?? 'Sem categoria'} {entry.due_date ? `- vence ${formatShortDate(entry.due_date)}` : ''}
      </p>
      {getOverdueLabel(entry.days_overdue) ? <p className="mt-1 text-sm font-medium text-danger">{getOverdueLabel(entry.days_overdue)}</p> : null}
      {entry.recurring_rule_id ? (
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          Recorrente
        </p>
      ) : null}
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
