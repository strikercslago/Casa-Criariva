import { expect, test, type Page } from '@playwright/test'

type Role = 'owner' | 'admin' | 'teacher'

async function mockAuthenticatedRole(page: Page, role: Role) {
  const now = '2026-08-11T12:00:00.000Z'
  const userId = `11111111-1111-4111-8111-00000000000${role === 'owner' ? '1' : role === 'admin' ? '2' : '3'}`

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
          email: `${role}@example.com`,
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
          full_name: role,
          id: userId,
          is_active: true,
          updated_at: now,
        },
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role }], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/functions/v1/admin-users', async (route) => {
    await route.fulfill({ contentType: 'application/json', json: { users: [] }, status: 200 })
  })
}

async function signInAsRole(page: Page, role: Role) {
  await mockAuthenticatedRole(page, role)
  await page.goto('/login')
  await page.getByLabel('Email').fill(`${role}@example.com`)
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
}

test('owner can access user administration', async ({ page }) => {
  await signInAsRole(page, 'owner')
  await page.goto('/configuracoes/usuarios')

  await expect(page.getByRole('heading', { name: 'Configuracoes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Adicionar usuario' })).toBeVisible()
})

test('admin is blocked from general finance', async ({ page }) => {
  await signInAsRole(page, 'admin')
  await page.goto('/financeiro')

  await expect(page.getByRole('heading', { name: 'Acesso nao autorizado' })).toBeVisible()
})

test('teacher is blocked from user administration and sees operational dashboard', async ({ page }) => {
  await signInAsRole(page, 'teacher')
  await page.goto('/configuracoes/usuarios')

  await expect(page.getByRole('heading', { name: 'Acesso nao autorizado' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir Frequencia' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir Financeiro' })).toHaveCount(0)
})
