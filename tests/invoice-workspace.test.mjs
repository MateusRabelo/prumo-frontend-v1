import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo, card, account, family } from './fixtures/prumo.mjs';

test('invoice workspace opens selected month, creates purchases, edits and excludes them', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  try {
    const writes = await mockPrumo(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/invoices');
    await page.getByRole('heading', { name: 'Faturas', exact: true }).waitFor();
    await page.getByRole('button', { name: /Abrir fatura/ }).waitFor();
    assert.match(await page.locator('.invoice-funding').innerText(), /saldo cobre/);
    assert.equal(await page.evaluate(() => document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1), false);
    await page.screenshot({ path: '/tmp/prumo-faturas-mobile.png' });
    await page.getByRole('button', { name: /Abrir fatura/ }).click();
    await page.getByRole('button', { name: 'Adicionar compra', exact: true }).click();
    await page.getByRole('heading', { name: 'Adicionar compra à fatura' }).waitFor();
    assert.equal(await page.locator('#transaction-card').inputValue(), card);
    assert.equal(await page.locator('#transaction-card').isDisabled(), true);
    assert.equal(await page.locator('#transaction-date').getAttribute('max'), '2026-10-20');
    await page.getByLabel('Descrição', { exact: true }).fill('Cantina faculdade');
    await page.locator('#transaction-amount').fill('25,90');
    await page.locator('dialog[open]').last().getByRole('button', { name: /Registrar lançamento/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    const created = writes.find(w => /transactions$/.test(w.path));
    assert.ok(created);
    assert.equal(created.body.card_id, card);
    assert.equal(created.body.amount, 25.9);
    assert.ok(created.body.date >= '2026-09-21' && created.body.date <= '2026-10-20');
    await page.getByRole('button', { name: /^Excluir / }).first().click();
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
    await page.waitForFunction(() => !document.body.textContent.includes('Confirmar exclusão'));
    assert.ok(writes.some(w => /transactions\//.test(w.path)));
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});
