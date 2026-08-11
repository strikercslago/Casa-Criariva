import { expect, test, type Page } from '@playwright/test'

const now = '2026-08-11T12:00:00.000Z'
const userId = '11111111-1111-4111-8111-111111111111'

test('daily operational smoke covers critical routes and logout', async ({ page }) => {
  const consoleErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await mockOwnerSession(page)

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()

  await expectRouteHeading(page, '/', 'Inicio')
  await expectRouteHeading(page, '/alunos', 'Alunos')
  await expectRouteHeading(page, '/agenda', 'Agenda')
  await expectRouteHeading(page, '/frequencia', 'Frequencia')
  await expectRouteHeading(page, '/mensalidades', 'Mensalidades')
  await expectRouteHeading(page, '/financeiro', 'Financeiro')

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 820 })
    await expectRouteHeading(page, '/agenda', 'Agenda')
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible()
    await expectRouteHeading(page, '/mensalidades', 'Mensalidades')
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  expect(consoleErrors).toEqual([])
})

async function expectRouteHeading(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

async function mockOwnerSession(page: Page) {
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
      await route.fulfill({
        contentType: 'application/json',
        json: {
          avatar_url: null,
          created_at: now,
          full_name: 'Owner',
          id: userId,
          is_active: true,
          updated_at: now,
        },
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_today')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            day_date: '2026-08-11',
            events_today_count: 0,
            expected_students: 8,
            next_event_id: null,
            next_event_name: null,
            next_event_start: null,
            next_session_class_name: 'Artes A',
            next_session_expected_students: 8,
            next_session_id: 'session-1',
            next_session_start: '14:00:00',
            pending_sessions_count: 1,
            sessions_count: 1,
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_attention')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_dashboard_operations')) {
      await route.fulfill({ contentType: 'application/json', json: [emptyDashboardOperations()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_billing_month_summary')) {
      await route.fulfill({ contentType: 'application/json', json: [emptyBillingSummary()], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_finance_month_summary')) {
      await route.fulfill({ contentType: 'application/json', json: [emptyFinanceSummary()], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })
}

function emptyDashboardOperations() {
  return {
    active_classes_count: 0,
    active_students_count: 0,
    archived_students_count: 0,
    attendance_absent_count: 0,
    attendance_excused_count: 0,
    attendance_pending_sessions: 0,
    attendance_present_count: 0,
    attendance_rate: 0,
    available_spots: 0,
    cash_in: 0,
    cash_out: 0,
    class_active_enrollments: 0,
    class_occupancy_rate: 0,
    class_total_capacity: 0,
    full_classes_count: 0,
    low_stock_count: 0,
    net_students_change: 0,
    new_students_count: 0,
    next_event_date: null,
    next_event_id: null,
    next_event_name: null,
    out_of_stock_count: 0,
    overdue_billing_amount: 0,
    overdue_billing_count: 0,
    payable_amount: 0,
    receivable_amount: 0,
    reference_month: '2026-08-01',
    result_amount: 0,
    upcoming_events_count: 0,
  }
}

function emptyBillingSummary() {
  return {
    active_fees_count: 0,
    cancelled_fees_count: 0,
    expected_amount: 0,
    overdue_amount: 0,
    overdue_fees_count: 0,
    paid_fees_count: 0,
    partial_fees_count: 0,
    pending_amount: 0,
    received_amount: 0,
    reference_month: '2026-08-01',
  }
}

function emptyFinanceSummary() {
  return {
    cash_in: 0,
    cash_movements_count: 0,
    cash_out: 0,
    payable_amount: 0,
    receivable_amount: 0,
    reference_month: '2026-08-01',
    result_amount: 0,
  }
}
