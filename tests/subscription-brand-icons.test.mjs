import {test} from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {origin,mockPrumo,account,card,category} from './fixtures/prumo.mjs';
test('subscription brands use local logos with consistent responsive sizing',async()=>{
 const browser=await chromium.launch();const context=await browser.newContext({serviceWorkers:'block'});
 try{await mockPrumo(context);await context.route('**/api/v1/subscriptions',route=>route.fulfill({json:['Brisa Internet','Plano TIM Sofia','Spotify'].map((name,i)=>({id:String(i),description:name,amount:30,account_id:account,card_id:card,category_id:category,frequency:'MONTHLY',next_due_date:'2026-11-01',is_active:true,card_name:'Cartão da casa',account_name:'Conta da casa'}))}));
 const page=await context.newPage();await page.goto(origin+'/subscriptions');
 for(const width of [1366,390]){await page.setViewportSize({width,height:950});for(const name of ['Brisanet','TIM','Spotify']){const img=page.getByRole('img',{name,exact:true});await img.waitFor();assert.equal(new URL(await img.getAttribute('src'),origin).origin,new URL(origin).origin);}
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.brand-mark img')).every(img=>img.complete&&img.naturalWidth>0));
 const sizes=await page.locator('.brand-mark').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));assert.ok(sizes.every(n=>Math.abs(n.w-n.h)<1));}
 await page.screenshot({path:'/tmp/prumo-subscription-brands.png'});
 }finally{await context.close();await browser.close();}
});
