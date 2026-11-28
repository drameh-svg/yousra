import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';process.env.APP_ORIGIN='http://localhost:3000';
process.env.CATALOG_CACHE_MS='0';process.env.PRIORITY_SITES='';process.env.FEED_PREWARM='false';process.env.ENRICH_WAIT_MS='50';process.env.NEXT_BATCH_MIN_MS='0';
for(const k of ['GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','FEED_BRANDS','STARTER_POOL','EXPLORE_EVERY'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-batches-')),'test.sqlite');
const {filtersFrom,defaultPreferences}=await import('../src/preferences.mjs');
const {rankProducts}=await import('../src/rank.mjs');
const {feedQuery,buildStarterPool}=await import('../src/feed.mjs');
const {keepPrioritySites}=await import('../src/discovery.mjs');
const {handle}=await import('../src/api.mjs');
const {store}=await import('../src/store.mjs');
const {settleBackground}=await import('../src/background.mjs');

const item=(id,o={})=>({id,title:'Maxi dress',description:'',category:'dress',styles:[],colors:[],attributes:{sleeves:'long',length:'maxi'},confidence:0.9,analysisSource:'vision+description',image:`https://cdn.example/${id}.jpg`,url:`https://shop.example/products/${id}`,productPage:true,store:'shop.example',price:40,currency:'USD',...o});
const profile=(o={})=>({id:'p',preferences:{...defaultPreferences(),...o},swipes:[]});
const ids=list=>list.map(x=>x.id);

test('For You filter labels are understood: plurals, abayas, aesthetics, colour shades',()=>{
 assert.deepEqual(filtersFrom({category:'Dresses',style:'90s Minimalism',color:'Olive',size:'M'}),{category:'dress',style:'90s_minimalism',color:'green',size:'m'});
 assert.equal(filtersFrom({category:'Abayas'}).category,'abaya');
 assert.throws(()=>filtersFrom({category:'Shoes'}));
 assert.throws(()=>filtersFrom({style:'whimsy'}),'legacy aesthetics rejected');
});
const classified=(id,style,extra={})=>item(id,{
 ...extra,
 styleClassification:{status:'ok',ranked:[{style,score:0.5,rank:1},{style:'y2k',score:0.2,rank:2},{style:'earthy',score:0.1,rank:3}]},
});
test('filters match: abaya type, SigLIP aesthetics (not Gemini tags), shades, unconfirmed sizes',()=>{
 const catalog=[
  item('abaya',{title:'Black open front abaya',category:'outerwear',colors:['black']}),
  classified('coquette1','coquette',{colors:['olive green']}),
  classified('clean1','clean_girl',{title:'Navy maxi dress',colors:['navy'],sizes:['XS','S']}),
  item('sized',{title:'Black maxi dress',colors:['black'],sizes:['M','L']}),
  item('cue',{title:'Tiered ruffle maxi dress',colors:['sage']}),
 ];
 const rank=f=>ids(rankProducts(catalog,profile(),[],[],f));
 assert.deepEqual(rank({category:'abaya'}),['abaya']);
 assert.deepEqual(rank({style:'coquette'}),['coquette1'],'style gate uses SigLIP ranks only');
 assert.deepEqual(rank({style:'clean_girl'}),['clean1']);
 assert.equal(rank({style:'coquette'}).includes('cue'),false,'Gemini/text cues alone never pass a style filter');
 assert.deepEqual(rank({color:'green'}).sort(),['coquette1','cue']);
 assert.deepEqual(rank({color:'blue'}),['clean1'],'navy is a blue');
 const m=rankProducts(catalog,profile(),[],[],{size:'m'});
 assert.equal(m[0].id,'sized','confirmed size first');assert.ok(!ids(m).includes('clean1'),'known sizes without M are excluded');
 assert.ok(m.find(x=>x.id==='abaya').match.reasons.includes('Size not confirmed'));
});
test('feed searches rotate through FEED_BRANDS and use aesthetic wording',()=>{
 process.env.FEED_BRANDS='Aab, Haute Hijab ,Modanisa,Lulus';
 const p=profile({styles:['coquette']});
 const queries=Array.from({length:8},(_,r)=>feedQuery(p,[],[],r));
 assert.deepEqual(queries.slice(0,4).map(q=>q.brand),['Aab','Haute Hijab','Modanisa','Lulus']);
 assert.ok(queries.every(q=>q.query.includes('bow lace ruffle')));
 assert.ok(queries.every(q=>!/\bmodest\b/.test(q.query)),'no "modest" in brand searches');
 assert.ok(queries.every(q=>q.query.split(' ').length<=9),'short queries');
 assert.equal(new Set(queries.map(q=>`${q.query}|${q.page}`)).size,8,'no repeated search');
 assert.equal(feedQuery(profile({preferredBrands:['Inayah']}),[],[],0).brand,'Inayah','her own favourites come first');
 assert.match(feedQuery(p,[],[],0,{category:'abaya'}).query,/abaya/);
 delete process.env.FEED_BRANDS;
});
test('no single store takes more than 4 slots of a batch when others are available',()=>{
 const big=Array.from({length:12},(_,i)=>({id:`b${i}`,url:`https://big.example/products/${i}`}));
 const small=Array.from({length:6},(_,i)=>({id:`s${i}`,url:`https://store${i}.example/products/${i}`}));
 const out=keepPrioritySites([...big,...small],10,[]);
 assert.equal(out.length,10);assert.equal(out.filter(x=>x.url.includes('big.example')).length,4);
});
async function client(){let jar='';return async(path,method='GET',data)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{cookie:jar,...(method!=='GET'?{'content-type':'application/json',origin:'http://localhost:3000'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})}));const set=r.headers.getSetCookie();if(set.length)jar=set.map(x=>x.split(';')[0]).join('; ');return {status:r.status,data:await r.json()};};}
const swipes=Array.from({length:15},(_,i)=>({id:`onboard-${i+1}`,like:i%2===0}));
test('new shoppers open on the saved starter pool; returning shoppers open on their unseen next batch',async()=>{
 process.env.SERPER_API_KEY='test-only-key';process.env.FEED_BRANDS='Aab,Modanisa';process.env.STARTER_SEARCHES='4';
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,init)=>{
  const {q}=JSON.parse(init.body);calls++;
  if(String(url).endsWith('/images'))return Response.json({images:Array.from({length:8},(_,i)=>({title:`Long sleeve maxi dress ${q} ${i}`,link:`https://store${i%5}.example/products/${encodeURIComponent(q)}-${i}`,imageUrl:`https://cdn.example/${encodeURIComponent(q)}-${i}.jpg`}))});
  return Response.json({});
 };
 try{
  const pool=await buildStarterPool({force:true});
  assert.equal(pool.queries.length,4);assert.ok(pool.queries.every(q=>/^(Aab|Modanisa) /.test(q)&&!/modest/.test(q)));
  assert.ok(pool.products.length>=20);assert.ok(new Set(pool.products.map(p=>p.store)).size>=5,'spread across stores');
  const callsAfterBuild=calls;
  const a=await client();
  await a('/auth/signup','POST',{email:'starter@example.com',password:'test-password-7'});
  await a('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
  const first=(await a('/feed?limit=12')).data;
  assert.equal(first.items.length,12);assert.equal(calls,callsAfterBuild,'no search needed to open the feed');
  const session=await store.get('feed',first.feedId);assert.equal(session.source,'starter');
  await settleBackground();
  const next=(await store.list('feed_next',undefined,10))[0];
  assert.ok(next.products.length>=12);assert.ok(next.seenIds.length>=12);
  const second=(await a('/feed?limit=12')).data;
  assert.equal((await store.get('feed',second.feedId)).source,'saved');
  const seenFirst=new Set(first.items.map(x=>x.id));
  assert.ok(second.items.slice(0,6).every(x=>!seenFirst.has(x.id)),'opens on pieces she has not seen yet');
  const filtered=(await a('/feed?category=Abayas')).data;
  assert.equal((await store.get('feed',filtered.feedId)).source,'catalog','filtered feeds rank the whole catalogue');
  await settleBackground();
 }finally{globalThis.fetch=original;delete process.env.SERPER_API_KEY;delete process.env.FEED_BRANDS;delete process.env.STARTER_SEARCHES;}
});
test('cron endpoint needs CRON_SECRET',async()=>{
 const call=headers=>handle(new Request('http://localhost:3000/api/cron/starter',{headers}));
 assert.equal((await call({})).status,503);
 process.env.CRON_SECRET='s3cret';
 assert.equal((await call({authorization:'Bearer nope'})).status,401);
 delete process.env.CRON_SECRET;
});
