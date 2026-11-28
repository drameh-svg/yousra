import { HttpError, number, text } from './util.mjs';
import { normalizeCategory, normalizeStyle, colorFamilies } from './taxonomy.mjs';

export const categories = ['dress','skirt','top','pants','outerwear'];
export const choices = {
  sleeves:['any','sleeveless','short','elbow','long'], neckline:['any','open','medium','high'],
  length:['any','mini','knee','midi','maxi'], fit:['any','fitted','regular','loose','wide'],
  transparency:['any','opaque'], slits:['any','none'], cutouts:['any','none'],
};
export const defaultPreferences = () => ({
  styles:[],colors:[],sizes:[],preferredBrands:[],excludedBrands:[],budgetMax:null,pantsAllowed:true,allowLayering:false,destination:'US',
  rules:Object.fromEntries(categories.map(c=>[c,{sleeves:'any',neckline:'any',length:'any',fit:'any',transparency:'any',slits:'any',cutouts:'any'}])),
});
export function validatePreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400,'Invalid preferences');
  const out = defaultPreferences();
  for (const field of ['styles','colors','sizes','preferredBrands','excludedBrands']) {
    if (input[field] !== undefined && (!Array.isArray(input[field]) || input[field].length>30 || input[field].some(x=>typeof x!=='string'))) throw new HttpError(400,`Invalid ${field}`);
    out[field] = (input[field] || []).map(x=>text(x,60).toLowerCase()).filter(Boolean);
  }
  for (const field of ['pantsAllowed','allowLayering']) { if (input[field] !== undefined && typeof input[field] !== 'boolean') throw new HttpError(400,`Invalid ${field}`); out[field]=input[field]??out[field]; }
  if (input.destination && input.destination !== 'US') throw new HttpError(400,'MVP shipping destination is US');
  out.budgetMax = input.budgetMax === null || input.budgetMax === undefined || input.budgetMax === '' ? null : number(input.budgetMax,1,100000,null);
  for (const c of categories) for (const [field,allowed] of Object.entries(choices)) {
    const value = input.rules?.[c]?.[field] ?? 'any';
    if (!allowed.includes(value)) throw new HttpError(400,`Invalid ${c} ${field}`);
    out.rules[c][field]=value;
  }
  return out;
}
const ranks = {sleeves:['sleeveless','short','elbow','long'],neckline:['open','medium','high'],length:['mini','knee','midi','maxi'],fit:['fitted','regular','loose','wide']};
// Coverage presets used by onboarding. Kept here too so human labels and evaluation use the same definitions.
export const LEVELS=['not_modest','relaxed','moderate','conservative'];
export function presetRules(level, category) {
  const long=['dress','skirt'].includes(category);
  if(level==='conservative')return {sleeves:'long',neckline:'high',fit:'loose',length:long?'maxi':'any',transparency:'opaque',slits:'none',cutouts:'none'};
  if(level==='moderate')return {sleeves:'elbow',neckline:'medium',fit:'any',length:long?'midi':'any',transparency:'opaque',slits:'any',cutouts:'none'};
  return {sleeves:'any',neckline:'any',fit:'any',length:'any',transparency:'any',slits:'any',cutouts:'any'};
}
const strictness=(field,value)=>!value||value==='any'?-1:ranks[field]?ranks[field].indexOf(value):1;
const fieldsFor=category=>category==='pants'||category==='skirt'?['length','fit','transparency','slits','cutouts']:Object.keys(choices);
// True when rule set a asks for at least as much coverage as rule set b on every field.
export function atLeastAsStrict(a,b,category){return fieldsFor(category).every(f=>strictness(f,a?.[f])>=strictness(f,b?.[f]));}
const minLabels=()=>Math.max(1,Number(process.env.HUMAN_LABEL_MIN||2));
// Shopper labels: majority level once enough people agree (a single "not modest" vote is enough to exclude).
export function humanVerdict(product) {
  const h=product.humanModesty;if(!h?.count)return null;
  if((h.counts?.not_modest||0)>=1&&h.level==='not_modest')return {level:'not_modest',count:h.count};
  if(h.count<minLabels()||(h.share??0)<0.6)return null;
  return {level:h.level,count:h.count};
}
function attributeMatch(product, prefs) {
  const a = product.attributes || {}, rule = prefs.rules?.[product.category] || {};
  if (product.category === 'pants' && !prefs.pantsAllowed) return {pass:false,confidence:1,reasons:['Pants excluded']};
  let unknown=0, checked=0; const reasons=[];
  for (const field of fieldsFor(product.category)) {
    const desired=rule[field]; if (!desired || desired==='any') continue; checked++;
    const value=a[field]; const confidence=product.evidence?.[field]?.confidence ?? product.confidence ?? 0;
    if (!value || value==='unknown' || confidence<0.65) { unknown++; reasons.push(`${field} uncertain`); continue; }
    let pass = ranks[field] ? ranks[field].indexOf(value)>=ranks[field].indexOf(desired) : value===desired;
    if (!pass && prefs.allowLayering && ['sleeves','neckline','transparency'].includes(field)) { unknown++; reasons.push(`${field} needs layering`); pass=true; }
    if (!pass) return {pass:false,confidence,reasons:[`${field} does not match`]};
  }
  if (!product.category || product.category==='unknown') unknown++;
  return {pass:true,confidence:checked?Math.max(0.1,1-unknown/checked):Math.min(product.confidence||0.25,1),reasons};
}
export function modestyMatch(product, prefs) {
  const base=attributeMatch(product,prefs),human=humanVerdict(product);
  if(!human||base.reasons[0]==='Pants excluded')return base;
  const rule=prefs.rules?.[product.category]||{},strictest=fieldsFor(product.category).some(f=>strictness(f,rule[f])>=0);
  if(human.level==='not_modest')return strictest?{pass:false,confidence:1,reasons:['Shoppers rated this not modest']}:base;
  const index=LEVELS.indexOf(human.level),above=LEVELS[index+1];
  // Shoppers placed it at this level, so it fails anyone who asks for the next level up.
  if(above&&atLeastAsStrict(rule,presetRules(above,product.category),product.category))return {pass:false,confidence:0.9,reasons:[`Shoppers rated this ${human.level}`]};
  if(atLeastAsStrict(presetRules(human.level,product.category),rule,product.category))return {pass:true,confidence:Math.max(base.confidence,0.9),reasons:[`Coverage confirmed by ${human.count} shopper${human.count===1?'':'s'}`]};
  return base;
}
// The most covering preset the model's attributes verifiably satisfy. Unknown or low-confidence fields do
// not count as covered, so evaluation measures what the model actually saw.
export function predictedLevel(product) {
  const a=product.attributes||{};
  const verified=(field,desired)=>{
    if(!desired||desired==='any')return true;
    const value=a[field],confidence=product.evidence?.[field]?.confidence ?? product.confidence ?? 0;
    if(!value||value==='unknown'||confidence<0.65)return false;
    return ranks[field]?ranks[field].indexOf(value)>=ranks[field].indexOf(desired):value===desired;
  };
  for(const level of ['conservative','moderate']){
    const rule=presetRules(level,product.category);
    if(fieldsFor(product.category).every(f=>verified(f,rule[f])))return level;
  }
  return 'relaxed';
}
export function filtersFrom(input={}) {
  const o = {};
  for (const k of ['style','color','size','category','shipping']) if (input[k]) o[k]=text(input[k],60).toLowerCase().trim();
  // The For You panel sends labels like "Dresses", "Abayas", "90s Chic"; accept them in any casing or plural.
  if (o.category) { const c=normalizeCategory(o.category); if(!c)throw new HttpError(400,'Unknown clothing category'); o.category=c; }
  // Persist / filter on classifier ids (90s_minimalism, clean_girl, …).
  if (o.style) o.style=normalizeStyle(o.style)[0]||o.style;
  if (o.color) o.color=colorFamilies([o.color])[0]||o.color;
  // Brand pages: restrict to one retailer by its domain (and name, for marketplaces that list the brand).
  if (input.brand) { const d=String(input.brand).toLowerCase().trim().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,''); if(!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))throw new HttpError(400,'Invalid brand'); o.brand=d; }
  if (input.brandName) o.brandName=text(input.brandName,60);
  for (const k of ['minPrice','maxPrice']) if (input[k]!==undefined && input[k]!=='' && input[k]!==null) { const n=Number(input[k]); if (!Number.isFinite(n)||n<0||n>100000) throw new HttpError(400,'Invalid price'); o[k]=n; }
  if (o.minPrice!==undefined&&o.maxPrice!==undefined&&o.minPrice>o.maxPrice) throw new HttpError(400,'Minimum price exceeds maximum');
  return o;
}
