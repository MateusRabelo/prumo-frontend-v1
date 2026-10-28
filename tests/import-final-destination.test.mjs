import {test} from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {origin,mockPrumo,account,card,category} from './fixtures/prumo.mjs';
test('final destination confirmation can select card and reference after a bank preview without losing edits',async()=>{
 const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 try{
  await mockPrumo(context);let saved=null;
  await context.route('**/api/v1/imports/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/preview'))return route.fulfill({json:{preview_token:'signed',credit_statement:true,warnings:[],rows:[{index:0,date:'2026-10-04',amount:'50.00',original_description:'Loja - Parcela 3/6',description:'Loja - Parcela 3/6',type:'DESPESA',category_id:category,blocked:false,duplicate:false,installment_info:{number:3,count:6,description:'Loja'}}]}});
   if(path.endsWith('/confirm')){saved=route.request().postDataJSON();return route.fulfill({json:{imported:1,skipped:0}});}
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();await page.goto(origin+'/import');
  await page.locator('#import-file').setInputFiles({name:'fatura.ofx',mimeType:'application/x-ofx',buffer:Buffer.from('<OFX>fixture</OFX>')});
  await page.getByRole('button',{name:/Gerar prévia/}).click();await page.locator('#import-name-0').fill('Minha compra');
  await page.getByRole('checkbox',{name:/Conferi as datas/}).check();await page.getByRole('button',{name:/Salvar 1 lançamentos/}).click();
  const dialog=page.getByRole('dialog',{name:'Confirmar destino dos lançamentos'});await dialog.waitFor();assert.equal(saved,null);
  await dialog.getByRole('button',{name:'Voltar à revisão'}).click();assert.equal(await page.locator('#import-name-0').inputValue(),'Minha compra');
  await page.getByRole('button',{name:/Salvar 1 lançamentos/}).click();
  assert.equal(await dialog.locator('#final-source').inputValue(),'card');await dialog.locator('#final-month').fill('2026-10');
  await page.screenshot({path:'/tmp/prumo-final-destination-mobile.png'});
  await dialog.getByRole('button',{name:'Confirmar destino e importar'}).click();await page.getByRole('heading',{name:'1 lançamentos importados'}).waitFor();
  assert.deepEqual(saved.destination,{account_id:account,card_id:card,invoice_month:'2026-10'});assert.equal(saved.entries[0].import_installment,true);assert.equal(saved.entries[0].description,'Minha compra');
 }finally{await context.close();await browser.close();}
});
