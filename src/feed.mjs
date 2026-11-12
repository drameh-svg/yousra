import {curatedProducts} from './curated.mjs';
import {store} from './store.mjs';
import {discover,analyze} from './discovery.mjs';
import {rankProducts,preferenceWeights} from './rank.mjs';
import {onboarding,sampleProducts} from './seed.mjs';
import {config,hash,id,now,HttpError} from './util.mjs';

export const feedInteractions=lib=>Object.entries(lib.reactions).map(([productId,r])=>({...r,productId,saved:lib.collections.some(c=>!c.system&&c.productIds.includes(productId))}));
async function products(){const all=await store.list('product');return config().demo?[...all,...sampleProducts]:all;}
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
  words.push('women US');return {query:words.filter(Boolean).join(' '),page:1+Math.floor(round/ordered.length)};
}
export async function createFeed(profile,lib,filters){
  const all=await products(),items=eligible(all,profile,lib,filters);
  const session={id:id(),owner:profile.id,filters,productIds:items.map(x=>x.id),round:0,pending:[],processed:0,version:0,lockedAt:0,stopped:config().demo,warnings:[],createdAt:now()};
  await store.put('feed',session.id,session,profile.id);return session;
}
export async function readFeed(key,uid){const s=await store.get('feed',key,uid);if(!s)throw new HttpError(404,'Feed not found');return s;}
export async function feedView(session,profile,lib,url){
  const all=await products(),allowed=new Map(eligible(all,profile,lib,session.filters).map(x=>[x.id,x]));
  const offset=Math.max(0,Number(url.searchParams.get('offset'))||0),limit=Math.max(1,Math.min(48,Number(url.searchParams.get('limit'))||24));
  const items=[];let cursor=Math.min(offset,session.productIds.length);
  while(cursor<session.productIds.length&&items.length<limit){const item=allowed.get(session.productIds[cursor++]);if(item)items.push(item);}
  return {feedId:session.id,excludedIds:session.productIds.filter(key=>!allowed.has(key)),items,total:session.productIds.filter(key=>allowed.has(key)).length,cursorEnd:cursor,nextOffset:cursor<session.productIds.length?cursor:null,canDiscover:!session.stopped,busy:session.lockedAt>0&&Date.now()-session.lockedAt<120000,warnings:session.warnings,demo:config().demo};
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
        const all=await products();const {query,page}=feedQuery(profile,feedInteractions(lib),all,next.round,next.filters);
        const cacheKey=hash(`images-v2:${query.toLowerCase()}:${page}`),cache=await store.get('cache',cacheKey);
        if(cache&&cache.expires>Date.now())next.pending=cache.productIds;
        else {
          const found=await discover(query,page);
          for(const p of found){const old=await store.get('product',p.id);await store.put('product',p.id,old?{...p,...old,image:old.image||p.image,images:old.images?.length?old.images:p.images,thumbnail:old.thumbnail||p.thumbnail}:p);}
          next.pending=found.map(p=>p.id);
          await store.put('cache',cacheKey,{productIds:next.pending,expires:Date.now()+Number(process.env.SEARCH_TTL_HOURS||6)*3600000});
        }
        next.round++;next.processed=0;
      }
    }else {
      const batch=next.pending.slice(next.processed,next.processed+2);
      await Promise.allSettled(batch.map(async key=>{
        const p=await store.get('product',key);if(!p)return;
        if(!p.analyzedAt||Date.now()-Date.parse(p.analyzedAt)>86400000)await store.put('product',key,await analyze(p));
      }));
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
