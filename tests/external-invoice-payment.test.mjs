import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo, card } from './fixtures/prumo.mjs';

test('empty invoice explains its cycle and already-paid confirmation requires password',async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  try {
    await mockPrumo(context);
    let confirmed=false, body=null;
    const invoice=()=>({id:'invoice',card_id:card,year:2026,month:10,period_label:'Outubro / 2026',cycle_start_date:'2026-09-21',closing_date:'2026-10-20',due_date:'2026-10-28',total_amount:0,paid_amount:0,remaining_amount:0,status:confirmed?'PAGA':'ABERTA',external_settled:confirmed,external_paid_amount:0,items:[],items_count:0});
    await context.route('**/api/v1/cards/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path.endsWith('/external-payment')) {body=route.request().postDataJSON();confirmed=true;return route.fulfill({json:invoice()});}
      if(path.endsWith('/external-payment/reverse')) {confirmed=false;return route.fulfill({json:invoice()});}
      if(new RegExp(`/cards/${card}/invoices/2026/10$`).test(path)) return route.fulfill({json:invoice()});
      if(path.endsWith('/invoices/overview')) return route.fulfill({json:{bank_balance:1000,available_for_payment:1000,total_amount:0,paid_amount:0,remaining_amount:0,shortfall:0,balance_after_payment:1000,invoices:[{card_name:'Cartão da casa',invoice:invoice()}]}});
      if(path.endsWith(`/cards/${card}/invoices`)) return route.fulfill({json:[invoice()]});
      return route.fallback();
    });
    const page=await context.newPage();
    await page.goto(origin+'/invoices');
    await page.getByRole('button',{name:'Abrir fatura Cartão da casa'}).click();
    await page.getByText(/O saldo zero não confirma/).waitFor();
    assert.equal(await page.getByRole('button',{name:'Pagar fatura',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Já paguei',exact:true}).click();
    const form=page.locator('dialog[open]').last();
    await form.getByText(/valor histórico pago não será reconstruído/).waitFor();
    await form.getByRole('button',{name:'Confirmar que já paguei'}).click();
    assert.equal(body,null);
    await form.locator('#external-payment-password').fill('test-password');
    await form.getByRole('checkbox').check();
    await form.getByRole('button',{name:'Confirmar que já paguei'}).click();
    await page.getByText(/Pagamento confirmado fora do Prumo/).first().waitFor();
    assert.equal(body.password,'test-password');
    assert.equal(body.expected_total,0);
    assert.equal(await page.locator('#external-payment-password').count(),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('test-password')),null);
    await page.getByRole('button',{name:'Desfazer confirmação',exact:true}).click();
    const reverse=page.locator('dialog[open]').last();
    await reverse.locator('#external-payment-password').fill('test-password');
    await reverse.getByRole('checkbox').check();
    await reverse.getByRole('button',{name:'Desfazer confirmação',exact:true}).click();
    await page.getByRole('button',{name:'Já paguei',exact:true}).waitFor();
  } finally {await context.close();await browser.close();}
});
