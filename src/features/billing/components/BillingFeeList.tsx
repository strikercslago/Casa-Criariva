import { ArrowRight, CreditCard, MessageCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { MonthlyFeeListRow } from '@/features/billing/types/billingTypes'
import { formatShortDate } from '@/features/billing/utils/billingDates'
import {
  formatMoney,
  getMonthlyFeeStatusLabel,
  getMonthlyFeeStatusTone,
  getOverdueLabel,
} from '@/features/billing/utils/billingFormat'
import { normalizePhoneForWhatsApp } from '@/features/students/utils/student360Format'

type BillingFeeListProps = {
  fees: MonthlyFeeListRow[]
  onOpenFee: (feeId: string) => void
  onRegisterPayment: (fee: MonthlyFeeListRow) => void
}

export function BillingFeeList({ fees, onOpenFee, onRegisterPayment }: BillingFeeListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle lg:block">
        <div className="grid grid-cols-[minmax(180px,1.25fr)_120px_120px_120px_120px_120px_minmax(160px,1fr)_180px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Aluno</span>
          <span>Referencia</span>
          <span>Vencimento</span>
          <span>Valor</span>
          <span>Pago</span>
          <span>Saldo</span>
          <span>Responsavel</span>
          <span className="text-right">Acoes</span>
        </div>
        {fees.map((fee) => (
          <article
            className="grid grid-cols-[minmax(180px,1.25fr)_120px_120px_120px_120px_120px_minmax(160px,1fr)_180px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={fee.monthly_fee_id}
          >
            <div className="min-w-0">
              <button
                className="truncate text-left font-semibold text-foreground hover:text-primary"
                onClick={() => onOpenFee(fee.monthly_fee_id)}
                type="button"
              >
                {fee.student_name}
              </button>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={getMonthlyFeeStatusTone(fee)}>{getMonthlyFeeStatusLabel(fee)}</Badge>
                {getOverdueLabel(fee.days_overdue) ? <Badge tone="danger">{getOverdueLabel(fee.days_overdue)}</Badge> : null}
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{fee.reference_month.slice(5, 7)}/{fee.reference_month.slice(0, 4)}</span>
            <span className="text-sm text-foreground">{formatShortDate(fee.due_date)}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(fee.final_amount)}</span>
            <span className="text-sm text-foreground">{formatMoney(fee.amount_paid)}</span>
            <span className="text-sm font-semibold text-foreground">{formatMoney(fee.balance)}</span>
            <FinancialGuardian fee={fee} />
            <div className="flex justify-end gap-2">
              <Button
                disabled={fee.balance <= 0 || fee.lifecycle_status === 'cancelled'}
                leftIcon={<CreditCard className="h-4 w-4" aria-hidden />}
                onClick={() => onRegisterPayment(fee)}
                size="sm"
                variant="secondary"
              >
                Pagar
              </Button>
              <Button
                onClick={() => onOpenFee(fee.monthly_fee_id)}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                size="sm"
                variant="secondary"
              >
                Abrir
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 lg:hidden">
        {fees.map((fee) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={fee.monthly_fee_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-foreground">{fee.student_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fee.reference_month.slice(5, 7)}/{fee.reference_month.slice(0, 4)} - Vence {formatShortDate(fee.due_date)}
                </p>
              </div>
              <Badge tone={getMonthlyFeeStatusTone(fee)}>{getMonthlyFeeStatusLabel(fee)}</Badge>
            </div>

            {getOverdueLabel(fee.days_overdue) ? (
              <p className="mt-2 text-sm font-medium text-danger">{getOverdueLabel(fee.days_overdue)}</p>
            ) : null}

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Mensalidade" value={formatMoney(fee.final_amount)} />
              <Summary label="Pago" value={formatMoney(fee.amount_paid)} />
              <Summary label="Saldo" value={formatMoney(fee.balance)} />
            </dl>

            <div className="mt-4">
              <FinancialGuardian fee={fee} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                disabled={fee.balance <= 0 || fee.lifecycle_status === 'cancelled'}
                leftIcon={<CreditCard className="h-4 w-4" aria-hidden />}
                onClick={() => onRegisterPayment(fee)}
                variant="secondary"
              >
                Registrar pagamento
              </Button>
              <Button
                onClick={() => onOpenFee(fee.monthly_fee_id)}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                variant="secondary"
              >
                Ver cobranca
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function FinancialGuardian({ fee }: { fee: MonthlyFeeListRow }) {
  const whatsapp = normalizePhoneForWhatsApp(fee.financial_guardian_phone)

  return (
    <div className="min-w-0 text-sm">
      <p className="truncate font-medium text-foreground">{fee.financial_guardian_name ?? 'Nao informado'}</p>
      {fee.financial_guardian_phone ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>{fee.financial_guardian_phone}</span>
          {whatsapp ? (
            <button
              className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
              onClick={() => window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer')}
              type="button"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              WhatsApp
            </button>
          ) : null}
        </div>
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
