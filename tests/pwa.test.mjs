import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, devices } from 'playwright';
import { readFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:4175';
const week = 7 * 24 * 60 * 60 * 1000;
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready, 'Production preview started');
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); server?.kill(); });

async function mobile(device = 'iPhone 13', setup) {
  const context = await browser.newContext({ ...devices[device], serviceWorkers: 'block' });
  if (setup) await context.addInitScript(setup);
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(origin + '/login');
  await page.getByRole('heading', { name: 'Bom ter você por aqui.' }).waitFor();
  await page.clock.fastForward(6500);
  return { context, page };
}

test('iPhone instructions, keyboard dismissal, no repeat before seven days, then repeat', async () => {
  const { context, page } = await mobile();
  try {
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').innerText(), /Adicionar à Tela de Início/);
    const first = await page.evaluate(() => Number(localStorage.getItem('prumo_pwa_install_shown_at')));
    assert.ok(first > 0);
    const bounds = await page.locator('dialog').boundingBox();
    assert.ok(bounds.width <= 390 && bounds.x >= 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    await page.reload();
    await page.getByRole('heading').first().waitFor();
    await page.clock.fastForward(6500);
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    await page.evaluate(({ first, week }) => {
      localStorage.setItem('prumo_pwa_install_shown_at', String(first));
      Date.now = () => first + week - 1;
      document.dispatchEvent(new Event('visibilitychange'));
    }, { first, week });
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    await page.evaluate(({ first, week }) => {
      Date.now = () => first + week;
      document.dispatchEvent(new Event('visibilitychange'));
    }, { first, week });
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.evaluate(() => Number(localStorage.getItem('prumo_pwa_install_shown_at'))), first + week);
    await page.screenshot({ path: '/tmp/prumo-pwa-iphone.png' });
  } finally { await context.close(); }
});

test('Android invokes native install from a user action and hides after installation', async () => {
  const { context, page } = await mobile('Pixel 7');
  try {
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => { window.nativePromptCalled = true; };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'Instalar Prumo', exact: true }).click();
    assert.equal(await page.evaluate(() => window.nativePromptCalled), true);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    assert.equal(await page.evaluate(() => localStorage.getItem('prumo_pwa_installed')), '1');
    await page.clock.fastForward(week + 1);
    await page.reload();
    await page.getByRole('heading').first().waitFor();
    await page.clock.fastForward(6500);
    assert.equal(await page.getByRole('dialog').isVisible(), false);
  } finally { await context.close(); }
});

test('standalone launch does not show an install offer', async () => {
  const { context, page } = await mobile('iPhone 13', () => Object.defineProperty(navigator, 'standalone', { value: true }));
  try {
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('prumo_pwa_installed')), '1');
  } finally { await context.close(); }
});

test('manifest and offline shell work without caching authenticated API responses', async () => {
  const manifest = await (await fetch(origin + '/manifest.webmanifest')).json();
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512'));
  for (const icon of manifest.icons) {
    const response = await fetch(origin + icon.src);
    assert.equal(response.headers.get('content-type'), 'image/png');
  }
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/login');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 20000 });
    await context.route('**/api/v1/private-check', route => route.fulfill({ json: { secret: 'must-not-be-cached' } }));
    await page.evaluate(async () => fetch('/api/v1/private-check', { headers: { Authorization: 'Bearer test-only' } }));
    const cached = await page.evaluate(async () => {
      const entries = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        entries.push(...(await cache.keys()).map(r => r.url));
      }
      return entries;
    });
    assert.ok(cached.length > 10);
    assert.equal(cached.some(url => url.includes('/api/')), false);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'Bom ter você por aqui.' }).waitFor();
    await page.getByRole('status').waitFor();
    assert.match(await page.getByRole('status').innerText(), /sem conexão/);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
  const sw = await readFile('dist/sw.js', 'utf8');
  assert.ok(!sw.includes('NetworkFirst'), 'No runtime financial response cache');
});
