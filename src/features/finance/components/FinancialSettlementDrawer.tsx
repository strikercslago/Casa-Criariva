import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import type { CashAccount, FinancialEntryRow, PaymentMethod } from '@/features/finance/types/financeTypes'
import { useSettleFinancialEntry } from '@/features/finance/hooks/useFinance'
import { toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/finance/utils/financeDates'
import { formatMoney, paymentMethodOptions } from '@/features/finance/utils/financeFormat'

type FinancialSettlementDrawerProps = {
  accounts: CashAccount[]
  entry: FinancialEntryRow | null
  onClose: () => void
}

export function FinancialSettlementDrawer({ accounts, entry, onClose }: FinancialSettlementDrawerProps) {
  const activeAccounts = accounts.filter((account) => account.is_active)
  const defaultCashAccountId = activeAccounts[0]?.id ?? ''
  const [amount, setAmount] = useState('')
  const [settledAt, setSettledAt] = useState(toLocalDateTimeInputValue())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [cashAccountId, setCashAccountId] = useState(defaultCashAccountId)
  const [notes, setNotes] = useState('')
  const settleMutation = useSettleFinancialEntry()
  const { notify } = useToast()
  const numericAmount = Number(amount || '0')
  const balanceAfterSettlement = Math.max(Number(entry?.balance ?? 0) - numericAmount, 0)
  const validationMessage = useMemo(() => {
    if (!entry) {
      return null
    }

    if (numericAmount <= 0) {
      return 'Informe um valor maior que zero.'
    }

    if (numericAmount > Number(entry.balance)) {
      return `O valor informado e maior que o saldo de ${formatMoney(entry.balance)}.`
    }

    return null
  }, [entry, numericAmount])

  useEffect(() => {
    if (!entry) {
      return
    }

    setAmount(String(Number(entry.balance).toFixed(2)))
    setSettledAt(toLocalDateTimeInputValue())
    setPaymentMethod('pix')
    setCashAccountId(defaultCashAccountId)
    setNotes('')
  }, [defaultCashAccountId, entry])

  async function handleSubmit() {
    if (!entry || validationMessage) {
      return
    }

    try {
      await settleMutation.mutateAsync({
        amount: numericAmount,
        cashAccountId,
        financialEntryId: entry.entry_id,
        notes,
        paymentMethod,
        settledAt: toPaymentTimestamp(settledAt),
      })
      notify({ title: entry.type === 'income' ? 'Recebimento registrado.' : 'Pagamento registrado.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({
        title: 'Nao foi possivel liquidar o lancamento.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={Boolean(entry)} onClose={onClose} side="right" title={entry?.type === 'income' ? 'Registrar recebimento' : 'Registrar pagamento'}>
      {entry ? (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <section className="grid gap-3 rounded-md border border-border bg-background p-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">{entry.description}</p>
              <p className="text-muted-foreground">{entry.category_name ?? 'Sem categoria'}</p>
            </div>
            <dl className="grid grid-cols-3 gap-2">
              <Summary label="Total" value={formatMoney(entry.amount)} />
              <Summary label={entry.type === 'income' ? 'Recebido' : 'Pago'} value={formatMoney(entry.settled_amount)} />
              <Summary label="Saldo" value={formatMoney(entry.balance)} />
            </dl>
          </section>

          <div className="grid gap-3">
            <Input
              error={validationMessage ?? undefined}
              inputMode="decimal"
              label="Valor"
              min={0}
              onChange={(event) => setAmount(event.target.value)}
              step="0.01"
              type="number"
              value={amount}
            />
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
          </div>

          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <p className="text-muted-foreground">Saldo apos liquidacao</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(balanceAfterSettlement)}</p>
          </div>

          <footer className="grid gap-2 sm:grid-cols-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={Boolean(validationMessage)} isLoading={settleMutation.isPending} type="submit">
              Registrar
            </Button>
          </footer>
        </form>
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
