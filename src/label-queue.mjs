import { isMenswear } from './shop-filter.mjs';
// Team labeling queue: products from the priority brands (src/label-brands.mjs) plus random stores, analysed by
// the AI, then checked attribute by attribute by the team on /admin/label. See docs/LABELING.md.
//  - The AI's answers are shown pre-selected, except on ~1 in 10 "blind" items where the labeler answers alone,
//    so we can measure how much the pre-filled answers sway people.
//  - The least certain pieces come first: that is where human labels teach the model most.
import { store } from './store.mjs';
import { discover, analyze } from './discovery.mjs';
import { LABEL_LEVELS, summarizeVotes } from './labels.mjs';
import { predictedLevel } from './preferences.mjs';
import { LABEL_BRANDS, LABEL_QUERIES, RANDOM_QUERIES, QUERIES_PER_PRIORITY } from './label-brands.mjs';
import { hash, host, HttpError, now, text } from './util.mjs';

export const ATTRIBUTE_VALUES = {
  sleeves:['sleeveless','short','elbow','long'], neckline:['open','medium','high'],
  length:['mini','knee','midi','maxi'], fit:['fitted','regular','loose','wide'],
  transparency:['opaque','sheer'], slits:['none','present'], cutouts:['none','present'],
};
export const FIELDS = Object.keys(ATTRIBUTE_VALUES);
const CANT_TELL = 'cant_tell';
// Pants and skirts have no sleeves or neckline to judge.
export const fieldsFor = category => category==='pants'||category==='skirt' ? ['length','fit','transparency','slits','cutouts'] : FIELDS;
const BLIND_SHARE = () => Math.max(0,Math.min(1,Number(process.env.LABEL_BLIND_SHARE ?? 0.1)));
export const isBlind = (userId, productId) => parseInt(hash(`blind:${userId}:${productId}`).slice(0,8),16)/0xffffffff < BLIND_SHARE();
const voter = userId => hash(`voter:${userId}`).slice(0,16);
// Queued pieces live in their own kind, so hundreds of test pieces (some deliberately not modest) never crowd
// real products out of shoppers' catalog and feeds. Labels still update the catalog copy when one exists.
export const QUEUE_KIND = 'label_item';

// ---------- Building the queue ----------
export function planSearches({brands=LABEL_BRANDS, perPriority=QUERIES_PER_PRIORITY, random=RANDOM_QUERIES, queries=LABEL_QUERIES, onlyPriority=null}={}) {
  const plan=[];
  brands.filter(b=>!onlyPriority||b.priority<=onlyPriority).forEach((b,i)=>{
    const n=perPriority[b.priority]||1;
    // Rotate through the query list so different brands cover different categories.
    for(let k=0;k<n;k++)plan.push({kind:'brand',brand:b.name,domain:b.domain,priority:b.priority,query:queries[(i*4+k)%queries.length]});
  });
  for(const q of random)plan.push({kind:'random',brand:null,domain:null,priority:null,query:q});
  return plan;
}

async function pool(items, limit, fn) {
  const out=[];let i=0;
  await Promise.all(Array.from({length:Math.max(1,limit)},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k],k).catch(e=>({error:e}));}}));
  return out;
}

