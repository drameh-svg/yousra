import { HttpError, number, text } from './util.mjs';

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
export function modestyMatch(product, prefs) {
  const a = product.attributes || {}, rule = prefs.rules?.[product.category] || {};
  if (product.category === 'pants' && !prefs.pantsAllowed) return {pass:false,confidence:1,reasons:['Pants excluded']};
  let unknown=0, checked=0; const reasons=[];
  const relevant = product.category === 'pants' || product.category === 'skirt' ? ['length','fit','transparency','slits','cutouts'] : Object.keys(choices);
  for (const field of relevant) {
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
export function filtersFrom(input={}) {
  const o = {};
  for (const k of ['style','color','size','category','shipping']) if (input[k]) o[k]=text(input[k],60).toLowerCase();
  if (o.category && !categories.includes(o.category)) throw new HttpError(400,'Unknown clothing category');
  for (const k of ['minPrice','maxPrice']) if (input[k]!==undefined && input[k]!=='' && input[k]!==null) { const n=Number(input[k]); if (!Number.isFinite(n)||n<0||n>100000) throw new HttpError(400,'Invalid price'); o[k]=n; }
  if (o.minPrice!==undefined&&o.maxPrice!==undefined&&o.minPrice>o.maxPrice) throw new HttpError(400,'Minimum price exceeds maximum');
  return o;
}
