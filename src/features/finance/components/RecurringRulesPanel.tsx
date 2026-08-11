import { RefreshCw, Trash2 } from 'lucide-react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { FinancialCategory, RecurringFinancialRule } from '@/features/finance/types/financeTypes'
import { useDisableRecurringFinancialRule, useEnsureRecurringFinancialEntries } from '@/features/finance/hooks/useFinance'
import { formatReferenceMonth } from '@/features/finance/utils/financeDates'
import { formatMoney, getEntryTypeLabel } from '@/features/finance/utils/financeFormat'

type RecurringRulesPanelProps = {
  categories: FinancialCategory[]
  referenceMonth: string
  rules: RecurringFinancialRule[]
}

export function RecurringRulesPanel({ categories, referenceMonth, rules }: RecurringRulesPanelProps) {
  const ensureMutation = useEnsureRecurringFinancialEntries(referenceMonth)
  const disableMutation = useDisableRecurringFinancialRule()
  const { notify } = useToast()
  const categoryById = new Map(categories.map((category) => [category.id, category.name]))

  async function generateRecurring() {
    try {
      const result = await ensureMutation.mutateAsync()
      notify({
        title: result.generated_count > 0 ? 'Recorrencias geradas.' : 'Recorrencias ja estavam geradas.',
        description:
          result.generated_count > 0
            ? `${result.generated_count} lancamento${result.generated_count === 1 ? '' : 's'} criado${result.generated_count === 1 ? '' : 's'}.`
            : 'A geracao nao duplicou lancamentos existentes.',
        tone: 'success',
      })
    } catch (error) {
      notify({ title: 'Nao foi possivel gerar recorrencias.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function disableRule(rule: RecurringFinancialRule) {
    try {
      await disableMutation.mutateAsync(rule.id)
      notify({ title: 'Recorrencia desativada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel desativar recorrencia.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-subtle">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Recorrencias</h2>
          <p className="text-sm text-muted-foreground">{formatReferenceMonth(referenceMonth)}</p>
        </div>
        <Button
          isLoading={ensureMutation.isPending}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          onClick={() => void generateRecurring()}
          variant="secondary"
        >
          Gerar mes
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        {rules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma recorrencia cadastrada.</p> : null}
        {rules.slice(0, 6).map((rule) => (
          <article className="flex flex-col gap-3 rounded border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between" key={rule.id}>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-foreground">{rule.description}</p>
                <Badge tone={rule.type === 'income' ? 'success' : 'danger'}>{getEntryTypeLabel(rule.type)}</Badge>
                <Badge tone={rule.is_active ? 'primary' : 'neutral'}>{rule.is_active ? 'Ativa' : 'Inativa'}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {categoryById.get(rule.category_id ?? '') ?? 'Sem categoria'} - dia {rule.due_day} - {formatMoney(rule.amount)}
              </p>
            </div>
            <Button
              disabled={!rule.is_active}
              isLoading={disableMutation.isPending}
              leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}
              onClick={() => void disableRule(rule)}
              size="sm"
              variant="secondary"
            >
              Desativar
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
