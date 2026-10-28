import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin,mockPrumo,account,card,category } from './fixtures/prumo.mjs';

test('subscription management is readable on mobile and creates a linked prediction before charging',async()=>{
  const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  try {
    await mockPrumo(context);let list=[],saved=null;
    await context.route('**/api/v1/subscriptions**',async route=>{
      if(route.request().method()==='POST'){saved=route.request().postDataJSON();list=[{id:'sub',...saved,account_name:'Conta da casa',card_name:'Cartão da casa'}];return route.fulfill({json:list[0]});}
      return route.fulfill({json:list});
    });
    const page=await context.newPage();await page.goto(origin+'/subscriptions');
    await page.getByRole('button',{name:'Nova assinatura',exact:true}).click();
    const form=page.locator('dialog[open]');
    await form.getByLabel('Nome da assinatura').fill('Netflix');
    await form.getByLabel('Valor da cobrança (R$)').fill('39,90');
    await form.getByLabel('Onde é cobrada?').selectOption(card);
    assert.equal(await form.getByLabel('Conta vinculada').inputValue(),account);
    assert.equal(await form.getByLabel('Conta vinculada').isDisabled(),true);
    await form.getByRole('button',{name:'Salvar assinatura',exact:true}).click();
    await page.getByRole('heading',{name:'Netflix',exact:true}).waitFor();
    assert.equal(saved.card_id,card);assert.equal(saved.amount,39.9);
    assert.equal(saved.category_id,category);assert.equal(saved.frequency,'MONTHLY');
    assert.equal(await page.evaluate(()=>document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth+1),false);
    await page.screenshot({path:'/tmp/prumo-subscriptions-mobile.png'});
  } finally{await context.close();await browser.close();}
});

test('statement suggestions require explicit subscription and category review',async()=>{
  const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block'});
  try{
    await mockPrumo(context);let body=null;
    await context.route('**/api/v1/imports/**',async route=>{
      const path=new URL(route.request().url()).pathname;let data=[];
      if(path.endsWith('/preview'))data={preview_token:'synthetic',warnings:[],rows:[{index:0,date:'2026-10-27',description:'Netflix',original_description:'Netflix.com',amount:'39.90',type:'DESPESA',blocked:false,duplicate:false,category_id:null,subscription_info:{matching_id:null,frequency:'MONTHLY',reason:'Serviço possivelmente recorrente; confirme a frequência'}}]};
      if(path.endsWith('/confirm')){body=route.request().postDataJSON();data={imported:1,skipped:0};}
      await route.fulfill({json:data});
    });
    const page=await context.newPage();await page.goto(origin+'/import');await page.locator('#import-source').selectOption('card');
    await page.locator('#import-file').setInputFiles({name:'statement.ofx',mimeType:'application/x-ofx',buffer:Buffer.from('<OFX>synthetic</OFX>')});
    await page.getByRole('button',{name:/Gerar prévia/}).click();
    const subscription=page.getByRole('checkbox',{name:/Acompanhar esta compra como assinatura/});
    assert.equal(await subscription.isChecked(),false);await subscription.check();
    await page.getByRole('checkbox',{name:/Conferi as datas/}).check();const save=page.getByRole('button',{name:/Salvar 1 lançamentos/});assert.equal(await save.isDisabled(),true);
    await page.locator('#import-category-0').selectOption(category);await page.locator('#subscription-frequency-0').selectOption('YEARLY');await page.getByRole('checkbox',{name:/Conferi as datas/}).check();
    await save.click();await page.getByRole('button',{name:'Confirmar destino e importar',exact:true}).click();await page.getByRole('heading',{name:'1 lançamentos importados'}).waitFor();
    assert.equal(body.entries[0].import_subscription,true);assert.equal(body.entries[0].subscription_frequency,'YEARLY');
  }finally{await context.close();await browser.close();}
});
