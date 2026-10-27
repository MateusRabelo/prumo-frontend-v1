import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin,mockPrumo,category } from './fixtures/prumo.mjs';

test('bulk categories organize twenty installments and rename recurring merchant patterns',async()=>{
  const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  try{
    await mockPrumo(context);let body;
    await context.route('**/api/v1/settings/categories',route=>route.fulfill({json:[{id:category,name:'Mercado',type:'DESPESA'},{id:'other-category',name:'Lazer',type:'DESPESA'}]}));
    const rows=Array.from({length:20},(_,i)=>({index:i,date:'2026-10-27',amount:'50',original_description:`${i<2?'Loja':`Loja ${i}`} - Parcela ${i===1?2:1}/5`,description:`${i<2?'Loja':`Loja ${i}`} - Parcela ${i===1?2:1}/5`,type:'DESPESA',category_id:null,blocked:false,duplicate:false,installment_info:{number:i===1?2:1,count:5,description:i<2?'Loja':`Loja ${i}`}}));
    rows.push({index:20,date:'2026-10-27',amount:'25',original_description:'Já classificado',description:'Já classificado',type:'DESPESA',category_id:'other-category',blocked:false,duplicate:false});
    await context.route('**/api/v1/imports/**',async route=>{
      const path=new URL(route.request().url()).pathname;let data=[];
      if(path.endsWith('/preview'))data={preview_token:'synthetic',warnings:[],rows};
      if(path.endsWith('/confirm')){body=route.request().postDataJSON();data={imported:21,skipped:0};}
      await route.fulfill({json:data});
    });
    const page=await context.newPage();await page.goto(origin+'/import');await page.locator('#import-source').selectOption('card');
    await page.locator('#import-file').setInputFiles({name:'example.ofx',mimeType:'application/x-ofx',buffer:Buffer.from('<OFX>fixture</OFX>')});
    await page.getByRole('button',{name:/Gerar prévia/}).click();
    await page.locator('#bulk-category').selectOption(category);
    await page.getByRole('button',{name:'Aplicar a 20 lançamentos',exact:true}).click();
    await page.getByRole('status').filter({hasText:'20 lançamentos atualizados'}).waitFor();
    for(let i=0;i<20;i++)assert.equal(await page.locator(`#import-category-${i}`).inputValue(),category);
    assert.equal(await page.locator('#import-category-20').inputValue(),'other-category');
    await page.locator('#import-name-0').fill('Cantina faculdade - Parcela 1/*');
    assert.equal(await page.locator('#import-name-1').inputValue(),'Cantina faculdade');
    await page.getByText(/Loja · Parcela \*\/\*/).first().waitFor();
    assert.equal(await page.locator('.import-category-heading h3').filter({hasText:'Mercado'}).count(),1);
    await page.getByRole('checkbox',{name:/Conferi as datas/}).check();
    await page.getByRole('button',{name:/Salvar 21 lançamentos/}).click();
    await page.getByRole('heading',{name:'21 lançamentos importados'}).waitFor();
    assert.equal(body.entries.filter(e=>e.category_id===category && e.import_installment && e.remember).length,20);
  }finally{await context.close();await browser.close();}
});
