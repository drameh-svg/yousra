import {external} from './network.mjs';
const cache=new Map(),pending=new Map();
// Only catalog-controlled image URLs are accepted; callers cannot supply an arbitrary URL.
export async function productImage(product,index=0){
 const urls=[...new Set([...(product.images||[]),product.image,product.thumbnail].filter(Boolean))];
 const selected=urls[index]?[urls[index],...urls.filter((_,i)=>i!==index)]:urls;
 const key=`${product.id}:${index}:${selected.join('|')}`;
 let value=cache.get(key);
 if(value&&value.expires>Date.now())return new Response(value.bytes,{headers:{'content-type':value.mime,'cache-control':'private, max-age=3600','x-content-type-options':'nosniff'}});
 if(!pending.has(key))pending.set(key,(async()=>{
  for(const url of selected.slice(0,4))try{
   const r=await external(url,{maxBytes:3000000,accept:'image/*',redirects:2});
   const mime=String(r.headers['content-type']||'').split(';')[0];
   if(r.status===200&&['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(mime))return {bytes:r.bytes,mime,expires:Date.now()+3600000};
  }catch{}
  return null;
 })());
 try{value=await pending.get(key);}finally{pending.delete(key);}
 if(!value)return new Response(null,{status:404,headers:{'cache-control':'no-store'}});
 // Keep memory bounded, even when a user scrolls for a long session.
 while(cache.size>=24)cache.delete(cache.keys().next().value);
 cache.set(key,value);
 return new Response(value.bytes,{headers:{'content-type':value.mime,'cache-control':'private, max-age=3600','x-content-type-options':'nosniff'}});
}
