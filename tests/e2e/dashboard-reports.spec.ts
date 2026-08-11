import { expect, test } from '@playwright/test'

test('shows reconciled dashboard and reports with CSV export', async ({ page }) => {
  const consoleErrors: string[] = []
  const rpcRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
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
    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/profiles')) {
      await route.fulfill({ contentType: 'application/json', json: { avatar_url: null, created_at: now, full_name: 'Owner', id: userId, is_active: true, updated_at: now }, status: 200 })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_today')) {
      rpcRequests.push('POST get_dashboard_today')
      await route.fulfill({ contentType: 'application/json', json: [{ day_date: '2026-08-11', events_today_count: 1, expected_students: 18, next_event_id: 'event-1', next_event_name: 'Oficina de Ferias', next_event_start: '15:00:00', next_session_class_name: 'Artes A', next_session_expected_students: 6, next_session_id: 'session-1', next_session_start: '14:00:00', pending_sessions_count: 1, sessions_count: 3 }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_attention')) {
      rpcRequests.push('POST get_dashboard_attention')
      await route.fulfill({ contentType: 'application/json', json: [
        { amount: 540, count_value: 3, description: '3 mensalidades em aberto.', href: '/mensalidades?status=overdue', kind: 'overdue_billing', priority: 10, title: 'Mensalidades vencidas' },
        { amount: null, count_value: 4, description: '4 materiais abaixo do minimo.', href: '/materiais?status=low', kind: 'stock_low', priority: 50, title: 'Materiais abaixo do minimo' },
      ], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_operations')) {
      rpcRequests.push('POST get_dashboard_operations')
      await route.fulfill({ contentType: 'application/json', json: [dashboardOperations()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_financial_report')) {
      rpcRequests.push('POST get_financial_report')
      await route.fulfill({ contentType: 'application/json', json: [financialReport()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_students_report')) {
      rpcRequests.push('POST get_students_report')
      await route.fulfill({ contentType: 'application/json', json: [studentsReport()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_classes_report')) {
      rpcRequests.push('POST get_classes_report')
      await route.fulfill({ contentType: 'application/json', json: [classesReport()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_attendance_report')) {
      rpcRequests.push('POST get_attendance_report')
      await route.fulfill({ contentType: 'application/json', json: [attendanceReport()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_events_report')) {
      rpcRequests.push('POST get_events_report')
      await route.fulfill({ contentType: 'application/json', json: [eventsReport()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_inventory_report')) {
      rpcRequests.push('POST get_inventory_report')
      await route.fulfill({ contentType: 'application/json', json: [inventoryReport()], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByText('Hoje - 11/08/2026')).toBeVisible()
  await expect(page.getByText('14:00 - Artes A')).toBeVisible()
  await expect(page.getByRole('link', { name: /Mensalidades vencidas/ })).toBeVisible()
  await expect(page.getByText('R$ 540,00').first()).toBeVisible()
  await expect(page.getByText('R$ 1.000,00').first()).toBeVisible()
  await expect(page.getByText('R$ 400,00').first()).toBeVisible()
  await expect(page.getByText('R$ 600,00').first()).toBeVisible()
  await expect(page.getByText('42').first()).toBeVisible()

  await page.getByRole('link', { name: /Abrir Financeiro/ }).click()
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: /Abrir Agenda/ }).click()
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()

  await page.goto('/relatorios?tipo=financial&inicio=2026-08-01&fim=2026-08-31')
  await expect(page.getByRole('heading', { name: 'Relatorios' })).toBeVisible()
  await expect(page.getByText('Entradas recebidas')).toBeVisible()
  await expect(page.getByText('+25,0% vs periodo anterior')).toBeVisible()
  await expect(page.getByText('Mensalidade Ana')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('relatorio-financeiro.csv')

  await page.getByRole('button', { name: 'Alunos' }).click()
  await expect(page.getByText('Distribuicao por turma')).toBeVisible()
  await expect(page.getByText('Artes A')).toBeVisible()

  await page.getByRole('button', { name: 'Frequencia' }).click()
  await expect(page.getByText('Por aluno')).toBeVisible()
  await expect(page.getByText('Ana Carolina')).toBeVisible()

  await page.getByRole('button', { name: 'Eventos' }).click()
  await expect(page.getByText('Oficina de Ferias')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 820 })
  await page.getByRole('button', { name: 'Estoque' }).click()
  await expect(page.getByRole('link', { name: /Tinta Branca/ })).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()

  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST get_dashboard_today',
    'POST get_dashboard_attention',
    'POST get_dashboard_operations',
    'POST get_financial_report',
    'POST get_students_report',
    'POST get_attendance_report',
    'POST get_events_report',
    'POST get_inventory_report',
  ]))
  expect(consoleErrors).toEqual([])
})

function dashboardOperations() {
  return {
    active_classes_count: 6,
    active_students_count: 42,
    archived_students_count: 1,
    attendance_absent_count: 2,
    attendance_excused_count: 1,
    attendance_pending_sessions: 1,
    attendance_present_count: 35,
    attendance_rate: 92.1,
    available_spots: 9,
    cash_in: 1000,
    cash_out: 400,
    class_active_enrollments: 37,
    class_occupancy_rate: 82.2,
    class_total_capacity: 45,
    full_classes_count: 1,
    low_stock_count: 4,
    net_students_change: 4,
    new_students_count: 5,
    next_event_date: '2026-08-17',
    next_event_id: 'event-1',
    next_event_name: 'Oficina de Ferias',
    out_of_stock_count: 2,
    overdue_billing_amount: 540,
    overdue_billing_count: 3,
    payable_amount: 100,
    receivable_amount: 300,
    reference_month: '2026-08-01',
    result_amount: 600,
    upcoming_events_count: 1,
  }
}

function financialReport() {
  return {
    cash_flow_rows: [
      { amount: 700, category_name: 'Mensalidades', date: '2026-08-10', description: 'Mensalidade Ana', direction: 'income', source_type: 'tuition_payment' },
      { amount: 300, category_name: 'Eventos', date: '2026-08-11', description: 'Oficina de Ferias', direction: 'income', source_type: 'event_registration' },
      { amount: 400, category_name: 'Materiais', date: '2026-08-12', description: 'Compra de materiais', direction: 'expense', source_type: 'material_purchase' },
    ],
    cash_in: 1000,
    cash_out: 400,
    end_date: '2026-08-31',
    expenses_by_category: [{ amount: 400, category_name: 'Materiais' }],
    other_income: 300,
    payable_amount: 100,
    previous_cash_in: 800,
    previous_cash_out: 300,
    previous_result_amount: 500,
    receivable_amount: 300,
    result_amount: 600,
    start_date: '2026-08-01',
    tuition_received: 700,
  }
}

function studentsReport() {
  return {
    active_students_count: 42,
    age_bands: [{ age_band: '6 a 8', student_count: 12 }],
    archived_students_count: 1,
    class_distribution: [{ active_students: 7, class_name: 'Artes A' }],
    end_date: '2026-08-31',
    net_students_change: 4,
    new_students_count: 5,
    start_date: '2026-08-01',
  }
}

function classesReport() {
  return {
    active_classes_count: 6,
    available_spots: 9,
    class_active_enrollments: 37,
    class_occupancy_rate: 82.2,
    class_total_capacity: 45,
    classes: [{ active_enrollments: 7, available_spots: 1, capacity: 8, class_id: 'class-1', is_full: false, name: 'Artes A', occupancy_rate: 87.5, schedules: [] }],
    full_classes_count: 1,
  }
}

function attendanceReport() {
  return {
    absent_count: 2,
    attendance_rate: 92.1,
    by_class: [{ absent_count: 1, attendance_rate: 90, class_id: 'class-1', class_name: 'Artes A', excused_count: 0, pending_sessions_count: 1, present_count: 9, sessions_count: 2 }],
    by_student: [{ absent_count: 1, attendance_rate: 83.3, excused_count: 1, present_count: 10, recorded_classes: 12, student_id: 'student-1', student_name: 'Ana Carolina' }],
    end_date: '2026-08-31',
    excused_count: 1,
    pending_sessions_count: 1,
    present_count: 35,
    sessions_count: 12,
    start_date: '2026-08-01',
  }
}

function eventsReport() {
  return {
    confirmed_count: 17,
    end_date: '2026-08-31',
    events: [{ capacity: 20, confirmed_count: 17, event_id: 'event-1', expected_revenue: 900, first_session_date: '2026-08-17', last_session_date: '2026-08-17', name: 'Oficina de Ferias', receivable_amount: 200, received_amount: 700, registrations_count: 18, status: 'open' }],
    events_count: 1,
    expected_revenue: 900,
    occupancy_rate: 85,
    receivable_amount: 200,
    received_amount: 700,
    registrations_count: 18,
    start_date: '2026-08-01',
    total_capacity: 20,
  }
}

function inventoryReport() {
  return {
    active_materials_count: 18,
    consumption_quantity: 12,
    end_date: '2026-08-31',
    loss_quantity: 1,
    low_stock_count: 4,
    low_stock_materials: [{ current_stock: 2, material_id: 'material-1', minimum_stock: 3, name: 'Tinta Branca', stock_status: 'low', unit: 'bottle' }],
    movement_rows: [{ date: '2026-08-12', material_name: 'Tinta Branca', movement_type: 'consumption', quantity: 3, unit: 'bottle', unit_cost: null }],
    out_of_stock_count: 2,
    purchased_quantity: 20,
    purchases_amount: 850,
    start_date: '2026-08-01',
  }
}
