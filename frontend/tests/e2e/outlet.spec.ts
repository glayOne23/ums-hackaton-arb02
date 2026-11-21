import { expect, test } from '@playwright/test'
import { signInAs } from './support/accounts'

// Sample accounts and outlets from SampleUserSeeder / SampleOutletSeeder (fictional data).
// Adds one "AP Sumber Waras Contoh <timestamp>" outlet per run and project, and leaves it
// in the trash at the end so it does not show up in any list.
// Each account signs in once per project: the login limit (6/min per account) counts every attempt.

test('office admin adds an outlet, sees the similar-name warning, and assigns a sales', async ({ page }) => {
  await signInAs(page, 'kantor')
  await expect(page).toHaveURL(/\/office$/)

  await page.goto('/office/outlets')
  await expect(page.getByRole('heading', { name: 'Outlet' })).toBeVisible()
  // The table (tablet/desktop) and the cards (phone) are both in the page; only one is shown
  await expect(page.getByText('Apotek Sumber Waras Contoh').filter({ visible: true }).first()).toBeVisible()

  await page.goto('/office/outlets/new')

  // A required field left empty says how to fix it
  await page.getByRole('button', { name: 'Simpan outlet' }).click()
  await expect(page.getByText('Nama outlet wajib diisi.')).toBeVisible()
  await expect(page.getByText('Kecamatan wajib diisi.')).toBeVisible()

  // Contains the sample outlet's name, like a numbered branch, so OT-02 must flag it
  const name = `AP Sumber Waras Contoh ${Date.now()}`
  await page.getByLabel('Nama outlet (wajib)').fill(name)
  await page.getByLabel('Jenis outlet (wajib)').selectOption({ label: 'Apotek' })
  await page.getByLabel('Kabupaten/kota (wajib)').selectOption({ label: 'Kota Surakarta' })
  await page.getByLabel('Kecamatan (wajib)').fill('Laweyan')

  // OT-02: the sample outlet "Apotek Sumber Waras Contoh" is in the same district
  await expect(page.getByText('Ada outlet dengan nama mirip di wilayah ini.')).toBeVisible()

  await page.getByRole('button', { name: 'Simpan outlet' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('Outlet ini belum dipegang sales mana pun.')).toBeVisible()

  await page.getByRole('button', { name: 'Ubah penugasan' }).click()
  await page.getByLabel(/Sales Satu/).check()
  await page.getByRole('button', { name: 'Simpan penugasan' }).click()
  await expect(page.getByText('Penugasan tersimpan')).toBeVisible()
  await expect(page.getByText('Sales Satu (contoh)').first()).toBeVisible()

  // Edit: deactivate
  await page.getByRole('link', { name: 'Ubah data' }).click()
  await page.getByLabel(/Outlet aktif/).uncheck()
  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('Nonaktif', { exact: true })).toBeVisible()

  // Delete, then undo from the toast
  const deleteOutlet = async () => {
    await page.getByRole('button', { name: 'Hapus outlet' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('dari HP Sales Satu (contoh)')
    await dialog.getByRole('button', { name: 'Hapus outlet' }).click()
    await expect(page).toHaveURL(/\/office\/outlets$/)
  }
  await deleteOutlet()
  await page.getByRole('button', { name: 'Urungkan' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()

  // Delete again, find it under Status: Terhapus, and restore it there
  await deleteOutlet()
  await page.goto(`/office/outlets?status=deleted&search=${encodeURIComponent(name)}`)
  const row = page.getByRole('listitem').filter({ hasText: name })
  await expect(row).toContainText('oleh Admin Kantor (contoh)')
  await row.getByRole('button', { name: 'Pulihkan' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()

  // Clean up: leave the test outlet in the trash
  await deleteOutlet()
})

test('sales sees only their own outlets and cannot open the office list', async ({ page }) => {
  await signInAs(page, 'sales2')
  await expect(page).toHaveURL(/\/field$/)

  await expect(page.getByText('AP Sehat Sentosa Contoh')).toBeVisible()
  // Assigned to sales1 only
  await expect(page.getByText('Apotek Kartasura Contoh')).toHaveCount(0)

  await page.getByLabel('Cari outlet').fill('depot')
  await expect(page.getByText('Depot Jamu Lestari Contoh')).toBeVisible()
  await expect(page.getByText('AP Sehat Sentosa Contoh')).toHaveCount(0)

  await page.goto('/office/outlets')
  await expect(page).toHaveURL(/\/field$/)
})
