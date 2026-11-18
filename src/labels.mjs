// Shopper modesty labels: people rate real scraped listings so we can measure and improve Gemini's
// coverage detection. Stored as kind='modesty_label' (one per shopper per product) and summarised on the
// product as humanModesty, which modestyMatch uses once enough shoppers agree.
import { store } from './store.mjs';
import { curatedProducts } from './curated.mjs';
import { LEVELS, predictedLevel } from './preferences.mjs';
import { hash, HttpError, now, text } from './util.mjs';

export const LABEL_LEVELS = ['conservative','moderate','relaxed','not_modest'];
export const ISSUES = ['sleeves','neckline','length','fit','transparency','slits','cutouts'];
const SOURCES = ['feedback','onboarding','product'];
const voter = userId => hash(`voter:${userId}`).slice(0,16);

function shuffle(list, seed) {
  const out=[...list];let h=parseInt(hash(seed).slice(0,8),16);
  for(let i=out.length-1;i>0;i--){h=(h*1103515245+12345)%2147483648;const j=h%(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
const labelable = p => !p.demo&&p.image&&p.productPage!==false&&!p.excluded&&p.availability!=='out_of_stock'&&p.category&&p.category!=='unknown';
const card = p => ({id:p.id,title:p.title,store:p.store,category:p.category,
  image:p.demo?p.image:`/api/products/${p.id}/image`,
  images:p.demo?(p.images||[p.image]).slice(0,3):(p.images?.length?p.images:[p.image]).slice(0,3).map((_,i)=>`/api/products/${p.id}/image?index=${i}`)});

// 5 to 10 real listings: least-labelled first, spread across categories, never ones this shopper already rated.
export async function labelingItems(userId, count=8) {
  const n=Math.max(5,Math.min(10,Number(count)||8));
  const mine=new Set((await store.list('modesty_label',userId,2000)).map(x=>x.productId));
  const pool=(await store.list('product',undefined,1500)).filter(p=>labelable(p)&&!mine.has(p.id));
  const byCount=shuffle(pool,`${userId}:${now().slice(0,10)}`).sort((a,b)=>(a.humanModesty?.count||0)-(b.humanModesty?.count||0));
  const buckets=new Map();for(const p of byCount){if(!buckets.has(p.category))buckets.set(p.category,[]);buckets.get(p.category).push(p);}
  const picked=[];
  while(picked.length<n&&[...buckets.values()].some(b=>b.length))for(const b of buckets.values()){if(b.length&&picked.length<n)picked.push(b.shift());}
  if(picked.length<5)for(const p of shuffle(curatedProducts,userId))if(picked.length<n&&!mine.has(p.id)&&!picked.some(x=>x.id===p.id))picked.push(p);
  return {items:picked.map(card),levels:LABEL_LEVELS,issues:ISSUES,live:picked.filter(p=>!p.demo).length};
}

export function summarizeVotes(votes) {
  const counts=Object.fromEntries(LABEL_LEVELS.map(l=>[l,0])),issues={};
  for(const v of Object.values(votes)){counts[v.level]=(counts[v.level]||0)+1;for(const i of v.issues||[])issues[i]=(issues[i]||0)+1;}
  const count=Object.values(counts).reduce((a,b)=>a+b,0);
  // Ties resolve towards the more covering-cautious (lower) level.
  const level=[...LEVELS].sort((a,b)=>counts[b]-counts[a]||LEVELS.indexOf(a)-LEVELS.indexOf(b))[0];
  return {votes,counts,issues,count,level,share:count?Math.round(counts[level]/count*100)/100:0,updatedAt:now()};
}

export async function submitLabels(data, account) {
  if(!account?.id)throw new HttpError(401,'Sign in to rate pieces');
  const list=Array.isArray(data?.labels)?data.labels:null;
  if(!list?.length||list.length>10)throw new HttpError(400,'Rate between 1 and 10 pieces');
  const source=SOURCES.includes(data.source)?data.source:'feedback';
  if(!await store.reserve(`labels:${account.id}`,200,100000))throw new HttpError(429,'Thank you! That is plenty of ratings for today.');
  const profile=await store.get('profile',account.id,account.id);
  const saved=[];
  for(const raw of list){
    const productId=text(raw?.productId,120);
    if(!LABEL_LEVELS.includes(raw?.level))throw new HttpError(400,'Choose a coverage level for each piece');
    const issues=Array.isArray(raw.issues)?[...new Set(raw.issues.filter(i=>ISSUES.includes(i)))]:[];
    const product=await store.get('product',productId)||curatedProducts.find(p=>p.id===productId);
    if(!product)throw new HttpError(404,'Product not found');
    const label={id:`${account.id}:${productId}`,productId,level:raw.level,issues,unsure:raw.unsure===true,note:text(raw.note,200),source,
      userId:account.id,labelerPreset:profile?.coveragePreset||null,createdAt:now(),
      // Snapshot of what the model saw and predicted, so later evaluation compares like with like.
      snapshot:{title:product.title,description:text(product.description,1500),store:product.store,url:product.url,image:product.image,images:(product.images||[]).slice(0,4),
        category:product.category,attributes:product.attributes||{},evidence:product.evidence||{},analysisSource:product.analysisSource,visionProvider:product.visionProvider||null,predictedLevel:predictedLevel(product)}};
    await store.put('modesty_label',label.id,label,account.id);
    if(!product.demo&&!label.unsure){
      const latest=await store.get('product',productId);
      if(latest){const votes={...(latest.humanModesty?.votes||{}),[voter(account.id)]:{level:label.level,issues}};await store.put('product',productId,{...latest,humanModesty:summarizeVotes(votes)});}
    }
    saved.push(label.id);
  }
  return {ok:true,saved:saved.length};
}

const cell=v=>{const s=v===null||v===undefined?'':String(v);return /[",\n\r]/.test(s)||/^[=+\-@]/.test(s)?`"${(/^[=+\-@]/.test(s)?"'":'')+s.replaceAll('"','""')}"`:s;};
// One JSON object per line: the photo(s), listing text, human label and the model's prediction at the time.
export function labelsJsonl(labels) {
  return labels.map(l=>JSON.stringify({product_id:l.productId,image_url:l.snapshot?.image,image_urls:l.snapshot?.images,title:l.snapshot?.title,description:l.snapshot?.description,category:l.snapshot?.category,
    human_level:l.level,human_issues:l.issues,unsure:!!l.unsure,labeler_preset:l.labelerPreset,source:l.source,
    model_level:l.snapshot?.predictedLevel,model_attributes:l.snapshot?.attributes,model_source:l.snapshot?.analysisSource,created_at:l.createdAt})).join('\n')+'\n';
}
export function labelsCsv(labels) {
  const head=['createdAt','productId','title','store','category','imageUrl','humanLevel','issues','unsure','labelerPreset','modelLevel','modelSleeves','modelNeckline','modelLength','modelFit','modelTransparency','modelSlits','modelCutouts','source'];
  const rows=labels.map(l=>{const a=l.snapshot?.attributes||{};return [l.createdAt,l.productId,l.snapshot?.title,l.snapshot?.store,l.snapshot?.category,l.snapshot?.image,l.level,(l.issues||[]).join('; '),l.unsure?'yes':'no',l.labelerPreset,l.snapshot?.predictedLevel,a.sleeves,a.neckline,a.length,a.fit,a.transparency,a.slits,a.cutouts,l.source];});
  return [head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
// How often the model's level matches the shoppers' majority level, per product.
export function labelAgreement(labels) {
  const byProduct=new Map();
  for(const l of labels){if(l.unsure)continue;const e=byProduct.get(l.productId)||{votes:{},model:l.snapshot?.predictedLevel};e.votes[l.userId]={level:l.level,issues:l.issues};byProduct.set(l.productId,e);}
  const confusion={};let agree=0,total=0;
  for(const e of byProduct.values()){
    const human=summarizeVotes(e.votes).level,model=e.model||'relaxed';
    confusion[human]??={};confusion[human][model]=(confusion[human][model]||0)+1;
    total++;if(human===model)agree++;
  }
  return {products:total,labels:labels.length,agreement:total?Math.round(agree/total*100):null,confusion};
}
