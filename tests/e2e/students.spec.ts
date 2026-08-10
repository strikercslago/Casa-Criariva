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

test('manages students with mocked Supabase requests', async ({ page }) => {
  const consoleErrors: string[] = []
  const restRequests: string[] = []
  const authRequests: string[] = []
  const now = '2026-08-10T22:30:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  let students: Student[] = []

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
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
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
      await route.fulfill({
        contentType: 'application/json',
        json: [{ role: 'owner' }],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/students')) {
      const idFilter = url.searchParams.get('id')

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as Partial<Student>
        const student: Student = {
          archived_at: null,
          birth_date: body.birth_date ?? null,
          created_at: now,
          created_by: userId,
          enrollment_date: body.enrollment_date ?? '2026-03-05',
          full_name: body.full_name ?? 'Aluno temporario',
          id: 'student-1',
          notes: body.notes ?? null,
          preferred_name: body.preferred_name ?? null,
          status: body.status ?? 'active',
          updated_at: now,
        }
        students = [student, ...students]
        await route.fulfill({ contentType: 'application/json', json: student, status: 201 })
        return
      }

      if (request.method() === 'PATCH' && idFilter) {
        const id = idFilter.replace('eq.', '')
        const body = request.postDataJSON() as Partial<Student>
        students = students.map((student) =>
          student.id === id ? { ...student, ...body, updated_at: now } : student,
        )
        await route.fulfill({
          contentType: 'application/json',
          json: students.find((student) => student.id === id),
          status: 200,
        })
        return
      }

      if (idFilter) {
        const id = idFilter.replace('eq.', '')
        await route.fulfill({
          contentType: 'application/json',
          json: students.find((student) => student.id === id) ?? null,
          status: 200,
        })
        return
      }

      const statusFilter = url.searchParams.get('status')?.replace('eq.', '')
      const nameFilter = url.searchParams.get('full_name')?.replace('ilike.', '').replaceAll('%', '').toLowerCase()
      const filtered = students.filter((student) => {
        const matchesStatus = !statusFilter || student.status === statusFilter
        const matchesName = !nameFilter || student.full_name.toLowerCase().includes(nameFilter)

        return matchesStatus && matchesName
      })

      await route.fulfill({
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(filtered.length - 1, 0)}/${filtered.length}` },
        json: filtered,
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
  await page.getByRole('link', { name: 'Alunos' }).click()
  await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible()
  await expect(page.getByText('Nenhum aluno cadastrado ainda.')).toBeVisible()

  await page.getByRole('button', { name: 'Novo aluno' }).click()
  await page.getByLabel(/^Nome completo/).fill('Aluno E2E Temporario')
  await page.getByLabel('Nome preferido').fill('E2E')
  await page.getByLabel(/^Data de matricula/).fill('2026-03-05')
  await page.getByLabel('Observacoes').fill('Criado por teste isolado.')
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click()

  await expect(page.getByText('Aluno cadastrado.')).toBeVisible()
  await expect(page.getByText('Aluno E2E Temporario').first()).toBeVisible()

  await page.getByRole('searchbox', { name: 'Buscar aluno' }).fill('E2E')
  await expect(page.getByText('Aluno E2E Temporario').first()).toBeVisible()

  await page.getByRole('button', { name: 'Abrir Aluno E2E Temporario' }).first().click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel(/^Nome completo/).fill('Aluno E2E Editado')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Aluno atualizado.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aluno E2E Editado' })).toBeVisible()

  await page.getByRole('button', { name: 'Arquivar aluno' }).click()
  await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
  await expect(page.getByText('Aluno arquivado.')).toBeVisible()
  await expect(page.getByText('Arquivado').first()).toBeVisible()

  await page.getByRole('button', { name: 'Fechar' }).first().click()
  await page.getByRole('tab', { name: 'Arquivados' }).click()
  await expect(page.getByText('Aluno E2E Editado').first()).toBeVisible()

  await page.getByRole('button', { name: 'Abrir Aluno E2E Editado' }).first().click()
  await page.getByRole('button', { name: 'Restaurar aluno' }).click()
  await expect(page.getByText('Aluno restaurado.')).toBeVisible()
  await expect(page.getByText('Ativo').first()).toBeVisible()

  expect(authRequests.filter((request) => request.includes('/token'))).toHaveLength(1)
  expect(restRequests.filter((request) => request.includes('/students')).length).toBeGreaterThanOrEqual(6)
  expect(consoleErrors).toEqual([])
})
