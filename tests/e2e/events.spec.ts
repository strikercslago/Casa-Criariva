import { expect, test } from '@playwright/test'

type RegistrationStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled'

type EventRow = {
  base_price: number
  capacity: number | null
  created_at: string
  created_by: string
  description: string | null
  event_type: 'colony' | 'workshop' | 'special_activity' | 'other'
  id: string
  name: string
  notes: string | null
  registration_end_date: string | null
  registration_start_date: string | null
  status: 'draft' | 'open' | 'closed' | 'completed' | 'cancelled'
  updated_at: string
}

type EventSession = {
  capacity_override: number | null
  created_at: string
  end_time: string
  event_id: string
  id: string
  notes: string | null
  price_override: number | null
  session_date: string
  start_time: string
  updated_at: string
}

type EventRegistration = {
  base_amount: number
  discount_amount: number
  event_id: string
  financial_due_date: string
  financial_entry_id: string | null
  guardian_email: string | null
  guardian_id: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guest_birth_date: string | null
  guest_full_name: string | null
  id: string
  notes: string | null
  registration_type: 'full_event' | 'selected_sessions'
  selected_session_ids: string[]
  status: RegistrationStatus
  student_id: string | null
}

type Settlement = {
  amount: number
  financial_entry_id: string
  id: string
}

