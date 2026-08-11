import { expect, test } from '@playwright/test'

test.use({ viewport: { height: 844, width: 390 } })

test('records agenda attendance in batch and syncs Student 360', async ({ page }) => {
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
  let attendanceStatus: 'present' | 'absent' | 'excused' | null = null

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

    if (url.pathname.endsWith('/rpc/list_agenda_sessions')) {
      rpcRequests.push('POST list_agenda_sessions')
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            absent_count: 0,
            attendance_state: attendanceStatus ? 'recorded' : 'pending',
            class_id: 'class-1',
            class_name: 'Artes 1',
            end_time: '15:30:00',
            excused_count: 0,
            expected_students: 1,
            notes: null,
            present_count: attendanceStatus === 'present' ? 1 : 0,
            recorded_count: attendanceStatus ? 1 : 0,
            schedule_id: 'schedule-1',
            session_date: '2026-08-11',
            session_id: 'session-1',
            start_time: '14:00:00',
            status: attendanceStatus ? 'completed' : 'planned',
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/get_session_attendance')) {
      rpcRequests.push('POST get_session_attendance')
      await route.fulfill({
        contentType: 'application/json',
        json: [
          {
            attendance_id: attendanceStatus ? 'attendance-1' : null,
            attendance_notes: attendanceStatus ? 'ok' : null,
            attendance_status: attendanceStatus,
            class_id: 'class-1',
            class_name: 'Artes 1',
            enrollment_id: 'enrollment-1',
            end_time: '15:30:00',
            preferred_name: 'Ana',
            recorded_at: attendanceStatus ? now : null,
            recorded_by: attendanceStatus ? userId : null,
            session_date: '2026-08-11',
            session_id: 'session-1',
            session_notes: null,
            session_status: attendanceStatus ? 'completed' : 'planned',
            start_time: '14:00:00',
            student_id: 'student-1',
            student_name: 'Ana Carolina',
          },
        ],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/save_session_attendance')) {
      rpcRequests.push('POST save_session_attendance')
      const body = request.postDataJSON() as { payload: { records: Array<{ status: 'present' | 'absent' | 'excused' }> } }
      attendanceStatus = body.payload.records[0]?.status ?? null
      await route.fulfill({ contentType: 'application/json', json: 'session-1', status: 200 })
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

    if (url.pathname.endsWith('/attendance_records')) {
      await route.fulfill({
        contentType: 'application/json',
        json: attendanceStatus
          ? [
              {
                created_at: now,
                id: 'attendance-1',
                notes: 'ok',
                recorded_by: userId,
                session: {
                  class: {
                    capacity: 10,
                    created_at: now,
                    description: null,
                    id: 'class-1',
                    name: 'Artes 1',
                    status: 'active',
                    updated_at: now,
                  },
                  class_id: 'class-1',
                  created_at: now,
                  end_time: '15:30:00',
                  id: 'session-1',
                  notes: null,
                  session_date: '2026-08-11',
                  start_time: '14:00:00',
                  status: 'completed',
                  updated_at: now,
                },
                session_id: 'session-1',
                status: attendanceStatus,
                student_id: 'student-1',
                updated_at: now,
              },
            ]
          : [],
        status: 200,
      })
      return
    }

    if (
      url.pathname.endsWith('/student_guardians') ||
      url.pathname.endsWith('/enrollments') ||
      url.pathname.endsWith('/student_billing_plans') ||
      url.pathname.endsWith('/audit_events') ||
      url.pathname.endsWith('/classes')
    ) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: {}, status: 404 })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/agenda')
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expect(page.getByText('Frequencia pendente')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir aula' }).click()
  await expect(page.getByRole('dialog', { name: 'Frequencia da aula' })).toBeVisible()
  await page.getByRole('button', { name: 'Todos presentes' }).click()
  await page.getByRole('button', { name: 'Salvar frequencia' }).click()
  await expect(page.getByText('Frequencia salva.')).toBeVisible()

  await page.goto('/alunos?aluno=student-1')
  await expect(page.getByRole('dialog', { name: 'Aluno' }).getByRole('heading', { name: 'Ana Carolina' })).toBeVisible()
  await page.getByRole('button', { name: 'Frequencia' }).click()
  await expect(page.getByText('Taxa de presenca')).toBeVisible()
  await expect(page.getByText('100%')).toBeVisible()
  await expect(page.getByText('Artes 1')).toBeVisible()

  expect(authRequests.filter((request) => request.includes('/token'))).toHaveLength(1)
  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST list_agenda_sessions',
    'POST get_session_attendance',
    'POST save_session_attendance',
  ]))
  expect(consoleErrors).toEqual([])
})
