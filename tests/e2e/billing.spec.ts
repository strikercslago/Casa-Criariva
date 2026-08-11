import { expect, test } from '@playwright/test'

type Payment = {
  amount: number
  notes: string | null
  paid_at: string
  payment_id: string
  payment_method: 'pix' | 'cash' | 'card' | 'bank_transfer' | 'other'
  reversal_reason: string | null
  reversed_at: string | null
  status: 'received' | 'reversed'
}

test('manages monthly fees, partial payments, reversals and Student 360 finance', async ({ page }) => {
  const consoleErrors: string[] = []
  const rpcRequests: string[] = []
  const authRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  const student = {
    archived_at: null,
    birth_date: '2018-08-12',
    created_at: now,
    created_by: userId,
    enrollment_date: '2026-03-05',
    full_name: 'Ana Carolina',
    id: 'student-1',
    notes: null,
    preferred_name: 'Ana',
    status: 'active',
    updated_at: now,
  }
  const guardian = {
    created_at: now,
    email: 'mae@example.com',
    full_name: 'Maria Responsavel',
    id: 'guardian-1',
    notes: null,
    phone: '11999990000',
    updated_at: now,
  }
  let feeGenerated = false
  let payments: Payment[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/auth/v1/**', async (route) => {
    authRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
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

    if (url.pathname.endsWith('/rpc/ensure_monthly_fees')) {
      rpcRequests.push('POST ensure_monthly_fees')
      const generated = feeGenerated ? 0 : 1
      feeGenerated = true
      await route.fulfill({
        contentType: 'application/json',
        json: [{ existing_count: generated ? 0 : 1, generated_count: generated, reference_month: '2026-08-01' }],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/list_monthly_fees')) {
      rpcRequests.push('POST list_monthly_fees')
      const body = request.postDataJSON() as { p_status_filter: string }
      const rows = feeGenerated ? [buildFeeRow()] : []
      const filtered = rows.filter((row) => {
        if (body.p_status_filter === 'partial') {
          return row.is_partial
        }
        if (body.p_status_filter === 'all') {
          return true
        }
        return row.computed_status === body.p_status_filter
      })

      await route.fulfill({ contentType: 'application/json', json: filtered, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_billing_month_summary')) {
      rpcRequests.push('POST get_billing_month_summary')
      const row = feeGenerated ? buildFeeRow() : null
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            active_fees_count: row ? 1 : 0,
            cancelled_fees_count: 0,
            expected_amount: row ? 180 : 0,
            overdue_amount: row && row.computed_status === 'overdue' ? row.balance : 0,
            overdue_fees_count: row && row.computed_status === 'overdue' ? 1 : 0,
            paid_fees_count: row && row.computed_status === 'paid' ? 1 : 0,
            partial_fees_count: row?.is_partial ? 1 : 0,
            pending_amount: row && row.computed_status !== 'overdue' && row.computed_status !== 'paid' ? row.balance : 0,
            received_amount: row ? row.amount_paid : 0,
            reference_month: '2026-08-01',
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/register_payment')) {
      rpcRequests.push('POST register_payment')
      const body = request.postDataJSON() as {
        payload: { amount: number; notes: string | null; paid_at: string; payment_method: Payment['payment_method'] }
      }
      const payment: Payment = {
        amount: Number(body.payload.amount),
        notes: body.payload.notes,
        paid_at: body.payload.paid_at,
        payment_id: `payment-${payments.length + 1}`,
        payment_method: body.payload.payment_method,
        reversal_reason: null,
        reversed_at: null,
        status: 'received',
      }
      payments = [payment, ...payments]
      const row = buildFeeRow()
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            amount_paid: row.amount_paid,
            balance: row.balance,
            computed_status: row.computed_status,
            monthly_fee_id: row.monthly_fee_id,
            payment_id: payment.payment_id,
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/get_monthly_fee_detail')) {
      rpcRequests.push('POST get_monthly_fee_detail')
      await route.fulfill({
        contentType: 'application/json',
        json: [{ ...buildFeeRow(), notes: 'Gerada automaticamente.', payments: buildPaymentHistory() }],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/reverse_payment')) {
      rpcRequests.push('POST reverse_payment')
      const body = request.postDataJSON() as { payload: { payment_id: string; reason: string } }
      payments = payments.map((payment) =>
        payment.payment_id === body.payload.payment_id
          ? { ...payment, reversal_reason: body.payload.reason, reversed_at: now, status: 'reversed' }
          : payment,
      )
      await route.fulfill({ contentType: 'application/json', json: [{ monthly_fee_id: 'fee-1', payment_id: body.payload.payment_id }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_student_billing_snapshot')) {
      rpcRequests.push('POST get_student_billing_snapshot')
      const row = feeGenerated ? buildFeeRow() : null
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            billing_plan: {
              auto_generate_fees: true,
              base_amount: 200,
              billing_start_date: '2026-08-01',
              discount_amount: 20,
              due_day: 10,
              financial_guardian_id: guardian.id,
              financial_guardian_name: guardian.full_name,
              financial_guardian_phone: guardian.phone,
              id: 'plan-1',
              status: 'active',
            },
            current_fee: row ?? {},
            recent_fees: row ? [row] : [],
            student_id: student.id,
            total_count: row ? 1 : 0,
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/students')) {
      const idFilter = url.searchParams.get('id')?.replace('eq.', '')
      await route.fulfill({
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        json: idFilter ? student : [student],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/student_guardians')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            can_pick_up: true,
            created_at: now,
            guardian,
            guardian_id: guardian.id,
            is_emergency_contact: true,
            is_financial_responsible: true,
            is_primary_contact: true,
            relationship: 'Mae',
            student_id: student.id,
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/student_billing_plans')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            auto_generate_fees: true,
            base_amount: 200,
            billing_start_date: '2026-08-01',
            created_at: now,
            discount_amount: 20,
            discount_reason: 'Bolsa parcial',
            due_day: 10,
            financial_guardian: guardian,
            financial_guardian_id: guardian.id,
            id: 'plan-1',
            status: 'active',
            student_id: student.id,
            updated_at: now,
          },
        ],
        status: 200,
      })
      return
    }

    if (
      url.pathname.endsWith('/enrollments') ||
      url.pathname.endsWith('/attendance_records') ||
      url.pathname.endsWith('/audit_events')
    ) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  function buildFeeRow() {
    const amountPaid = payments.filter((payment) => payment.status === 'received').reduce((sum, payment) => sum + payment.amount, 0)
    const balance = Math.max(180 - amountPaid, 0)
    const isPartial = amountPaid > 0 && balance > 0
    const computedStatus = balance <= 0 ? 'paid' : 'overdue'

    return {
      amount_paid: amountPaid,
      balance,
      base_amount: 200,
      computed_status: computedStatus,
      days_overdue: balance > 0 ? 1 : 0,
      discount_amount: 20,
      due_date: '2026-08-10',
      final_amount: 180,
      financial_guardian_id: guardian.id,
      financial_guardian_name: guardian.full_name,
      financial_guardian_phone: guardian.phone,
      is_partial: isPartial,
      lifecycle_status: 'active',
      monthly_fee_id: 'fee-1',
      payment_count: payments.filter((payment) => payment.status === 'received').length,
      reference_month: '2026-08-01',
      student_id: student.id,
      student_name: student.full_name,
      total_count: 1,
    }
  }

  function buildPaymentHistory() {
    return payments.map((payment, index) => ({
      allocation_id: `allocation-${index + 1}`,
      amount: payment.amount,
      created_at: now,
      notes: payment.notes,
      paid_at: payment.paid_at,
      payment_id: payment.payment_id,
      payment_method: payment.payment_method,
      received_by: userId,
      reversal_reason: payment.reversal_reason,
      reversed_at: payment.reversed_at,
      reversed_by: payment.reversed_at ? userId : null,
      status: payment.status,
    }))
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/mensalidades')
  await expect(page.getByRole('heading', { name: 'Mensalidades' })).toBeVisible()
  await expect(page.getByText('Nenhuma mensalidade gerada neste mes.')).toBeVisible()

  await page.getByRole('button', { name: /^Gerar mensalidades/ }).first().click()
  await expect(page.getByText('Mensalidades geradas.')).toBeVisible()
  await expect(page.getByText('Ana Carolina').first()).toBeVisible()
  await expect(page.getByText('Vencida').first()).toBeVisible()

  await page.getByRole('button', { name: 'Pagar' }).click()
  await page.getByLabel('Valor recebido').fill('100')
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await expect(page.getByText('Pagamento registrado.')).toBeVisible()
  await expect(page.getByText('Vencida - Parcial').first()).toBeVisible()
  await expect(page.getByText('R$ 80,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'Pagar' }).click()
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await expect(page.getByText('Paga').first()).toBeVisible()

  await page.getByRole('button', { name: 'Abrir' }).click()
  await expect(page.getByRole('dialog', { name: 'Ficha da mensalidade' })).toBeVisible()
  await page.getByRole('button', { name: 'Reverter' }).first().click()
  await page.getByLabel('Motivo da reversao').fill('Pagamento registrado por engano no teste.')
  await page.getByRole('button', { name: 'Confirmar reversao' }).click()
  await expect(page.getByText('Pagamento revertido.')).toBeVisible()
  await expect(page.getByText('Revertido').first()).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).first().click()

  await page.getByRole('tab', { name: 'Parciais' }).click()
  await expect(page.getByText('Vencida - Parcial').first()).toBeVisible()

  await page.goto('/alunos?aluno=student-1')
  await expect(page.getByRole('dialog', { name: 'Aluno' }).getByRole('heading', { name: 'Ana Carolina' })).toBeVisible()
  await page.getByRole('button', { name: 'Financeiro' }).click()
  await expect(page.getByText('Mensalidade do mes atual')).toBeVisible()
  await expect(page.getByText('Vencida - Parcial').first()).toBeVisible()
  await expect(page.getByText('Ultimas mensalidades')).toBeVisible()

  expect(authRequests.filter((request) => request.includes('/token'))).toHaveLength(1)
  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST ensure_monthly_fees',
    'POST list_monthly_fees',
    'POST get_billing_month_summary',
    'POST register_payment',
    'POST get_monthly_fee_detail',
    'POST reverse_payment',
    'POST get_student_billing_snapshot',
  ]))
  expect(consoleErrors).toEqual([])
})