test('manages events, waitlist and event receivables through finance', async ({ page }) => {
  const consoleErrors: string[] = []
  const rpcRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  const student = {
    birth_date: '2018-08-12',
    enrollment_date: '2026-03-05',
    full_name: 'Ana Carolina',
    id: 'student-1',
    preferred_name: 'Ana',
    status: 'active',
  }
  const account = { created_at: now, id: 'account-main', is_active: true, name: 'Conta Principal', type: 'bank', updated_at: now }
  let events: EventRow[] = []
  let sessions: EventSession[] = []
  let registrations: EventRegistration[] = []
  let settlements: Settlement[] = []

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
      await route.fulfill({ contentType: 'application/json', json: { avatar_url: null, created_at: now, full_name: 'Owner', id: userId, is_active: true, updated_at: now }, status: 200 })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/cash_accounts')) {
      await route.fulfill({ contentType: 'application/json', json: [account], status: 200 })
      return
    }

    if (url.pathname.endsWith('/students')) {
      await route.fulfill({ contentType: 'application/json', json: [student], status: 200 })
      return
    }

    if (url.pathname.endsWith('/guardians')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/events')) {
      const eventId = url.searchParams.get('id')?.replace('eq.', '')
      await route.fulfill({ contentType: 'application/json', json: events.find((event) => event.id === eventId) ?? null, status: 200 })
      return
    }

    if (url.pathname.endsWith('/event_sessions')) {
      const eventId = url.searchParams.get('event_id')?.replace('eq.', '')
      await route.fulfill({ contentType: 'application/json', json: sessions.filter((session) => session.event_id === eventId), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_events')) {
      rpcRequests.push('POST list_events')
      await route.fulfill({ contentType: 'application/json', json: events.map(buildEventListRow), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_event_finance_summary')) {
      rpcRequests.push('POST get_event_finance_summary')
      const body = request.postDataJSON() as { p_event_id: string }
      await route.fulfill({ contentType: 'application/json', json: [buildSummary(body.p_event_id)], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_event_registrations')) {
      rpcRequests.push('POST list_event_registrations')
      const body = request.postDataJSON() as { p_event_id: string }
      await route.fulfill({
        contentType: 'application/json',
        json: registrations.filter((registration) => registration.event_id === body.p_event_id).map(buildRegistrationListRow),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/create_event')) {
      rpcRequests.push('POST create_event')
      const body = request.postDataJSON() as { payload: { base_price: number; capacity: number; event_type: EventRow['event_type']; name: string; registration_end_date: string; registration_start_date: string; sessions: Array<{ capacity_override: number | null; end_time: string; price_override: number | null; session_date: string; start_time: string }>; status: EventRow['status'] } }
      const eventId = 'event-1'
      events = [{
        base_price: Number(body.payload.base_price),
        capacity: Number(body.payload.capacity),
        created_at: now,
        created_by: userId,
        description: null,
        event_type: body.payload.event_type,
        id: eventId,
        name: body.payload.name,
        notes: null,
        registration_end_date: body.payload.registration_end_date,
        registration_start_date: body.payload.registration_start_date,
        status: body.payload.status,
        updated_at: now,
      }]
      sessions = body.payload.sessions.map((session, index) => ({
        ...session,
        created_at: now,
        event_id: eventId,
        id: `session-${index + 1}`,
        notes: null,
        updated_at: now,
      }))
      await route.fulfill({ contentType: 'application/json', json: eventId, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/create_event_registration')) {
      rpcRequests.push('POST create_event_registration')
      const body = request.postDataJSON() as { payload: Record<string, unknown> }
      const finalAmount = Number(body.payload.base_amount) - Number(body.payload.discount_amount)
      const registrationId = `registration-${registrations.length + 1}`
      const isGuest = Boolean(body.payload.guest_full_name)
      registrations = [
        {
          base_amount: Number(body.payload.base_amount),
          discount_amount: Number(body.payload.discount_amount),
          event_id: String(body.payload.event_id),
          financial_due_date: String(body.payload.financial_due_date ?? '2026-08-20'),
          financial_entry_id: body.payload.status === 'confirmed' && finalAmount > 0 ? `entry-${registrationId}` : null,
          guardian_email: isGuest ? 'joao@example.com' : 'mae@example.com',
          guardian_id: isGuest ? 'guardian-guest' : 'guardian-1',
          guardian_name: isGuest ? 'Marcos Responsavel' : 'Maria Responsavel',
          guardian_phone: isGuest ? '11988887777' : '11999990000',
          guest_birth_date: (body.payload.guest_birth_date as string | null) ?? null,
          guest_full_name: (body.payload.guest_full_name as string | null) ?? null,
          id: registrationId,
          notes: null,
          registration_type: body.payload.registration_type as EventRegistration['registration_type'],
          selected_session_ids: (body.payload.session_ids as string[]) ?? [],
          status: body.payload.status as RegistrationStatus,
          student_id: (body.payload.student_id as string | null) ?? null,
        },
        ...registrations,
      ]
      await route.fulfill({ contentType: 'application/json', json: registrationId, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/settle_event_registration')) {
      rpcRequests.push('POST settle_event_registration')
      const body = request.postDataJSON() as { payload: { amount: number; registration_id: string } }
      const registration = registrations.find((candidate) => candidate.id === body.payload.registration_id)
      if (registration?.financial_entry_id) {
        settlements = [{ amount: Number(body.payload.amount), financial_entry_id: registration.financial_entry_id, id: `settlement-${settlements.length + 1}` }, ...settlements]
      }
      await route.fulfill({ contentType: 'application/json', json: [{ registration_id: body.payload.registration_id }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/confirm_event_registration')) {
      rpcRequests.push('POST confirm_event_registration')
      await route.fulfill({ contentType: 'application/json', json: { code: '23514', message: 'Event capacity exceeded.' }, status: 400 })
      return
    }

    if (url.pathname.endsWith('/rpc/cancel_event_registration') || url.pathname.endsWith('/rpc/update_event_status')) {
      await route.fulfill({ contentType: 'application/json', json: null, status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  function receivedAmount(financialEntryId: string | null) {
    return settlements
      .filter((settlement) => settlement.financial_entry_id === financialEntryId)
      .reduce((sum, settlement) => sum + settlement.amount, 0)
  }

  function buildEventListRow(event: EventRow) {
    const eventSessions = sessions.filter((session) => session.event_id === event.id)
    const confirmed = registrations.filter((registration) => registration.event_id === event.id && registration.status === 'confirmed')
    const received = confirmed.reduce((sum, registration) => sum + receivedAmount(registration.financial_entry_id), 0)
    const expected = confirmed.reduce((sum, registration) => sum + registration.base_amount - registration.discount_amount, 0)

    return {
      available_spots: Math.max((event.capacity ?? 0) - confirmed.length, 0),
      base_price: event.base_price,
      capacity: event.capacity,
      confirmed_count: confirmed.length,
      event_id: event.id,
      event_type: event.event_type,
      expected_revenue: expected,
      first_session_date: eventSessions[0]?.session_date ?? null,
      last_session_date: eventSessions.at(-1)?.session_date ?? null,
      name: event.name,
      receivable_amount: Math.max(expected - received, 0),
      received_amount: received,
      registration_end_date: event.registration_end_date,
      registration_start_date: event.registration_start_date,
      session_count: eventSessions.length,
      status: event.status,
      total_count: events.length,
      waitlisted_count: registrations.filter((registration) => registration.event_id === event.id && registration.status === 'waitlisted').length,
    }
  }

  function buildSummary(eventId: string) {
    const rows = registrations.filter((registration) => registration.event_id === eventId && registration.status !== 'cancelled')
    const confirmed = rows.filter((registration) => registration.status === 'confirmed')
    const expected = confirmed.reduce((sum, registration) => sum + registration.base_amount - registration.discount_amount, 0)
    const received = confirmed.reduce((sum, registration) => sum + receivedAmount(registration.financial_entry_id), 0)

    return {
      event_id: eventId,
      expected_revenue: expected,
      free_count: confirmed.filter((registration) => registration.base_amount - registration.discount_amount <= 0).length,
      paid_count: confirmed.filter((registration) => receivedAmount(registration.financial_entry_id) >= registration.base_amount - registration.discount_amount).length,
      partial_count: confirmed.filter((registration) => receivedAmount(registration.financial_entry_id) > 0 && receivedAmount(registration.financial_entry_id) < registration.base_amount - registration.discount_amount).length,
      pending_count: confirmed.filter((registration) => receivedAmount(registration.financial_entry_id) === 0 && registration.base_amount - registration.discount_amount > 0).length,
      receivable_amount: Math.max(expected - received, 0),
      received_amount: received,
    }
  }

  function buildRegistrationListRow(registration: EventRegistration) {
    const finalAmount = registration.base_amount - registration.discount_amount
    const received = receivedAmount(registration.financial_entry_id)
    const balance = Math.max(finalAmount - received, 0)

    return {
      balance,
      base_amount: registration.base_amount,
      created_at: now,
      discount_amount: registration.discount_amount,
      event_id: registration.event_id,
      final_amount: finalAmount,
      finance_status: finalAmount <= 0 ? 'free' : balance <= 0 ? 'paid' : received > 0 ? 'partial' : 'pending',
      financial_due_date: registration.financial_due_date,
      financial_entry_id: registration.financial_entry_id,
      guardian_email: registration.guardian_email,
      guardian_id: registration.guardian_id,
      guardian_name: registration.guardian_name,
      guardian_phone: registration.guardian_phone,
      guest_birth_date: registration.guest_birth_date,
      guest_full_name: registration.guest_full_name,
      notes: registration.notes,
      participant_name: registration.student_id ? student.full_name : registration.guest_full_name,
      received_amount: received,
      registration_id: registration.id,
      registration_type: registration.registration_type,
      selected_sessions: sessions.filter((session) => registration.selected_session_ids.includes(session.id)),
      selected_sessions_count: registration.selected_session_ids.length,
      status: registration.status,
      student_id: registration.student_id,
      total_count: registrations.length,
    }
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/eventos')
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible()
  await expect(page.getByText('Nenhum evento encontrado.')).toBeVisible()

  await page.getByRole('button', { name: 'Novo evento' }).first().click()
  const eventDrawer = page.getByRole('dialog', { name: 'Novo evento' })
  await eventDrawer.getByLabel('Nome').fill('Colonia Criativa')
  await eventDrawer.getByLabel('Capacidade geral').fill('1')
  await eventDrawer.getByLabel('Valor base').fill('150')
  await eventDrawer.getByLabel('Data').fill('2026-08-20')
  await eventDrawer.getByLabel('Inicio', { exact: true }).fill('09:00')
  await eventDrawer.getByLabel('Fim', { exact: true }).fill('12:00')
  await eventDrawer.getByRole('button', { name: 'Salvar evento' }).click()
  await expect(page.getByText('Evento criado.')).toBeVisible()
  await expect(page.getByText('Colonia Criativa').first()).toBeVisible()

  await page.getByRole('button', { name: 'Nova inscricao' }).first().click()
  const registrationDrawer = page.getByRole('dialog', { name: 'Nova inscricao' })
  await registrationDrawer.getByLabel('Buscar aluno').fill('Ana')
  await registrationDrawer.getByRole('button', { name: /Ana Carolina/ }).click()
  await registrationDrawer.getByRole('button', { name: 'Criar inscricao' }).click()
  await expect(page.getByText('Inscricao criada.')).toBeVisible()
  await expect(page.getByText('Ana Carolina').first()).toBeVisible()
  await expect(page.getByText('Saldo R$ 150,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'Nova inscricao' }).first().click()
  const waitlistDrawer = page.getByRole('dialog', { name: 'Nova inscricao' })
  await waitlistDrawer.getByLabel('Participante').selectOption('guest')
  await waitlistDrawer.getByLabel('Status inicial').selectOption('waitlisted')
  await waitlistDrawer.getByLabel('Nome do participante').fill('Joao Visitante')
  await waitlistDrawer.locator('select').nth(2).selectOption('new')
  await waitlistDrawer.getByLabel('Nome', { exact: true }).fill('Marcos Responsavel')
  await waitlistDrawer.getByLabel('WhatsApp').fill('11988887777')
  await waitlistDrawer.getByLabel('Email').fill('joao@example.com')
  await waitlistDrawer.getByRole('button', { name: 'Criar inscricao' }).click()
  await expect(page.getByText('Inscricao na lista de espera.')).toBeVisible()
  await expect(page.getByText('Joao Visitante').first()).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Joao Visitante' }).getByText('Lista de espera').first()).toBeVisible()

  await page.getByRole('button', { name: 'Receber' }).click()
  await page.getByRole('dialog', { name: 'Receber inscricao' }).getByLabel('Valor recebido').fill('50')
  await page.getByRole('button', { name: 'Receber' }).last().click()
  await expect(page.getByText('Recebimento registrado.')).toBeVisible()
  await expect(page.getByText('Parcial').first()).toBeVisible()
  await expect(page.getByText('Saldo R$ 100,00').first()).toBeVisible()

  await page.getByRole('button', { name: 'Receber' }).click()
  await page.getByRole('button', { name: 'Receber' }).last().click()
  await expect(page.locator('article').filter({ hasText: 'Ana Carolina' }).getByText('Pago').first()).toBeVisible()
  await expect(page.getByText('R$ 150,00').first()).toBeVisible()

  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST list_events',
    'POST create_event',
    'POST create_event_registration',
    'POST list_event_registrations',
    'POST get_event_finance_summary',
    'POST settle_event_registration',
  ]))
  expect(consoleErrors).toEqual([])
})
