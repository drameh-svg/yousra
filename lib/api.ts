export type Category = 'dress' | 'skirt' | 'top' | 'pants' | 'outerwear';
export type Rule = Record<'sleeves'|'neckline'|'length'|'fit'|'transparency'|'slits'|'cutouts', string>;
export interface Preferences {
  styles:string[]; colors:string[]; sizes:string[]; preferredBrands?:string[]; excludedBrands:string[]; budgetMax:number|null;
  pantsAllowed:boolean; allowLayering:boolean; destination:'US'; rules:Record<Category,Rule>;
}
export interface Profile { coveragePreset?:string; id:string; preferences:Preferences; onboarded:boolean; swipes:{id:string;like:boolean}[]; version:number }
export interface Account {id:string;email:string}
export interface Collection {id:string;name:string;productIds:string[];system?:boolean}
export interface Reaction {liked?:boolean;disliked?:boolean;clicks?:number}
export interface ApiProduct {
 id:string;title:string;description:string;store:string;brand?:string;price:number|null;currency:string|null;priceFrom?:boolean;priceRange?:{min:number;max:number}|null;priceSource?:string;priceCheckedAt?:string;priceNote?:string;
 image:string|null;images:string[];styles:string[];colors:string[];category:Category|'unknown';sizes:string[];
 shippingUS:'yes'|'no'|'unknown';availability:string;availabilityCheckedAt?:string|null;attributes:Partial<Rule>;analysisSource:string;
 evidence?:Record<string,{confidence:number;reason:string}>;confidence:number;demo?:boolean;affiliate?:boolean;
 shopPath:string;sourceUrl:string;shopAvailable?:boolean;pageFetchedAt?:string;analyzedAt?:string;
 match?:{uncertain:boolean;reasons:string[]};
}
export interface Results {
 items:ApiProduct[];total:number;nextOffset:number|null;feedId?:string;cursorEnd?:number;canDiscover?:boolean;
 excludedIds?:string[];busy?:boolean;jobId?:string;canAdvance?:boolean;status?:string;processed?:number;
 discovered?:number;warnings?:string[];demo?:boolean;
}
export interface Filters {style?:string;color?:string;size?:string;category?:string;minPrice?:string;maxPrice?:string;shipping?:string}
export class ApiError extends Error {constructor(public status:number,message:string){super(message)}}
let refreshInFlight:Promise<boolean>|null=null;
export async function api<T>(path:string,method='GET',data?:unknown,signal?:AbortSignal,retry=true):Promise<T>{
 const response=await fetch('/api'+path,{method,credentials:'same-origin',signal,headers:method==='GET'?{}:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
 if(response.status===401&&retry&&!path.startsWith('/auth/')){
  if(!refreshInFlight)refreshInFlight=fetch('/api/auth/refresh',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.ok).finally(()=>{refreshInFlight=null});
  if(await refreshInFlight)return api<T>(path,method,data,signal,false);
 }
 const result=await response.json();
 if(!response.ok)throw new ApiError(response.status,result.error||'Something went wrong. Please try again.');
 return result as T;
}
export const categories:{id:Category;label:string}[]=[{id:'dress',label:'Dresses'},{id:'skirt',label:'Skirts'},{id:'top',label:'Tops'},{id:'pants',label:'Pants'},{id:'outerwear',label:'Outerwear'}];
export const allStyles=['minimal','romantic','streetwear','classic','casual','elegant','boho','sporty'];
export const colors=['black','white','blue','navy','green','pink','red','brown','beige','cream','gray','purple','yellow'];
export const pretty=(s:string)=>s.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export function money(p:ApiProduct){
 if(p.price===null||!p.currency)return 'Price unknown';
 try{return (p.priceFrom?'From ':'')+new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency}).format(p.price)}catch{return `${p.currency} ${p.price.toFixed(2)}`}
}
