import { expect, test } from '@playwright/test'

test('protects private routes and shows login without public signup', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByText('Cadastro publico nao esta disponivel.')).toBeVisible()

  await page.goto('/alunos')
  await expect(page).toHaveURL(/\/login$/)
})
