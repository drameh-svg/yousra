import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';process.env.APP_ORIGIN='http://localhost:3000';
process.env.CATALOG_CACHE_MS='0';process.env.PRIORITY_SITES='';process.env.FEED_PREWARM='false';process.env.STARTER_POOL='false';process.env.ENRICH_WAIT_MS='50';
for(const k of ['GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','FEED_BRANDS','SERPER_API_KEY','HUMAN_LABEL_MIN'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-explore-')),'test.sqlite');
const {filtersFrom,defaultPreferences}=await import('../src/preferences.mjs');
const {rankProducts}=await import('../src/rank.mjs');
const {feedQuery}=await import('../src/feed.mjs');
const {discover}=await import('../src/discovery.mjs');
const {knownLevel,quizItems,scoreQuiz}=await import('../src/modesty-quiz.mjs');
const {handle}=await import('../src/api.mjs');
const {store}=await import('../src/store.mjs');
const {settleBackground}=await import('../src/background.mjs');

const sure=v=>({confidence:0.9,reason:'photo'});
const ev=a=>Object.fromEntries(Object.keys(a).map(k=>[k,sure()]));
const cons={sleeves:'long',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'none',cutouts:'none'};
const mod={sleeves:'elbow',neckline:'medium',length:'midi',fit:'regular',transparency:'opaque',slits:'present',cutouts:'none'};
const rel={sleeves:'short',neckline:'open',length:'knee',fit:'fitted',transparency:'opaque',slits:'present',cutouts:'none'};
const item=(id,host,o={})=>({id,title:'Maxi dress',description:'',category:'dress',styles:[],colors:[],attributes:cons,evidence:ev(cons),confidence:0.9,analysisSource:'vision+description',image:`https://cdn.example/${id}.jpg`,url:`https://${host}/products/${id}`,productPage:true,store:host,price:40,currency:'USD',...o});
const profile=()=>({id:'p',preferences:defaultPreferences(),swipes:[]});

test('brand pages: only the brand\'s own site, or pieces listed under its name',()=>{
 assert.deepEqual(filtersFrom({brand:'https://www.FreePeople.com/shop',brandName:'Free People'}),{brand:'freepeople.com',brandName:'Free People'});
 assert.throws(()=>filtersFrom({brand:'not a domain'}));
 const catalog=[item('own','freepeople.com'),item('sub','us.freepeople.com'),item('listed','nordstrom.com',{brand:'Free People'}),item('other','zara.com'),item('fake','freepeople.com.evil.example')];
 assert.deepEqual(rankProducts(catalog,profile(),[],[],{brand:'freepeople.com',brandName:'Free People'}).map(x=>x.id).sort(),['listed','own','sub']);
 const q=feedQuery(profile(),[],[],0,{brand:'freepeople.com',brandName:'Free People'});
 assert.equal(q.site,'freepeople.com');assert.match(q.query,/^Free People /);
});
test('a brand search only keeps results from that site',async()=>{
 process.env.SERPER_API_KEY='k';const original=globalThis.fetch,qs=[];
 globalThis.fetch=async(url,init)=>{const {q}=JSON.parse(init.body);qs.push(q);if(String(url).endsWith('/images'))return Response.json({images:[{title:'Maxi dress',link:'https://www.freepeople.com/shop/maxi-dress-1/products/1',imageUrl:'https://cdn.example/a.jpg'},{title:'Maxi dress',link:'https://reseller.example/products/2',imageUrl:'https://cdn.example/b.jpg'}]});return Response.json({});};
 try{const found=await discover('Free People maxi dress',1,{site:'freepeople.com'});
  assert.ok(qs.includes('Free People maxi dress site:freepeople.com'));assert.deepEqual(found.map(p=>new URL(p.url).hostname),['www.freepeople.com']);}
 finally{globalThis.fetch=original;delete process.env.SERPER_API_KEY;}
});
test('style and category pages: only that aesthetic / clothing type',()=>{
 assert.equal(filtersFrom({style:'90s-minimalism'}).style,'90s_minimalism');assert.equal(filtersFrom({style:'clean-girl'}).style,'clean_girl');
 assert.throws(()=>filtersFrom({style:'90s-chic'}));
 const ranks=(style)=>({status:'ok',ranked:[{style,score:0.55,rank:1},{style:'earthy',score:0.2,rank:2},{style:'y2k',score:0.1,rank:3}]});
 const catalog=[
  item('slip','a.example',{title:'Satin slip maxi dress',styleClassification:ranks('90s_minimalism')}),
  item('linen','b.example',{title:'Linen maxi dress',styleClassification:ranks('earthy')}),
  item('abaya','c.example',{title:'Black abaya',category:'outerwear'}),
  item('top','d.example',{title:'Blazer',category:'top',styleClassification:ranks('90s_minimalism')}),
  item('gemini-only','e.example',{title:'Satin slip maxi dress',styles:['90s_minimalism']}),
 ];
 assert.deepEqual(rankProducts(catalog,profile(),[],[],filtersFrom({style:'90s_minimalism'})).map(x=>x.id).sort(),['slip','top']);
 assert.ok(!rankProducts(catalog,profile(),[],[],filtersFrom({style:'90s_minimalism'})).some(x=>x.id==='gemini-only'),'Gemini style tags alone never pass');
 assert.deepEqual(rankProducts(catalog,profile(),[],[],filtersFrom({category:'abayas'})).map(x=>x.id),['abaya']);
 assert.deepEqual(rankProducts(catalog,profile(),[],[],filtersFrom({category:'tops'})).map(x=>x.id),['top']);
});
test('Find my modesty: known levels, a spread of 5 pieces, and scoring',()=>{
 assert.equal(knownLevel(item('c','a.example')),'conservative');
 assert.equal(knownLevel(item('m','a.example',{attributes:mod,evidence:ev(mod)})),'moderate');
 assert.equal(knownLevel(item('r','a.example',{attributes:rel,evidence:ev(rel)})),'relaxed');
 assert.equal(knownLevel(item('u','a.example',{attributes:{sleeves:'long'},evidence:{}, confidence:0.3})),null,'unverified pieces are not used');
 const catalog=[...[1,2,3].map(i=>item(`c${i}`,`c${i}.example`)),...[1,2,3].map(i=>item(`m${i}`,`m${i}.example`,{attributes:mod,evidence:ev(mod)})),...[1,2].map(i=>item(`r${i}`,`r${i}.example`,{attributes:rel,evidence:ev(rel)}))];
 const picked=quizItems(catalog,'seed');assert.equal(picked.length,5);
 assert.deepEqual(picked.map(x=>x.level).sort(),['conservative','conservative','moderate','moderate','relaxed']);
 const levels=new Map(catalog.map(p=>[p.id,knownLevel(p)]));
 const a=(productId,wear,reasons=[])=>({productId,wear,reasons});
 // Refuses moderate pieces because of the sleeves: conservative.
 assert.equal(scoreQuiz([a('c1',true),a('c2',true),a('m1',false,['sleeves']),a('m2',false,['sleeves']),a('r1',false,['neckline'])],levels).preset,'conservative');
 // Wears moderate, refuses relaxed: moderate; "with a layer" turns layering on.
 const m=scoreQuiz([a('c1',true),a('m1',true,['layer']),a('m2',true),a('r1',false,['length'])],levels);assert.equal(m.preset,'moderate');assert.equal(m.allowLayering,true);
 // Wears everything: relaxed. "Not my style" answers are ignored.
 assert.equal(scoreQuiz([a('c1',true),a('m1',true),a('r1',true),a('r2',false,['style'])],levels).preset,'relaxed');
 // A moderate shopper who still flags a neckline on a moderate piece gets that one rule tightened.
 const t=scoreQuiz([a('c1',true),a('m1',true),a('m2',false,['neckline']),a('r1',false,['sleeves']),a('r2',false,['length'])],levels);
 assert.equal(t.preset,'moderate');assert.deepEqual(t.tweaks,{neckline:'high'});
 assert.throws(()=>scoreQuiz([a('c1',false,['style']),a('m1',false,['style']),a('r1',false,['style'])],levels));
});
async function client(){let jar='';return async(path,method='GET',data)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{cookie:jar,...(method!=='GET'?{'content-type':'application/json',origin:'http://localhost:3000'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})}));const set=r.headers.getSetCookie();if(set.length)jar=set.map(x=>x.split(';')[0]).join('; ');return {status:r.status,data:await r.json().catch(()=>null)};};}
const swipes=Array.from({length:15},(_,i)=>({id:`onboard-${i+1}`,like:i%2===0}));
test('brand previews, public collections and account deletion through the API',async()=>{
 for(let i=0;i<5;i++)await store.put('product',`fp${i}`,item(`fp${i}`,'freepeople.com'));
 await store.put('product','z1',item('z1','zara.com'));
 const alice=await client(),bob=await client();
 await alice('/auth/signup','POST',{email:'alice@example.com',password:'test-password-1'});await alice('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
 await bob('/auth/signup','POST',{email:'bob@example.com',password:'test-password-2'});
 const prev=(await alice(`/brand-previews?n=3&brands=${encodeURIComponent('freepeople.com|Free People,zara.com|Zara')}`)).data.brands;
 assert.equal(prev['freepeople.com'].items.length,3);assert.equal(prev['freepeople.com'].total,5);assert.ok(prev['freepeople.com'].items.every(p=>p.sourceUrl.includes('freepeople.com')));
 assert.deepEqual(prev['zara.com'].items.map(p=>p.id),['z1']);
 await settleBackground();
 const {collection}=(await alice('/collections','POST',{name:'Eid looks'})).data;
 await alice(`/collections/${collection.id}`,'PATCH',{productId:'fp1'});
 assert.equal((await bob(`/public-collections/${collection.id}`)).status,404,'private by default');
 assert.equal((await alice(`/collections/${collection.id}`,'PATCH',{public:'yes'})).status,400);
 await alice(`/collections/${collection.id}`,'PATCH',{public:true,ownerName:'Alice'});
 const list=(await bob('/public-collections')).data.collections;assert.equal(list.length,1);assert.equal(list[0].ownerName,'Alice');assert.equal(list[0].count,1);
 await alice(`/collections/${collection.id}`,'PATCH',{productId:'fp2'});
 assert.equal((await bob(`/public-collections/${collection.id}`)).data.items.length,2,'stays in sync');
 await alice(`/collections/${collection.id}`,'PATCH',{public:false});
 assert.equal((await bob(`/public-collections/${collection.id}`)).status,404,'private again');
 await alice(`/collections/${collection.id}`,'PATCH',{public:true});
 assert.equal((await alice('/account','DELETE',{confirm:'nope'})).status,400);
 assert.equal((await alice('/account','DELETE',{confirm:'DELETE'})).status,200);
 assert.equal((await bob('/public-collections')).data.collections.length,0,'shared collections go with the account');
 assert.equal((await alice('/collections')).status,401,'signed out');
 assert.equal((await alice('/auth/signin','POST',{email:'alice@example.com',password:'test-password-1'})).status,401,'login removed');
});
