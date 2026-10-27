import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { origin, mockPrumo } from './fixtures/prumo.mjs';

for (const scenario of ['slow', 'offline', 'expired']) {
  test(`startup remains visible with ${scenario} authentication`, async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers:'block' });
    try {
      await mockPrumo(context);
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('**/api/v1/auth/me', async route => {
        if (scenario === 'slow') { await gate; return route.fallback(); }
        if (scenario === 'offline') return route.abort('failed');
        return route.fulfill({ status:401, json:{detail:'Expired'} });
      });
      const page = await context.newPage();
      await page.goto(origin+'/dashboard');
      if (scenario === 'slow') {
        await page.getByRole('heading',{name:'Abrindo seu Prumo'}).waitFor();
        release();
        await page.getByRole('link',{name:'Dashboard',exact:true}).waitFor();
      } else if (scenario === 'offline') {
        await page.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();
        assert.equal(await page.evaluate(()=>localStorage.getItem('msfinancas_token')),'test-token');
      } else {
        await page.waitForURL('**/login?**');
        await page.getByRole('button',{name:/Entrar/}).waitFor();
        assert.equal(await page.evaluate(()=>localStorage.getItem('msfinancas_token')),null);
      }
      assert.ok((await page.locator('body').innerText()).trim().length > 20);
    } finally { await context.close(); await browser.close(); }
  });
}
