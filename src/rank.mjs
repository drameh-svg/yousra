import { hiddenForEveryone } from './shop-filter.mjs';
import {isProductUrl} from './product-url.mjs';
import {curatedProducts} from './curated.mjs';
import {contentModel,cosine,diversify,explore} from './recommend.mjs';
import { modestyMatch } from './preferences.mjs';
import { productAesthetics, normalizeStyles, colorFamilies, isAbaya, classifierStyle } from './taxonomy.mjs';
import { aestheticMatch, styleMatchPolicy } from './style-classifier.mjs';

export const tokens = value => (String(value||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).map(x=>({dresses:'dress',skirts:'skirt',shirts:'shirt',blouses:'blouse',sweaters:'sweater',coats:'coat',jackets:'jacket',sleeves:'sleeve',trousers:'pants'}[x]||x));
// Aesthetics and colour families are normalised so old tags, new tags and shades all line up.
// A piece belongs to a brand when it's sold on the brand's own site, or a marketplace lists it under that brand.
const squash=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function fromBrand(p,domain,name=''){
  let h='';try{h=new URL(p.url).hostname.replace(/^www\./,'').toLowerCase();}catch{}
  if(h===domain||h.endsWith(`.${domain}`))return true;
  const n=squash(name);return n.length>2&&[p.brand,p.store].some(v=>squash(v)===n||squash(v)===`${n}com`);
}
export function features(p) { return [...productAesthetics(p).map(x=>`style:${x}`),...colorFamilies(p.colors).map(x=>`color:${x}`),`category:${p.category}`,...(isAbaya(p)?['type:abaya']:[]), ...Object.entries(p.attributes||{}).filter(([,v])=>v&&v!=='unknown'&&v!=='any').map(([k,v])=>`${k}:${v}`)]; }
export function preferenceWeights(profile, interactions, products, swipePhotos) {
  const weights={};
  const add=(key,v)=>weights[key]=(weights[key]||0)+v;
  for(const vote of profile.styleVotes||[]){const item=curatedProducts.find(p=>p.id===vote.id);if(item)for(const feature of features(item))add(feature,vote.like?1:-0.7);}
  for (const s of normalizeStyles(profile.preferences.styles)) add(`style:${s}`,2);
  for (const c of profile.preferences.colors) add(`color:${c}`,1.5);
  for (const swipe of profile.swipes||[]) { const p=swipePhotos.find(x=>x.id===swipe.id); if(p) features(p).forEach(f=>add(f,swipe.like?0.6:-0.2)); }
  const catalog=new Map(products.map(p=>[p.id,p]));
  // Latest state per product: dislikes override likes. Saves in multiple collections do not multiply votes.
  for (const interaction of interactions) {
    const p=catalog.get(interaction.productId); if (!p) continue;
    const strength=interaction.disliked?-3: (interaction.liked?2:0)+(interaction.saved?1.5:0)+Math.min(interaction.clicks||0,3)*0.2;
    features(p).forEach(f=>add(f,strength));
  }
  return weights;
}
export function rankProducts(products, profile, interactions, swipes, filters={}, query='', feed=false, context=products) {
  const prefs=profile.preferences, weights=preferenceWeights(profile,interactions,context,swipes);
  const hidden=new Set(interactions.filter(x=>x.disliked).map(x=>x.productId));
  const queryTokens=tokens(query).filter(x=>!['a','an','the','for','with','under','below','less','than','dollars','us','i','want','something'].includes(x)&&!/^\d+$/.test(x));
  const model=contentModel(context),byId=new Map(context.map(x=>[x.id,x]));
  const signals=interactions.map(i=>({p:byId.get(i.productId),weight:i.disliked?-4:(i.liked?4:0)+(i.saved?3:0)+Math.min(i.clicks||0,3)*0.3})).filter(x=>x.p&&x.weight);
  const ranked=products.flatMap(p=>{
    if((!p.demo&&p.url&&!isProductUrl(p.url))||p.excluded || hiddenForEveryone(p) || p.productPage===false || p.availability==='out_of_stock')return [];
    if(!p.demo&&p.url&&p.productPage!==true&&/\/(collections|categories|category|search|cat|browse)(\/|$)|\/shop\/gender/i.test(new URL(p.url).pathname))return [];
    if(feed&&hidden.has(p.id)) return [];
    if(prefs.excludedBrands.some(b=>[p.brand,p.store].some(x=>String(x).toLowerCase().includes(b)))) return [];
    if((filters.brand||filters.brandName)&&!fromBrand(p,filters.brand||'',filters.brandName)) return [];
    if(filters.category==='abaya'?!isAbaya(p):filters.category&&p.category!==filters.category) return [];
    const max=filters.maxPrice??prefs.budgetMax;
    if(max!=null && (p.price===null||p.price>max||p.currency!=='USD')) return [];
    if(filters.minPrice!=null && (p.price===null||p.price<filters.minPrice||p.currency!=='USD')) return [];
    if(filters.color){
      // A title that names a colour wins over model tags (e.g. a "Black abaya" photographed on a beige set).
      const named=colorFamilies([p.title]);
      if(named.length?!named.includes(filters.color):!colorFamilies(p.colors).includes(filters.color))return [];
    }
    // Aesthetic gate runs BEFORE coverage/modesty. Brand/store name alone never passes.
    // If the product has a successful SigLIP classification, use ranked image labels (1st/2nd/3rd weights).
    // If classification was attempted and failed/unavailable, fail closed for style filters.
    // If not classified yet, fall back to Gemini/text aesthetics so existing catalog pages keep working until backfill.
    let aesthetic=null;
    if(filters.style){
      const clf=classifierStyle(filters.style);
      const sc=p.styleClassification;
      if(clf&&sc?.status==='ok'){
        aesthetic=aestheticMatch(p,clf);
        if(!aesthetic.pass) return [];
      }else if(clf&&sc&&sc.status!=='ok'){
        return [];
      }else if(!productAesthetics(p).includes(filters.style)){
        return [];
      }
    }
    // Most retailers don't expose sizes. Confirmed sizes must match; unconfirmed ones stay, ranked lower and labelled.
    const knownSizes=(p.sizes||[]).map(x=>String(x).toLowerCase());
    if(filters.size&&knownSizes.length&&!knownSizes.includes(filters.size)) return [];
    const sizeUnconfirmed=!!filters.size&&!knownSizes.length;
    if(!filters.size&&prefs.sizes?.length&&knownSizes.length&&!knownSizes.some(x=>prefs.sizes.includes(x)))return [];
    if(filters.shipping==='confirmed'&&p.shippingUS!=='yes') return [];
    if(p.shippingUS==='no') return [];
    const modest=modestyMatch(p,prefs); if(!modest.pass) return [];
    const words=tokens(`${p.title} ${p.description} ${p.store||''} ${p.brand||''} ${p.category} ${(p.styles||[]).join(' ')} ${(p.colors||[]).join(' ')}`);
    const lexical=queryTokens.length?queryTokens.filter(t=>words.includes(t)||words.includes(t.replace(/s$/,''))).length/queryTokens.length:0;
    if(queryTokens.length&&lexical===0) return [];
    const taste=features(p).reduce((sum,f)=>sum+(weights[f]||0),0)/Math.sqrt(Math.max(1,features(p).length));
    const learned=signals.reduce((sum,x)=>sum+x.weight*cosine(model.vector(p),model.vector(x.p)),0)/Math.sqrt(Math.max(1,signals.length));
    const uncertain=modest.confidence<0.65 || (p.analysisSource!=='vision+description'&&p.analysisSource!=='curated-reference');
    const myStyles=normalizeStyles(prefs.styles),myColors=colorFamilies(prefs.colors);
    const styleMatch=productAesthetics(p).some(s=>myStyles.includes(s))?1:0;
    const colorMatch=colorFamilies(p.colors).some(c=>myColors.includes(c))?1:0;
    const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const brandMatch=(prefs.preferredBrands||[]).some(b=>[p.brand,p.store].some(value=>{const brand=normalized(b),store=normalized(value);return brand.length>2?store.includes(brand):store===brand||store===brand+'com'}));
    const policy=styleMatchPolicy();
    const aestheticBoost=aesthetic?.pass?aesthetic.weight*policy.scoreScale:0;
    const score=lexical*80+styleMatch*50+colorMatch*20+(brandMatch?35:0)+taste*3+learned*25+modest.confidence*8-(uncertain?4:0)+(p.shippingUS==='yes'?2:0)-(sizeUnconfirmed?30:0)+aestheticBoost;
    const affinity=styleMatch*50+colorMatch*20+(brandMatch?35:0)+taste*3+learned*25+aestheticBoost;
    return [{...p,match:{score:Math.round(score*100)/100,affinity:Math.round(affinity*100)/100,confidence:modest.confidence,uncertain,aestheticRank:aesthetic?.rank??null,aestheticScore:aesthetic?.score??null,reasons:[...modest.reasons,...(sizeUnconfirmed?['Size not confirmed']:[]),...(learned>0.3?['Similar to pieces you liked or saved']:[]),...(styleMatch?['Matches your styles']:[]),...(colorMatch?['Matches your colors']:[]),...(brandMatch?['From a brand you like']:[]),...(aesthetic?.pass?[aesthetic.reason]:[])]}}];
  }).sort((a,b)=>b.match.score-a.match.score||a.id.localeCompare(b.id));
  return feed?explore(diversify(ranked,model)):ranked;
}
export function similarProducts(target, products) {
 if(!target.category||target.category==='unknown')return [];
 const model=contentModel([target,...products]),base=model.vector(target);
 const known=p=>new Set(features(p).filter(x=>!x.startsWith('category:')&&!x.endsWith(':unknown')));
 const targetFacts=known(target), seen=new Set([target.id]),urls=new Set([target.url].filter(Boolean));
 const shape=/\b(linen|cotton|denim|lace|satin|knit|pleated|pencil|floral|striped|wide|wrap|tiered|a-line)\b/g;
 const details=p=>new Set(`${p.title} ${p.description||''}`.toLowerCase().match(shape)||[]);
 const baseDetails=details(target);
 return products.filter(p=>p.id!==target.id&&p.category===target.category).map(p=>{
   const overlap=[...known(p)].filter(x=>targetFacts.has(x)).length;
   const materialShape=[...details(p)].filter(x=>baseDetails.has(x)).length;
   const content=cosine(base,model.vector(p));
   return {...p,similarity:content*6+overlap*0.5+materialShape*1.5,related:content>=0.18&&(overlap>0||materialShape>0||content>=0.35)};
 }).filter(p=>p.related).sort((a,b)=>b.similarity-a.similarity||a.id.localeCompare(b.id)).filter(p=>{
   if(seen.has(p.id)||(p.url&&urls.has(p.url)))return false;seen.add(p.id);if(p.url)urls.add(p.url);return true;
 }).slice(0,8);
}
