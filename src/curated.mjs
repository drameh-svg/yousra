import {products} from '../lib/products.ts';
import {inferAttributes} from './discovery.mjs';
export const curatedProducts=products.map(p=>({
 ...inferAttributes(`${p.title} ${p.description}`),id:p.id,title:p.title,description:p.description,
 store:p.store,brand:p.store,url:p.storeUrl,image:p.image,images:[p.image],
 price:Number(p.price.replace(/[^0-9.]/g,''))||null,currency:'USD',sizes:p.sizes,
 styles:[p.aesthetic.toLowerCase()],confidence:0.35,shippingUS:'unknown',availability:'unknown',
 analysisSource:'curated-reference',demo:true
}));
