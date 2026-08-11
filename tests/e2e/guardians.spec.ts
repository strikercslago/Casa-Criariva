import { expect, test } from '@playwright/test'

type Student = {
  archived_at: string | null
  birth_date: string | null
  created_at: string
  created_by: string | null
  enrollment_date: string
  full_name: string
  id: string
  notes: string | null
  preferred_name: string | null
  status: 'active' | 'inactive' | 'archived'
  updated_at: string
}

type Guardian = {
  created_at: string
  email: string | null
  full_name: string
  id: string
  notes: string | null
  phone: string | null
  updated_at: string
}

type GuardianLink = {
  can_pick_up: boolean
  created_at: string
  guardian_id: string
  is_emergency_contact: boolean
  is_financial_responsible: boolean
  is_primary_contact: boolean
  relationship: string
  student_id: string
}

test('manages guardians and keeps Student 360 consistent with mocked Supabase requests', async ({ page }) => {
  const consoleErrors: string[] = []
  const restRequests: string[] = []
  const rpcRequests: string[] = []
  const authRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  const students: Student[] = [
    {
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
    },
  ]
  let guardians: Guardian[] = [
    {
      created_at: now,
      email: 'existente@example.com',
      full_name: 'Maria Existente',
      id: 'guardian-existing',
      notes: null,
      phone: '(54) 99999-9999',
      updated_at: now,
    },
  ]
  let links: GuardianLink[] = []
  let auditEvents: Array<{
    action: string
    actor_user_id: string
    created_at: string
    entity_id: string
    entity_type: 'guardian' | 'student'
    id: string
    metadata: Record<string, string>
  }> = []

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
    restRequests.push(`${request.method()} ${url.pathname}`)

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

    if (url.pathname.endsWith('/rpc/list_guardians')) {
      rpcRequests.push('POST list_guardians')
      const body = request.postDataJSON() as {
        p_page?: number
        p_page_size?: number
        p_role_filter?: string
        p_search?: string
      }
      const search = (body.p_search ?? '').toLowerCase()
      const digits = search.replace(/\D/g, '')
      const role = body.p_role_filter ?? 'all'
      const filtered = guardians.filter((guardian) => {
        const guardianLinks = links.filter((link) => link.guardian_id === guardian.id)
        const matchesSearch =
          !search ||
          guardian.full_name.toLowerCase().includes(search) ||
          (guardian.email ?? '').toLowerCase().includes(search) ||
          (guardian.phone ?? '').toLowerCase().includes(search) ||
          ((guardian.phone ?? '').replace(/\D/g, '').includes(digits) && digits.length >= 3)
        const matchesRole =
          role === 'all' ||
          (role === 'financial' && guardianLinks.some((link) => link.is_financial_responsible)) ||
          (role === 'primary' && guardianLinks.some((link) => link.is_primary_contact)) ||
          (role === 'pickup' && guardianLinks.some((link) => link.can_pick_up)) ||
          (role === 'emergency' && guardianLinks.some((link) => link.is_emergency_contact))

        return matchesSearch && matchesRole
      })

      await route.fulfill({
        contentType: 'application/json',
        json: filtered.map((guardian) => {
          const guardianLinks = links.filter((link) => link.guardian_id === guardian.id)

          return {
            can_pick_up: guardianLinks.some((link) => link.can_pick_up),
            created_at: guardian.created_at,
            email: guardian.email,
            full_name: guardian.full_name,
            guardian_id: guardian.id,
            is_emergency_contact: guardianLinks.some((link) => link.is_emergency_contact),
            is_financial_responsible: guardianLinks.some((link) => link.is_financial_responsible),
            is_primary_contact: guardianLinks.some((link) => link.is_primary_contact),
            linked_students: guardianLinks.map((link) => ({
              ...students.find((student) => student.id === link.student_id),
              can_pick_up: link.can_pick_up,
              is_emergency_contact: link.is_emergency_contact,
              is_financial_responsible: link.is_financial_responsible,
              is_primary_contact: link.is_primary_contact,
              relationship: link.relationship,
            })),
            notes: guardian.notes,
            phone: guardian.phone,
            students_count: guardianLinks.length,
            total_count: filtered.length,
            updated_at: guardian.updated_at,
          }
        }),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/create_guardian_with_optional_student')) {
      rpcRequests.push('POST create_guardian_with_optional_student')
      const body = request.postDataJSON() as {
        payload: {
          guardian: Pick<Guardian, 'email' | 'full_name' | 'notes' | 'phone'>
          student_link: Omit<GuardianLink, 'created_at' | 'guardian_id'> | null
        }
      }
      const guardian: Guardian = {
        created_at: now,
        email: body.payload.guardian.email,
        full_name: body.payload.guardian.full_name,
        id: 'guardian-created',
        notes: body.payload.guardian.notes,
        phone: body.payload.guardian.phone,
        updated_at: now,
      }
      guardians = [guardian, ...guardians]
      auditEvents = [
        ...auditEvents,
        {
          action: 'guardian.created',
          actor_user_id: userId,
          created_at: now,
          entity_id: guardian.id,
          entity_type: 'guardian',
          id: 'audit-created',
          metadata: {},
        },
      ]

      await route.fulfill({ contentType: 'application/json', json: guardian.id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/update_guardian_contact')) {
      rpcRequests.push('POST update_guardian_contact')
      const body = request.postDataJSON() as { payload: Guardian & { guardian_id: string } }
      guardians = guardians.map((guardian) =>
        guardian.id === body.payload.guardian_id
          ? {
              ...guardian,
              email: body.payload.email,
              full_name: body.payload.full_name,
              notes: body.payload.notes,
              phone: body.payload.phone,
              updated_at: now,
            }
          : guardian,
      )
      auditEvents.push({
        action: 'guardian.updated',
        actor_user_id: userId,
        created_at: now,
        entity_id: body.payload.guardian_id,
        entity_type: 'guardian',
        id: 'audit-updated',
        metadata: {},
      })
      await route.fulfill({ contentType: 'application/json', json: body.payload.guardian_id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/upsert_guardian_student_link')) {
      rpcRequests.push('POST upsert_guardian_student_link')
      const body = request.postDataJSON() as { payload: Omit<GuardianLink, 'created_at'> }
      const existing = links.some(
        (link) => link.guardian_id === body.payload.guardian_id && link.student_id === body.payload.student_id,
      )
      links = [
        ...links.filter(
          (link) => !(link.guardian_id === body.payload.guardian_id && link.student_id === body.payload.student_id),
        ),
        { ...body.payload, created_at: now },
      ]
      auditEvents.push({
        action: existing ? 'guardian.relationship_updated' : 'guardian.linked_to_student',
        actor_user_id: userId,
        created_at: now,
        entity_id: body.payload.guardian_id,
        entity_type: 'guardian',
        id: `audit-link-${auditEvents.length + 1}`,
        metadata: { student_id: body.payload.student_id },
      })
      auditEvents.push({
        action: existing ? 'guardian.relationship_updated' : 'guardian.linked_to_student',
        actor_user_id: userId,
        created_at: now,
        entity_id: body.payload.student_id,
        entity_type: 'student',
        id: `audit-student-${auditEvents.length + 1}`,
        metadata: { guardian_id: body.payload.guardian_id },
      })
      await route.fulfill({ contentType: 'application/json', json: null, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/unlink_guardian_student')) {
      rpcRequests.push('POST unlink_guardian_student')
      const body = request.postDataJSON() as { payload: { guardian_id: string; student_id: string } }
      links = links.filter(
        (link) => !(link.guardian_id === body.payload.guardian_id && link.student_id === body.payload.student_id),
      )
      auditEvents.push({
        action: 'guardian.unlinked_from_student',
        actor_user_id: userId,
        created_at: now,
        entity_id: body.payload.guardian_id,
        entity_type: 'guardian',
        id: `audit-unlink-${auditEvents.length + 1}`,
        metadata: { student_id: body.payload.student_id },
      })
      await route.fulfill({ contentType: 'application/json', json: null, status: 200 })
      return
    }

    if (url.pathname.endsWith('/guardians')) {
      const idFilter = url.searchParams.get('id')?.replace('eq.', '')
      const guardian = guardians.find((item) => item.id === idFilter)

      await route.fulfill({
        contentType: 'application/json',
        json: guardian
          ? {
              ...guardian,
              student_guardians: links
                .filter((link) => link.guardian_id === guardian.id)
                .map((link) => ({
                  ...link,
                  student: students.find((student) => student.id === link.student_id) ?? null,
                })),
            }
          : null,
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/students')) {
      const idFilter = url.searchParams.get('id')?.replace('eq.', '')

      if (idFilter) {
        await route.fulfill({
          contentType: 'application/json',
          json: students.find((student) => student.id === idFilter) ?? null,
          status: 200,
        })
        return
      }

      await route.fulfill({
        contentType: 'application/json',
        headers: { 'content-range': `0-${students.length - 1}/${students.length}` },
        json: students,
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/student_guardians')) {
      const studentId = url.searchParams.get('student_id')?.replace('eq.', '')
      await route.fulfill({
        contentType: 'application/json',
        json: links
          .filter((link) => !studentId || link.student_id === studentId)
          .map((link) => ({
            ...link,
            guardian: guardians.find((guardian) => guardian.id === link.guardian_id) ?? null,
          })),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/classes')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/enrollments') || url.pathname.endsWith('/student_billing_plans')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/audit_events')) {
      const entityType = url.searchParams.get('entity_type')?.replace('eq.', '') as 'guardian' | 'student' | undefined
      const entityId = url.searchParams.get('entity_id')?.replace('eq.', '')

      await route.fulfill({
        contentType: 'application/json',
        json: auditEvents.filter(
          (event) => (!entityType || event.entity_type === entityType) && (!entityId || event.entity_id === entityId),
        ),
        status: 200,
      })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: {}, status: 404 })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.getByRole('link', { name: 'Responsaveis' }).click()
  await expect(page.getByRole('heading', { name: 'Responsaveis' })).toBeVisible()
  await expect(page.getByText('Maria Existente').first()).toBeVisible()

  await page.getByRole('button', { name: 'Novo responsavel' }).click()
  await page.getByLabel('Nome completo *').fill('Maria E2E')
  await page.getByLabel('Celular / WhatsApp').fill('(54) 99999-9999')
  await expect(page.getByText('Encontramos um possivel responsavel ja cadastrado.')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar novo cadastro' }).click()
  await page.getByLabel('E-mail').fill('maria-e2e@example.com')
  await page.getByRole('button', { name: 'Cadastrar responsavel' }).click()
  await expect(page.getByText('Responsavel cadastrado.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Maria E2E' })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nome completo *').fill('Maria E2E Editada')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Responsavel atualizado.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Maria E2E Editada' })).toBeVisible()

  await page.getByRole('button', { name: 'Vincular aluno' }).click()
  await page.getByPlaceholder('Nome do aluno').fill('Ana')
  await page.getByRole('button', { name: /Ana Carolina/ }).click()
  await page.getByRole('button', { name: 'Salvar vinculo' }).click()
  await expect(page.getByText('Aluno vinculado.')).toBeVisible()
  await page.getByRole('button', { name: 'Alunos vinculados' }).click()
  await expect(page.getByText('Ana Carolina').first()).toBeVisible()

  await page.getByRole('button', { name: 'Abrir aluno' }).click()
  await expect(page.getByRole('heading', { name: 'Ana Carolina' })).toBeVisible()
  await page.getByRole('button', { name: 'Responsaveis' }).click()
  await expect(page.getByText('Maria E2E Editada').first()).toBeVisible()
  await expect(page.getByText('Financeiro').first()).toBeVisible()

  await page.getByRole('dialog', { name: 'Aluno' }).getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('link', { name: 'Responsaveis' }).click()
  await page.getByRole('searchbox', { name: 'Buscar responsavel' }).fill('54999999999')
  await expect(page.getByText('Maria E2E Editada').first()).toBeVisible()
  await page.getByRole('button', { name: 'Abrir Maria E2E Editada' }).first().click()
  await page.getByRole('button', { name: 'Alunos vinculados' }).click()
  await page.getByRole('button', { name: 'Alterar vinculo' }).click()
  await page.getByLabel('Responsavel financeiro').uncheck()
  await page.getByRole('button', { name: 'Salvar vinculo' }).click()
  await expect(page.getByText('Vinculo atualizado.')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir aluno' }).click()
  await page.getByRole('button', { name: 'Responsaveis' }).click()
  await expect(page.getByRole('dialog', { name: 'Aluno' }).getByText('Maria E2E Editada').first()).toBeVisible()
  await expect(
    page
      .getByRole('dialog', { name: 'Aluno' })
      .locator('article')
      .filter({ hasText: 'Maria E2E Editada' })
      .getByText('Financeiro'),
  ).toHaveCount(0)

  await page.getByRole('dialog', { name: 'Aluno' }).getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('link', { name: 'Responsaveis' }).click()
  await page.getByRole('button', { name: 'Abrir Maria E2E Editada' }).first().click()
  await page.getByRole('button', { name: 'Alunos vinculados' }).click()
  await page.getByRole('button', { name: 'Desvincular' }).click()
  await page.getByRole('dialog', { name: 'Desvincular responsavel' }).getByRole('button', { name: 'Desvincular' }).click()
  await expect(page.getByText('Responsavel desvinculado.')).toBeVisible()
  await expect(page.getByText('Nenhum aluno vinculado')).toBeVisible()

  expect(authRequests.filter((request) => request.includes('/token'))).toHaveLength(1)
  expect(rpcRequests).toContain('POST list_guardians')
  expect(rpcRequests).toContain('POST create_guardian_with_optional_student')
  expect(rpcRequests).toContain('POST update_guardian_contact')
  expect(rpcRequests).toContain('POST upsert_guardian_student_link')
  expect(rpcRequests).toContain('POST unlink_guardian_student')
  expect(restRequests.filter((request) => request.includes('/guardians')).length).toBeGreaterThan(0)
  expect(consoleErrors).toEqual([])
})