// Searches each planned query, analyses new pieces with the AI and stores them flagged for labeling.
// Costs Serper and Gemini calls (each capped by the usual daily limits). dryRun only returns the plan.
export async function buildLabelQueue({dryRun=false,maxProducts=300,perSearch=6,concurrency=3,onlyPriority=null,log=()=>{}}={}) {
  const plan=planSearches({onlyPriority});
  if(dryRun)return {plan,searches:plan.length};
  const seen=new Set((await store.list(QUEUE_KIND,undefined,20000)).map(p=>p.id));
  let added=0,searched=0,failed=0;const byBrand={};
  for(const step of plan){
    if(added>=maxProducts)break;
    let found=[];
    try{found=await discover(step.query,1,step.domain?{site:step.domain}:{});searched++;}
    catch(e){failed++;log(`search failed: ${step.query}${step.domain?` @${step.domain}`:''} — ${e.message}`);if(e.status===429)break;continue;}
    const fresh=found.filter(p=>!seen.has(p.id)).slice(0,Math.min(perSearch,maxProducts-added));
    fresh.forEach(p=>seen.add(p.id));
    const results=await pool(fresh,concurrency,async p=>{
      const old=await store.get('product',p.id);
      // Already in the catalog and analysed: reuse that analysis (no AI call).
      const analyzed=old?.analyzedAt?old:await analyze(old?{...p,...old}:p);
      if(analyzed.excluded||!analyzed.image||analyzed.productPage===false||isMenswear(analyzed))return null;
      const labelQueue={source:step.kind,brand:step.brand||analyzed.brand||analyzed.store||host(analyzed.url),domain:step.domain||host(analyzed.url),priority:step.priority,query:step.query,addedAt:now()};
      await store.put(QUEUE_KIND,analyzed.id,{...analyzed,labelQueue});
      return analyzed.id;
    });
    const ok=results.filter(r=>typeof r==='string').length;added+=ok;
    const key=step.brand||'random stores';byBrand[key]=(byBrand[key]||0)+ok;
    log(`${String(added).padStart(4)}  +${ok}  ${step.query}${step.domain?` @${step.domain}`:' (any store)'}`);
  }
  return {added,searched,failed,byBrand};
}

// ---------- Serving items ----------
const labelable = p => p.labelQueue&&!isMenswear(p)&&!p.demo&&p.image&&p.productPage!==false&&!p.excluded&&p.category&&p.category!=='unknown';
const conf = (p,f) => p.evidence?.[f]?.confidence ?? p.confidence ?? 0;
// 0 (AI sure of everything) to 1 (AI unsure of everything); listing text and photo disagreeing counts extra.
export function uncertainty(p) {
  const fields=fieldsFor(p.category);
  const unsure=fields.filter(f=>!p.attributes?.[f]||p.attributes[f]==='unknown'||conf(p,f)<0.65).length/fields.length;
  const conflict=fields.some(f=>/Listing text says/.test(p.evidence?.[f]?.reason||''))?0.3:0;
  return Math.min(1,unsure+conflict);
}
const PRIORITY_WEIGHT={1:1,2:0.7,3:0.45};
export function queueScore(p, seed='') {
  const brand=p.labelQueue?.source==='random'?0.55:(PRIORITY_WEIGHT[p.labelQueue?.priority]??0.5);
  const jitter=parseInt(hash(`${seed}:${p.id}`).slice(0,6),16)/0xffffff*0.25;
  return uncertainty(p)*1.2+brand+jitter;
}

export async function labelQueueItems(userId, count=10) {
  const n=Math.max(1,Math.min(20,Number(count)||10));
  const done=new Set((await store.list('attribute_label',userId,20000)).map(l=>l.productId));
  const all=(await store.list(QUEUE_KIND,undefined,20000)).filter(labelable);
  const open=all.filter(p=>!done.has(p.id));
  const ranked=open.map(p=>({p,s:queueScore(p,`${userId}:${now().slice(0,13)}`)})).sort((a,b)=>b.s-a.s).map(x=>x.p);
  // At most 2 pieces from one store per batch, so a session isn't 10 Shein listings in a row.
  const perStore=new Map(),picked=[],later=[];
  for(const p of ranked){if(picked.length>=n)break;const s=p.labelQueue.domain||host(p.url),k=perStore.get(s)||0;if(k>=2){later.push(p);continue;}perStore.set(s,k+1);picked.push(p);}
  for(const p of later)if(picked.length<n)picked.push(p);
  return {
    items:picked.map(p=>{
      const blind=isBlind(userId,p.id);
      return {id:p.id,title:p.title,description:text(p.description,600),store:p.store||host(p.url),url:p.url,category:p.category,
        brand:p.labelQueue.brand,source:p.labelQueue.source,priority:p.labelQueue.priority,
        images:(p.images?.length?p.images:[p.image]).slice(0,4).map((_,i)=>`/api/products/${p.id}/image?index=${i}`),
        fields:fieldsFor(p.category),blind,uncertainty:Math.round(uncertainty(p)*100)/100,
        ai:blind?null:Object.fromEntries(fieldsFor(p.category).map(f=>[f,{value:p.attributes?.[f]||'unknown',confidence:Math.round(conf(p,f)*100)/100,reason:p.evidence?.[f]?.reason||''}])),
        aiLevel:blind?null:predictedLevel(p)};
    }),
    remaining:open.length,total:all.length,labeled:done.size,values:ATTRIBUTE_VALUES,levels:LABEL_LEVELS,
  };
}

