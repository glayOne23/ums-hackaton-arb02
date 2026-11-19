import { expect, test } from '@playwright/test'

// Sample accounts from SampleUserSeeder (fictional data)
const PASSWORD = 'sigap123'

test('redirects to the login screen when not signed in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'SIGAP' })).toBeVisible()
})

test('empty fields show how to fix them', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText('Isi nomor HP atau username.')).toBeVisible()
  await expect(page.getByText('Isi kata sandi.')).toBeVisible()
})

test('wrong password is rejected with a clear message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Nomor HP atau username').fill('sales1')
  await page.getByLabel('Kata sandi', { exact: true }).fill('salah')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('alert')).toContainText('kata sandi salah')
})

test('sales signs in with a phone number to the field area, then signs out', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Nomor HP atau username').fill('0811 0000 0004')
  await page.getByLabel('Kata sandi', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page).toHaveURL(/\/field$/)
  await expect(page.getByText('Halo, Sales')).toBeVisible()

  // The session survives reopening the app (AK-01)
  await page.reload()
  await expect(page).toHaveURL(/\/field$/)

  // Sales cannot open the office area
  await page.goto('/office')
  await expect(page).toHaveURL(/\/field$/)

  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
