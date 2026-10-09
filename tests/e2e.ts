// Browser test against the PGlite stand-in: guest books and sees the UPI QR; admin adds a hotel + room,
// uploads photos, deletes one, and the public site reflects it.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startDevDb } from '../scripts/dev-db';

const DB_PORT = 54331, WEB_PORT = 3131;
const base = `http://localhost:${WEB_PORT}`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const env = {
  ...process.env, SUPABASE_URL: `http://localhost:${DB_PORT}`, SUPABASE_SERVICE_ROLE_KEY: 'dev',
  ADMIN_PASSWORD: 'e2e-password', ADMIN_SESSION_SECRET: 'e2e-secret-'.repeat(4), NEXT_PUBLIC_UPI_ID: 'aura@okbizaxis',
  NEXT_PUBLIC_UPI_NAME: 'Aura Suites', NEXT_PUBLIC_SITE_URL: base,
} as NodeJS.ProcessEnv;

async function waitFor(url: string) { for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error('server not up'); }

async function main() {
const dev = await startDevDb(DB_PORT, false);
let web: ChildProcess | undefined;
let failed = false;
try {
  const b = spawnSync('npx', ['next', 'build'], { env, stdio: 'inherit' });
  assert.equal(b.status, 0, 'next build failed');
  web = spawn('npx', ['next', 'start', '-p', String(WEB_PORT)], { env, stdio: 'inherit' });
  await waitFor(base);

  const browser = await chromium.launch();
  const admin = await (await browser.newContext()).newPage();
  admin.on('dialog', (d) => d.accept());

  // ---- admin: sign in, add hotel
  await admin.goto(`${base}/admin`);
  await admin.fill('#pw', 'wrong'); await admin.click('[data-testid=login] button');
  await admin.getByText('Wrong password.').waitFor();
  await admin.fill('#pw', 'e2e-password'); await admin.click('[data-testid=login] button');
  await admin.getByRole('tab', { name: 'Hotels' }).click();
  await admin.getByRole('button', { name: 'Add hotel' }).click();
  await admin.fill('#h-name', 'Aura Suites Testville');
  await admin.fill('#h-city', 'Testville');
  await admin.fill('#h-tag', 'A test stay');
  await admin.fill('#h-phone', '9995588780');
  await admin.getByLabel('Free WiFi').check();
  // photos: upload two, delete one
  await admin.setInputFiles('[data-testid=photo-input]', [
    { name: 'a.png', mimeType: 'image/png', buffer: PNG }, { name: 'b.png', mimeType: 'image/png', buffer: PNG }]);
  await admin.locator('[data-testid=photo-manager] img[alt^="Photo"]').nth(1).waitFor();
  assert.equal(await admin.locator('[data-testid=photo-manager] img[alt^="Photo"]').count(), 2);
  await admin.getByRole('button', { name: 'Delete photo' }).nth(1).click();
  assert.equal(await admin.locator('[data-testid=photo-manager] img[alt^="Photo"]').count(), 1);
  const stored = () => dev.files.size;
  assert.equal(stored(), 2);
  await admin.getByRole('button', { name: 'Save hotel' }).click();
  await admin.getByText('/testville', { exact: false }).waitFor();
  assert.equal(stored(), 1, 'removed photo should be deleted from storage after save');

  // ---- admin: add room
  await admin.getByRole('tab', { name: 'Rooms & rates' }).click();
  await admin.fill('#n-name', 'Deluxe Room');
  await admin.fill('#n-total_rooms', '2'); await admin.fill('#n-base_rate', '3000');
  await admin.getByRole('button', { name: 'Add room' }).click();
  const row = admin.locator('[data-room-row="Deluxe Room"]');
  await row.waitFor();
  await row.getByRole('button', { name: 'Details & photos' }).click();
  await admin.fill('textarea[id^="d-"]', 'Bright room with a king bed.');
  await admin.getByRole('button', { name: 'Save details & photos' }).click();

  // ---- public site reflects it
  const guest = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  let html = '';
  for (let i = 0; i < 20 && !html.includes('Deluxe Room'); i++) { html = await (await fetch(`${base}/hotels/testville`)).text(); await new Promise((r) => setTimeout(r, 300)); }
  assert.ok(html.includes('Aura Suites Testville') && html.includes('Deluxe Room'), 'hotel page should show the new hotel and room');
  assert.ok((await (await fetch(`${base}/sitemap.xml`)).text()).includes('/rooms/deluxe-room'));

  // ---- guest: pick dates, book, see QR
  await guest.goto(`${base}/hotels/testville`);
  await guest.getByRole('button', { name: 'Choose dates' }).click();
  const cells = guest.locator('[data-date]:not([disabled])');
  const n = await cells.count();
  await cells.nth(n - 20).click(); await cells.nth(n - 18).click();
  await guest.getByRole('button', { name: 'Check availability' }).click();
  await guest.getByRole('button', { name: /Deluxe Room/ }).click();
  await guest.getByRole('button', { name: 'Continue' }).click();
  await guest.fill('#g-name', 'Test Guest'); await guest.fill('#g-phone', '9876543210');
  await guest.getByRole('button', { name: 'Confirm booking' }).click();
  const ref = await guest.locator('[data-testid=reference]').innerText();
  assert.match(ref, /^AUR-[0-9A-F]{6}$/);
  await guest.locator('[data-testid=upi-card] img[alt="UPI payment QR code"]').waitFor();
  assert.ok((await guest.locator('[data-testid=upi-card]').innerText()).includes('cannot verify'));

  // ---- manage booking, then admin sees it
  await guest.goto(`${base}/manage-booking`);
  await guest.fill('#m-ref', ref); await guest.fill('#m-phone', '9876543210');
  await guest.getByRole('button', { name: 'Find booking' }).click();
  await guest.locator('[data-testid=booking]').waitFor();
  await admin.getByRole('tab', { name: 'Bookings' }).click();
  await admin.getByText(ref).waitFor();

  // ---- fallback: database down => site still renders with the built-in list
  await dev.server.close(); dev.server.closeAllConnections?.();
  await guest.goto(`${base}/`);
  await guest.getByText('Arrive.').waitFor();
  console.log('e2e passed, booking', ref);
  await browser.close();
} catch (e) {
  failed = true; console.error(e);
} finally {
  web?.kill();
  process.exit(failed ? 1 : 0);
}
}
main();
