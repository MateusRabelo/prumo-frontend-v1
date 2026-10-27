import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {origin,mockPrumo,account,category} from './fixtures/prumo.mjs';

test('import review survives reload and leaving the screen without creating transactions',async()=>{
  const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block'});
  try{
    const writes=await mockPrumo(context);const id='77777777-1111-4111-8111-111111111111';let revision=1,state={},created=false,completed=false,denyPut=false;
    const metadata=()=>({id,draft_id:id,file_name:'exemplo.ofx',revision,rows_count:1,updated_at:'2026-10-27T12:00:00Z',expires_at:'2026-11-26T12:00:00Z'});
    const preview=()=>({...metadata(),preview_token:`signed-${revision}`,reference_month:'2026-10',resolved_account_id:account,warnings:[],rows:[{index:0,date:'2026-10-27',amount:'50',original_description:'Loja',description:'Loja',type:'DESPESA',category_id:category,classification:'NECESSIDADE',blocked:false,duplicate:false}],review_state:state});
    await context.route('**/api/v1/imports/**',async route=>{
      const path=new URL(route.request().url()).pathname;const method=route.request().method();
      if(path.endsWith('/preview')){created=true;return route.fulfill({json:preview()});}
      if(path.endsWith('/drafts'))return route.fulfill({json:created&&!completed?[metadata()]:[]});
      if(path.endsWith('/drafts/'+id)){
        if(method==='PUT'){if(denyPut)return route.abort('failed');const body=route.request().postDataJSON();if(body.revision!==revision)return route.fulfill({status:409,json:{detail:'Outra aba alterou o rascunho'}});state=body;revision++;return route.fulfill({json:{...metadata(),preview_token:`signed-${revision}`}});}
        return route.fulfill({json:preview()});
      }
      if(path.endsWith('/confirm')){completed=true;return route.fulfill({json:{imported:1,skipped:0}});}
      return route.fallback();
    });
    const page=await context.newPage();await page.goto(origin+'/import');await page.locator('#import-file').setInputFiles({name:'exemplo.ofx',mimeType:'application/x-ofx',buffer:Buffer.from('<OFX>fixture</OFX>')});await page.getByRole('button',{name:/Gerar prévia/}).click();
    await page.getByRole('region',{name:'Rascunho da revisão'}).waitFor();
    await page.locator('#import-name-0').fill('Nome revisado');await page.locator('#import-classification-0').selectOption('DESEJO');
    await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByRole('status').filter({hasText:'Rascunho salvo na nuvem.'}).waitFor();
    assert.equal(state.entries[0].description,'Nome revisado');assert.equal(state.entries[0].classification,'DESEJO');
    await page.reload();await page.locator('#import-name-0').waitFor();assert.equal(await page.locator('#import-name-0').inputValue(),'Nome revisado');assert.equal(await page.locator('#import-classification-0').inputValue(),'DESEJO');
    assert.equal(await page.getByRole('checkbox',{name:/Conferi as datas/}).isChecked(),false);
    denyPut=true;await page.locator('#import-name-0').fill('Edição local imediata');await page.reload();await page.locator('#import-name-0').waitFor();assert.equal(await page.locator('#import-name-0').inputValue(),'Edição local imediata');denyPut=false;await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.getByRole('status').filter({hasText:'Rascunho salvo na nuvem.'}).waitFor();
    await page.locator('#import-name-0').fill('Outra edição');await page.getByRole('link',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:'Importar extrato',exact:true}).click();
    await page.getByRole('button',{name:'Retomar',exact:true}).click();await page.locator('#import-name-0').waitFor();assert.equal(await page.locator('#import-name-0').inputValue(),'Outra edição');
    assert.equal(writes.filter(w=>w.path.endsWith('/transactions')).length,0);
    await page.getByRole('button',{name:'Salvar rascunho e sair',exact:true}).click();await page.getByRole('button',{name:'Retomar',exact:true}).waitFor();
    assert.equal(completed,false);
  }finally{await context.close();await browser.close();}
});
