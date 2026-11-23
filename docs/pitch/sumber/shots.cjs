/**
 * Mengambil ulang tangkapan layar untuk pitch deck dari aplikasi yang sedang jalan.
 * Hanya membuka layar; kunjungan tidak disimpan. Cara pakai ada di README.md folder ini.
 */
const fs = require('node:fs');
const { chromium, request } = require('@playwright/test');
const OUT = __dirname + '/shots/';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
// Frontend dev server dengan backend berisi data contoh (php artisan migrate --seed)
const BASE = process.env.PITCH_BASE_URL || 'http://localhost:5173';
async function session(account) {
  const api = await request.newContext({ baseURL: BASE });
  const r = await api.post('/api/v1/auth/login', { data: { login: account, password: 'sigap123', device_name: 'pitch' }, headers: { Accept: 'application/json' } });
  if (!r.ok()) throw new Error(account + ' ' + r.status());
  const { token, user } = await r.json();
  return JSON.stringify({ state: { token, user }, version: 0 });
}
async function open(browser, account, phone) {
  const ctx = await browser.newContext(phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'id-ID' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'id-ID' });
  const page = await ctx.newPage();
  const s = await session(account);
  await page.goto(BASE + '/login');
  await page.evaluate((v) => { localStorage.setItem('sigap-session', v); localStorage.setItem('sigap-preferences', JSON.stringify({ hintsOff: true })); }, s);
  return { ctx, page };
}
async function shot(page, url, name, wait = 2500) {
  if (url) await page.goto(BASE + url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(wait);
  await page.screenshot({ path: OUT + name + '.png' });
  console.log('shot', name, page.url());
}
(async () => {
  const browser = await chromium.launch();
  // Sales on a phone
  let { ctx, page } = await open(browser, 'sales1', true);
  await shot(page, '/field/today', 'm-today');
  await shot(page, '/field', 'm-outlets');
  const links = page.locator('a[href^="/field/visit/"]');
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    await links.nth(i).click();
    await page.getByRole('button', { name: 'Lanjut' }).or(page.getByText('Belum ada titipan')).first().waitFor();
    if (await page.locator('button[aria-label^="Kurangi Sisa"]:enabled').count()) break;
    await page.getByRole('link', { name: 'Kembali ke daftar outlet' }).click();
    await links.first().waitFor();
  }
  await shot(page, null, 'm-visit', 1200);
  await ctx.setOffline(true);
  const minus = page.locator('button[aria-label^="Kurangi Sisa"]:enabled');
  await minus.nth(0).click(); await minus.nth(0).click(); await minus.nth(0).click();
  if (await minus.count() > 1) await minus.nth(1).click();
  await shot(page, null, 'm-visit-offline', 800);
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('dialog').waitFor();
  await shot(page, null, 'm-bill', 1000);
  await ctx.close();
  // Desktop roles
  for (const [acc, list] of [
    ['pimpinan', [['/office', 'd-dashboard'], ['/office/reports', 'd-reports']]],
    ['gudang', [['/office/inventory/requests', 'd-requests']]],
    ['kantor', [['/office/billing', 'd-billing'], ['/office/outlets', 'd-outlets'], ['/office/settings', 'd-settings']]],
  ]) {
    ({ ctx, page } = await open(browser, acc, false));
    for (const [u, n] of list) await shot(page, u, n);
    if (acc === 'kantor') {
      await page.goto(BASE + '/office/products');
      await page.waitForLoadState('networkidle').catch(() => {});
      const ph = await page.locator('a[href^="/office/products/"]:not([href$="/new"]):not([href*="/edit"])').first().getAttribute('href');
      await shot(page, ph, 'd-product');
    }
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
