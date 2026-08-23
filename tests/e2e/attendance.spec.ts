import { expect, test } from '@playwright/test'

test.use({ viewport: { height: 844, width: 390 } })

test('records attendance from the dedicated frequency page without overwriting saved statuses', async ({ page }) => {
  const consoleErrors: string[] = []
  const now = '2026-08-23T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  let savedRecords: Array<{ status: 'present' | 'absent' | 'excused'; student_id: string }> = []

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

    if (url.pathname.includes('/rpc/get_dashboard_')) {
      await route.fulfill({ contentType: 'application/json', json: dashboardRows(url.pathname), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_agenda_sessions')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            absent_count: 1,
            attendance_state: 'pending',
            class_id: 'class-1',
            class_name: 'Artes 1',
            end_time: '15:30:00',
            excused_count: 0,
            expected_students: 2,
            notes: null,
            present_count: 0,
            recorded_count: 1,
            schedule_id: 'schedule-1',
            session_date: '2026-08-23',
            session_id: 'session-1',
            start_time: '14:00:00',
            status: 'planned',
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/get_session_attendance')) {
      await route.fulfill({
        contentType: 'application/json',
        json: [
          attendanceRow({
            attendance_id: 'attendance-1',
            attendance_notes: 'Avisado pela familia',
            attendance_status: 'absent',
            student_id: 'student-1',
            student_name: 'Ana Carolina',
          }),
          attendanceRow({
            preferred_name: 'Bruno',
            student_id: 'student-2',
            student_name: 'Bruno Lima',
          }),
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/save_session_attendance')) {
      const body = request.postDataJSON() as {
        payload: { records: Array<{ status: 'present' | 'absent' | 'excused'; student_id: string }> }
      }
      savedRecords = body.payload.records
      await route.fulfill({ contentType: 'application/json', json: 'session-1', status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/frequencia')
  await expect(page.getByRole('heading', { name: 'Frequencia' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Artes 1/ })).toBeVisible()

  const ana = page.locator('article').filter({ hasText: 'Ana Carolina' })
  const bruno = page.locator('article').filter({ hasText: 'Bruno Lima' })

  await expect(ana.getByRole('button', { name: 'Falta' })).toHaveAttribute('aria-pressed', 'true')
  await expect(bruno.getByText('Sem registro')).toBeVisible()

  await page.getByRole('button', { name: 'Marcar nao registrados' }).click()

  await expect(ana.getByRole('button', { name: 'Falta' })).toHaveAttribute('aria-pressed', 'true')
  await expect(bruno.getByRole('button', { name: 'Presente' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Salvar chamada' }).click()
  await expect(page.getByText('Frequencia salva.')).toBeVisible()

  expect(savedRecords).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 'absent', student_id: 'student-1' }),
      expect.objectContaining({ status: 'present', student_id: 'student-2' }),
    ]),
  )
  expect(consoleErrors).toEqual([])
})

function attendanceRow(overrides: {
  attendance_id?: string | null
  attendance_notes?: string | null
  attendance_status?: 'present' | 'absent' | 'excused' | null
  preferred_name?: string | null
  student_id: string
  student_name: string
}) {
  return {
    attendance_id: null,
    attendance_notes: null,
    attendance_status: null,
    class_id: 'class-1',
    class_name: 'Artes 1',
    enrollment_id: `enrollment-${overrides.student_id}`,
    end_time: '15:30:00',
    preferred_name: null,
    recorded_at: overrides.attendance_status ? '2026-08-23T12:00:00.000Z' : null,
    recorded_by: overrides.attendance_status ? '11111111-1111-4111-8111-111111111111' : null,
    session_date: '2026-08-23',
    session_id: 'session-1',
    session_notes: null,
    session_status: 'planned',
    start_time: '14:00:00',
    student_photo_path: null,
    ...overrides,
  }
}

function dashboardRows(pathname: string) {
  if (pathname.endsWith('/rpc/get_dashboard_today')) {
    return [
      {
        day_date: '2026-08-23',
        events_today_count: 0,
        expected_students: 0,
        next_event_id: '',
        next_event_name: '',
        next_event_start: '',
        next_session_class_name: '',
        next_session_expected_students: 0,
        next_session_id: '',
        next_session_start: '',
        pending_sessions_count: 0,
        sessions_count: 0,
      },
    ]
  }

  if (pathname.endsWith('/rpc/get_dashboard_attention')) {
    return []
  }

  return [
    {
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
      next_event_date: '',
      next_event_id: '',
      next_event_name: '',
      out_of_stock_count: 0,
      overdue_billing_amount: 0,
      overdue_billing_count: 0,
      payable_amount: 0,
      receivable_amount: 0,
      reference_month: '2026-08-01',
      result_amount: 0,
      upcoming_events_count: 0,
    },
  ]
}
