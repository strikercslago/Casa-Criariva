import { expect, test } from '@playwright/test'

test('loads foundation shell and navigates between lazy routes', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.getByRole('link', { name: 'Alunos' }).click()
  await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible()
  await page.getByRole('link', { name: 'Financeiro' }).click()
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()
})
