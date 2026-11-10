import {contentModel,cosine,diversify} from './recommend.mjs';
import { modestyMatch } from './preferences.mjs';

export const tokens = value => (String(value||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).map(x=>({dresses:'dress',skirts:'skirt',shirts:'shirt',blouses:'blouse',sweaters:'sweater',coats:'coat',jackets:'jacket',sleeves:'sleeve',trousers:'pants'}[x]||x));
export function features(p) { return [...(p.styles||[]).map(x=>`style:${x}`),...(p.colors||[]).map(x=>`color:${x}`),`category:${p.category}`, ...Object.entries(p.attributes||{}).filter(([,v])=>v&&v!=='unknown'&&v!=='any').map(([k,v])=>`${k}:${v}`)]; }
export function preferenceWeights(profile, interactions, products, swipePhotos) {
  const weights={};
  const add=(key,v)=>weights[key]=(weights[key]||0)+v;
  for (const s of profile.preferences.styles) add(`style:${s}`,2);
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
    if(p.excluded || p.productPage===false || p.availability==='out_of_stock')return [];
    if(!p.demo&&p.url&&p.productPage!==true&&/\/(collections|categories|category|search|cat|browse)(\/|$)|\/shop\/gender/i.test(new URL(p.url).pathname))return [];
    if(feed&&hidden.has(p.id)) return [];
    if(prefs.excludedBrands.some(b=>[p.brand,p.store].some(x=>String(x).toLowerCase().includes(b)))) return [];
    if(filters.category&&p.category!==filters.category) return [];
    const max=filters.maxPrice??prefs.budgetMax;
    if(max!=null && (p.price===null||p.price>max||p.currency!=='USD')) return [];
    if(filters.minPrice!=null && (p.price===null||p.price<filters.minPrice||p.currency!=='USD')) return [];
    if(filters.color&&!p.colors?.includes(filters.color)) return [];
    if(filters.style&&!p.styles?.includes(filters.style)) return [];
    if(filters.size&&!p.sizes?.map(x=>x.toLowerCase()).includes(filters.size)) return [];
    if(!filters.size&&prefs.sizes?.length&&p.sizes?.length&&!p.sizes.some(x=>prefs.sizes.includes(String(x).toLowerCase())))return [];
    if(filters.shipping==='confirmed'&&p.shippingUS!=='yes') return [];
    if(p.shippingUS==='no') return [];
    const modest=modestyMatch(p,prefs); if(!modest.pass) return [];
    const words=tokens(`${p.title} ${p.description} ${p.category} ${(p.styles||[]).join(' ')} ${(p.colors||[]).join(' ')}`);
    const lexical=queryTokens.length?queryTokens.filter(t=>words.includes(t)||words.includes(t.replace(/s$/,''))).length/queryTokens.length:0;
    if(queryTokens.length&&lexical===0) return [];
    const taste=features(p).reduce((sum,f)=>sum+(weights[f]||0),0)/Math.sqrt(Math.max(1,features(p).length));
    const learned=signals.reduce((sum,x)=>sum+x.weight*cosine(model.vector(p),model.vector(x.p)),0)/Math.sqrt(Math.max(1,signals.length));
    const uncertain=modest.confidence<0.65 || (p.analysisSource!=='vision+description'&&p.analysisSource!=='curated-reference');
    // Separate confidence buckets: an uncertain item cannot outrank a confident match.
    const score=(uncertain?0:10000)+lexical*50+taste+learned*4+modest.confidence*10+(p.shippingUS==='yes'?2:0);
    return [{...p,match:{score:Math.round(score*100)/100,confidence:modest.confidence,uncertain,reasons:[...modest.reasons,...(learned>0.3?['Similar to pieces you liked or saved']:[]),...(p.styles?.some(x=>prefs.styles.includes(x))?['Matches your styles']:[])]}}];
  }).sort((a,b)=>b.match.score-a.match.score||a.id.localeCompare(b.id));
  return feed?diversify(ranked,model):ranked;
}
export function similarProducts(target, products) {
  const base=new Set(features(target));
  return products.filter(p=>p.id!==target.id).map(p=>({...p,similarity:features(p).filter(x=>base.has(x)).length+(p.category===target.category?3:0)})).sort((a,b)=>b.similarity-a.similarity).slice(0,8);
}
