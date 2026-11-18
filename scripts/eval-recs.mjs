// Offline recommendation check: hide one liked/saved piece per shopper, rank everything else, and see
// whether the hidden piece lands in the top 10. Reads whatever STORAGE points at (local SQLite or Supabase).
// Usage: npm run eval:recs            (read-only; no provider calls)
import { store } from '../src/store.mjs';
import { curatedProducts } from '../src/curated.mjs';
import { onboarding } from '../src/seed.mjs';
import { rankProducts } from '../src/rank.mjs';

const K=Number(process.env.EVAL_K||10);
const catalog=[...(await store.list('product',undefined,5000)).filter(p=>!p.demo&&p.image),...curatedProducts];
const byId=new Map(catalog.map(p=>[p.id,p]));
const profiles=(await store.list('profile',undefined,5000)).filter(p=>p.onboarded);
let users=0,trials=0,hits=0,rr=0;
for(const profile of profiles){
  const lib=await store.get('library',profile.id,profile.id);if(!lib)continue;
  const interactions=Object.entries(lib.reactions||{}).map(([productId,r])=>({...r,productId,saved:lib.collections.some(c=>!c.system&&c.productIds.includes(productId))}));
  const positives=interactions.filter(i=>(i.liked||i.saved)&&!i.disliked&&byId.has(i.productId));
  if(positives.length<3)continue;users++;
  for(const held of positives){
    const rest=interactions.filter(i=>i.productId!==held.productId);
    // Previously liked pieces stay in the pool, as in the real feed; only the held-out like is unknown.
    const ranked=rankProducts(catalog,profile,rest,onboarding,{},'',false,catalog).map(p=>p.id);
    const rank=ranked.indexOf(held.productId);trials++;
    if(rank>=0&&rank<K)hits++;if(rank>=0)rr+=1/(rank+1);
  }
}
if(!trials){console.log(`Not enough data yet: need onboarded shoppers with at least 3 likes/saves (found ${profiles.length} onboarded profiles).`);process.exit(0);}
const random=Math.min(1,K/catalog.length);
console.log(`Shoppers evaluated: ${users}   held-out likes: ${trials}   catalog: ${catalog.length}`);
console.log(`Hit rate @${K}: ${(hits/trials*100).toFixed(1)}%   (random would be ~${(random*100).toFixed(1)}%)`);
console.log(`Mean reciprocal rank: ${(rr/trials).toFixed(3)}`);
console.log('Change weights in src/rank.mjs, re-run, and keep changes that raise hit rate without hurting modesty filtering.');
