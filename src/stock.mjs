import {refreshProductPrice} from './discovery.mjs';
const TTL=30*60*1000;
export function verifiedAvailable(p,time=Date.now()){
 const age=time-Date.parse(p.availabilityCheckedAt||'');
 return p.availability==='in_stock'&&Number.isFinite(age)&&age>=0&&age<TTL;
}
// Check a bounded batch before returning any live cards; unknown stock stays hidden.
export async function checkAvailability(products){
 const due=products.filter(p=>!p.demo&&!verifiedAvailable(p)&&!(Date.now()-Date.parse(p.availabilityAttemptedAt||'')<TTL)).slice(0,6);
 const updates=new Map();
 for(let i=0;i<due.length;i+=3)await Promise.allSettled(due.slice(i,i+3).map(async p=>updates.set(p.id,await refreshProductPrice(p,{allowSearch:false,stockOnly:true}))));
 return products.map(p=>updates.get(p.id)||p).filter(p=>verifiedAvailable(p));
}
