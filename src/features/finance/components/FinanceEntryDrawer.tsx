import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Checkbox, Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import type {
  CashAccount,
  FinancialCategory,
  FinancialEntryRow,
  FinancialEntryType,
  PaymentMethod,
} from '@/features/finance/types/financeTypes'
import {
  useCreateFinancialEntry,
  useCreateRecurringFinancialRule,
  useEnsureRecurringFinancialEntries,
  useUpdateFinancialEntry,
} from '@/features/finance/hooks/useFinance'
import { toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/finance/utils/financeDates'
import { formatMoney, paymentMethodOptions } from '@/features/finance/utils/financeFormat'

type FinanceEntryDrawerProps = {
  accounts: CashAccount[]
  categories: FinancialCategory[]
  editingEntry: FinancialEntryRow | null
  isOpen: boolean
  onClose: () => void
  referenceMonth: string
}

export function FinanceEntryDrawer({
  accounts,
  categories,
  editingEntry,
  isOpen,
  onClose,
  referenceMonth,
}: FinanceEntryDrawerProps) {
  const [type, setType] = useState<FinancialEntryType>('expense')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [competenceDate, setCompetenceDate] = useState(referenceMonth)
  const [dueDate, setDueDate] = useState(referenceMonth)
  const [notes, setNotes] = useState('')
  const [settleNow, setSettleNow] = useState(false)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settledAt, setSettledAt] = useState(toLocalDateTimeInputValue())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [cashAccountId, setCashAccountId] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [dueDay, setDueDay] = useState('5')
  const createMutation = useCreateFinancialEntry()
  const updateMutation = useUpdateFinancialEntry()
  const createRuleMutation = useCreateRecurringFinancialRule()
  const ensureRecurringMutation = useEnsureRecurringFinancialEntries(referenceMonth)
  const { notify } = useToast()
  const isEditing = Boolean(editingEntry)
  const filteredCategories = categories.filter((category) => category.type === type && category.is_active)
  const activeAccounts = accounts.filter((account) => account.is_active)
  const defaultCashAccountId = activeAccounts[0]?.id ?? ''
  const numericAmount = Number(amount || '0')
  const numericSettlementAmount = Number(settlementAmount || '0')
  const validationMessage = useMemo(() => {
    if (description.trim().length < 2) {
      return 'Informe uma descricao.'
    }

    if (numericAmount <= 0) {
      return 'Informe um valor maior que zero.'
    }

    if (settleNow && (numericSettlementAmount <= 0 || numericSettlementAmount > numericAmount)) {
      return `A liquidacao deve ficar entre R$ 0,01 e ${formatMoney(numericAmount)}.`
    }

    if (isRecurring && (Number(dueDay) < 1 || Number(dueDay) > 31)) {
      return 'O dia de vencimento deve ficar entre 1 e 31.'
    }

    return null
  }, [description, dueDay, isRecurring, numericAmount, numericSettlementAmount, settleNow])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingEntry) {
      setType(editingEntry.type)
      setDescription(editingEntry.description)
      setCategoryId(editingEntry.category_id ?? '')
      setAmount(String(Number(editingEntry.amount).toFixed(2)))
      setCompetenceDate(editingEntry.competence_date)
      setDueDate(editingEntry.due_date ?? editingEntry.competence_date)
      setNotes(editingEntry.notes ?? '')
      setSettleNow(false)
      setIsRecurring(false)
      return
    }

    setType('expense')
    setDescription('')
    setCategoryId('')
    setAmount('')
    setCompetenceDate(referenceMonth)
    setDueDate(referenceMonth)
    setNotes('')
    setSettleNow(false)
    setSettlementAmount('')
    setSettledAt(toLocalDateTimeInputValue())
    setPaymentMethod('pix')
    setCashAccountId(defaultCashAccountId)
    setIsRecurring(false)
    setDueDay('5')
  }, [defaultCashAccountId, editingEntry, isOpen, referenceMonth])

  async function handleSubmit() {
    if (validationMessage) {
      return
    }

    try {
      if (isEditing && editingEntry) {
        await updateMutation.mutateAsync({
          amount: numericAmount,
          categoryId,
          competenceDate,
          description,
          dueDate,
          financialEntryId: editingEntry.entry_id,
          notes,
        })
        notify({ title: 'Lancamento atualizado.', tone: 'success' })
      } else if (isRecurring) {
        await createRuleMutation.mutateAsync({
          amount: numericAmount,
          categoryId,
          description,
          dueDay: Number(dueDay),
          startDate: competenceDate,
          type,
        })
        await ensureRecurringMutation.mutateAsync()
        notify({ title: 'Recorrencia criada.', tone: 'success' })
      } else {
        await createMutation.mutateAsync({
          amount: numericAmount,
          cashAccountId,
          categoryId,
          competenceDate,
          description,
          dueDate,
          notes,
          paymentMethod,
          settleNow,
          settledAt: toPaymentTimestamp(settledAt),
          settlementAmount: numericSettlementAmount,
          type,
        })
        notify({ title: settleNow ? 'Lancamento liquidado.' : 'Lancamento criado.', tone: 'success' })
      }

      onClose()
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar o lancamento.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="right" title={isEditing ? 'Editar lancamento' : 'Novo lancamento'}>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select disabled={isEditing} label="Tipo" onChange={(event) => setType(event.target.value as FinancialEntryType)} value={type}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </Select>
          <Select label="Categoria" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">Sem categoria</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <Input label="Descricao" onChange={(event) => setDescription(event.target.value)} value={description} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input inputMode="decimal" label="Valor" min={0} onChange={(event) => setAmount(event.target.value)} step="0.01" type="number" value={amount} />
          <Input label="Competencia" onChange={(event) => setCompetenceDate(event.target.value)} type="date" value={competenceDate} />
          <Input disabled={isRecurring} label="Vencimento" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
          {!isEditing ? (
            <Input disabled={!isRecurring} label="Dia recorrente" max={31} min={1} onChange={(event) => setDueDay(event.target.value)} type="number" value={dueDay} />
          ) : null}
        </div>

        <Textarea label="Observacao" onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" value={notes} />

        {!isEditing ? (
          <section className="grid gap-3 rounded-md border border-border bg-background p-3">
            <Checkbox checked={isRecurring} label="Mensal recorrente" onChange={(event) => setIsRecurring(event.target.checked)} />
            {!isRecurring ? (
              <>
                <Checkbox checked={settleNow} label={type === 'income' ? 'Receber agora' : 'Pagar agora'} onChange={(event) => setSettleNow(event.target.checked)} />
                {settleNow ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input inputMode="decimal" label="Valor liquidado" min={0} onChange={(event) => setSettlementAmount(event.target.value)} step="0.01" type="number" value={settlementAmount} />
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
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        {validationMessage ? <p className="text-sm font-medium text-danger">{validationMessage}</p> : null}

        <footer className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button
            disabled={Boolean(validationMessage)}
            isLoading={createMutation.isPending || updateMutation.isPending || createRuleMutation.isPending || ensureRecurringMutation.isPending}
            type="submit"
          >
            Salvar
          </Button>
        </footer>
      </form>
    </Overlay>
  )
}
