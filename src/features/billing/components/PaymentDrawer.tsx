import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import type { MonthlyFeeListRow, PaymentMethod } from '@/features/billing/types/billingTypes'
import { useRegisterPayment } from '@/features/billing/hooks/useBilling'
import { toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/billing/utils/billingDates'
import { formatMoney, paymentMethodOptions } from '@/features/billing/utils/billingFormat'

type PaymentDrawerProps = {
  fee: MonthlyFeeListRow | null
  onClose: () => void
}

export function PaymentDrawer({ fee, onClose }: PaymentDrawerProps) {
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(toLocalDateTimeInputValue())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [notes, setNotes] = useState('')
  const registerMutation = useRegisterPayment()
  const { notify } = useToast()
  const numericAmount = Number(amount || '0')
  const balanceAfterPayment = Math.max(Number(fee?.balance ?? 0) - numericAmount, 0)
  const validationMessage = useMemo(() => {
    if (!fee) {
      return null
    }

    if (numericAmount <= 0) {
      return 'Informe um valor maior que zero.'
    }

    if (numericAmount > Number(fee.balance)) {
      return `O valor informado e maior que o saldo de ${formatMoney(fee.balance)}.`
    }

    return null
  }, [fee, numericAmount])

  useEffect(() => {
    if (fee) {
      setAmount(String(Number(fee.balance).toFixed(2)))
      setPaidAt(toLocalDateTimeInputValue())
      setPaymentMethod('pix')
      setNotes('')
    }
  }, [fee])

  async function handleSubmit() {
    if (!fee || validationMessage) {
      return
    }

    try {
      await registerMutation.mutateAsync({
        amount: numericAmount,
        monthlyFeeId: fee.monthly_fee_id,
        notes,
        paidAt: toPaymentTimestamp(paidAt),
        payerGuardianId: fee.financial_guardian_id,
        paymentMethod,
        referenceMonth: fee.reference_month,
        studentId: fee.student_id,
      })
      notify({ title: 'Pagamento registrado.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({
        title: 'Nao foi possivel registrar o pagamento. Tente novamente.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={Boolean(fee)} onClose={onClose} side="right" title="Registrar pagamento">
      {fee ? (
        <div className="grid gap-5">
          <section className="grid gap-3 rounded-md border border-border bg-background p-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">{fee.student_name}</p>
              <p className="text-muted-foreground">
                Mensalidade {fee.reference_month.slice(5, 7)}/{fee.reference_month.slice(0, 4)}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2">
              <Summary label="Total" value={formatMoney(fee.final_amount)} />
              <Summary label="Pago" value={formatMoney(fee.amount_paid)} />
              <Summary label="Saldo" value={formatMoney(fee.balance)} />
            </dl>
          </section>

          <div className="grid gap-3">
            <Input
              error={validationMessage ?? undefined}
              inputMode="decimal"
              label="Valor recebido"
              min={0}
              onChange={(event) => setAmount(event.target.value)}
              step="0.01"
              type="number"
              value={amount}
            />
            <Input
              label="Data do pagamento"
              onChange={(event) => setPaidAt(event.target.value)}
              type="datetime-local"
              value={paidAt}
            />
            <Select
              label="Forma"
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              value={paymentMethod}
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Textarea
              label="Observacao"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
              value={notes}
            />
          </div>

          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Saldo apos pagamento</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(balanceAfterPayment)}</p>
          </div>

          <footer className="grid gap-2 sm:grid-cols-2">
            <Button onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={Boolean(validationMessage)}
              isLoading={registerMutation.isPending}
              onClick={() => void handleSubmit()}
            >
              Registrar pagamento
            </Button>
          </footer>
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
