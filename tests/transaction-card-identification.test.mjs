import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo, card, account, family } from './fixtures/prumo.mjs';

test('transactions identify credit, invoice payment and unlinked account on desktop and mobile',async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({serviceWorkers:'block'});
  try {
    await mockPrumo(context);
    const base={family_id:family,date:'2026-10-27',type:'DESPESA',amount:24,account_id:account,account_name:'Conta da casa',card_id:card,card_name:'Nubank',card_last_digits:'1234',payment_mode:'CREDIT',invoice_year:2026,invoice_month:11,invoice_label:'Novembro / 2026',responsible_name:'Pessoa',status:'REALIZADA',is_shared:false};
    await context.route('**/api/v1/transactions/**',route=>route.fulfill({json:{items:[{...base,id:'credit',description:'Passagem'},{...base,id:'payment',description:'Quitação',payment_mode:'ACCOUNT',is_invoice_payment:true},{...base,id:'account',description:'Compra por Pix',card_id:null,payment_mode:'ACCOUNT'}],total:3,summary:{}}}));
    const page=await context.newPage();
    await page.goto(origin+'/transactions');
    for(const width of [1366,390]) {
      await page.setViewportSize({width,height:844});
      const row=width===390?page.locator('article').filter({hasText:'Passagem'}):page.getByRole('row').filter({hasText:'Passagem'});
      await row.getByRole('link',{name:'Nubank · final 1234'}).waitFor();
      assert.match(await row.innerText(),/Crédito · Novembro \/ 2026/);
      const pay=width===390?page.locator('article').filter({hasText:'Quitação'}):page.getByRole('row').filter({hasText:'Quitação'});
      assert.match(await pay.innerText(),/Pagamento de fatura/);
      assert.doesNotMatch(await pay.innerText(),/Débito/);
      const pix=width===390?page.locator('article').filter({hasText:'Compra por Pix'}):page.getByRole('row').filter({hasText:'Compra por Pix'});
      assert.match(await pix.innerText(),/Sem cartão vinculado/);
    }
    await page.locator('article').filter({hasText:'Passagem'}).getByRole('link',{name:'Nubank · final 1234'}).click();
    await page.waitForURL('**/invoices?**');
    assert.equal(new URL(page.url()).searchParams.get('month'),'11');
    assert.equal(new URL(page.url()).searchParams.get('card'),card);
    await page.locator('dialog[open]').first().waitFor();
  } finally {await context.close();await browser.close();}
});
