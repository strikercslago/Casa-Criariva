import { expect, test } from '@playwright/test'

type EntryType = 'income' | 'expense'
type SettlementStatus = 'active' | 'reversed'

type FinancialEntry = {
  amount: number
  category_id: string | null
  competence_date: string
  created_at: string
  days_overdue: number
  description: string
  due_date: string | null
  entry_id: string
  lifecycle_status: 'active' | 'cancelled'
  notes: string | null
  recurring_rule_id: string | null
  type: EntryType
}

type Settlement = {
  amount: number
  cash_account_id: string | null
  financial_entry_id: string
  id: string
  payment_method: 'pix' | 'cash' | 'card' | 'bank_transfer' | 'other'
  settled_at: string
  status: SettlementStatus
}

test('manages finance summary, entries, settlements and consolidated cash flow', async ({ page }) => {
  const consoleErrors: string[] = []
  const rpcRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  const categories = [
    { created_at: now, id: 'cat-income', is_active: true, name: 'Outras receitas', type: 'income', updated_at: now },
    { created_at: now, id: 'cat-expense', is_active: true, name: 'Materiais', type: 'expense', updated_at: now },
  ]
  const accounts = [{ created_at: now, id: 'account-main', is_active: true, name: 'Conta Principal', type: 'bank', updated_at: now }]
  const tuitionPayment = {
    amount: 300,
    description: 'Mensalidade - Ana Carolina, Bia Souza',
    movement_id: 'payment-1',
    occurred_at: '2026-08-08T10:00:00.000Z',
  }
  let entries: FinancialEntry[] = []
  let settlements: Settlement[] = []
  let recurringRules: Array<Record<string, unknown>> = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/auth/v1/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        access_token: 'mock-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        user: {
          app_metadata: {},
          aud: 'authenticated',
          confirmed_at: now,
          created_at: now,
          email: 'owner@example.com',
          id: userId,
          role: 'authenticated',
          updated_at: now,
          user_metadata: {},
        },
      },
      status: 200,
    })
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/profiles')) {
      await route.fulfill({
        contentType: 'application/json',
        json: { avatar_url: null, created_at: now, full_name: 'Owner', id: userId, is_active: true, updated_at: now },
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/financial_categories')) {
      await route.fulfill({ contentType: 'application/json', json: categories, status: 200 })
      return
    }

    if (url.pathname.endsWith('/cash_accounts')) {
      await route.fulfill({ contentType: 'application/json', json: accounts, status: 200 })
      return
    }

    if (url.pathname.endsWith('/recurring_financial_rules')) {
      await route.fulfill({ contentType: 'application/json', json: recurringRules, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_finance_month_summary')) {
      rpcRequests.push('POST get_finance_month_summary')
      await route.fulfill({ contentType: 'application/json', json: [buildSummary()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_finance_cash_flow')) {
      rpcRequests.push('POST list_finance_cash_flow')
      await route.fulfill({ contentType: 'application/json', json: buildCashFlowRows(), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_financial_entries')) {
      rpcRequests.push('POST list_financial_entries')
      const body = request.postDataJSON() as { p_search: string; p_status_filter: string; p_type_filter: EntryType | 'all' }
      await route.fulfill({ contentType: 'application/json', json: buildEntryRows(body), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_finance_receivables')) {
      rpcRequests.push('POST list_finance_receivables')
      await route.fulfill({ contentType: 'application/json', json: [buildReceivableRow()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_finance_payables')) {
      rpcRequests.push('POST list_finance_payables')
      await route.fulfill({ contentType: 'application/json', json: buildPayableRows(), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/create_financial_entry')) {
      rpcRequests.push('POST create_financial_entry')
      const body = request.postDataJSON() as {
        payload: {
          amount: number
          category_id: string | null
          competence_date: string
          description: string
          due_date: string | null
          notes: string | null
          settle_now: boolean
          settlement_amount?: number
          type: EntryType
        }
      }
      const entry: FinancialEntry = {
        amount: Number(body.payload.amount),
        category_id: body.payload.category_id,
        competence_date: body.payload.competence_date,
        created_at: now,
        days_overdue: 0,
        description: body.payload.description,
        due_date: body.payload.due_date,
        entry_id: `entry-${entries.length + 1}`,
        lifecycle_status: 'active',
        notes: body.payload.notes,
        recurring_rule_id: null,
        type: body.payload.type,
      }
      entries = [entry, ...entries]
      if (body.payload.settle_now) {
        settlements = [
          {
            amount: Number(body.payload.settlement_amount ?? body.payload.amount),
            cash_account_id: 'account-main',
            financial_entry_id: entry.entry_id,
            id: `settlement-${settlements.length + 1}`,
            payment_method: 'pix',
            settled_at: now,
            status: 'active',
          },
          ...settlements,
        ]
      }
      await route.fulfill({ contentType: 'application/json', json: entry.entry_id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/settle_financial_entry')) {
      rpcRequests.push('POST settle_financial_entry')
      const body = request.postDataJSON() as {
        payload: { amount: number; cash_account_id: string | null; financial_entry_id: string; payment_method: Settlement['payment_method']; settled_at: string }
      }
      settlements = [
        {
          amount: Number(body.payload.amount),
          cash_account_id: body.payload.cash_account_id,
          financial_entry_id: body.payload.financial_entry_id,
          id: `settlement-${settlements.length + 1}`,
          payment_method: body.payload.payment_method,
          settled_at: body.payload.settled_at,
          status: 'active',
        },
        ...settlements,
      ]
      await route.fulfill({ contentType: 'application/json', json: [{ financial_entry_id: body.payload.financial_entry_id }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/create_recurring_financial_rule')) {
      rpcRequests.push('POST create_recurring_financial_rule')
      const body = request.postDataJSON() as { payload: Record<string, unknown> }
      recurringRules = [{ ...body.payload, created_at: now, id: 'rule-1', is_active: true, updated_at: now }, ...recurringRules]
      await route.fulfill({ contentType: 'application/json', json: 'rule-1', status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/ensure_recurring_financial_entries')) {
      rpcRequests.push('POST ensure_recurring_financial_entries')
      await route.fulfill({
        contentType: 'application/json',
        json: [{ existing_count: 0, generated_count: recurringRules.length, reference_month: '2026-08-01' }],
        status: 200,
      })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  function activeSettledAmount(entryId: string) {
    return settlements
      .filter((settlement) => settlement.financial_entry_id === entryId && settlement.status === 'active')
      .reduce((sum, settlement) => sum + settlement.amount, 0)
  }

  function buildEntryRows(body: { p_search: string; p_status_filter: string; p_type_filter: EntryType | 'all' }) {
    const search = body.p_search.trim().toLowerCase()
    const rows = entries.map((entry) => {
      const settledAmount = activeSettledAmount(entry.entry_id)
      const balance = Math.max(entry.amount - settledAmount, 0)
      const computedStatus = balance <= 0 ? (entry.type === 'income' ? 'received' : 'paid') : settledAmount > 0 ? 'partial' : 'pending'

      return {
        ...entry,
        balance,
        category_name: categories.find((category) => category.id === entry.category_id)?.name ?? null,
        computed_status: computedStatus,
        is_partial: settledAmount > 0 && balance > 0,
        settled_amount: settledAmount,
        total_count: entries.length,
      }
    })

    return rows.filter((row) => {
      if (body.p_type_filter !== 'all' && row.type !== body.p_type_filter) {
        return false
      }
      if (body.p_status_filter !== 'all' && row.computed_status !== body.p_status_filter) {
        return false
      }
      return !search || row.description.toLowerCase().includes(search)
    })
  }

  function buildCashFlowRows() {
    const settlementRows = settlements
      .filter((settlement) => settlement.status === 'active')
      .map((settlement) => {
        const entry = entries.find((candidate) => candidate.entry_id === settlement.financial_entry_id)

        return {
          amount: settlement.amount,
          cash_account_id: settlement.cash_account_id,
          cash_account_name: 'Conta Principal',
          category_id: entry?.category_id ?? null,
          category_name: categories.find((category) => category.id === entry?.category_id)?.name ?? null,
          description: entry?.description ?? 'Lancamento',
          direction: entry?.type ?? 'expense',
          movement_id: settlement.id,
          occurred_at: settlement.settled_at,
          payment_method: settlement.payment_method,
          related_entry_id: entry?.entry_id ?? null,
          source_id: settlement.id,
          source_type: 'financial_settlement',
          total_count: settlements.length + 1,
        }
      })

    return [
      {
        amount: tuitionPayment.amount,
        cash_account_id: null,
        cash_account_name: null,
        category_id: null,
        category_name: 'Mensalidades',
        description: tuitionPayment.description,
        direction: 'income',
        movement_id: tuitionPayment.movement_id,
        occurred_at: tuitionPayment.occurred_at,
        payment_method: 'pix',
        related_entry_id: null,
        source_id: tuitionPayment.movement_id,
        source_type: 'tuition_payment',
        total_count: settlementRows.length + 1,
      },
      ...settlementRows,
    ]
  }

  function buildSummary() {
    const cashIn = tuitionPayment.amount + settlements.reduce((sum, settlement) => {
      const entry = entries.find((candidate) => candidate.entry_id === settlement.financial_entry_id)
      return settlement.status === 'active' && entry?.type === 'income' ? sum + settlement.amount : sum
    }, 0)
    const cashOut = settlements.reduce((sum, settlement) => {
      const entry = entries.find((candidate) => candidate.entry_id === settlement.financial_entry_id)
      return settlement.status === 'active' && entry?.type === 'expense' ? sum + settlement.amount : sum
    }, 0)
    const payableAmount = buildPayableRows().reduce((sum, row) => sum + row.balance, 0)

    return {
      cash_in: cashIn,
      cash_movements_count: buildCashFlowRows().length,
      cash_out: cashOut,
      payable_amount: payableAmount,
      receivable_amount: 180,
      reference_month: '2026-08-01',
      result_amount: cashIn - cashOut,
    }
  }

  function buildPayableRows() {
    return buildEntryRows({ p_search: '', p_status_filter: 'all', p_type_filter: 'expense' })
      .filter((row) => row.balance > 0)
      .map((row) => ({
        amount: row.amount,
        balance: row.balance,
        computed_status: row.computed_status,
        days_overdue: row.days_overdue,
        description: row.description,
        due_date: row.due_date,
        item_id: row.entry_id,
        settled_amount: row.settled_amount,
        source_id: row.entry_id,
        source_type: 'financial_entry',
        total_count: 1,
      }))
  }

  function buildReceivableRow() {
    return {
      amount: 180,
      balance: 180,
      computed_status: 'pending',
      days_overdue: 0,
      description: 'Mensalidade - Ana Carolina',
      due_date: '2026-08-10',
      item_id: 'fee-1',
      settled_amount: 0,
      source_id: 'fee-1',
      source_type: 'monthly_fee',
      total_count: 1,
    }
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/financeiro')
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()
  await expect(page.getByText('Entradas recebidas')).toBeVisible()
  await expect(page.getByText('R$ 300,00').first()).toBeVisible()
  await expect(page.getByText('Mensalidade - Ana Carolina, Bia Souza').first()).toBeVisible()

  await page.getByRole('button', { name: 'Novo lancamento' }).click()
  const drawer = page.getByRole('dialog', { name: 'Novo lancamento' })
  await drawer.getByLabel('Categoria').selectOption('cat-expense')
  await drawer.getByLabel('Descricao').fill('Compra de tintas')
  await drawer.getByLabel('Valor').fill('120')
  await drawer.getByLabel('Vencimento').fill('2026-08-15')
  await Promise.all([
    page.waitForRequest((request) => request.url().includes('/rpc/create_financial_entry')),
    drawer.getByRole('button', { name: 'Salvar' }).click(),
  ])
  await expect(page.getByText('Lancamento criado.')).toBeVisible()

  await page.getByRole('button', { name: 'Lancamentos' }).click()
  await expect(page.getByText('Compra de tintas').first()).toBeVisible()
  await expect(page.getByText('R$ 120,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'Liquidar' }).click()
  await page.getByRole('dialog', { name: 'Registrar pagamento' }).getByLabel('Valor').fill('100')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('Pagamento registrado.')).toBeVisible()
  await expect(page.getByText('Parcial').first()).toBeVisible()
  await expect(page.getByText('R$ 20,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'Visao geral' }).click()
  await expect(page.getByText('- R$ 100,00')).toBeVisible()
  await expect(page.getByText('Mensalidade - Ana Carolina, Bia Souza').first()).toBeVisible()

  await page.getByRole('button', { name: 'A pagar' }).click()
  await expect(page.getByText('Compra de tintas').first()).toBeVisible()
  await expect(page.getByText('R$ 20,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'A receber' }).click()
  await expect(page.getByText('Mensalidade - Ana Carolina').first()).toBeVisible()

  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST get_finance_month_summary',
    'POST list_finance_cash_flow',
    'POST list_financial_entries',
    'POST create_financial_entry',
    'POST settle_financial_entry',
    'POST list_finance_receivables',
    'POST list_finance_payables',
  ]))
  expect(consoleErrors).toEqual([])
})