// ---------- Saving a label ----------
export async function submitAttributeLabel(data, account) {
  if(!account?.id)throw new HttpError(401,'Sign in to label');
  const productId=text(data?.productId,120);
  const product=await store.get(QUEUE_KIND,productId);
  if(!product)throw new HttpError(404,'Product not in the labeling queue');
  const fields=fieldsFor(product.category),unsure=data?.unsure===true;
  const attributes={};
  for(const f of fields){
    const v=data?.attributes?.[f];
    if(v===CANT_TELL||ATTRIBUTE_VALUES[f].includes(v))attributes[f]=v;
    else if(!unsure)throw new HttpError(400,`Choose a value for ${f}, or "can't tell"`);
  }
  const level=data?.level==null?null:data.level;
  if(level!==null&&!LABEL_LEVELS.includes(level))throw new HttpError(400,'Invalid coverage level');
  const blind=isBlind(account.id,productId);
  const ai=Object.fromEntries(fields.map(f=>[f,product.attributes?.[f]||'unknown']));
  const changed=blind?[]:fields.filter(f=>attributes[f]&&attributes[f]!==CANT_TELL&&attributes[f]!==ai[f]);
  const label={id:`${account.id}:${productId}`,productId,userId:account.id,attributes,level,unsure,blind,changed,
    seconds:Number.isFinite(data?.seconds)?Math.max(0,Math.min(600,Math.round(data.seconds))):null,
    note:text(data?.note,200),createdAt:now(),
    snapshot:{title:product.title,description:text(product.description,1500),store:product.store,url:product.url,image:product.image,images:(product.images||[]).slice(0,4),
      category:product.category,attributes:product.attributes||{},evidence:product.evidence||{},analysisSource:product.analysisSource,visionProvider:product.visionProvider||null,
      predictedLevel:predictedLevel(product),queue:product.labelQueue||null}};
  await store.put('attribute_label',label.id,label,account.id);
  // A coverage level also counts as a shopper vote, so it feeds the existing human override immediately,
  // on the queue copy and on the catalog copy if the piece is also in the catalog.
  if(!unsure){
    if(level)await store.put('modesty_label',`${account.id}:${productId}`,{id:`${account.id}:${productId}`,productId,level,issues:[],unsure:false,note:'',source:'labeling',userId:account.id,labelerPreset:null,createdAt:label.createdAt,snapshot:label.snapshot},account.id);
    for(const kind of [QUEUE_KIND,'product']){
      const latest=await store.get(kind,productId);if(!latest)continue;
      const next={...latest,verifiedAttributes:{...(latest.verifiedAttributes||{}),[voter(account.id)]:{attributes,at:label.createdAt}}};
      if(level)next.humanModesty=summarizeVotes({...(latest.humanModesty?.votes||{}),[voter(account.id)]:{level,issues:[]}});
      await store.put(kind,productId,next);
    }
  }
  return {ok:true,changed:changed.length,blind};
}

