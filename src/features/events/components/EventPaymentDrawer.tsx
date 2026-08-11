import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import { useSettleEventRegistration } from '@/features/events/hooks/useEvents'
import type { CashAccount, EventRegistrationRow, PaymentMethod } from '@/features/events/types/eventsTypes'
import { formatMoney, paymentMethodOptions } from '@/features/events/utils/eventsFormat'
import { toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/finance/utils/financeDates'

type EventPaymentDrawerProps = {
  accounts: CashAccount[]
  eventId: string
  onClose: () => void
  registration: EventRegistrationRow | null
}

export function EventPaymentDrawer({ accounts, eventId, onClose, registration }: EventPaymentDrawerProps) {
  const [amount, setAmount] = useState('')
  const [settledAt, setSettledAt] = useState(toLocalDateTimeInputValue())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [cashAccountId, setCashAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useSettleEventRegistration(eventId)
  const { notify } = useToast()
  const activeAccounts = accounts.filter((account) => account.is_active)
  const defaultAccountId = activeAccounts[0]?.id ?? ''
  const balance = Number(registration?.balance ?? 0)
  const numericAmount = Number(amount || '0')

  useEffect(() => {
    if (!registration) return
    setAmount(String(Math.max(0, Number(registration.balance)).toFixed(2)))
    setSettledAt(toLocalDateTimeInputValue())
    setPaymentMethod('pix')
    setCashAccountId(defaultAccountId)
    setNotes('')
  }, [defaultAccountId, registration])

  const validationMessage = useMemo(() => {
    if (!registration) return 'Selecione uma inscricao.'
    if (numericAmount <= 0) return 'Informe um valor maior que zero.'
    if (numericAmount > balance) return `O valor deve ser ate ${formatMoney(balance)}.`
    return null
  }, [balance, numericAmount, registration])

  async function handleSubmit() {
    if (!registration || validationMessage) return

    try {
      await mutation.mutateAsync({
        amount: numericAmount,
        cashAccountId,
        notes,
        paymentMethod,
        registrationId: registration.registration_id,
        settledAt: toPaymentTimestamp(settledAt),
      })
      notify({ title: 'Recebimento registrado.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel receber.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={Boolean(registration)} onClose={onClose} side="right" title="Receber inscricao">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="rounded-md border border-border bg-background p-3">
          <p className="font-semibold text-foreground">{registration?.participant_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Saldo em aberto: {formatMoney(balance)}</p>
        </div>
        <Input inputMode="decimal" label="Valor recebido" min={0} onChange={(event) => setAmount(event.target.value)} step="0.01" type="number" value={amount} />
        <Input label="Data" onChange={(event) => setSettledAt(event.target.value)} type="datetime-local" value={settledAt} />
        <Select label="Forma" onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} value={paymentMethod}>
          {paymentMethodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select label="Conta" onChange={(event) => setCashAccountId(event.target.value)} value={cashAccountId}>
          <option value="">Sem conta</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
        <Textarea label="Observacao" onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" value={notes} />
        {validationMessage ? <p className="text-sm font-medium text-danger">{validationMessage}</p> : null}
        <footer className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={Boolean(validationMessage)} isLoading={mutation.isPending} type="submit">
            Receber
          </Button>
        </footer>
      </form>
    </Overlay>
  )
}
