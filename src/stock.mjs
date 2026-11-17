import {refreshProductPrice} from './discovery.mjs';
const TTL=30*60*1000;
export function verifiedAvailable(p,time=Date.now()){
 const age=time-Date.parse(p.availabilityCheckedAt||'');
 return p.availability==='in_stock'&&Number.isFinite(age)&&age>=0&&age<TTL;
}
// Strict mode (REQUIRE_VERIFIED_STOCK=true) only shows listings confirmed in stock in the last 30 minutes.
// By default, listings are shown unless the retailer confirmed they are sold out or removed; retailers that
// block automated checks (for example Amazon and SHEIN) would otherwise never appear. The UI labels unknown stock.
export const strictStock=()=>process.env.REQUIRE_VERIFIED_STOCK==='true';
export function displayable(p,time=Date.now()){return strictStock()?verifiedAvailable(p,time):p.availability!=='out_of_stock';}
// Check a bounded batch of the top listings in parallel before returning cards.
export async function checkAvailability(products){
 const due=products.filter(p=>!p.demo&&!verifiedAvailable(p)&&!(Date.now()-Date.parse(p.availabilityAttemptedAt||'')<TTL)).slice(0,6);
 const updates=new Map();
 await Promise.allSettled(due.map(async p=>updates.set(p.id,await refreshProductPrice(p,{allowSearch:false,stockOnly:true}))));
 return products.map(p=>updates.get(p.id)||p).filter(p=>displayable(p));
}
