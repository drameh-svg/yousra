import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultPreferences,modestyMatch,validatePreferences } from '../src/preferences.mjs';
import {isProductUrl} from '../src/product-url.mjs';
import { rankProducts,similarProducts } from '../src/rank.mjs';
import { publicAddress,robotsAllowed } from '../src/network.mjs';
import { extractProduct,queryFilters,discoveryCandidates,inferAttributes } from '../src/discovery.mjs';
import { handle } from '../src/api.mjs';
import { store } from '../src/store.mjs';

process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';
delete process.env.SERPER_API_KEY;delete process.env.GEMINI_API_KEY;
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-test-')),'test.sqlite');
process.env.APP_ORIGIN='http://localhost:3000';
const prefs=()=>{const p=defaultPreferences();p.rules.dress.sleeves='long';p.rules.dress.length='maxi';return p;};
const garment=(id,overrides={})=>({id,title:'Blue maxi dress',description:'',category:'dress',styles:['minimal'],colors:['blue'],attributes:{sleeves:'long',length:'maxi'},confidence:0.9,analysisSource:'vision+description',shippingUS:'unknown',price:40,currency:'USD',sizes:['m'],...overrides});

test('clear modesty violations excluded; unknown evidence retained and demoted',()=>{
 const profile={preferences:prefs(),swipes:[]};
 const products=[garment('uncertain',{attributes:{sleeves:'unknown',length:'maxi'},styles:['minimal']}),garment('bad',{attributes:{sleeves:'short',length:'maxi'}}),garment('good')];
 const ranked=rankProducts(products,profile,[],[]);
 assert.deepEqual(ranked.map(x=>x.id),['good','uncertain']);assert.equal(ranked[1].match.uncertain,true);
});
test('layering only relaxes layerable attributes and pants rules are per category',()=>{
 const p=prefs();p.allowLayering=true;assert.equal(modestyMatch(garment('x',{attributes:{sleeves:'short',length:'maxi'}}),p).pass,true);
 assert.equal(modestyMatch(garment('x',{attributes:{sleeves:'long',length:'mini'}}),p).pass,false);
 p.pantsAllowed=false;assert.equal(modestyMatch(garment('x',{category:'pants'}),p).pass,false);
});
test('dislikes hide only feed, price and size filters exclude unverified values',()=>{
 const products=[garment('x'),garment('unknown',{price:null,sizes:[]})],profile={preferences:defaultPreferences(),swipes:[]},events=[{productId:'x',disliked:true}];
 assert.equal(rankProducts(products,profile,events,[],{},'',true).length,1);
 assert.equal(rankProducts(products,profile,events,[],{},'',false).length,2);
 assert.deepEqual(rankProducts(products,profile,[],[],{maxPrice:50,size:'m'}).map(x=>x.id),['x']);
});
test('learning changes order, confidence remains dominant',()=>{
 const profile={preferences:defaultPreferences(),swipes:[]};profile.preferences.styles=['classic'];
 const products=[garment('a',{styles:['classic']}),garment('b',{styles:['boho']})];
 assert.equal(rankProducts(products,profile,[],[])[0].id,'a');
 assert.equal(rankProducts(products,profile,[{productId:'b',liked:true,saved:true}],[])[0].id,'b');
});
test('natural language budget/category and structured retailer metadata',()=>{
 assert.deepEqual(queryFilters('a blue maxi dress under $50',{}),{maxPrice:50,category:'dress',color:'blue'});
 const p=extractProduct(`<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Test dress","image":["/photo.jpg"],"offers":{"price":"42.50","priceCurrency":"USD","shippingDetails":{"shippingDestination":{"addressCountry":"US"}},"availability":"https://schema.org/InStock"}}</script>`,'https://shop.example/dress');
 assert.equal(p.price,42.5);assert.equal(p.shippingUS,'yes');assert.equal(p.images[0],'https://shop.example/photo.jpg');
 assert.equal(extractProduct('<html></html>','https://shop.example').price,null);
});
test('SSRF address validation and robots matching',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','2001:db8::1','224.0.0.1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/test'),false);
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/public/item'),true);
});
test('reject invalid preferences',()=>{assert.throws(()=>validatePreferences({rules:{dress:{fit:'made-up'}}}));assert.throws(()=>validatePreferences({sizes:'m'}));});

