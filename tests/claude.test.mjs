import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';
for(const k of ['SERPER_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','VISION_PROVIDER','REQUIRE_VERIFIED_STOCK','VERCEL'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-claude-')),'test.sqlite');
const {claudeDiscover,discoveryProvider,parseJson}=await import('../src/claude.mjs');
const {inferListing,mergeEvidence,visionProvider,discoveryCandidates}=await import('../src/discovery.mjs');
const {displayable}=await import('../src/stock.mjs');
const {clientIp,coverageHint}=await import('../src/api.mjs');
const {defaultPreferences}=await import('../src/preferences.mjs');

test('provider selection keeps Serper/Gemini by default; Claude is opt-in or the fallback',()=>{
 assert.equal(discoveryProvider(),null);assert.equal(visionProvider(),null);
 process.env.ANTHROPIC_API_KEY='a';
 assert.equal(discoveryProvider(),'claude');assert.equal(visionProvider(),'claude');
 process.env.SERPER_API_KEY='s';process.env.GEMINI_API_KEY='g';
 assert.equal(discoveryProvider(),'serper');assert.equal(visionProvider(),'gemini');
 process.env.DISCOVERY_PROVIDER='claude';process.env.VISION_PROVIDER='claude';
 assert.equal(discoveryProvider(),'claude');assert.equal(visionProvider(),'claude');
 process.env.DISCOVERY_PROVIDER='both';process.env.VISION_PROVIDER='gemini';
 assert.equal(discoveryProvider(),'both');assert.equal(visionProvider(),'gemini');
 for(const k of ['SERPER_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','VISION_PROVIDER'])delete process.env[k];
});

test('Claude discovery keeps only product URLs that web search actually returned',async()=>{
 const original=globalThis.fetch;let request;
 try{
  process.env.ANTHROPIC_API_KEY='test-only';
  globalThis.fetch=async(url,options)=>{
   assert.equal(String(url),'https://api.anthropic.com/v1/messages');
   request=JSON.parse(options.body);assert.equal(options.headers['anthropic-version'],'2023-06-01');
   return Response.json({stop_reason:'end_turn',content:[
    {type:'server_tool_use',id:'s1',name:'web_search',input:{query:'long sleeve maxi dress'}},
    {type:'web_search_tool_result',tool_use_id:'s1',content:[{type:'web_search_result',url:'https://shop.invalid/products/linen-maxi?utm_source=x',title:'Linen Maxi Dress'}]},
    {type:'text',text:'<products>[{"url":"https://shop.invalid/products/linen-maxi","title":"Linen Maxi Dress","store":"Shop","price":58,"currency":"USD","description":"Long sleeves, maxi length."},{"url":"https://made-up.invalid/products/fake","title":"Invented","price":10,"currency":"USD"}]</products>'}]});
  };
  const {curated}=await claudeDiscover('long sleeve maxi dress',1,'long sleeves');
  assert.equal(curated.length,1);assert.equal(curated[0].link,'https://shop.invalid/products/linen-maxi');
  assert.equal(request.tools[0].type,'web_search_20250305');assert.ok(request.messages[0].content.includes('long sleeves'));
  const [candidate]=discoveryCandidates([{curated}]);
  assert.equal(candidate.discoverySource,'claude');assert.equal(candidate.price,58);assert.equal(candidate.attributes.sleeves,'long');
 }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});

test('JSON parsing tolerates tags, fences and prose',()=>{
 assert.deepEqual(parseJson('<products>[{"a":1}]</products>'),[{a:1}]);
 assert.deepEqual(parseJson('Here:\n```json\n{"b":2}\n```'),{b:2});
 assert.equal(parseJson('nothing'),null);
});

test('title wording wins and styling advice never describes the sale garment',()=>{
 const r=inferListing('Sleeveless linen maxi dress','Pair with a long sleeve top. Crew neck. Fully lined.');
 assert.equal(r.attributes.sleeves,'sleeveless');assert.equal(r.attributes.neckline,'medium');assert.equal(r.attributes.transparency,'opaque');
 assert.equal(inferListing('Black abaya').category,'dress');assert.equal(inferListing('Black abaya').attributes.length,'maxi');
 assert.equal(inferListing('Spaghetti strap floral dress').attributes.sleeves,'sleeveless');
 assert.equal(inferListing('Floor-length chiffon skirt').attributes.length,'maxi');
});

test('photo/text conflicts keep the less covering value at low confidence; unknown photo never erases text',()=>{
 const text={value:'long',confidence:0.85,reason:'title'};
 assert.deepEqual(mergeEvidence('sleeves',text,{value:'unknown',confidence:0.3,reason:''}),text);
 const conflict=mergeEvidence('sleeves',{value:'sleeveless',confidence:0.85,reason:'title'},{value:'long',confidence:0.9,reason:'photo'});
 assert.equal(conflict.value,'sleeveless');assert.ok(conflict.confidence<0.65);
 assert.equal(mergeEvidence('transparency',{value:'opaque',confidence:0.75},{value:'sheer',confidence:0.8}).value,'sheer');
});

test('default stock mode hides only confirmed sold-out listings; strict mode needs fresh confirmation',()=>{
 assert.equal(displayable({availability:'unknown'}),true);assert.equal(displayable({availability:'out_of_stock'}),false);
 process.env.REQUIRE_VERIFIED_STOCK='true';
 assert.equal(displayable({availability:'unknown'}),false);
 assert.equal(displayable({availability:'in_stock',availabilityCheckedAt:new Date().toISOString()}),true);
 delete process.env.REQUIRE_VERIFIED_STOCK;
});

test('sign-in limits use the visitor IP on Vercel and never trust headers elsewhere',()=>{
 const request=new Request('https://x.invalid/',{headers:{'x-forwarded-for':'203.0.113.9, 10.0.0.1'}});
 assert.equal(clientIp(request),'deployment');
 process.env.VERCEL='1';assert.equal(clientIp(request),'203.0.113.9');delete process.env.VERCEL;
 assert.equal(clientIp(request,{clientIp:'198.51.100.2'}),'198.51.100.2');
});

test('coverage hint turns saved rules into plain search guidance',()=>{
 const p=defaultPreferences();p.rules.dress.sleeves='long';p.rules.dress.slits='none';p.budgetMax=80;
 assert.equal(coverageHint(p,'dress'),'long sleeves, no slits, under $80');
 assert.equal(coverageHint(defaultPreferences(),'top'),'');
});

test('validation survey: guests and members can submit; only admins can read; CSV is formula-safe',async()=>{
 const {handle}=await import('../src/api.mjs');
 process.env.APP_ORIGIN='http://localhost:3000';
 const jar={};
 const call=async(path,method='GET',data,cookie)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}));const setc=r.headers.get('set-cookie');if(setc)jar.c=setc.split(';')[0];const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return {status:r.status,data:j};};
 const form=await call('/reviews/form');assert.equal(form.data.version,2);assert.ok(form.data.working.length&&form.data.inProgress.length);
 assert.equal((await call('/reviews','POST',{overall:9,sentence:'Great'})).status,400);
 assert.equal((await call('/reviews','POST',{overall:4})).status,400,'needs the one-sentence answer');
 const guest=await call('/reviews','POST',{overall:5,sentence:'=HYPERLINK("x")',liked:['feed','Hacked'],wanted:['outfits','accuracy'],wantedOther:['  Abaya filter  '],priorities:['coverage','price','fit','style'],sites:['shein','modanisa','nope'],disappointed:'very'});
 assert.equal(guest.status,201);
 await call('/auth/signup','POST',{email:'reviewer@example.com',password:'test-password-9'});
 const cookie=jar.c;
 assert.equal((await call('/reviews','POST',{overall:3,sentence:'The swipes were fun.',priorities:['price'],disappointed:'not'},cookie)).status,201);
 assert.equal((await call('/admin/reviews','GET',undefined,cookie)).status,403);
 process.env.ADMIN_EMAILS='Reviewer@Example.com';
 const admin=await call('/admin/reviews','GET',undefined,cookie);
 assert.equal(admin.status,200);assert.equal(admin.data.summary.count,2);
 const g=admin.data.reviews.find(r=>!r.userId);assert.deepEqual(g.liked,['feed']);assert.deepEqual(g.priorities,['coverage','price','fit']);assert.deepEqual(g.sites,['shein','modanisa']);assert.deepEqual(g.wantedOther,['Abaya filter']);
 assert.ok(admin.data.reviews.some(r=>r.email==='reviewer@example.com'));
 assert.equal(admin.data.summary.veryDisappointed,50);
 assert.equal(admin.data.summary.priorities[0].id,'price');assert.equal(admin.data.summary.priorities[0].points,5);
 assert.ok(admin.data.summary.wanted.find(x=>x.id==='accuracy').inProgress);
 const csv=await call('/admin/reviews?format=csv','GET',undefined,cookie);
 assert.ok(csv.data.includes(`"'=HYPERLINK(""x"")"`));
 delete process.env.ADMIN_EMAILS;
});
