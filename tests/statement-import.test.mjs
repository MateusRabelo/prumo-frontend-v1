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
    await page.getByRole('button',{name:'Confirmar destino e importar',exact:true}).click();
    await page.getByRole('heading', { name: '1 lançamentos importados' }).waitFor();
    assert.equal(confirmed.entries.length, 1);
    assert.equal(confirmed.entries[0].description, 'Cantina faculdade');
    assert.equal(confirmed.entries[0].remember, true);
    assert.equal(confirmed.entries[0].type, 'DESPESA');
    assert.equal(confirmed.reviewed, true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test('Nubank summary separates purchases from debt and requires reconciliation acknowledgement', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  try {
    await mockPrumo(context);
    let body = null;
    await context.route('**/api/v1/imports/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.endsWith('/preview')) data = { preview_token: 'synthetic-nubank-token', warnings: [],
        statement: { issuer: 'Nubank', year: 2026, month: 9, purchases: '25.00', previous_balance: '0', amount_due: '0.00', recognized_credits: '0', recognized_payments: '25.00', totals_match: true, requires_reconciliation: true },
        rows: [{ index: 0, date: '2026-08-06', amount: '25.00', original_description: 'R N Doces', description: 'R N Doces', type: 'DESPESA', category_id: null, blocked: false, warning: '', duplicate: false, possible_duplicate: false, learned: false }] };
      else if (path.endsWith('/confirm')) { body = route.request().postDataJSON(); data = { imported: 1, skipped: 0 }; }
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    await page.goto(origin+'/import');
    await page.locator('#import-source').selectOption('card');
    await page.locator('#import-file').setInputFiles({ name: 'example.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-synthetic') });
    await page.getByRole('button', { name: /Gerar prévia/ }).click();
    const panel = page.getByRole('region', { name: 'Resumo reconhecido do PDF' });
    await panel.waitFor();
    assert.match(await panel.innerText(), /Nubank · Fatura 09\/2026/);
    assert.match(await panel.innerText(), /25,00/);
    assert.match(await panel.innerText(), /0,00/);
    await page.getByRole('checkbox', { name: /Conferi as datas/ }).check();
    const save = page.getByRole('button', { name: /Salvar 1 lançamentos/ });
    assert.equal(await save.isDisabled(), true);
    await page.getByRole('checkbox', { name: /Entendi que pagamentos/ }).check();
    assert.equal(await save.isEnabled(), true);
    await save.click();
    await page.getByRole('button',{name:'Confirmar destino e importar',exact:true}).click();
    await page.getByRole('heading', { name: '1 lançamentos importados' }).waitFor();
    assert.equal(body.reconciliation_reviewed, true);
  } finally { await context.close(); await browser.close(); }
});

test('recognized installments require a category and payments stay in the final summary', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  try {
    await mockPrumo(context);
    let saved;
    await context.route('**/api/v1/imports/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      let data=[];
      if(path.endsWith('/preview')) data={preview_token:'signed',warnings:[],rows:[
        {index:0,date:'2026-10-27',amount:'50',original_description:'Loja - Parcela 6/6',description:'Loja - Parcela 6/6',type:'DESPESA',category_id:null,blocked:false,duplicate:false,possible_installment:true,installment_info:{number:6,count:6,description:'Loja'}},
        {index:1,date:'2026-10-06',amount:'147.64',original_description:'Pagamento em 06 OUT',description:'Pagamento em 06 OUT',blocked:true,entry_kind:'payment'}]};
      if(path.endsWith('/confirm')) {saved=route.request().postDataJSON();data={imported:1,skipped:0};}
      await route.fulfill({json:data});
    });
    const page=await context.newPage();
    await page.goto(origin+'/import');
    await page.locator('#import-source').selectOption('card');
    await page.locator('#import-file').setInputFiles({name:'fatura.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-synthetic')});
    await page.getByRole('button',{name:/Gerar prévia/}).click();
    await page.getByRole('region',{name:'Pagamentos e créditos do extrato'}).waitFor();
    assert.equal(await page.locator('.import-row').count(),1);
    assert.equal(await page.locator('#import-name-1').count(),0);
    await page.getByRole('checkbox',{name:/Conferi as datas/}).check();
    const save=page.getByRole('button',{name:/Salvar 1 lançamentos/});
    assert.equal(await save.isDisabled(),true);
    await page.locator('#import-category-0').selectOption({label:'Mercado'});
    await page.getByRole('checkbox',{name:/Conferi as datas/}).check();
    assert.equal(await save.isEnabled(),true);
    await page.screenshot({path:'/tmp/prumo-import-installment-mobile.png',fullPage:true});
    await save.click();
    await page.getByRole('button',{name:'Confirmar destino e importar',exact:true}).click();
    await page.getByRole('heading',{name:'1 lançamentos importados'}).waitFor();
    assert.equal(saved.entries[0].import_installment,true);
    assert.equal(saved.entries.length,1);
  } finally {await context.close();await browser.close();}
});

test('validation failures identify the rejected field and preserve the review without exposing preview tokens',async()=>{
  const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block'});
  try{
    await mockPrumo(context);
    await context.route('**/api/v1/imports/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith('/confirm'))return route.fulfill({status:422,json:{detail:[{loc:['body','preview_token'],type:'value_error',msg:'Value error, Prévia inválida para confirmação',input:'sensitive-preview-token'}]}});
      return route.fulfill({json:path.endsWith('/preview')?{preview_token:'signed',warnings:[],rows:[{index:0,date:'2026-10-27',amount:'10',original_description:'Compra exemplo',description:'Compra exemplo',type:'DESPESA',category_id:null,blocked:false,duplicate:false}]}:[]});
    });
    const page=await context.newPage();await page.goto(origin+'/import');
    await page.locator('#import-file').setInputFiles({name:'sample.ofx',mimeType:'application/x-ofx',buffer:Buffer.from('<OFX>test</OFX>')});
    await page.getByRole('button',{name:/Gerar prévia/}).click();await page.getByRole('checkbox',{name:/Conferi as datas/}).check();
    await page.getByRole('button',{name:/Salvar 1 lançamentos/}).click();
    await page.getByRole('button',{name:'Confirmar destino e importar',exact:true}).click();
    await page.getByRole('dialog').getByRole('alert').filter({hasText:/Prévia do extrato/}).waitFor();
    assert.equal(await page.locator('#import-name-0').inputValue(),'Compra exemplo');
    assert.doesNotMatch(await page.locator('body').innerText(),/sensitive-preview-token/);
  }finally{await context.close();await browser.close();}
});
