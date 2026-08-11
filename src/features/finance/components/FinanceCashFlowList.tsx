import { RotateCcw } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { FinanceCashFlowRow } from '@/features/finance/types/financeTypes'
import { formatPaymentDateTime } from '@/features/billing/utils/billingDates'
import {
  formatMoney,
  getDirectionLabel,
  getDirectionTone,
  getSourceLabel,
  paymentMethodLabelMap,
} from '@/features/finance/utils/financeFormat'

type FinanceCashFlowListProps = {
  movements: FinanceCashFlowRow[]
  onReverseSettlement: (movement: FinanceCashFlowRow) => void
}

export function FinanceCashFlowList({ movements, onReverseSettlement }: FinanceCashFlowListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle lg:block">
        <div className="grid grid-cols-[110px_minmax(220px,1.4fr)_150px_140px_140px_120px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Fluxo</span>
          <span>Descricao</span>
          <span>Origem</span>
          <span>Data</span>
          <span>Valor</span>
          <span className="text-right">Acoes</span>
        </div>
        {movements.map((movement) => (
          <article
            className="grid grid-cols-[110px_minmax(220px,1.4fr)_150px_140px_140px_120px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={movement.movement_id}
          >
            <Badge tone={getDirectionTone(movement.direction)}>{getDirectionLabel(movement.direction)}</Badge>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{movement.description}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {movement.category_name ?? 'Sem categoria'} - {paymentMethodLabelMap[movement.payment_method]}
                {movement.cash_account_name ? ` - ${movement.cash_account_name}` : ''}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{getSourceLabel(movement.source_type)}</span>
            <span className="text-sm text-foreground">{formatPaymentDateTime(movement.occurred_at)}</span>
            <span className={movement.direction === 'income' ? 'text-sm font-semibold text-success' : 'text-sm font-semibold text-danger'}>
              {movement.direction === 'income' ? '+' : '-'} {formatMoney(movement.amount)}
            </span>
            <div className="flex justify-end">
              <Button
                disabled={movement.source_type !== 'financial_settlement'}
                leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
                onClick={() => onReverseSettlement(movement)}
                size="sm"
                variant="secondary"
              >
                Reverter
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 lg:hidden">
        {movements.map((movement) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={movement.movement_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-foreground">{movement.description}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{formatPaymentDateTime(movement.occurred_at)}</p>
              </div>
              <Badge tone={getDirectionTone(movement.direction)}>{getDirectionLabel(movement.direction)}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Origem" value={getSourceLabel(movement.source_type)} />
              <Summary label="Forma" value={paymentMethodLabelMap[movement.payment_method]} />
              <Summary label="Valor" value={formatMoney(movement.amount)} />
            </dl>
            {movement.source_type === 'financial_settlement' ? (
              <Button className="mt-4 w-full" leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={() => onReverseSettlement(movement)} variant="secondary">
                Reverter liquidacao
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-foreground">{value}</dd>
    </div>
  )
}
