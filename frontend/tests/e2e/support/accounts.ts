import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, expect, type Page, type TestInfo } from '@playwright/test'

/** Sample accounts from SampleUserSeeder (fictional data). */
export const ACCOUNTS = ['kantor', 'gudang', 'pimpinan', 'sales1', 'sales2'] as const
export type Account = (typeof ACCOUNTS)[number]

export const PASSWORD = 'sigap123'

export function sessionFile(account: Account): string {
  return join(import.meta.dirname, '..', '.auth', `${account}.json`)
}

/** Open the app as an account signed in by global-setup (no login attempt counted). */
export async function signInAs(page: Page, account: Account): Promise<void> {
  const session = readFileSync(sessionFile(account), 'utf8')
  await page.goto('/login')
  await page.evaluate((value) => localStorage.setItem('sigap-session', value), session)
  await page.goto('/')
  await expect(page).toHaveURL(/\/(office|field)$/)
}

/** A new page with the project's device (phone or desktop), signed in as the account. */
export async function pageAs(browser: Browser, testInfo: TestInfo, account: Account): Promise<Page> {
  const { baseURL, viewport, locale, isMobile, hasTouch, userAgent, deviceScaleFactor } = testInfo.project.use
  const context = await browser.newContext({
    baseURL,
    viewport,
    locale,
    isMobile,
    hasTouch,
    userAgent,
    deviceScaleFactor,
  })
  const page = await context.newPage()
  await signInAs(page, account)
  return page
}

/**
 * Open the first consignment outlet (in "Outlet saya" order) that still has
 * goods on the shelf. Repeated runs sell from the sample shelves, so the very
 * first outlet may be empty. Moves inside the app (no page reload), so code
 * already loaded stays available when a test then goes offline.
 *
 * `fromEnd` searches from the last outlet, so a spec that runs next to the
 * visit spec with the same sales does not visit the same outlet at once.
 */
export async function openOutletWithShelfStock(page: Page, { fromEnd = false } = {}): Promise<void> {
  const outletTab = page.getByRole('link', { name: 'Outlet', exact: true })
  if (await outletTab.count()) await outletTab.click()
  else await page.goto('/field')

  const links = page.locator('a[href^="/field/visit/"]')
  await expect(links.first()).toBeVisible()
  const count = await links.count()

  for (let n = 0; n < count; n++) {
    await links.nth(fromEnd ? count - 1 - n : n).click()
    await expect(
      page.getByRole('button', { name: 'Lanjut' }).or(page.getByText('Belum ada titipan')).first(),
    ).toBeVisible()
    if (await page.locator('button[aria-label^="Kurangi Sisa"]:enabled').count()) return
    await page.getByRole('link', { name: 'Kembali ke daftar outlet' }).click()
    await expect(links.first()).toBeVisible()
  }
  throw new Error(
    'No consignment outlet of this sales has goods on the shelf. Reseed: php artisan migrate:fresh --seed',
  )
}