// ---------- Measuring ----------
// Per attribute: how often the AI's answer matched the human's. "Can't tell" answers are left out; an AI
// "unknown" counts as a miss. Blind items are reported separately: they are the honest number.
export function labelQueueStats(labels, queueSize=0) {
  const blank=()=>({checked:0,agree:0});
  const shown=Object.fromEntries(FIELDS.map(f=>[f,blank()])),blind=Object.fromEntries(FIELDS.map(f=>[f,blank()]));
  const missed={};let changedItems=0,shownItems=0,seconds=0,timed=0;const byLabeler={},byStore={};const today=now().slice(0,10);
  for(const l of labels){
    if(l.unsure)continue;
    const bucket=l.blind?blind:shown;
    for(const [f,v] of Object.entries(l.attributes||{})){
      if(v===CANT_TELL)continue;
      const ai=l.snapshot?.attributes?.[f]||'unknown';
      bucket[f].checked++;if(ai===v)bucket[f].agree++;else missed[`${f}: AI ${ai} → human ${v}`]=(missed[`${f}: AI ${ai} → human ${v}`]||0)+1;
    }
    if(!l.blind){shownItems++;if(l.changed?.length)changedItems++;}
    if(l.seconds){seconds+=l.seconds;timed++;}
    const who=byLabeler[l.userId]??={total:0,today:0};who.total++;if(l.createdAt?.startsWith(today))who.today++;
    const s=l.snapshot?.queue?.brand||l.snapshot?.store||'unknown',st=byStore[s]??={checked:0,agree:0};
    for(const [f,v] of Object.entries(l.attributes||{}))if(v!==CANT_TELL){st.checked++;if((l.snapshot?.attributes?.[f]||'unknown')===v)st.agree++;}
  }
  const pct=x=>x.checked?Math.round(x.agree/x.checked*100):null;
  return {
    queue:queueSize,labels:labels.length,unsure:labels.filter(l=>l.unsure).length,
    changedShare:shownItems?Math.round(changedItems/shownItems*100):null,
    avgSeconds:timed?Math.round(seconds/timed*10)/10:null,
    accuracy:Object.fromEntries(FIELDS.map(f=>[f,{shown:pct(shown[f]),blind:pct(blind[f]),checked:shown[f].checked+blind[f].checked}])),
    blindItems:labels.filter(l=>l.blind&&!l.unsure).length,
    topMistakes:Object.entries(missed).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,n])=>({mistake:k,count:n})),
    byStore:Object.entries(byStore).map(([store,x])=>({store,agreement:pct(x),checked:x.checked})).sort((a,b)=>b.checked-a.checked).slice(0,20),
    labelers:Object.values(byLabeler),
  };
}

const cell=v=>{const s=v===null||v===undefined?'':String(v);return /[",\n\r]/.test(s)||/^[=+\-@]/.test(s)?`"${(/^[=+\-@]/.test(s)?"'":'')+s.replaceAll('"','""')}"`:s;};
export function attributeLabelsJsonl(labels) {
  return labels.map(l=>JSON.stringify({product_id:l.productId,image_url:l.snapshot?.image,image_urls:l.snapshot?.images,title:l.snapshot?.title,description:l.snapshot?.description,
    store:l.snapshot?.store,url:l.snapshot?.url,category:l.snapshot?.category,human_attributes:l.attributes,human_level:l.level,unsure:!!l.unsure,blind:!!l.blind,
    model_attributes:l.snapshot?.attributes,model_level:l.snapshot?.predictedLevel,queue_source:l.snapshot?.queue?.source,brand:l.snapshot?.queue?.brand,labeler:voter(l.userId),created_at:l.createdAt})).join('\n')+'\n';
}
export function attributeLabelsCsv(labels) {
  const head=['createdAt','productId','title','store','brand','source','category','imageUrl','blind','unsure','humanLevel','modelLevel',...FIELDS.flatMap(f=>[`human_${f}`,`model_${f}`])];
  const rows=labels.map(l=>[l.createdAt,l.productId,l.snapshot?.title,l.snapshot?.store,l.snapshot?.queue?.brand,l.snapshot?.queue?.source,l.snapshot?.category,l.snapshot?.image,l.blind?'yes':'no',l.unsure?'yes':'no',l.level,l.snapshot?.predictedLevel,
    ...FIELDS.flatMap(f=>[l.attributes?.[f]??'',l.snapshot?.attributes?.[f]??''])]);
  return [head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
