import { useEffect, useState } from 'react'
import { AlertTriangle, RotateCcw, Save, XCircle } from 'lucide-react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import {
  useCancelMonthlyFee,
  useMonthlyFeeDetail,
  useReversePayment,
  useUpdateMonthlyFeeAmount,
} from '@/features/billing/hooks/useBilling'
import { formatPaymentDateTime, formatShortDate } from '@/features/billing/utils/billingDates'
import {
  formatMoney,
  getMonthlyFeeStatusLabel,
  getMonthlyFeeStatusTone,
  paymentMethodLabels,
} from '@/features/billing/utils/billingFormat'

type MonthlyFeeDetailDrawerProps = {
  monthlyFeeId: string | null
  onClose: () => void
}

export function MonthlyFeeDetailDrawer({ monthlyFeeId, onClose }: MonthlyFeeDetailDrawerProps) {
  const detailQuery = useMonthlyFeeDetail(monthlyFeeId)
  const reverseMutation = useReversePayment()
  const cancelMutation = useCancelMonthlyFee()
  const updateMutation = useUpdateMonthlyFeeAmount()
  const { notify } = useToast()
  const detail = detailQuery.data
  const [reversePaymentId, setReversePaymentId] = useState<string | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  useEffect(() => {
    if (detail) {
      setBaseAmount(String(Number(detail.base_amount).toFixed(2)))
      setDiscountAmount(String(Number(detail.discount_amount).toFixed(2)))
      setNotes(detail.notes ?? '')
      setAdjustReason('')
      setCancelReason('')
      setReversePaymentId(null)
      setReverseReason('')
    }
  }, [detail])

  async function reversePayment(paymentId: string) {
    if (!detail || reverseReason.trim().length < 4) {
      return
    }

    try {
      await reverseMutation.mutateAsync({
        monthlyFeeId: detail.monthly_fee_id,
        paymentId,
        reason: reverseReason,
        referenceMonth: detail.reference_month,
        studentId: detail.student_id,
      })
      notify({ title: 'Pagamento revertido.', tone: 'success' })
      setReversePaymentId(null)
      setReverseReason('')
    } catch (error) {
      notify({ title: 'Nao foi possivel reverter.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function cancelFee() {
    if (!detail || cancelReason.trim().length < 4) {
      return
    }

    try {
      await cancelMutation.mutateAsync({
        monthlyFeeId: detail.monthly_fee_id,
        reason: cancelReason,
        referenceMonth: detail.reference_month,
        studentId: detail.student_id,
      })
      notify({ title: 'Mensalidade cancelada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel cancelar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function updateFee() {
    if (!detail || adjustReason.trim().length < 4) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        baseAmount: Number(baseAmount || '0'),
        discountAmount: Number(discountAmount || '0'),
        monthlyFeeId: detail.monthly_fee_id,
        notes: notes.trim() || null,
        reason: adjustReason,
        referenceMonth: detail.reference_month,
        studentId: detail.student_id,
      })
      notify({ title: 'Mensalidade ajustada.', tone: 'success' })
      setAdjustReason('')
    } catch (error) {
      notify({ title: 'Nao foi possivel ajustar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={Boolean(monthlyFeeId)} onClose={onClose} side="wide" title="Ficha da mensalidade">
      {detailQuery.isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : null}

      {detailQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar a mensalidade."
          description={getUserSafeErrorMessage(detailQuery.error)}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}

      {detail ? (
        <div className="grid gap-5">
          <header className="grid gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{detail.student_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Referencia {detail.reference_month.slice(5, 7)}/{detail.reference_month.slice(0, 4)} - Vencimento {formatShortDate(detail.due_date)}
                </p>
              </div>
              <Badge tone={getMonthlyFeeStatusTone(detail)}>{getMonthlyFeeStatusLabel(detail)}</Badge>
            </div>

            <dl className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-4">
              <Summary label="Valor base" value={formatMoney(detail.base_amount)} />
              <Summary label="Desconto" value={formatMoney(detail.discount_amount)} />
              <Summary label="Valor final" value={formatMoney(detail.final_amount)} />
              <Summary label="Saldo" value={formatMoney(detail.balance)} />
            </dl>

            <section className="rounded-md border border-border bg-background p-3 text-sm">
              <p className="font-medium text-foreground">Responsavel financeiro</p>
              <p className="mt-1 text-muted-foreground">
                {detail.financial_guardian_name ?? 'Nao informado'}
                {detail.financial_guardian_phone ? ` - ${detail.financial_guardian_phone}` : ''}
              </p>
            </section>
          </header>

          <section className="grid gap-3">
            <h3 className="text-base font-semibold text-foreground">Historico de pagamentos</h3>
            {detail.payments.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-background p-5 text-sm">
                <p className="font-semibold text-foreground">Nenhum pagamento registrado</p>
                <p className="mt-1 text-muted-foreground">Pagamentos futuros aparecerao aqui, inclusive reversoes.</p>
              </div>
            ) : (
              <ol className="grid gap-3">
                {detail.payments.map((payment) => (
                  <li className="rounded-md border border-border bg-background p-4" key={payment.allocation_id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{formatMoney(payment.amount)}</p>
                          <Badge tone={payment.status === 'reversed' ? 'danger' : 'success'}>
                            {payment.status === 'reversed' ? 'Revertido' : 'Recebido'}
                          </Badge>
                          <Badge tone="neutral">{paymentMethodLabels[payment.payment_method]}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{formatPaymentDateTime(payment.paid_at)}</p>
                        {payment.notes ? <p className="mt-2 text-sm text-muted-foreground">{payment.notes}</p> : null}
                        {payment.reversal_reason ? (
                          <p className="mt-2 text-sm font-medium text-danger">Motivo: {payment.reversal_reason}</p>
                        ) : null}
                      </div>
                      {payment.status === 'received' ? (
                        <Button
                          leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
                          onClick={() => setReversePaymentId(payment.payment_id)}
                          size="sm"
                          variant="secondary"
                        >
                          Reverter
                        </Button>
                      ) : null}
                    </div>

                    {reversePaymentId === payment.payment_id ? (
                      <div className="mt-4 grid gap-3 rounded border border-border bg-surface p-3">
                        <Textarea
                          label="Motivo da reversao"
                          onChange={(event) => setReverseReason(event.target.value)}
                          placeholder="Ex: Pagamento registrado por engano."
                          value={reverseReason}
                        />
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <Button onClick={() => setReversePaymentId(null)} size="sm" variant="secondary">
                            Cancelar
                          </Button>
                          <Button
                            disabled={reverseReason.trim().length < 4}
                            isLoading={reverseMutation.isPending}
                            onClick={() => void reversePayment(payment.payment_id)}
                            size="sm"
                            variant="danger"
                          >
                            Confirmar reversao
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="grid gap-4 rounded-md border border-border bg-background p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" aria-hidden />
              <div>
                <h3 className="font-semibold text-foreground">Ajustar cobranca</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use somente para correcao negociada. O banco impede valor final menor que pagamentos recebidos.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Valor base" min={0} onChange={(event) => setBaseAmount(event.target.value)} step="0.01" type="number" value={baseAmount} />
              <Input label="Desconto" min={0} onChange={(event) => setDiscountAmount(event.target.value)} step="0.01" type="number" value={discountAmount} />
            </div>
            <Textarea label="Observacao da cobranca" onChange={(event) => setNotes(event.target.value)} value={notes} />
            <Textarea
              label="Motivo do ajuste"
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder="Obrigatorio"
              value={adjustReason}
            />
            <div className="flex justify-end">
              <Button
                disabled={detail.lifecycle_status === 'cancelled' || adjustReason.trim().length < 4}
                isLoading={updateMutation.isPending}
                leftIcon={<Save className="h-4 w-4" aria-hidden />}
                onClick={() => void updateFee()}
                variant="secondary"
              >
                Salvar ajuste
              </Button>
            </div>
          </section>

          <section className="grid gap-3 rounded-md border border-danger/30 bg-danger/5 p-4">
            <div>
              <h3 className="font-semibold text-foreground">Cancelar mensalidade</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cobrancas com pagamentos recebidos precisam ter os pagamentos revertidos antes do cancelamento.
              </p>
            </div>
            <Textarea
              label="Motivo do cancelamento"
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Obrigatorio"
              value={cancelReason}
            />
            <div className="flex justify-end">
              <Button
                disabled={detail.lifecycle_status === 'cancelled' || detail.amount_paid > 0 || cancelReason.trim().length < 4}
                isLoading={cancelMutation.isPending}
                leftIcon={<XCircle className="h-4 w-4" aria-hidden />}
                onClick={() => void cancelFee()}
                variant="danger"
              >
                Cancelar mensalidade
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </Overlay>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  )
}
