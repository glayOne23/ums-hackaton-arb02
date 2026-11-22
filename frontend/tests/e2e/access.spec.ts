import { expect, type Page, test } from '@playwright/test'
import { pageAs } from './support/accounts'

// W9 + Kelola pengguna, as the sample office admin. Each run makes a role "Kepala Gudang E2E…" and
// a user for it; at the end the user is deactivated and moved back to Admin Gudang, so the role
// can be deleted again. Desktop only: the screens are the same on the phone.
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'Desktop only')

const stamp = Date.now().toString().slice(-6)
const ROLE = `Kepala Gudang E2E ${stamp}`
const USER = `Pengguna E2E ${stamp}`
const USERNAME = `e2e${stamp}`
// Fictional number in the sample range 0811 0000 ….
const PHONE = `0811${stamp.padStart(8, '9')}`

let office: Page
let password = ''

/** User rows: table rows on desktop, cards on phones (only the visible one matches). */
const userRows = () =>
  office
    .getByRole('list', { name: 'Daftar pengguna' })
    .getByRole('listitem')
    .or(
      office
        .getByRole('table', { name: 'Daftar pengguna' })
        .getByRole('row')
        .filter({ has: office.getByRole('cell') }),
    )

test.beforeAll(async ({ browser }, testInfo) => {
  office = await pageAs(browser, testInfo, 'kantor')
})

test.afterAll(async () => {
  await office?.close()
})

test('a new role starts as a copy of Admin Gudang and gets the approval (PG-08)', async () => {
  await office.getByRole('link', { name: 'Pengguna' }).first().click()
  await office.getByRole('link', { name: 'Peran & izin' }).click()
  await expect(office.getByRole('heading', { name: 'Peran & izin' })).toBeVisible()

  await office.getByRole('button', { name: 'Peran baru' }).click()
  await office.getByLabel('Nama peran (wajib)').fill(ROLE)
  await office.getByLabel('Tugas utama').fill('Mengawasi stok gudang (uji e2e).')
  await office.getByLabel('Salin izin dari').selectOption({ label: 'Admin Gudang' })
  await office.getByRole('button', { name: 'Buat peran' }).click()
  await expect(office.getByText(`Peran ${ROLE} dibuat`)).toBeVisible()

  // Copied permissions are ticked; add one more and save
  await expect(office.getByLabel('Siapkan barang untuk sales')).toBeChecked()
  const approve = office.getByLabel('Setujui penyesuaian opname')
  await expect(approve).not.toBeChecked()
  await approve.check()
  await office.getByRole('button', { name: 'Simpan (1 perubahan)' }).click()
  await expect(office.getByText(`Peran ${ROLE} tersimpan.`)).toBeVisible()
  await expect(office.getByRole('button', { name: 'Belum ada perubahan' })).toBeDisabled()

  await office.getByRole('button', { name: 'Riwayat perubahan' }).click()
  await expect(office.getByText('Izin ditambah: Setujui penyesuaian opname').first()).toBeVisible()

  // The duties typed here show in the table on the Pengguna page
  await office.getByRole('link', { name: 'Pengguna', exact: true }).first().click()
  await expect(
    office.getByRole('table', { name: 'Penjelasan tiap peran' }).getByRole('row', { name: new RegExp(ROLE) }),
  ).toContainText('Mengawasi stok gudang (uji e2e).')
})

test('the office adds a user with that role, who can sign in at once', async ({ browser }) => {
  await office.getByRole('link', { name: 'Pengguna', exact: true }).last().click()
  await office.getByRole('button', { name: 'Tambah pengguna' }).click()

  const sheet = office.getByRole('dialog')
  // Server checks come back in plain words
  await sheet.getByLabel('Nama (wajib)').fill(USER)
  await sheet.getByLabel('Nomor HP (wajib)').fill(PHONE)
  await sheet.getByLabel('Username (wajib)').fill(USERNAME)
  await sheet.getByRole('button', { name: 'Tambah pengguna' }).click()
  await expect(sheet.getByText('Pilih paling sedikit satu peran.')).toBeVisible()

  await sheet.getByLabel(ROLE).check()
  await sheet.getByRole('button', { name: 'Tambah pengguna' }).click()
  await expect(sheet.getByText(`Akun ${USER} sudah bisa dipakai masuk.`)).toBeVisible()
  password = (await sheet.getByTestId('new-password').textContent()) ?? ''
  expect(password).toHaveLength(10)
  await sheet.getByRole('button', { name: 'Selesai' }).click()

  await office.getByLabel('Cari nama, username, atau nomor HP').fill(USERNAME)
  const row = userRows()
  await expect(row).toHaveCount(1)
  await expect(row).toContainText(ROLE)
  await expect(row).toContainText('Belum pernah masuk')

  // The new user signs in with the phone number and lands in the office area
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Nomor HP atau username').fill(PHONE)
  await page.getByLabel('Kata sandi', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await expect(page).toHaveURL(/\/office$/)
  await expect(page.getByRole('link', { name: 'Gudang' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pengguna' })).toHaveCount(0)
  await context.close()
})

test('a deactivated user moved off the role lets the role be deleted', async () => {
  const row = userRows()
  await row.getByRole('button', { name: `Ubah ${USER}` }).click()
  const sheet = office.getByRole('dialog')
  await sheet.getByLabel('Aktif, boleh masuk').uncheck()
  await sheet.getByLabel(ROLE).uncheck()
  await sheet.getByLabel('Admin Gudang').check()
  await sheet.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(office.getByText(`Data ${USER} tersimpan.`)).toBeVisible()
  await expect(row).toContainText('Nonaktif')

  await office.getByRole('link', { name: 'Peran & izin' }).click()
  await office.getByLabel('Peran', { exact: true }).selectOption({ label: `${ROLE} (0 pengguna)` })
  await office.getByRole('button', { name: 'Hapus peran ini' }).click()
  await office.getByRole('alertdialog').getByRole('button', { name: 'Hapus peran' }).click()
  await expect(office.getByText(`Peran ${ROLE} dihapus.`)).toBeVisible()
  await expect(office.locator('#role-select option', { hasText: ROLE })).toHaveCount(0)
})

test('the Pengguna page explains every role and what it may open (AK-02)', async () => {
  await office.getByRole('link', { name: 'Pengguna', exact: true }).last().click()

  const duties = office.getByRole('table', { name: 'Penjelasan tiap peran' })
  await expect(duties.getByRole('row', { name: /Sales/ })).toContainText('Bekerja dari HP')

  // One row per permission, one column per role: a tick is "Boleh", a dash is "Tidak"
  const matrix = office.getByRole('table', { name: 'Hak akses tiap peran' })
  const row = matrix.getByRole('row', { name: /^Kelola pengguna, peran & izin/ })
  await expect(row.getByRole('cell')).toHaveText(['Tidak', 'Boleh', 'Tidak', 'Tidak'])
})
