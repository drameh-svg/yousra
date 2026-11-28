import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';process.env.CATALOG_CACHE_MS='0';process.env.PRIORITY_SITES='';process.env.STARTER_POOL='false';process.env.APP_ORIGIN='http://localhost:3000';
for(const k of ['SERPER_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','VISION_PROVIDER','HUMAN_LABEL_MIN','EXPLORE_EVERY'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-labels-')),'test.sqlite');
const {defaultPreferences,modestyMatch,predictedLevel,presetRules}=await import('../src/preferences.mjs');
const {summarizeVotes,labelAgreement}=await import('../src/labels.mjs');
const {explore}=await import('../src/recommend.mjs');
const {analyze,visionKey}=await import('../src/discovery.mjs');
const {handle}=await import('../src/api.mjs');
const {store}=await import('../src/store.mjs');

const prefsFor=level=>{const p=defaultPreferences();for(const c of Object.keys(p.rules))p.rules[c]=presetRules(level,c);return p;};
const dress=(id,o={})=>({id,title:'Linen dress',description:'',category:'dress',styles:['clean_girl'],colors:['blue'],attributes:{sleeves:'short',neckline:'medium',length:'midi',fit:'regular',transparency:'opaque',slits:'none',cutouts:'none'},evidence:{},confidence:0.9,analysisSource:'vision+description',...o});
const votes=list=>summarizeVotes(Object.fromEntries(list.map((level,i)=>[`v${i}`,{level,issues:[]}])));

test('shopper labels confirm or exclude coverage once enough people agree',()=>{
 const conservative=prefsFor('conservative'),moderate=prefsFor('moderate');
 assert.equal(modestyMatch(dress('a'),moderate).pass,false,'model says short sleeves');
 const confirmed=dress('a',{humanModesty:votes(['moderate','moderate'])});
 assert.equal(modestyMatch(confirmed,moderate).pass,true);
 assert.match(modestyMatch(confirmed,moderate).reasons[0],/2 shoppers/);
 assert.equal(modestyMatch(confirmed,conservative).pass,false,'moderate is not enough for conservative');
 assert.equal(modestyMatch(dress('a',{humanModesty:votes(['moderate'])}),moderate).pass,false,'one vote is not enough to loosen');
 const flagged=dress('b',{attributes:{...dress('b').attributes,sleeves:'long',length:'maxi'},humanModesty:votes(['not_modest'])});
 assert.equal(modestyMatch(flagged,moderate).pass,false,'one "not modest" vote excludes');
 assert.equal(modestyMatch(flagged,defaultPreferences()).pass,true,'no coverage rules: unaffected');
});
test('predicted level and agreement report',()=>{
 assert.equal(predictedLevel(dress('a')),'relaxed');
 assert.equal(predictedLevel(dress('c',{attributes:{sleeves:'long',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'none',cutouts:'none'}})),'conservative');
 const labels=[{productId:'p1',userId:'u1',level:'relaxed',snapshot:{predictedLevel:'relaxed'}},{productId:'p2',userId:'u1',level:'moderate',snapshot:{predictedLevel:'relaxed'}}];
 const r=labelAgreement(labels);assert.equal(r.products,2);assert.equal(r.agreement,50);assert.equal(r.confusion.moderate.relaxed,1);
});
test('exploration adds an out-of-taste piece every Nth slot without duplicates',()=>{
 const items=Array.from({length:24},(_,i)=>({id:`i${i}`,match:{score:100-i,affinity:24-i,confidence:0.9,uncertain:false,reasons:[]}}));
 const out=explore(items,8);
 assert.equal(out.length,24);assert.equal(new Set(out.map(x=>x.id)).size,24);
 assert.ok(out[7].match.explore);assert.ok(out[15].match.explore);
 assert.equal(out.filter(x=>x.match.explore).length,2);
 assert.deepEqual(explore(items.slice(0,10),8).map(x=>x.id),items.slice(0,10).map(x=>x.id),'small lists unchanged');
});
test('vision results are cached permanently and reused without a model call',async()=>{
 process.env.GEMINI_API_KEY='test';process.env.VISION_PROVIDER='gemini';
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('no network in this test');};
 try{
  const p={...dress('cached'),attributes:{},evidence:{},image:'https://cdn.example/x.jpg',images:['https://cdn.example/x.jpg'],pageFetchedAt:new Date().toISOString(),title:'Abaya'};
  await store.put('cache',visionKey(p.image,p.title),{result:{itemIsClothing:true,category:'dress',colors:['black'],styles:['90s_minimalism'],attributes:{sleeves:'long',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'none',cutouts:'none'},evidence:{sleeves:{confidence:0.9,reason:'photo'}},confidence:0.9}});
  const out=await analyze(p);
  assert.equal(out.visionCached,true);assert.equal(out.attributes.sleeves,'long');assert.equal(out.analysisSource,'vision+description');
 }finally{globalThis.fetch=original;delete process.env.GEMINI_API_KEY;delete process.env.VISION_PROVIDER;}
});
test('labeling: 5 to 10 real listings, labels saved with a model snapshot, admin export',async()=>{
 const jar={};
 const call=async(path,method='GET',data)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(jar.c?{cookie:jar.c}:{})},body:data?JSON.stringify(data):undefined}));const setc=r.headers.get('set-cookie');if(setc)jar.c=setc.split(';')[0];const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return {status:r.status,data:j};};
 for(let i=0;i<12;i++)await store.put('product',`live-${i}`,{...dress(`live-${i}`),category:i%2?'dress':'top',url:`https://shop.example/products/${i}`,image:`https://cdn.example/${i}.jpg`,images:[`https://cdn.example/${i}.jpg`],productPage:true,store:'shop.example'});
 assert.equal((await call('/labeling/items')).status,401);
 await call('/auth/signup','POST',{email:'labeler@example.com',password:'test-password-9'});
 const first=await call('/labeling/items?count=8');
 assert.equal(first.status,200);assert.equal(first.data.items.length,8);assert.equal(first.data.live,8);
 assert.ok(new Set(first.data.items.map(x=>x.category)).size>1,'mixed categories');
 assert.ok(first.data.items[0].image.startsWith('/api/products/'),'images go through the proxy');
 assert.equal((await call('/labeling','POST',{labels:[{productId:'live-0',level:'nope'}]})).status,400);
 const sent=await call('/labeling','POST',{source:'feedback',labels:first.data.items.slice(0,5).map((x,i)=>({productId:x.id,level:i===0?'not_modest':'moderate',issues:i===0?['neckline','bogus']:[]}))});
 assert.equal(sent.status,201);assert.equal(sent.data.saved,5);
 const labelled=await store.get('product',first.data.items[0].id);
 assert.equal(labelled.humanModesty.level,'not_modest');assert.deepEqual(labelled.humanModesty.issues,{neckline:1});
 const again=await call('/labeling/items?count=10');
 assert.ok(again.data.items.every(x=>!first.data.items.slice(0,5).some(y=>y.id===x.id)),'never re-asks the same piece');
 assert.equal((await call('/admin/labels')).status,403);
 process.env.ADMIN_EMAILS='labeler@example.com';
 const summary=await call('/admin/labels');assert.equal(summary.data.summary.labels,5);
 const jsonl=await call('/admin/labels?format=jsonl');
 const rows=String(jsonl.data).trim().split('\n').map(x=>JSON.parse(x));
 assert.equal(rows.length,5);assert.ok(rows[0].image_url&&rows[0].human_level&&rows[0].model_level);
 delete process.env.ADMIN_EMAILS;
});
