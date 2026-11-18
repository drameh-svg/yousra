import {checkAvailability,displayable} from './stock.mjs';
import {curatedProducts} from './curated.mjs';
import {store} from './store.mjs';
import {discover,analyzeStored,analysisConcurrency} from './discovery.mjs';
import {discoveryProvider} from './claude.mjs';
import {rankProducts,preferenceWeights} from './rank.mjs';
import {onboarding,sampleProducts} from './seed.mjs';
import {config,hash,id,now,HttpError} from './util.mjs';
import {background} from './background.mjs';
import {strictStock} from './stock.mjs';

export const feedInteractions=lib=>Object.entries(lib.reactions).map(([productId,r])=>({...r,productId,saved:lib.collections.some(c=>!c.system&&c.productIds.includes(productId))}));
// The catalog is read once and reused for a few seconds, instead of 3-5 full reads per feed request.
let catalog=null;
async function products({fresh=false}={}){
  if(fresh||!catalog||Date.now()-catalog.at>Number(process.env.CATALOG_CACHE_MS??15000))catalog={at:Date.now(),list:await store.list('product')};
  const all=catalog.list;return config().demo?[...new Map([...sampleProducts,...all].map(p=>[p.id,p])).values()]:all.filter(p=>!p.demo);
}
function remember(updated){if(!catalog)return;const byId=new Map(catalog.list.map(p=>[p.id,p]));for(const p of updated)byId.set(p.id,p);catalog={...catalog,list:[...byId.values()]};}
export const forgetCatalog=()=>{catalog=null;};
function eligible(all,p,lib,filters){return rankProducts(config().demo?all:all.filter(x=>x.image&&x.productPage!==false),p,feedInteractions(lib),onboarding,filters,'',true,[...all,...curatedProducts]);}
export function feedQuery(profile,interactions,all,round,filters={}) {
  const prefs=profile.preferences,weights=preferenceWeights(profile,interactions,all,onboarding);
  const best=(prefix,fallback)=>Object.entries(weights).filter(([k,v])=>k.startsWith(prefix)&&v>0).sort((a,b)=>b[1]-a[1]).map(([k])=>k.slice(prefix.length))[0]||fallback;
  const cats=['dress','top','skirt','outerwear',...(prefs.pantsAllowed?['pants']:[])];
  const candidate=best('category:','dress'),favored=cats.includes(candidate)?candidate:'dress';const ordered=[favored,...cats.filter(c=>c!==favored)];
  const category=filters.category||ordered[round%ordered.length],rule=prefs.rules[category]||{};
  const nouns={dress:'maxi dress',top:'blouse top',skirt:'maxi skirt',outerwear:'coat cardigan',pants:'wide leg trousers'};
  const words=[filters.style||best('style:',prefs.styles[0]||'modest'),round%3===0?(filters.color||best('color:',prefs.colors[0]||'')):(filters.color||''),rule.sleeves==='long'?'long sleeve':'',rule.neckline==='high'?'high neck':'',rule.fit==='loose'?'loose fit':'',nouns[category]||'women clothing'];
  const budget=filters.maxPrice??prefs.budgetMax;if(budget)words.push(`under $${budget}`);
  if(prefs.preferredBrands?.length&&round%2===0)words.push(prefs.preferredBrands[Math.floor(round/2)%prefs.preferredBrands.length]);
  words.push('women US');return {query:words.filter(Boolean).join(' '),page:1+Math.floor(round/ordered.length)};
}
function coverageSummary(prefs,category){const r=prefs?.rules?.[category||'dress']||{};return [r.sleeves==='long'?'long sleeves':'',r.neckline==='high'?'high neckline':'',r.length==='maxi'?'maxi length':r.length==='midi'?'at least midi length':'',r.fit==='loose'?'loose fit':'',r.transparency==='opaque'?'opaque fabric':'',r.slits==='none'?'no slits':'',r.cutouts==='none'?'no cutouts':''].filter(Boolean).join(', ');}
export async function createFeed(profile,lib,filters){
  const all=await products(),items=eligible(all,profile,lib,filters);
  const session={id:id(),owner:profile.id,filters,productIds:items.map(x=>x.id),round:0,pending:[],processed:0,version:0,lockedAt:0,stopped:config().demo,warnings:[],createdAt:now()};
  await store.put('feed',session.id,session,profile.id);
  // Start the first search now, so it is usually done by the time the page asks for more.
  if(!config().demo&&process.env.FEED_PREWARM!=='false'&&items.length<24)background(warmRound(profile,lib,0,filters));
  return {session,ranked:items};
}
export async function readFeed(key,uid){const s=await store.get('feed',key,uid);if(!s)throw new HttpError(404,'Feed not found');return s;}
export async function feedView(session,profile,lib,url,{ranked}={}){
  ranked??=eligible(await products(),profile,lib,session.filters);
  // Stock checks visit retailer pages (slow). Unless strict stock is on, show pieces now and check in the
  // background; anything found sold out drops out of the next load.
  let checked=ranked;
  if(config().demo)checked=ranked;
  else if(strictStock())checked=await checkAvailability(ranked);
  else {checked=ranked.filter(p=>displayable(p));background(checkAvailability(ranked).then(()=>{catalog=null;}));}
  const allowed=new Map(checked.map(x=>[x.id,x]));
  const offset=Math.max(0,Number(url.searchParams.get('offset'))||0),limit=Math.max(1,Math.min(48,Number(url.searchParams.get('limit'))||24));
  const items=[];let cursor=Math.min(offset,session.productIds.length);
  while(cursor<session.productIds.length&&items.length<limit){const item=allowed.get(session.productIds[cursor++]);if(item)items.push(item);}
  return {feedId:session.id,excludedIds:session.productIds.filter(key=>!allowed.has(key)),items,total:session.productIds.filter(key=>allowed.has(key)).length,cursorEnd:cursor,nextOffset:cursor<session.productIds.length?cursor:null,canDiscover:!session.stopped,busy:session.lockedAt>0&&Date.now()-session.lockedAt<120000,warnings:session.warnings,demo:config().demo};
}
// One discovery round: search, save the finds, cache the result. Shared by the feed and the warm-up, and
// de-duplicated so a warm-up already running is joined instead of repeated.
const rounds=new Map();
export function warmRound(profile,lib,round,filters={}){
  return (async()=>{
    const all=await products();const {query,page}=feedQuery(profile,feedInteractions(lib),all,round,filters);
    const cacheKey=hash(`images-v2:${discoveryProvider()}:${query.toLowerCase()}:${page}`);
    if(rounds.has(cacheKey))return rounds.get(cacheKey);
    const job=(async()=>{
      const cache=await store.get('cache',cacheKey);
      if(cache&&cache.expires>Date.now())return cache.productIds;
      const found=await discover(query,page,{hint:coverageSummary(profile.preferences,filters.category)});
      const saved=await Promise.all(found.map(async p=>{const old=await store.get('product',p.id);return store.put('product',p.id,old?{...p,...old,image:old.image||p.image,images:old.images?.length?old.images:p.images,thumbnail:old.thumbnail||p.thumbnail}:p);}));
      remember(saved);
      const productIds=found.map(p=>p.id);
      await store.put('cache',cacheKey,{productIds,expires:Date.now()+Number(process.env.SEARCH_TTL_HOURS||6)*3600000});
      return productIds;
    })().finally(()=>setTimeout(()=>rounds.delete(cacheKey),5000));
    rounds.set(cacheKey,job);return job;
  })();
}
export async function advanceFeed(session,profile,lib){
  if(session.stopped||session.lockedAt&&Date.now()-session.lockedAt<120000)return session;
  const locked={...session,version:session.version+1,lockedAt:Date.now()};
  if(!await store.compareAndSwap('feed',session.id,session.owner,session.version,locked))return readFeed(session.id,session.owner);
  const next={...locked,version:locked.version+1,warnings:[]};
  try{
    if(!next.pending.length){
      if(next.round>=40){next.stopped=true;next.warnings=['You have explored this feed. Refresh later for more discoveries.'];}
      else {
        next.pending=await warmRound(profile,lib,next.round,next.filters);
        next.round++;next.processed=0;
      }
    }else {
      const batch=next.pending.slice(next.processed,next.processed+analysisConcurrency());
      remember((await Promise.allSettled(batch.map(key=>analyzeStored(key)))).filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value));
      next.processed+=batch.length;
      if(next.processed>=next.pending.length){next.pending=[];next.processed=0;}
    }
    const all=await products(),seen=new Set(next.productIds);
    for(const p of eligible(all,profile,lib,next.filters))if(!seen.has(p.id)){next.productIds.push(p.id);seen.add(p.id);}
  }catch(e){next.stopped=true;next.warnings=[e instanceof HttpError?e.message:'More pieces could not be loaded. Refresh to retry; your current finds are still here.'];}
  next.lockedAt=0;
  await store.compareAndSwap('feed',next.id,next.owner,locked.version,next);
  return readFeed(next.id,next.owner);
}