async function client(){let jar='';return async(path,method='GET',data,extra={})=>{const response=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{cookie:jar,...(method!=='GET'?{'content-type':'application/json',origin:'http://localhost:3000'}:{}),...extra},...(data!==undefined?{body:JSON.stringify(data)}:{})}));const set=response.headers.getSetCookie();if(set.length)jar=set.map(x=>x.split(';')[0]).join('; ');return {status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():null,headers:response.headers};};}
const swipes=Array.from({length:15},(_,i)=>({id:`onboard-${i+1}`,like:i%2===0}));
test('end-to-end: account gating, onboarding, collections, search, click tracking, private ownership',async()=>{
 const a=await client(),b=await client();
 assert.equal((await a('/feed')).status,401);
 assert.equal((await a('/auth/signup','POST',{email:'alice@example.com',password:'test-password-1'})).status,200);
 assert.equal((await a('/feed')).status,409);
 assert.equal((await a('/profile','PUT',{swipes:swipes.slice(1),completeOnboarding:true,preferences:defaultPreferences()})).status,400);
 assert.equal((await a('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()})).status,200);
 const feed=await a('/feed');assert.equal(feed.status,200);assert.equal(feed.data.items.length,15);
 const productId=feed.data.items[0].id;
 const liked=await a(`/products/${productId}/reaction`,'POST',{action:'like'});assert.equal(liked.data.collections.find(x=>x.id==='likes').productIds.includes(productId),true);
 await a(`/products/${productId}/reaction`,'POST',{action:'dislike'});
 assert.equal((await a('/feed')).data.items.some(x=>x.id===productId),false);
 const collection=(await a('/collections','POST',{name:'Vacation'})).data.collection;
 await a('/collections/'+collection.id,'PATCH',{productId});
 assert.equal((await a('/collections/'+collection.id)).data.items.length,1);
 assert.equal((await a('/collections/likes','DELETE',{})).status,400);
 const search=await a('/search','POST',{query:'dress',filters:{}});assert.equal(search.status,201);assert.equal(search.data.demo,true);
 assert.ok((await a('/search/suggestions')).data.recent.includes('dress'));
 await store.put('product',productId,{...feed.data.items[0],url:'https://retailer.example/products/sample-reference'});
 const out=await a(`/products/${productId}/outbound?surface=card`);assert.equal(out.status,302);assert.ok(out.headers.get('location').startsWith('https://'));
 const metrics=await a('/metrics');assert.equal(metrics.data.clicks,0);assert.equal(metrics.data.sampleClicks,1);
 assert.equal((await a('/admin/metrics')).status,403);
 await b('/auth/signup','POST',{email:'bob@example.com',password:'test-password-2'});
 await b('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
 assert.equal((await b('/collections/'+collection.id)).status,404);
 assert.equal((await b('/search/'+search.data.jobId)).status,404);
 assert.equal((await b('/metrics')).data.sampleClicks,0);
 assert.equal((await a('/collections','POST',{name:'x'},{origin:'https://evil.example'})).status,403);
 await a('/auth/signout','POST',{});assert.equal((await a('/me')).status,401);
 assert.equal((await a('/auth/signin','POST',{email:'alice@example.com',password:'incorrect'})).status,401);
 assert.equal((await a('/auth/signin','POST',{email:'alice@example.com',password:'test-password-1'})).status,200);
});
test('persistent provider caps are atomic under simultaneous reservations',async()=>{
 const results=await Promise.all(Array.from({length:10},()=>store.reserve('test-provider',3,5)));
 assert.equal(results.filter(Boolean).length,3);
 assert.equal(await store.reserve('test-provider',3,5),false);
});
test('concurrent collection writes preserve both items',async()=>{
 const a=await client();await a('/auth/signup','POST',{email:'concurrent@example.com',password:'test-password-3'});
 await a('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
 const c=(await a('/collections','POST',{name:'Both'})).data.collection;
 const results=await Promise.all(['sample-1','sample-2'].map(productId=>a('/collections/'+c.id,'PATCH',{productId})));
 assert.ok(results.every(x=>x.status===200));
 assert.deepEqual((await a('/collections/'+c.id)).data.collection.productIds.sort(),['sample-1','sample-2']);
});

test('newsletter requires an explicit choice and sign-in preserves it',async()=>{
 const email=`newsletter-${Date.now()}@example.com`,password='newsletter-test-password';
 const request=(path,data)=>handle(new Request('http://localhost:3000/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}));
 let response=await request('/auth/signup',{email,password,newsletterOptIn:true});
 const {user}=await response.json();
 let record=await store.get('newsletter',user.id,user.id);
 assert.equal(record.optedIn,true);assert.equal(record.email,email);assert.ok(record.recordedAt);
 await request('/auth/signin',{email,password});
 assert.deepEqual(await store.get('newsletter',user.id,user.id),record);
 response=await request('/auth/signup',{email:`default-${email}`,password});
 const other=await response.json();
 assert.equal((await store.get('newsletter',other.user.id,other.user.id)).optedIn,false);
 const google=await handle(new Request('http://localhost:3000/api/auth/google'));
 assert.equal(google.status,404);
});


test('indexed photos keep their original retailer product and explicit violations are excluded',()=>{
 const found=discoveryCandidates([{images:[
  {title:'Blue short sleeve maxi dress',link:'https://retailer.example/products/blue?srsltid=tracking',imageUrl:'https://cdn.example/blue.jpg',thumbnailUrl:'https://thumb.example/blue.jpg'},
  {title:'Maxi dresses',link:'https://retailer.example/collections/dresses',imageUrl:'https://cdn.example/category.jpg'},
  {title:'Blue maxi dress',link:'https://www.google.com/search?x=1',imageUrl:'https://cdn.example/unrelated.jpg'}
 ]}]);
 assert.equal(found.length,1);assert.equal(found[0].url,'https://retailer.example/products/blue');
 assert.equal(found[0].image,'https://cdn.example/blue.jpg');assert.equal(found[0].price,null);
 assert.equal(rankProducts(found,{preferences:prefs(),swipes:[]},[],[]).length,0);
});

test('historical likes outside a search subset influence eligible similar items, never restrictions',()=>{
 const profile={preferences:prefs(),swipes:[]};
 const liked=garment('past',{title:'Floral romantic blue maxi dress',styles:['romantic'],colors:['blue']});
 const same=garment('similar',{title:'Floral romantic maxi dress',styles:['romantic'],colors:['blue']});
 const other=garment('other',{title:'Minimal black maxi dress',styles:['minimal'],colors:['black']});
 const violation=garment('violation',{...same,id:'violation',attributes:{sleeves:'short',length:'maxi'}});
 const ranked=rankProducts([other,same,violation],profile,[{productId:'past',liked:true}],[],{},'',true,[liked,same,other,violation]);
 assert.equal(ranked[0].id,'similar');assert.equal(ranked.some(x=>x.id==='violation'),false);
});

test('feed pages are private, stable, nonrepeating and reapply current restrictions',async()=>{
 const a=await client(),b=await client();
 await a('/auth/signup','POST',{email:'feed-owner@example.com',password:'test-password-4'});
 await a('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
 const first=await a('/feed?limit=3');assert.ok(first.data.feedId);assert.equal(first.data.items.length,3);
 const second=await a('/feed/'+first.data.feedId+'?offset=3&limit=3');
 assert.ok(second.data.items.every(x=>!first.data.items.some(p=>p.id===x.id)));
 const repeat=await a('/feed/'+first.data.feedId+'?limit=3');assert.deepEqual(repeat.data.items.map(p=>p.id),first.data.items.map(p=>p.id));
 await b('/auth/signup','POST',{email:'feed-other@example.com',password:'test-password-4'});
 await b('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
 assert.equal((await b('/feed/'+first.data.feedId)).status,404);
 await a('/profile','PUT',{preferences:prefs()});
 const tightened=await a('/feed/'+first.data.feedId);
 assert.ok(tightened.data.items.every(p=>modestyMatch(p,prefs()).pass));
 assert.equal((await a('/feed/'+first.data.feedId+'/advance','POST',{})).data.canDiscover,false);
});


test('explicit sheer fabric, cutouts, slits and three-quarter sleeves cannot bypass restrictions',()=>{
 const p=prefs();p.rules.top={...p.rules.top,sleeves:'long',transparency:'opaque',slits:'none',cutouts:'none'};
 for(const title of ['Sheer long sleeve blouse','See through long sleeve top','3/4 sleeve blouse','Long sleeve cutout top','Long sleeve slit blouse']){
  const inferred=inferAttributes(title);
  assert.equal(modestyMatch({...inferred,confidence:0.9},p).pass,false,title);
 }
 assert.equal(inferAttributes('Opaque long sleeve top without cutouts').attributes.cutouts,'none');
});

test('live feed expands with indexed images, deduplicates products and stops at provider caps',async()=>{
 const originalFetch=globalThis.fetch,oldKey=process.env.SERPER_API_KEY,oldLimit=process.env.SERPER_DAILY_LIMIT;
 let imageCalls=0;
 try{
  process.env.SERPER_API_KEY='test-only-key';
  globalThis.fetch=async(url,options)=>{
   assert.ok(String(url).startsWith('https://google.serper.dev/'));
   if(String(url).endsWith('/images')){
    imageCalls++;
    return Response.json({images:[
     {title:'Long sleeve maxi dress',link:'https://retailer.invalid/products/common',imageUrl:'https://cdn.invalid/common.jpg'},
     {title:'Long sleeve maxi dress',link:`https://retailer.invalid/products/new-${imageCalls}`,imageUrl:`https://cdn.invalid/${imageCalls}.jpg`}
    ]});
   }
   return Response.json({});
  };
  const a=await client();
  await a('/auth/signup','POST',{email:'live-feed@example.com',password:'test-password-5'});
  await a('/profile','PUT',{swipes,completeOnboarding:true,preferences:defaultPreferences()});
  const initial=(await a('/feed')).data;
  assert.equal(initial.items.length,0);assert.equal(initial.canDiscover,true);
  const first=(await a(`/feed/${initial.feedId}/advance`,'POST',{})).data;
  assert.equal(first.items.length,2);assert.ok(first.items.every(x=>x.image.startsWith('/api/products/')));
  for(const x of first.items){const raw=await store.get('product',x.id);await store.put('product',x.id,{...raw,analyzedAt:new Date().toISOString()});}
  await a(`/feed/${initial.feedId}/advance?offset=${first.cursorEnd}`,'POST',{});
  const next=(await a(`/feed/${initial.feedId}/advance?offset=${first.cursorEnd}`,'POST',{})).data;
  assert.equal(next.items.length,1);assert.ok(first.items.every(p=>p.id!==next.items[0].id));
  const raw=await store.get('product',next.items[0].id);await store.put('product',raw.id,{...raw,analyzedAt:new Date().toISOString()});
  await a(`/feed/${initial.feedId}/advance?offset=${next.cursorEnd}`,'POST',{});
  process.env.SERPER_DAILY_LIMIT='0';
  const stopped=(await a(`/feed/${initial.feedId}/advance?offset=${next.cursorEnd}`,'POST',{})).data;
  assert.equal(stopped.canDiscover,false);assert.ok(stopped.warnings.some(x=>x.includes('cap')));
 }finally{
  globalThis.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.SERPER_API_KEY;else process.env.SERPER_API_KEY=oldKey;
  if(oldLimit===undefined)delete process.env.SERPER_DAILY_LIMIT;else process.env.SERPER_DAILY_LIMIT=oldLimit;
 }
});


test('blank, zero placeholder and currency-less retailer prices remain unknown',()=>{
 for(const offer of [{price:' ',priceCurrency:'USD'},{price:'0',priceCurrency:'USD'},{price:'25'}]){
  const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',offers:offer})+'</script>';
  assert.equal(extractProduct(html,'https://retailer.example/products/dress').price,null);
 }
});


test('curated retailer items can be liked and saved before onboarding, and stay private',async()=>{
 const a=await client(),b=await client();
 await a('/auth/signup','POST',{email:'curated-owner@example.com',password:'curated-test-password'});
 await b('/auth/signup','POST',{email:'curated-other@example.com',password:'curated-test-password'});
 for(const id of ['1','3','25'])assert.equal((await a(`/products/${id}/reaction`,'POST',{action:'like'})).status,200);
 const c=(await a('/collections','POST',{name:'Saved'})).data.collection;
 for(const productId of ['1','3','25'])assert.equal((await a('/collections/'+c.id,'PATCH',{productId})).status,200);
 const result=await a('/collections/'+c.id);assert.equal(result.data.items.length,3);
 assert.equal((await b('/collections/'+c.id)).status,404);
 assert.equal((await a('/products/not-a-product/reaction','POST',{action:'like'})).status,404);
 assert.equal((await a('/collections/'+c.id,'PATCH',{productId:'injected-product',url:'https://attacker.example'})).status,404);
 assert.equal((await a('/products/3/reaction','POST',{action:'clear'})).data.reaction.liked,false);
 assert.equal((await a('/collections/'+c.id,'PATCH',{productId:'3',remove:true})).data.collections.find(x=>x.id===c.id).productIds.includes('3'),false);
});

test('short adaptive onboarding saves explicit preferences and rejects invalid votes',async()=>{
 const a=await client();await a('/auth/signup','POST',{email:'adaptive@example.com',password:'adaptive-test-password'});
 assert.equal((await a('/profile','PUT',{styleVotes:[{id:'1',like:true},{id:'1',like:false}],preferences:defaultPreferences(),completeOnboarding:true})).status,400);
 assert.equal((await a('/profile','PUT',{styleVotes:[{id:'untrusted',like:true}],preferences:defaultPreferences(),completeOnboarding:true})).status,400);
 const preferences=defaultPreferences();preferences.styles=['casual'];preferences.budgetMax=55;
 const result=await a('/profile','PUT',{styleVotes:[{id:'25',like:true},{id:'26',like:false}],preferences,completeOnboarding:true});
 assert.equal(result.status,200);assert.equal(result.data.profile.onboarded,true);
 const me=(await a('/me')).data;assert.equal(me.profile.styleVotes.length,2);assert.equal(me.profile.preferences.budgetMax,55);assert.deepEqual(me.profile.preferences.styles,['casual']);
 assert.equal((await a('/feed')).status,200);
});


test('purchase links reject retailer homepages, categories, social references and malformed URLs',()=>{
 for(const url of ['https://example.com','https://example.com/en-us','https://example.com/collections/dresses','https://example.com/women','https://instagram.com/p/garment','javascript:alert(1)','https://example.com/search?q=dress'])assert.equal(isProductUrl(url),false,url);
 for(const url of ['https://example.com/products/blue-skirt?variant=123','https://amazon.com/dp/B1234','https://example.com/item/123','https://hm.com/productpage.123.html'])assert.equal(isProductUrl(url),true,url);
 assert.equal(discoveryCandidates([{shopping:[{title:'Long sleeve dress',link:'https://example.com',imageUrl:'https://example.com/a.jpg'}]}]).length,0);
});
test('similar products follow the clicked category, shape and fabric; unknown facts never count',()=>{
 const skirt={...garment('skirt'),category:'skirt',title:'Blue pleated linen maxi skirt',description:'Loose pleated linen',attributes:{length:'maxi',fit:'loose'},url:'https://example.com/products/skirt'};
 const close={...skirt,id:'close',url:'https://other.example/products/linen-skirt'};
 const unrelated={...garment('top'),category:'top',title:'Blue linen blouse',attributes:{length:'maxi',fit:'loose'}};
 const unknown={...garment('unknown'),category:'unknown',attributes:{length:'unknown',fit:'unknown'}};
 const duplicate={...skirt,id:'duplicate'};
 assert.deepEqual(similarProducts(skirt,[unrelated,unknown,duplicate,close]).map(p=>p.id),['close']);
 assert.deepEqual(similarProducts(unknown,[skirt,close]),[]);
 assert.equal(similarProducts(unrelated,[skirt,close]).length,0);
});
test('plural search categories work without silently changing budget or coverage',()=>{
 assert.equal(queryFilters('black maxi skirts under $80',{}).category,'skirt');
 assert.equal(queryFilters('long sleeve dresses',{}).category,'dress');
 assert.equal(queryFilters('blue blouses',{}).category,'top');
});
test('retailer landing references never redirect shoppers or count as outbound clicks',async()=>{
 const a=await client();await a('/auth/signup','POST',{email:'landing-links@example.com',password:'landing-test-password'});
 await a('/profile','PUT',{styleVotes:[],preferences:defaultPreferences(),completeOnboarding:true});
 const response=await a('/products/3/outbound?surface=detail');assert.equal(response.status,410);assert.equal(response.headers.get('location'),null);
 assert.equal((await a('/metrics')).data.sampleClicks,0);
});


test('live search retains cached matches when the new discovery batch is empty',async()=>{
 const oldKey=process.env.SERPER_API_KEY,originalFetch=globalThis.fetch;
 try{
  process.env.SERPER_API_KEY='search-empty-test';globalThis.fetch=async(input,options)=>String(input).startsWith('https://google.serper.dev/')?Response.json({}):originalFetch(input,options);
  await store.put('product','cached-blue-skirt',{...garment('cached-blue-skirt'),title:'Blue pleated skirt',category:'skirt',url:'https://retailer.example/products/blue-skirt',image:'https://cdn.example/skirt.jpg',images:['https://cdn.example/skirt.jpg'],productPage:true,analyzedAt:new Date().toISOString()});
  const a=await client();await a('/auth/signup','POST',{email:'cached-search@example.com',password:'cached-search-password'});
  await a('/profile','PUT',{styleVotes:[],preferences:defaultPreferences(),completeOnboarding:true});
  const initial=(await a('/search','POST',{query:'blue skirts'})).data;
  assert.ok(initial.items.some(p=>p.id==='cached-blue-skirt'));
  const done=(await a(`/search/${initial.jobId}/advance`,'POST',{})).data;
  assert.equal(done.status,'complete');assert.ok(done.items.some(p=>p.id==='cached-blue-skirt'));
 }finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.SERPER_API_KEY;else process.env.SERPER_API_KEY=oldKey;}
});


test('an explicit single title color cannot be overridden by inferred colors during search',()=>{
 const p=garment('white',{title:'White maxi dress',colors:['blue','white']});
 assert.equal(rankProducts([p],{preferences:defaultPreferences(),swipes:[]},[],[],{color:'blue'}).length,0);
 assert.equal(rankProducts([p],{preferences:defaultPreferences(),swipes:[]},[],[],{color:'white'}).length,1);
});
