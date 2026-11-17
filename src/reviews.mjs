// Journey reviews: one survey per submission, stored as kind='review' records (owner = signed-in user or null).
import { store } from './store.mjs';
import { hash, HttpError, id, json, now, text } from './util.mjs';

export const STAGES=[
 {id:'signup',label:'Creating your account'},
 {id:'swipes',label:'Style swipes'},
 {id:'coverage',label:'Coverage questions'},
 {id:'feed',label:'Your For You feed'},
 {id:'search',label:'Searching for a piece'},
 {id:'save',label:'Liking & saving'},
 {id:'shop',label:'Shopping at the retailer'},
];
export const TAGS=['Easy','Beautiful','Fast','Accurate','Fun','Confusing','Slow','Not modest enough','Wrong prices','Missing photos','Too few results','Skipped it'];
const FOUND=['yes','almost','no','not_yet'];
const SOURCES=['instagram','friend','campus','creator','other'];
const int=(v,min,max)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:null;};

export function validateReview(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new HttpError(400,'Invalid review');
 const stages={};
 for(const s of STAGES){
  const raw=input.stages?.[s.id];if(!raw||typeof raw!=='object')continue;
  const rating=raw.rating===null||raw.rating===undefined?null:int(raw.rating,1,5);
  if(raw.rating!==null&&raw.rating!==undefined&&rating===null)throw new HttpError(400,`Rate ${s.label} from 1 to 5`);
  const tags=Array.isArray(raw.tags)?[...new Set(raw.tags.filter(t=>TAGS.includes(t)))].slice(0,6):[];
  const note=text(raw.note,500);
  if(rating!==null||tags.length||note)stages[s.id]={rating,tags,...(note?{note}:{})};
 }
 const overall=int(input.overall,1,5),recommend=input.recommend===null||input.recommend===undefined?null:int(input.recommend,0,10);
 if(overall===null)throw new HttpError(400,'Choose an overall rating');
 if(input.recommend!==null&&input.recommend!==undefined&&recommend===null)throw new HttpError(400,'Recommendation must be 0 to 10');
 const modestyAccuracy=input.modestyAccuracy===null||input.modestyAccuracy===undefined?null:int(input.modestyAccuracy,1,5);
 const review={
  stages,overall,recommend,modestyAccuracy,
  foundPiece:FOUND.includes(input.foundPiece)?input.foundPiece:null,
  heardFrom:SOURCES.includes(input.heardFrom)?input.heardFrom:null,
  loved:text(input.loved,2000),improve:text(input.improve,4000),wish:text(input.wish,1000),
  quoteOk:input.quoteOk===true,
  contact:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.contact,254))?text(input.contact,254).toLowerCase():'',
  name:text(input.name,80),
 };
 if(!Object.keys(stages).length&&!review.loved&&!review.improve&&!review.wish)throw new HttpError(400,'Tell us about at least one part of your journey');
 return review;
}
export async function submitReview(data,{userAccount,ip,userAgent}) {
 if(!await store.reserve(`review:${hash(ip||'unknown').slice(0,20)}`,12,1000000))throw new HttpError(429,'Thank you! You have shared a lot of feedback today. Please try again tomorrow.');
 const review={...validateReview(data),id:id(),userId:userAccount?.id||null,email:userAccount?.email||null,createdAt:now(),userAgent:text(userAgent,200),source:'journey-survey-v1'};
 await store.put('review',review.id,review,userAccount?.id||null);
 return json({ok:true,id:review.id},201);
}
const avg=list=>list.length?Math.round(list.reduce((a,b)=>a+b,0)/list.length*10)/10:null;
export function summarize(reviews) {
 const scores=reviews.map(r=>r.recommend).filter(x=>x!==null&&x!==undefined);
 const nps=scores.length?Math.round((scores.filter(x=>x>=9).length-scores.filter(x=>x<=6).length)/scores.length*100):null;
 const tags={};for(const r of reviews)for(const s of Object.values(r.stages||{}))for(const t of s.tags||[])tags[t]=(tags[t]||0)+1;
 return {count:reviews.length,overall:avg(reviews.map(r=>r.overall).filter(Boolean)),modestyAccuracy:avg(reviews.map(r=>r.modestyAccuracy).filter(Boolean)),nps,npsResponses:scores.length,
  foundPiece:Object.fromEntries(FOUND.map(f=>[f,reviews.filter(r=>r.foundPiece===f).length])),
  stages:STAGES.map(s=>{const rs=reviews.map(r=>r.stages?.[s.id]?.rating).filter(Boolean);return {...s,average:avg(rs),responses:rs.length};}),
  topTags:Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tag,count])=>({tag,count}))};
}
const cell=v=>{const s=v===null||v===undefined?'':String(v);return /[",\n\r]/.test(s)||/^[=+\-@]/.test(s)?`"${(/^[=+\-@]/.test(s)?"'":'')+s.replaceAll('"','""')}"`:s;};
export function reviewsCsv(reviews) {
 const head=['createdAt','name','email','contact','overall','recommend','modestyAccuracy','foundPiece','heardFrom',...STAGES.flatMap(s=>[`${s.id}_rating`,`${s.id}_tags`,`${s.id}_note`]),'loved','improve','wish','quoteOk'];
 const rows=reviews.map(r=>[r.createdAt,r.name,r.email,r.contact,r.overall,r.recommend,r.modestyAccuracy,r.foundPiece,r.heardFrom,...STAGES.flatMap(s=>[r.stages?.[s.id]?.rating,(r.stages?.[s.id]?.tags||[]).join('; '),r.stages?.[s.id]?.note]),r.loved,r.improve,r.wish,r.quoteOk?'yes':'no']);
 return [head,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function isAdmin(u) {
 const ids=(process.env.ADMIN_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
 const emails=(process.env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 return !!u&&(ids.includes(u.id)||(!!u.email&&emails.includes(u.email.toLowerCase())));
}
