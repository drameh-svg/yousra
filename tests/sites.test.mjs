import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';
for(const k of ['GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','PRIORITY_SITES','PRIORITY_SITE_MIN'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-sites-')),'test.sqlite');
process.env.SERPER_API_KEY='test-only-key';process.env.ENRICH_WAIT_MS='50';
const {discover,prioritySites}=await import('../src/discovery.mjs');

test('SHEIN is searched directly and keeps slots even when general results fill the batch',async()=>{
 assert.deepEqual(prioritySites(),['shein.com']);
 const queries=[],original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  const {q}=JSON.parse(init.body),endpoint=String(url).split('/').pop();queries.push(`${endpoint}:${q}`);
  if(endpoint==='images'&&q.includes('site:shein.com'))return Response.json({images:[1,2,3,4].map(i=>({title:`Long sleeve maxi dress ${i}`,link:`https://us.shein.com/Long-Sleeve-Maxi-Dress-${i}-p-${1000+i}.html`,imageUrl:`https://img.ltwebstatic.com/${i}.jpg`}))});
  if(endpoint==='images')return Response.json({images:Array.from({length:20},(_,i)=>({title:`Abaya ${i}`,link:`https://other${i}.example/products/abaya-${i}`,imageUrl:`https://cdn.example/${i}.jpg`}))});
  return Response.json({});
 };
 try{
  const found=await discover('long sleeve maxi dress');
  assert.ok(queries.includes('images:long sleeve maxi dress site:shein.com'));
  assert.ok(queries.includes('shopping:shein long sleeve maxi dress'));
  assert.equal(queries.length,5);
  assert.equal(found.length,12,'batch size unchanged');
  assert.equal(found.filter(p=>p.url.includes('shein.com')).length,3,'three SHEIN pieces reserved');
 }finally{globalThis.fetch=original;}
});
test('priority sites are configurable and can be turned off',()=>{
 process.env.PRIORITY_SITES=' https://www.Shein.com/ , modanisa.com, not a domain ';
 assert.deepEqual(prioritySites(),['shein.com','modanisa.com']);
 process.env.PRIORITY_SITES='';assert.deepEqual(prioritySites(),[]);
 delete process.env.PRIORITY_SITES;
});
