import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo, card, account, family } from './fixtures/prumo.mjs';

test('multiple card binds its bank account and separates debit from credit', async () => {
  const browser=await chromium.launch();
  const context=await browser.newContext({serviceWorkers:'block'});
  try {
    const writes=await mockPrumo(context);
    await context.route('**/api/v1/cards',route=>route.fulfill({json:[{id:card,family_id:family,name:'Nubank',bank_name:'Nubank',card_type:'MULTIPLE',account_id:account,last_digits:'1234',closing_day:20,due_day:28,credit_limit:5000,is_active:true}]}));
    const page=await context.newPage();
    await page.goto(origin+'/transactions');
    await page.getByRole('button',{name:/Novo lançamento/}).first().click();
    const dialog=page.locator('dialog[open]');
    await dialog.locator('#transaction-card').selectOption(card);
    await dialog.locator('#transaction-payment-mode').waitFor();
    assert.equal(await dialog.locator('#transaction-account').inputValue(),account);
    assert.equal(await dialog.locator('#transaction-account').isDisabled(),true);
    await dialog.getByText(/O banco será debitado somente/).waitFor();
    await dialog.locator('#transaction-payment-mode').selectOption('DEBIT');
    await dialog.getByText(/Compra no débito: desconta/).waitFor();
    await dialog.locator('#transaction-description').fill('Compra no débito');
    await dialog.locator('#transaction-amount').fill('25,50');
    await dialog.getByRole('button',{name:/Registrar lançamento/}).click();
    await dialog.waitFor({state:'hidden'});
    const tx=writes.find(w=>w.path.endsWith('/transactions'));
    assert.equal(tx.body.payment_mode,'DEBIT');
    assert.equal(tx.body.card_id,card);
    assert.equal(tx.body.account_id,account);
    assert.equal(tx.body.amount,25.5);
  } finally {await context.close();await browser.close();}
});
