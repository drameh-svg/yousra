const iso=value=>/^[A-Z]{3}$/.test(String(value||'').toUpperCase())?String(value).toUpperCase():null;
export function amount(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>0?value:null;
 const s=String(value??'').trim();if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))return null;
 const n=Number(s.replaceAll(',',''));return n>0&&Number.isFinite(n)?n:null;
}
export function moneyValue(value,currency){
 if(value&&typeof value==='object')return moneyValue(value.value??value.amount??value.price,value.currency??value.priceCurrency??currency);
 if(typeof value==='number')return {price:amount(value),currency:iso(currency),priceFrom:false};
 const text=String(value??'').trim(),match=text.match(/^(from\s+)?(?:(USD|EUR|GBP|CAD|AUD)\s*|US\s*\$\s*|(\$|€|£)\s*)?([\d,]+(?:\.\d{1,2})?)(?:\s*(USD|EUR|GBP|CAD|AUD))?$/i);
 if(!match)return {price:null,currency:null,priceFrom:false};
 const unit=iso(match[2]||match[5]||currency)||({'$':'USD','€':'EUR','£':'GBP'}[match[3]]||null);
 return {price:amount(match[4]),currency:unit,priceFrom:!!match[1]};
}
export function selectProduct(nodes,url){
 const list=nodes.filter(n=>[n['@type']].flat().some(t=>['Product','ProductGroup'].includes(t)));
 const target=new URL(url),variant=target.searchParams.get('variant');
 const urls=n=>[n.url,n['@id']].filter(x=>typeof x==='string').map(x=>{try{return new URL(x,url)}catch{return null}}).filter(Boolean);
 const same=u=>u.hostname.replace(/^www\./,'')===target.hostname.replace(/^www\./,'')&&u.pathname.replace(/\/$/,'')===target.pathname.replace(/\/$/,'');
 if(variant){const exact=list.find(n=>urls(n).some(u=>same(u)&&u.searchParams.get('variant')===variant));if(exact)return exact;}
 return list.find(n=>urls(n).some(same))||(list.length===1?list[0]:list.find(n=>[n['@type']].flat().includes('ProductGroup')));
}
export function offerPrice(product,url){
 if(!product)return {price:null,currency:null};
 const offers=[product.offers].flat().filter(x=>x&&typeof x==='object');
 const target=new URL(url),selected=target.searchParams.get('variant');
 const matched=selected?offers.filter(o=>{try{return new URL(o.url,url).searchParams.get('variant')===selected}catch{return false}}):[];
 const pool=matched.length?matched:offers;
 const candidates=[];
 for(const offer of pool){
  if(offer.validForMemberTier||/member|subscription/i.test(String(offer.name||'')))continue;
  const specs=[offer.priceSpecification].flat().filter(x=>x&&typeof x==='object'&&!x.validForMemberTier&&!/StrikethroughPrice|ListPrice/i.test(String(x.priceType||'')));
  const values=offer.price!=null?[{price:offer.price,priceCurrency:offer.priceCurrency}]:offer.lowPrice!=null?[{price:offer.lowPrice,priceCurrency:offer.priceCurrency,high:offer.highPrice,aggregate:true}]:specs;
  for(const spec of values){const value=moneyValue(spec.price,spec.priceCurrency||offer.priceCurrency);if(value.price!==null&&value.currency)candidates.push({...value,priceFrom:!!spec.aggregate||value.priceFrom,high:amount(spec.high),availability:offer.availability});}
 }
 const units=new Set(candidates.map(x=>x.currency));if(units.size!==1)return {price:null,currency:null};
 const available=candidates.filter(x=>!String(x.availability||'').includes('OutOfStock'));
 const sorted=(available.length?available:candidates).sort((a,b)=>a.price-b.price);if(!sorted.length)return {price:null,currency:null};
 const low=sorted[0],high=Math.max(...sorted.map(x=>x.high||x.price));
 return {price:low.price,currency:low.currency,priceFrom:low.priceFrom||high!==low.price,priceRange:high!==low.price?{min:low.price,max:high}:null,priceSource:'retailer-structured-data'};
}
export function htmlPrice(product,meta,html,url){
 const structured=offerPrice(product,url);if(structured.price!==null)return structured;
 for(const [p,c]of [['product:price:amount','product:price:currency'],['og:price:amount','og:price:currency']]){
  const value=moneyValue(meta[p],meta[c]);if(value.price!==null&&value.currency)return {...value,priceRange:null,priceSource:'retailer-meta'};
 }
 // Only use unambiguous microdata, never prices from a recommendation carousel.
 const prices=[],currencies=[];
 for(const tag of html.matchAll(/<(?:meta|span|data)\b[^>]*itemprop\s*=\s*["'](price|priceCurrency)["'][^>]*>/gi)){
  const content=tag[0].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
  if(content)(tag[1].toLowerCase()==='price'?prices:currencies).push(content);
 }
 if(prices.length===1&&new Set(currencies).size===1){const value=moneyValue(prices[0],currencies[0]);if(value.price!==null&&value.currency)return {...value,priceRange:null,priceSource:'retailer-microdata'};}
 return {price:null,currency:null,priceFrom:false,priceRange:null,priceSource:null};
}
export function shopifyPrice(data,currency,variant){
 const variants=Array.isArray(data?.variants)?data.variants:[];
 const chosen=variant?variants.find(v=>String(v.id)===variant):null;
 const available=variants.filter(v=>v.available!==false);
 const values=(chosen?[chosen]:available.length?available:variants).map(v=>v.price).filter(x=>typeof x==='number'&&Number.isFinite(x)&&x>0);
 if(variant&&!chosen||!values.length||!iso(currency))return {price:null,currency:null};
 const min=Math.min(...values)/100,max=Math.max(...values)/100;
 return {price:min,currency:iso(currency),priceFrom:min!==max,priceRange:min!==max?{min,max}:null,priceSource:'retailer-product-api'};
}
export function indexedPrice(p){
 const value=moneyValue(p.price??p.extractedPrice??p.attributes?.Price??p.attributes?.price,p.currency||p.priceCurrency);
 return value.price!==null&&value.currency?{...value,priceRange:null,priceSource:'search-index'}:{price:null,currency:null};
}
function identity(value){try{const u=new URL(value);u.hash='';if(/(^|\.)amazon\.com$/i.test(u.hostname)){const asin=u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];if(asin)return 'amazon:'+asin.toUpperCase();}for(const k of [...u.searchParams.keys()])if(/^utm_|^(gclid|fbclid|srsltid)$/i.test(k))u.searchParams.delete(k);u.hostname=u.hostname.replace(/^www\./,'');u.searchParams.sort();return u.href.replace(/\/$/,'')}catch{return null}}
export function matchingIndexedPrice(product,results){
 for(const p of results){if(identity(p.link)!==identity(product.url))continue;const value=indexedPrice(p);if(value.price!==null)return value;}
 return {price:null,currency:null};
}

export function productAvailability(product,url){
 const target=new URL(url),variant=target.searchParams.get('variant');
 let offers=[product?.offers].flat().filter(x=>x&&typeof x==='object');
 if(variant){const selected=offers.filter(o=>{try{return new URL(o.url,url).searchParams.get('variant')===variant}catch{return false}});if(selected.length)offers=selected;}
 const states=offers.map(o=>String(o.availability||'').split('/').pop().toLowerCase());
 if(states.some(s=>['instock','limitedavailability','onlineonly'].includes(s)))return 'in_stock';
 if(states.length&&states.every(s=>['outofstock','soldout','discontinued'].includes(s)))return 'out_of_stock';
 return 'unknown';
}
export function shopifyAvailability(data,variant){
 const variants=Array.isArray(data?.variants)?data.variants:[];
 const selected=variant?variants.filter(v=>String(v.id)===variant):variants;
 if(selected.some(v=>v.available===true))return 'in_stock';
 if(selected.length&&selected.every(v=>v.available===false))return 'out_of_stock';
 return 'unknown';
}
