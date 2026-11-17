import { expect, test } from '@playwright/test'

// Akun contoh dari PenggunaContohSeeder (data fiktif)
const SANDI = 'sigap123'

test('belum masuk diarahkan ke layar masuk', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/masuk$/)
  await expect(page.getByRole('heading', { name: 'SIGAP' })).toBeVisible()
})

test('kolom kosong menampilkan pesan cara memperbaiki', async ({ page }) => {
  await page.goto('/masuk')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByText('Isi nomor HP atau username.')).toBeVisible()
  await expect(page.getByText('Isi kata sandi.')).toBeVisible()
})

test('kata sandi salah ditolak dengan pesan jelas', async ({ page }) => {
  await page.goto('/masuk')
  await page.getByLabel('Nomor HP atau username').fill('sales1')
  await page.getByLabel('Kata sandi', { exact: true }).fill('salah')
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page.getByRole('alert')).toContainText('kata sandi salah')
})

test('sales masuk dengan nomor HP ke area lapangan lalu keluar', async ({ page }) => {
  await page.goto('/masuk')
  await page.getByLabel('Nomor HP atau username').fill('0811 0000 0004')
  await page.getByLabel('Kata sandi', { exact: true }).fill(SANDI)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page).toHaveURL(/\/lapangan$/)
  await expect(page.getByText('Halo, Sales')).toBeVisible()

  // Sesi bertahan setelah aplikasi dibuka ulang (AK-01)
  await page.reload()
  await expect(page).toHaveURL(/\/lapangan$/)

  // Sales tidak bisa membuka area kantor
  await page.goto('/kantor')
  await expect(page).toHaveURL(/\/lapangan$/)

  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page).toHaveURL(/\/masuk$/)
})

test('admin kantor masuk ke area kantor', async ({ page }) => {
  await page.goto('/masuk')
  await page.getByLabel('Nomor HP atau username').fill('kantor')
  await page.getByLabel('Kata sandi', { exact: true }).fill(SANDI)
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page).toHaveURL(/\/kantor$/)
  await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible()
})
