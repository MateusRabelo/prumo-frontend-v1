import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {origin,mockPrumo,account,family} from './fixtures/prumo.mjs';
for (const mobile of [false,true]) test(`bulk transaction changes are explicit and preserve selection after conflict (${mobile?'mobile':'desktop'})`,async()=>{
 const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
 try {
  await mockPrumo(context);
  let requests=[];let fail=true;
  const rows=[1,2].map(n=>({id:`0000000${n}-2222-4222-8222-222222222222`,family_id:family,date:'2026-10-27',description:`Compra teste ${n}`,type:'DESPESA',amount:10,account_id:account,account_name:'Conta da casa',responsible_name:'Família',is_shared:true,classification:'NECESSIDADE',status:'PENDENTE',payment_mode:'ACCOUNT',created_at:'2026-10-27T12:00:00Z',updated_at:'2026-10-27T12:00:00Z'}));
  await context.route('**/api/v1/transactions/**',async route=>{
   const req=route.request();if(req.url().includes('/bulk')){requests.push(req.postDataJSON());await route.fulfill(fail ? {status:409,json:{detail:'Um lançamento foi alterado. Atualize a lista e selecione novamente'}} : {json:{updated:2}});return;}
   await route.fulfill({json:{items:rows,total:2,skip:0,limit:50,summary:{total_realized_income:0,total_realized_expense:0,realized_net:0,total_pending_expense:20,total_pending_income:0,count:2}}});
  });
  const page=await context.newPage();await page.goto(origin+'/transactions');
  await page.getByLabel('Selecionar esta página',{exact:true}).check();
  const bar=page.getByRole('region',{name:'Ações em massa'});
  await bar.getByLabel('Situação do lote',{exact:true}).selectOption('REALIZADA');
  if(mobile) {const bounds=await bar.boundingBox();const select=await bar.getByLabel('Situação do lote').boundingBox();assert.ok(select.x+select.width <= bounds.x+bounds.width);}
  await page.screenshot({path:`/tmp/prumo-bulk-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await bar.getByRole('button',{name:'Aplicar em 2 lançamentos'}).click();
  assert.equal(requests.length,0);
  const dialog=page.getByRole('dialog',{name:'Confirmar alteração'});
  await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();
  await bar.getByRole('alert').waitFor();assert.equal(requests.length,1);assert.equal(requests[0].items.length,2);assert.equal(requests[0].items[0].updated_at,rows[0].updated_at);assert.equal(requests[0].status,'REALIZADA');
  assert.match(await bar.innerText(),/2 selecionados/);
  fail=false;
  await bar.getByRole('button',{name:'Aplicar em 2 lançamentos'}).click();
  await page.getByRole('dialog',{name:'Confirmar alteração'}).getByRole('button',{name:'Confirmar',exact:true}).click();
  await page.getByText('2 lançamentos atualizados',{exact:true}).waitFor();
  assert.equal(requests.length,2);
  assert.equal(await bar.getByRole('button',{name:/Aplicar em/}).count(),0);
 } finally {await context.close();await browser.close();}
});
