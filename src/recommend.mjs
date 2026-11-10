// Sparse TF-IDF content vectors. No model downloads, training service or user-to-user data.
import {tokens} from './rank.mjs';
const ignored=new Set(['a','an','the','and','or','for','with','women','womens','dress','clothing','unknown','any']);
export function contentVector(product) {
  const vector={};const add=(k,n)=>vector[k]=(vector[k]||0)+n;
  for(const s of product.styles||[])add(`style:${s}`,3);
  for(const c of product.colors||[])add(`color:${c}`,2);
  if(product.category&&product.category!=='unknown')add(`category:${product.category}`,1.5);
  for(const [k,v] of Object.entries(product.attributes||{}))if(v&&!ignored.has(v))add(`${k}:${v}`,1);
  for(const t of new Set(tokens(product.title)))if(!ignored.has(t)&&t.length>2)add(`text:${t}`,0.6);
  return vector;
}
export function cosine(a,b) {
  let dot=0,aa=0,bb=0;
  for(const [k,v]of Object.entries(a)){aa+=v*v;dot+=v*(b[k]||0);}
  for(const v of Object.values(b))bb+=v*v;
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
export function contentModel(products) {
  const unique=[...new Map(products.map(p=>[p.id,p])).values()];
  const raw=new Map(unique.map(p=>[p.id,contentVector(p)])),df={};
  for(const v of raw.values())for(const k of Object.keys(v))df[k]=(df[k]||0)+1;
  const vector=p=>Object.fromEntries(Object.entries(raw.get(p.id)||contentVector(p)).map(([k,v])=>[k,v*(1+Math.log((unique.length+1)/((df[k]||0)+1)))]));
  return {vector};
}
export function diversify(items, model) {
  const result=[];
  // Confidence tiers are never mixed, including during diversity re-ranking.
  for(const uncertain of [false,true]) {
    const remaining=items.filter(p=>p.match.uncertain===uncertain);
    const chosen=[];
    while(remaining.length){
      let best=0,bestScore=-Infinity;
      for(let i=0;i<remaining.length;i++){
        const p=remaining[i];
        const recent=chosen.slice(-8);
        const similarity=recent.length?Math.max(...recent.map(q=>Math.max(0,cosine(model.vector(p),model.vector(q))))):0;
        const retailerPenalty=recent.filter(q=>q.store&&q.store===p.store).length*0.7;
        const score=p.match.score-similarity*3-retailerPenalty;
        if(score>bestScore){best=i;bestScore=score;}
      }
      chosen.push(remaining.splice(best,1)[0]);
    }
    result.push(...chosen);
  }
  return result;
}
