import {checkAvailability,displayable} from './stock.mjs';
import {curatedProducts} from './curated.mjs';
import {store} from './store.mjs';
import {discover,analyzeStored,analysisConcurrency} from './discovery.mjs';
import {discoveryProvider} from './claude.mjs';
import {rankProducts,preferenceWeights} from './rank.mjs';
import {onboarding,sampleProducts} from './seed.mjs';
import {config,hash,id,now,HttpError} from './util.mjs';
import {background} from './background.mjs';
import {normalizeStyles,AESTHETIC_SEARCH} from './taxonomy.mjs';
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
// Brands every feed search rotates through (FEED_BRANDS, comma-separated), after the shopper's own favourites.
export const feedBrands=()=>[...new Set(String(process.env.FEED_BRANDS||'').split(',').map(x=>x.trim()).filter(x=>x&&x.length<=40))].slice(0,40);
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function feedQuery(profile,interactions,all,round,filters={}) {
  const prefs=profile.preferences,weights=preferenceWeights(profile,interactions,all,onboarding);
  const best=(prefix,fallback)=>Object.entries(weights).filter(([k,v])=>k.startsWith(prefix)&&v>0).sort((a,b)=>b[1]-a[1]).map(([k])=>k.slice(prefix.length))[0]||fallback;
  const cats=['dress','top','skirt','outerwear',...(prefs.pantsAllowed?['pants']:[])];
  const candidate=best('category:','dress'),favored=cats.includes(candidate)?candidate:'dress';const ordered=[favored,...cats.filter(c=>c!==favored)];
  const category=filters.category||ordered[round%ordered.length],rule=prefs.rules[category==='abaya'?'dress':category]||{};
  const nouns={dress:'maxi dress',top:'blouse top',skirt:'maxi skirt',outerwear:'coat cardigan',pants:'wide leg trousers',abaya:'abaya'};
  const style=filters.style||best('style:',normalizeStyles(prefs.styles)[0]||'');
  const brands=[...new Set([...(prefs.preferredBrands||[]),...feedBrands()].map(b=>b.trim()).filter(Boolean))];
  // A different brand each round keeps results from collapsing onto the same few big retailers.
  const brand=brands.length?brands[round%brands.length]:'';
  const words=[brand,AESTHETIC_SEARCH[style]||(style?style:'modest'),round%3===0?(filters.color||best('color:',prefs.colors[0]||'')):(filters.color||''),rule.sleeves==='long'?'long sleeve':'',rule.neckline==='high'?'high neck':'',rule.fit==='loose'?'loose fit':'',nouns[category]||'women clothing'];
  const budget=filters.maxPrice??prefs.budgetMax;if(budget)words.push(`under $${budget}`);
  const cycle=filters.category?Math.max(1,brands.length):ordered.length*Math.max(1,brands.length)/gcd(ordered.length,Math.max(1,brands.length));
  words.push('women');return {query:words.filter(Boolean).join(' '),page:1+Math.floor(round/cycle),brand};
}
function coverageSummary(prefs,category){const r=prefs?.rules?.[category||'dress']||{};return [r.sleeves==='long'?'long sleeves':'',r.neckline==='high'?'high neckline':'',r.length==='maxi'?'maxi length':r.length==='midi'?'at least midi length':'',r.fit==='loose'?'loose fit':'',r.transparency==='opaque'?'opaque fabric':'',r.slits==='none'?'no slits':'',r.cutouts==='none'?'no cutouts':''].filter(Boolean).join(', ');}
// ---------- saved batches: instant first paint ----------
// New shoppers start from a shared starter pool; returning shoppers start from the unseen pieces we ranked for
// them last visit. Both are a single record read, then re-checked against current preferences and filters.
const STARTER_KEY='starter-pool-v1';
const compact=p=>({...p,description:String(p.description||'').slice(0,600)});
const hours=(name,fallback)=>Number(process.env[name]||fallback)*3600000;
const isFresh=(record,ttl)=>record?.builtAt&&Date.now()-Date.parse(record.builtAt)<ttl;
const usable=p=>p.image&&!p.excluded&&p.productPage!==false&&p.availability!=='out_of_stock'&&p.category!=='unknown';
const hasFilters=filters=>Object.values(filters||{}).some(v=>v!==undefined&&v!==null&&v!=='');
// Spread a pool across stores, categories and aesthetics; best-analysed pieces first.
function spread(list,size,perStore=6){
  const quality=p=>(p.analysisSource==='vision+description'?2:0)+(p.price>0?1:0)+(p.humanModesty?.count?1:0);
  const byStore=new Map(),out=[];
  for(const p of [...list].sort((a,b)=>quality(b)-quality(a)||String(b.discoveredAt||'').localeCompare(String(a.discoveredAt||'')))){
    const key=String(p.store||'').toLowerCase(),n=byStore.get(key)||0;
    if(n>=perStore)continue;byStore.set(key,n+1);out.push(p);if(out.length>=size)break;
  }
  return out;
}
let starterBuild=null;
// Search FEED_BRANDS with generic modest queries, analyse the finds, and save a diverse pool for new shoppers.
export function buildStarterPool({force=false}={}){
  if(starterBuild)return starterBuild;
  starterBuild=(async()=>{
    const current=await store.get('cache',STARTER_KEY);
    if(!force&&isFresh(current,hours('STARTER_TTL_HOURS',12)))return current;
    // Cross-instance guard: one rebuild at a time.
    const lock=await store.get('cache',`${STARTER_KEY}:lock`);
    if(!force&&lock?.until>Date.now())return current;
    await store.put('cache',`${STARTER_KEY}:lock`,{until:Date.now()+10*60000});
    try{
      const brands=feedBrands(),nouns=['maxi dress','long sleeve top','maxi skirt','abaya','cardigan','wide leg trousers'];
      const day=Math.floor(Date.now()/86400000),count=Math.min(Number(process.env.STARTER_SEARCHES||6),Math.max(brands.length,1)*nouns.length);
      const queries=Array.from({length:discoveryProvider()?count:0},(_,i)=>{const brand=brands.length?brands[(day*count+i)%brands.length]:'';return `${brand} modest ${nouns[(day+i)%nouns.length]} women`.trim();});
      const found=(await Promise.allSettled(queries.map(q=>discover(q,1,{lite:true})))).flatMap(r=>r.status==='fulfilled'?r.value:[]);
      const saved=await Promise.all(found.map(async p=>{const old=await store.get('product',p.id);return store.put('product',p.id,old?{...p,...old,image:old.image||p.image,images:old.images?.length?old.images:p.images}:p);}));
      // Analyse a limited number of new finds so the pool's coverage labels are real, not guesses.
      const todo=saved.filter(p=>!p.analyzedAt).slice(0,Number(process.env.STARTER_ANALYZE||24)),done=[];
      for(let i=0;i<todo.length;i+=analysisConcurrency())done.push(...(await Promise.allSettled(todo.slice(i,i+analysisConcurrency()).map(p=>analyzeStored(p.id)))).flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]));
      remember([...saved,...done]);
      const pool=spread((await products({fresh:true})).filter(usable),Number(process.env.STARTER_SIZE||80));
      const record={products:pool.map(compact),builtAt:now(),queries};
      await store.put('cache',STARTER_KEY,record);return record;
    }finally{await store.put('cache',`${STARTER_KEY}:lock`,{until:0}).catch(()=>{});}
  })().finally(()=>{starterBuild=null;});
  return starterBuild;
}
// After each feed page: rank everything for this shopper and keep the best unseen pieces for next visit.
const nextSaves=new Map();
export function saveNextBatch(profile,lib,seenNow=[]){
  const last=nextSaves.get(profile.id)||0;if(Date.now()-last<Number(process.env.NEXT_BATCH_MIN_MS??30000))return Promise.resolve(null);
  nextSaves.set(profile.id,Date.now());
  return (async()=>{
    const previous=await store.get('feed_next',profile.id,profile.id);
    const seen=[...new Set([...seenNow,...(previous?.seenIds||[])])].slice(0,600),seenSet=new Set(seen);
    const ranked=eligible(await products(),profile,lib,{});
    const unseen=ranked.filter(p=>!seenSet.has(p.id)),size=Number(process.env.NEXT_BATCH_SIZE||60);
    // Too few unseen pieces: top up with the best ones already shown, so the next visit still opens instantly.
    const batch=[...unseen,...ranked.filter(p=>seenSet.has(p.id))].slice(0,size);
    return store.put('feed_next',profile.id,{products:batch.map(({match,...p})=>compact(p)),seenIds:seen,profileVersion:profile.version??0,builtAt:now()},profile.id);
  })();
}
export async function createFeed(profile,lib,filters={}){
  let items=null,source='catalog';
  if(!config().demo&&!hasFilters(filters)){
    const [next,starter]=await Promise.all([store.get('feed_next',profile.id,profile.id),store.get('cache',STARTER_KEY)]);
    const sameProfile=next&&(next.profileVersion??0)===(profile.version??0);
    if(sameProfile&&isFresh(next,hours('NEXT_BATCH_TTL_HOURS',72))&&next.products?.length){
      // Re-check against current likes/dislikes and rules, but keep pieces she hasn't seen ahead of repeats.
      const seen=new Set(next.seenIds||[]),ranked=eligible(next.products,profile,lib,filters);
      items=[...ranked.filter(x=>!seen.has(x.id)),...ranked.filter(x=>seen.has(x.id))];source='saved';
    }
    if((!items||items.length<12)&&starter?.products?.length){
      const fromStarter=eligible(starter.products,profile,lib,filters),have=new Set((items||[]).map(x=>x.id));
      items=[...(items||[]),...fromStarter.filter(x=>!have.has(x.id))];source=source==='saved'?'saved+starter':'starter';
    }
    if(process.env.STARTER_POOL!=='false'&&!isFresh(starter,hours('STARTER_TTL_HOURS',12)))background(buildStarterPool());
    if(items&&items.length<12)items=null;
  }
  items??=eligible(await products(),profile,lib,filters);
  const session={id:id(),owner:profile.id,filters,productIds:items.map(x=>x.id),round:0,pending:[],processed:0,version:0,lockedAt:0,stopped:config().demo,warnings:[],createdAt:now(),source};
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
  // Remember what they've now seen and rank the next unseen batch for their next visit.
  if(!config().demo&&!hasFilters(session.filters)&&items.length)background(saveNextBatch(profile,lib,session.productIds.slice(0,cursor)));
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
