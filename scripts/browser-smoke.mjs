// Run against the standalone LOCAL TEST server only. Requires `playwright` + Chromium.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.TEST_ORIGIN||'http://localhost:3000';
const status=await fetch(`${base}/api/health`).then(r=>r.json());
assert.equal(status.authMode,'local','Only run the smoke test against local test auth');
assert.equal(status.discovery,'sample','Only run the smoke test against sample data');
const browser=await chromium.launch({headless:true});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByRole('heading',{name:'Make yourself at home.'}).waitFor();
  await page.getByLabel('Email',{exact:true}).fill(`smoke-${Date.now()}@example.com`);
  await page.getByLabel('Password',{exact:true}).fill('smoke-test-password');
  await page.getByRole('button',{name:'Create account',exact:false}).click();
  for(let i=0;i<15;i++) {
    await page.getByText(`${i+1} of 15`,{exact:false}).waitFor();
    await page.getByRole('button',{name:i%2===0?"I'd wear this":"I wouldn't wear this",exact:true}).click();
  }
  await page.getByRole('heading',{name:'Let’s set your standards.'}).waitFor();
  await page.getByRole('button',{name:'Find my style'}).click();
  await page.getByRole('heading',{name:'Your kind of modest.'}).waitFor();
  assert.equal(await page.locator('.card').count(),15);
  await page.locator('.card').first().getByRole('button',{name:/^Like /}).click();
  await page.getByRole('button',{name:'Collections',exact:false}).first().click();
  await page.getByRole('button',{name:'Likes',exact:false}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.card').length===1);
  assert.equal(await page.locator('.card').count(),1);
  await page.getByRole('button',{name:'For you',exact:false}).first().click();
  await page.getByRole('heading',{name:'Your kind of modest.'}).waitFor();
  await page.getByRole('searchbox').count().then(async n=>{if(n)await page.getByRole('searchbox').fill('dress');else await page.getByLabel('Search clothing').fill('dress');});
  await page.getByRole('button',{name:'Search ↗',exact:true}).click();
  await page.getByRole('heading',{name:'Found for you.'}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.card').length>0);
  await page.getByRole('button',{name:'↻ Refresh',exact:true}).waitFor();
  await page.locator('.card a[aria-label^="View "]').first().click();
  await page.waitForURL('**/products/*');
  await page.getByRole('button',{name:'← Back to browsing',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'← Back to browsing',exact:true}).waitFor();
  await page.goBack();
  await page.getByRole('heading',{name:'Found for you.'}).waitFor();
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow on mobile');
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Browser journey passed: signup → 15 swipes → questionnaire → feed → like → private collection → search → dedicated product page → direct reload → back → mobile.');
}finally{await browser.close();}
