import {curatedProducts} from './curated.mjs';
import {createFeed,readFeed,feedView,advanceFeed} from './feed.mjs';
import {productImage} from './media.mjs';
import { signIn,signOut,user,refresh,assertEnvironment } from './auth.mjs';
import { store,mutate } from './store.mjs';
import { defaultPreferences,validatePreferences,filtersFrom } from './preferences.mjs';
import { onboarding,sampleProducts } from './seed.mjs';
import { discover,analyze,queryFilters } from './discovery.mjs';
import { rankProducts,similarProducts } from './rank.mjs';
import { body,config,hash,host,HttpError,id,json,now,safeUrl,text } from './util.mjs';

const libraryInitial = () => ({collections:[{id:'likes',name:'Likes',productIds:[],system:true}],reactions:{}});
async function library(uid) {await store.create('library',uid,{...libraryInitial(),version:0},uid);return await store.get('library',uid,uid);}
async function profile(uid) {await store.create('profile',uid,{id:uid,preferences:defaultPreferences(),swipes:[],onboarded:false,createdAt:now(),version:0},uid);return await store.get('profile',uid,uid);}
async function catalog() {const real=await store.list('product');return [...real,...curatedProducts,...(config().demo?sampleProducts:[])];}
function interactions(lib) {return Object.entries(lib.reactions).map(([productId,r])=>({...r,productId,saved:lib.collections.some(c=>!c.system&&c.productIds.includes(productId))}));}
function shopUrl(p) {
  let rules={};try{rules=JSON.parse(process.env.AFFILIATE_RULES||'{}');}catch{}
  const template=rules[host(p.url)];
  if(!p.demo&&typeof template==='string'&&template.includes('{url}')) {const url=safeUrl(template.replaceAll('{url}',encodeURIComponent(p.url)));if(url)return {url,affiliate:true};}
  return {url:p.url,affiliate:false};
}
function publicProduct(p) {
  const shop=shopUrl(p);
  return {...p,price:Number.isFinite(p.price)&&p.price>0&&p.currency?p.price:null,originalImage:p.image,image:p.image&&!p.demo?`/api/products/${p.id}/image`:p.image,images:p.demo?p.images:(p.images||[]).map((_,i)=>`/api/products/${p.id}/image?index=${i}`),affiliate:shop.affiliate,shopPath:`/api/products/${p.id}/outbound`,sourceUrl:p.url};
}
function pages(items,url) {const offset=Math.max(0,Number(url.searchParams.get('offset'))||0),limit=Math.max(1,Math.min(48,Number(url.searchParams.get('limit'))||24));return {items:items.slice(offset,offset+limit).map(publicProduct),total:items.length,nextOffset:offset+limit<items.length?offset+limit:null};}
async function product(key) {return await store.get('product',key)||curatedProducts.find(x=>x.id===key)||(config().demo?sampleProducts.find(x=>x.id===key):null);}
async function searchView(job,p,lib,url) {
  const all=await catalog(),subset=all.filter(x=>job.productIds.includes(x.id)&&(config().demo||x.image));
  return {...pages(rankProducts(subset,{...p,preferences:job.preferences},interactions(lib),onboarding,job.filters,job.query,false,all),url),jobId:job.id,status:job.status,phase:job.phase,processed:job.processed||0,discovered:job.productIds.length,canAdvance:!['complete','error'].includes(job.status),warnings:job.warnings||[],demo:job.demo};
}
async function advance(job,uid) {
  if(['complete','error'].includes(job.status))return job;
  if(job.status==='running'&&Date.now()-(job.lockedAt||0)<90000)return job;
  const locked={...job,version:job.version+1,status:'running',lockedAt:Date.now()};
  if(!await store.compareAndSwap('job',job.id,uid,job.version,locked))return await store.get('job',job.id,uid);
  let next={...locked,version:locked.version+1};
  try {
    if(next.phase==='discovery') {
      const cacheKey=hash('images-v2:'+next.discoveryQuery.toLowerCase());
      const cache=await store.get('cache',cacheKey);
      if(cache&&cache.expires>Date.now())next.productIds=cache.productIds;
      else {
        const found=await discover(next.discoveryQuery);
        for(const p of found) {const existing=await store.get('product',p.id);await store.put('product',p.id,existing&&Date.now()-Date.parse(existing.analyzedAt||'')<86400000?existing:p);}
        next.productIds=found.map(x=>x.id);
        await store.put('cache',cacheKey,{productIds:next.productIds,expires:Date.now()+Number(process.env.SEARCH_TTL_HOURS||6)*3600000});
      }
      next.phase='analysis';next.processed=0;next.status=next.productIds.length?'pending':'complete';
    } else {
      const ids=next.productIds.slice(next.processed,next.processed+2);
      const results=await Promise.allSettled(ids.map(async key=>{
        const p=await store.get('product',key); if(!p)return;
        if(!p.analyzedAt || Date.now()-Date.parse(p.analyzedAt)>86400000) await store.put('product',key,await analyze(p));
      }));
      if(results.some(r=>r.status==='rejected')) next.warnings=[...new Set([...next.warnings,'Some products could not be analyzed and remain uncertain.'])];
      next.processed+=ids.length;next.status=next.processed>=next.productIds.length?'complete':'pending';
    }
  } catch(e) {next.status='error';next.warnings=[...next.warnings,e instanceof HttpError?e.message:'Search could not finish. Cached results are still available.'];}
  next.lockedAt=0;
  await store.compareAndSwap('job',next.id,uid,locked.version,next);
  return await store.get('job',next.id,uid);
}
function csrf(request) {
  if(['GET','HEAD','OPTIONS'].includes(request.method))return;
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(config().origin).origin)throw new HttpError(403,'Cross-origin request blocked');
  const type=request.headers.get('content-type')||'';
  if(!type.startsWith('application/json'))throw new HttpError(415,'Use application/json');
}
export async function handle(request, context={}) {
  try {
    assertEnvironment();csrf(request);
    const url=new URL(request.url),path=url.pathname.replace(/\/$/,''),method=request.method;
    if(path==='/api/health'&&method==='GET')return json({ok:true,authMode:config().auth,storage:config().storage,discovery:config().demo?'sample':'live',vision:!!process.env.GEMINI_API_KEY});
    if(['/api/auth/google','/api/auth/callback'].includes(path))throw new HttpError(404,'Use email and password to sign in');
    if(['/api/auth/signup','/api/auth/signin'].includes(path)&&method==='POST') {
      // Do not trust forwarded IP headers unless your hosting proxy overwrites them.
      const ip=typeof context.clientIp==='string'?context.clientIp:'deployment';
      if(!await store.reserve(`auth:${hash(ip).slice(0,20)}`,80,1000000))throw new HttpError(429,'Too many sign-in attempts today');
      return await signIn(await body(request),path.endsWith('signup'));
    }
    if(path==='/api/auth/signout'&&method==='POST')return await signOut(request);
    if(path==='/api/auth/refresh'&&method==='POST')return await refresh(request);
    const u=await user(request);
    if(path==='/api/me'&&method==='GET')return json({user:u,profile:await profile(u.id),localTest:config().auth==='local'});
    if(path==='/api/onboarding'&&method==='GET')return json({photos:onboarding,required:15});
    if(path==='/api/profile'&&method==='PUT') {
      const data=await body(request);
      const updated=await mutate('profile',u.id,u.id,{...(await profile(u.id))},p=>{
        if(data.preferences)p.preferences=validatePreferences(data.preferences);
        if(data.swipes!==undefined) {
          if(!Array.isArray(data.swipes)||data.swipes.length!==15||new Set(data.swipes.map(s=>s.id)).size!==15||data.swipes.some(s=>!onboarding.some(p=>p.id===s.id)||typeof s.like!=='boolean'))throw new HttpError(400,'Complete all 15 unique swipes');
          p.swipes=data.swipes.map(s=>({id:s.id,like:s.like}));
        }
        if(data.styleVotes!==undefined){
          if(!Array.isArray(data.styleVotes)||data.styleVotes.length>5||new Set(data.styleVotes.map(v=>v.id)).size!==data.styleVotes.length||data.styleVotes.some(v=>!curatedProducts.some(x=>x.id===v.id)||typeof v.like!=='boolean'))throw new HttpError(400,'Use up to five unique style choices');
          p.styleVotes=data.styleVotes.map(v=>({id:v.id,like:v.like}));
        }
        if(data.completeOnboarding){if((data.styleVotes===undefined&&p.swipes.length!==15)||!data.preferences)throw new HttpError(400,'Style choices and preferences required');p.onboarded=true;}
        return p;
      });return json({profile:updated});
    }
    const p=await profile(u.id),lib=await library(u.id);
    const libraryAction=path.startsWith('/api/collections')||path==='/api/reactions'||/^\/api\/products\/[\w-]+\/reaction$/.test(path);
    if(!p.onboarded&&!libraryAction)throw new HttpError(409,'Complete onboarding first');
    if(path==='/api/feed'&&method==='GET') {
      const session=await createFeed(p,lib,filtersFrom(Object.fromEntries(url.searchParams)));
      const view=await feedView(session,p,lib,url);return json({...view,items:view.items.map(publicProduct)});
    }
    const feedMatch=path.match(/^\/api\/feed\/([\w-]+)(\/advance)?$/);
    if(feedMatch&&((feedMatch[2]&&method==='POST')||(!feedMatch[2]&&method==='GET'))){
      let session=await readFeed(feedMatch[1],u.id);
      if(feedMatch[2])session=await advanceFeed(session,p,lib);
      const view=await feedView(session,p,lib,url);return json({...view,items:view.items.map(publicProduct)});
    }
    if(path==='/api/search'&&method==='POST') {
      if(!await store.reserve(`search:${u.id}`,40,100000))throw new HttpError(429,'Daily search limit reached');
      const data=await body(request),query=text(data.query,300);
      if(!query)throw new HttpError(400,'Enter something to search for');
      const preferences=data.preferences?validatePreferences(data.preferences):p.preferences;
      const filters=queryFilters(query,data.filters||{});
      const key=id(),job={id:key,owner:u.id,query,discoveryQuery:`${query} ${filters.color||''} ${filters.category||'women clothing'} ${preferences.rules?.[filters.category]?.sleeves==='long'?'long sleeve':''} ${preferences.styles.slice(0,2).join(' ')} US`.trim(),filters,preferences,phase:'discovery',status:'pending',productIds:[],processed:0,warnings:[],createdAt:now(),demo:config().demo,version:0};
      if(config().demo) {job.productIds=sampleProducts.map(x=>x.id);job.status='complete';job.phase='analysis';job.warnings=['Sample catalog only. Add a Serper API key for live web discovery.'];}
      // Return cached catalog immediately; advancing the job performs network work.
      else {job.productIds=(await catalog()).map(x=>x.id);}
      await store.put('job',key,job,u.id);
      await store.put('search',id(),{userId:u.id,query,at:now(),demo:config().demo},u.id);
      return json(await searchView(job,p,lib,url),201);
    }
    const searchMatch=path.match(/^\/api\/search\/([\w-]+)(\/advance)?$/);
    if(searchMatch&&searchMatch[1]!=='suggestions'&&((searchMatch[2]&&method==='POST')||(!searchMatch[2]&&method==='GET'))) {
      let job=await store.get('job',searchMatch[1],u.id);if(!job)throw new HttpError(404,'Search not found');
      if(searchMatch[2])job=await advance(job,u.id);
      return json(await searchView(job,p,lib,url));
    }
    if(path==='/api/search/suggestions'&&method==='GET') {
      const recent=[...new Set((await store.list('search',u.id,30)).map(x=>x.query))].slice(0,6);
      return json({recent,suggested:[`${p.preferences.styles[0]||'casual'} maxi dress`,'wide-leg trousers','long sleeve blouse'],trending:[],note:'Trending stays empty until there is enough real search activity.'});
    }
    if(path==='/api/collections'&&method==='GET')return json({collections:lib.collections});
    if(path==='/api/collections'&&method==='POST') {
      const name=text((await body(request)).name,60);if(!name)throw new HttpError(400,'Collection name required');const created={id:id(),name,productIds:[],system:false};
      await mutate('library',u.id,u.id,libraryInitial(),l=>{if(l.collections.length>=50)throw new HttpError(400,'Collection limit reached');l.collections.push(created);return l;});return json({collection:created},201);
    }
    const coll=path.match(/^\/api\/collections\/([\w-]+)$/);
    if(coll) {
      const collection=lib.collections.find(c=>c.id===coll[1]);if(!collection)throw new HttpError(404,'Collection not found');
      if(method==='GET') {const all=await catalog();return json({collection,items:all.filter(p=>collection.productIds.includes(p.id)).map(publicProduct)});}
      if(method==='DELETE') {if(collection.system)throw new HttpError(400,'The Likes collection cannot be deleted');await mutate('library',u.id,u.id,libraryInitial(),l=>{l.collections=l.collections.filter(c=>c.id!==coll[1]);return l;});return json({ok:true});}
      if(method==='PATCH') {const data=await body(request);if(data.productId&&!await product(data.productId))throw new HttpError(404,'Product not found');
        const updated=await mutate('library',u.id,u.id,libraryInitial(),l=>{const c=l.collections.find(x=>x.id===coll[1]);if(!c)throw new HttpError(404,'Collection not found');if(c.system)throw new HttpError(400,'Use product like/unlike for the Likes collection');
          if(data.name!==undefined){const n=text(data.name,60);if(!n)throw new HttpError(400,'Name required');c.name=n;}
          if(data.productId){if(data.remove)c.productIds=c.productIds.filter(x=>x!==data.productId);else if(!c.productIds.includes(data.productId)){if(c.productIds.length>=500)throw new HttpError(400,'Collection item limit reached');c.productIds.push(data.productId);}}return l;});return json({collections:updated.collections});}
    }
    const prod=path.match(/^\/api\/products\/([\w-]+)(?:\/(reaction|outbound|image))?$/);
    if(prod) {
      const item=await product(prod[1]);if(!item)throw new HttpError(404,'Product not found');
      if(prod[2]==='image'&&method==='GET')return productImage(item,Math.max(0,Math.min(5,Number(url.searchParams.get('index'))||0)));
      if(!prod[2]&&method==='GET') {
        const eligible=rankProducts((await catalog()).filter(x=>config().demo||x.image&&x.productPage!==false),p,interactions(lib),onboarding,{},'',true);
        return json({product:publicProduct(item),reaction:lib.reactions[item.id]||{},similar:similarProducts(item,eligible).map(publicProduct)});
      }
      if(prod[2]==='reaction'&&method==='POST') {
        const {action}=await body(request);if(!['like','dislike','clear'].includes(action))throw new HttpError(400,'Unknown reaction');
        const updated=await mutate('library',u.id,u.id,libraryInitial(),l=>{
          l.reactions[item.id]={...l.reactions[item.id],liked:action==='like',disliked:action==='dislike',at:now()};
          const likes=l.collections.find(c=>c.id==='likes');likes.productIds=likes.productIds.filter(x=>x!==item.id);if(action==='like')likes.productIds.push(item.id);return l;
        });return json({reaction:updated.reactions[item.id],collections:updated.collections});
      }
      if(prod[2]==='outbound'&&method==='GET') {
        if(!['card','detail'].includes(url.searchParams.get('surface')))throw new HttpError(400,'Specify surface=card or surface=detail');
        if(!await store.reserve(`click:${u.id}`,500,1000000))throw new HttpError(429,'Click limit reached');
        const shop=shopUrl(item),surface=url.searchParams.get('surface');
        await store.put('event',id(),{type:'outbound_click',userId:u.id,productId:item.id,store:item.store,at:now(),surface,affiliate:shop.affiliate,demo:!!item.demo},u.id);
        await mutate('library',u.id,u.id,libraryInitial(),l=>{const r=l.reactions[item.id]||{};l.reactions[item.id]={...r,clicks:(r.clicks||0)+1};return l;});
        return new Response(null,{status:302,headers:{location:shop.url,'cache-control':'no-store'}});
      }
    }
    if(path==='/api/reactions'&&method==='GET')return json({reactions:lib.reactions});
    if(path==='/api/metrics'&&method==='GET') {
      const events=await store.list('event',u.id,1000);return json({clicks:events.filter(e=>!e.demo).length,sampleClicks:events.filter(e=>e.demo).length,likes:Object.values(lib.reactions).filter(r=>r.liked).length,collections:lib.collections.length});
    }
    if(path==='/api/admin/metrics'&&method==='GET') {
      if(!(process.env.ADMIN_USER_IDS||'').split(',').includes(u.id))throw new HttpError(403,'Admin access required');
      const events=(await store.list('event',undefined,10000)).filter(e=>!e.demo);
      const brands={};for(const e of events){brands[e.store]??={clicks:0,users:new Set()};brands[e.store].clicks++;brands[e.store].users.add(e.userId);}
      return json({outboundClicks:events.length,uniqueClickers:new Set(events.map(e=>e.userId)).size,byStore:Object.entries(brands).map(([store,m])=>({store,clicks:m.clicks,uniqueClickers:m.users.size})),providerUsage:await store.usage(),window:'Most recent 10,000 events; clicks are not purchases.'});
    }
    throw new HttpError(404,'Endpoint not found');
  } catch(e) {
    if(!(e instanceof HttpError))console.error('API error:',e.message);
    return json({error:e instanceof HttpError?e.message:'Something went wrong. Please try again.'},e instanceof HttpError?e.status:500);
  }
}
