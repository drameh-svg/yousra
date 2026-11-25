import {external} from './network.mjs';
const cache=new Map(),pending=new Map();
// Only catalog-controlled image URLs are accepted; callers cannot supply an arbitrary URL.
// Zoom the main photo onto the sale garment (Gemini's focus box), so a skirt styled with a bra top shows as
// the skirt. Pads the box, widens it to the card's 3:4 shape and keeps it inside the photo. Returns null when
// the crop would be almost the whole photo anyway.
export function cropBox(focus,width,height,aspect=3/4){
 if(!focus||![focus.x,focus.y,focus.w,focus.h].every(Number.isFinite)||!width||!height)return null;
 let w=focus.w*width,h=focus.h*height,x=focus.x*width,y=focus.y*height;
 const pad=0.08;x-=w*pad;y-=h*pad;w*=1+2*pad;h*=1+2*pad;
 if(w/h<aspect){const nw=h*aspect;x-=(nw-w)/2;w=nw;}else{const nh=w/aspect;y-=(nh-h)/2;h=nh;}
 w=Math.min(w,width);h=Math.min(h,height);
 x=Math.max(0,Math.min(width-w,x));y=Math.max(0,Math.min(height-h,y));
 if(w*h>0.85*width*height)return null;
 return {left:Math.round(x),top:Math.round(y),width:Math.max(1,Math.round(w)),height:Math.max(1,Math.round(h))};
}
async function cropToFocus(bytes,focus){
 try{
  const sharp=(await import('sharp')).default,image=sharp(bytes).rotate(),meta=await image.metadata();
  const box=cropBox(focus,meta.width,meta.height);if(!box)return null;
  return {bytes:await image.extract(box).jpeg({quality:85}).toBuffer(),mime:'image/jpeg'};
 }catch{return null;}
}
export async function productImage(product,index=0,{full=false}={}){
 const urls=[...new Set([...(product.images||[]),product.image,product.thumbnail].filter(Boolean))];
 const selected=urls[index]?[urls[index],...urls.filter((_,i)=>i!==index)]:urls;
 const crop=index===0&&!full&&!!product.focus;
 const key=`${product.id}:${index}:${crop?'crop:':''}${selected.join('|')}`;
 let value=cache.get(key);
 if(value&&value.expires>Date.now())return new Response(value.bytes,{headers:{'content-type':value.mime,'cache-control':'private, max-age=3600','x-content-type-options':'nosniff'}});
 if(!pending.has(key))pending.set(key,(async()=>{
  for(const url of selected.slice(0,4))try{
   const r=await external(url,{maxBytes:3000000,accept:'image/*',redirects:2});
   const mime=String(r.headers['content-type']||'').split(';')[0];
   if(r.status===200&&['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(mime)){const cropped=crop&&url===selected[0]?await cropToFocus(r.bytes,product.focus):null;return {...(cropped||{bytes:r.bytes,mime}),expires:Date.now()+3600000};}
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
