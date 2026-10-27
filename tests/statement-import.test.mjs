import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo } from './fixtures/prumo.mjs';

test('statement preview requires review and remembers merchant renaming only on confirmation', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  try {
    await mockPrumo(context);
    let confirmed = null;
    await context.route('**/api/v1/imports/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data;
      if (path.endsWith('/rules')) data = confirmed ? [{ id: 'rule', merchant: 'r n doces', description: 'Cantina faculdade' }] : [];
      else if (path.endsWith('/preview')) data = { preview_token: 'signed-preview-test', warnings: ['Confira as colunas com o PDF.'], rows: [
        { index: 0, date: '2026-10-26', amount: '12.50', original_description: 'R N Doces', description: 'R N Doces', type: null, category_id: null, blocked: false, warning: 'Confirme entrada ou saída', duplicate: false, possible_duplicate: false, learned: false },
        { index: 1, date: '2026-10-25', amount: '10.00', original_description: 'Já salvo', description: 'Já salvo', type: 'DESPESA', category_id: null, blocked: false, warning: '', duplicate: true, possible_duplicate: false, learned: false },
      ] };
      else if (path.endsWith('/confirm')) { confirmed = route.request().postDataJSON(); data = { imported: 1, skipped: 0 }; }
      else return route.fallback();
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/import');
    await page.getByRole('heading', { name: 'Importar extrato' }).waitFor();
    await page.locator('#import-file').setInputFiles({ name: 'extrato.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
    await page.getByRole('button', { name: /Gerar prévia/ }).click();
    await page.getByRole('heading', { name: '2. Confira antes de salvar' }).waitFor();
    const save = page.getByRole('button', { name: /Salvar 1 lançamentos/ });
    assert.equal(await save.isDisabled(), true);
    assert.equal(confirmed, null, 'Preview cannot persist financial transactions');
    await page.locator('#import-name-0').fill('Cantina faculdade');
    await page.locator('#import-type-0').selectOption('DESPESA');
    assert.equal(await page.locator('.import-row').first().getByRole('checkbox').last().isChecked(), true);
    assert.equal(await page.locator('.import-row').last().getByRole('checkbox').isDisabled(), true);
    await page.getByRole('checkbox', { name: /Conferi as datas/ }).check();
    assert.equal(await save.isEnabled(), true);
    assert.equal(await page.evaluate(() => document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1), false);
    await page.screenshot({ path: '/tmp/prumo-import-preview.png' });
    await save.click();
    await page.getByRole('heading', { name: '1 lançamentos importados' }).waitFor();
    assert.equal(confirmed.entries.length, 1);
    assert.equal(confirmed.entries[0].description, 'Cantina faculdade');
    assert.equal(confirmed.entries[0].remember, true);
    assert.equal(confirmed.entries[0].type, 'DESPESA');
    assert.equal(confirmed.reviewed, true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});
