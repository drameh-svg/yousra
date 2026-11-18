'use client';
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {Download,RefreshCw} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {AuthScreen} from '@/components/account-gate';
import {fieldClass,secondaryClass} from '@/components/preference-form';

interface Counted{id:string;label:string;emoji?:string;count:number;inProgress?:boolean}
interface Review{id:string;createdAt:string;version?:number;name:string;email:string|null;contact:string;overall:number;sentence?:string;disappointed?:string|null;liked?:string[];wanted?:string[];wantedOther?:string[];priorities?:string[];sites?:string[];sitesOther?:string[];labeled?:number;quoteOk:boolean;loved?:string;improve?:string;wish?:string}
interface Summary{count:number;responses:number;legacy:number;overall:number|null;veryDisappointed:number|null;pmfResponses:number;liked:Counted[];wanted:Counted[];priorities:{id:string;label:string;emoji?:string;points:number;first:number}[];sites:Counted[];otherWishes:string[];otherSites:string[];labeled:number}
interface LabelSummary{summary:{products:number;labels:number;agreement:number|null;confusion:Record<string,Record<string,number>>}}
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const words=['','Rough','Meh','Okay','Lovely','Pure sutra'];
async function download(path:string,filename:string){const r=await fetch(path,{credentials:'same-origin'});if(!r.ok)return;const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
const today=()=>new Date().toISOString().slice(0,10);

function Bars({title,items,note}:{title:string;items:{id:string;label:string;emoji?:string;value:number;tag?:string}[];note?:string}){
 const max=Math.max(1,...items.map(x=>x.value));
 return <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-1 text-xl">{title}</h2>{note?<p className="mb-4 text-[11px] text-stone-400">{note}</p>:<div className="mb-4"/>}
  {items.map(x=><div key={x.id} className="mb-2.5"><div className="mb-1 flex justify-between gap-2 text-xs"><span className="text-stone-600">{x.emoji} {x.label}{x.tag?<span className="ml-1.5 rounded-full bg-[#DDE5D3] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-stone-600">{x.tag}</span>:null}</span><span className="text-stone-400">{x.value}</span></div><div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-stone-800" style={{width:`${x.value/max*100}%`}}/></div></div>)}
 </div>;
}

export default function ReviewsAdmin(){
 const {user,loading}=useSession();
 const [data,setData]=useState<{summary:Summary;reviews:Review[]}|null>(null),[labels,setLabels]=useState<LabelSummary|null>(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{if(!user)return;let live=true;
  api<{summary:Summary;reviews:Review[]}>('/admin/reviews').then(d=>{if(live){setData(d);setError('')}}).catch(e=>{if(live)setError(e instanceof ApiError&&e.status===403?'forbidden':e.message)});
  api<LabelSummary>('/admin/labels').then(d=>{if(live)setLabels(d)}).catch(()=>{});
  return()=>{live=false}},[user,tick]);
 const shown=useMemo(()=>{const q=query.toLowerCase().trim();return (data?.reviews||[]).filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q));},[data,query]);
 if(loading)return <main className="py-24 text-center text-sm text-stone-400">Loading…</main>;
 if(!user)return <AuthScreen/>;
 if(error==='forbidden')return <main className="mx-auto max-w-lg px-5 py-20"><h1 style={serif} className="mb-3 text-3xl">Team access only</h1><p className="text-sm leading-relaxed text-stone-500">This page shows every feedback response. Ask whoever manages the Vercel project to add <code className="rounded bg-stone-100 px-1">{user.email}</code> to the <code className="rounded bg-stone-100 px-1">ADMIN_EMAILS</code> environment variable (comma-separated), then redeploy.</p><Link href="/" className="mt-6 inline-block text-sm underline">Back to Yousra</Link></main>;
 const s=data?.summary,l=labels?.summary;
 const label=(list:{id:string;label:string}[],id:string)=>list.find(x=>x.id===id)?.label||id;
 return <main className="min-h-screen bg-[#FAF8F5] px-4 py-10"><div className="mx-auto max-w-6xl">
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-stone-400">Team dashboard</p><h1 style={serif} className="text-4xl text-stone-900">MVP validation</h1></div>
   <div className="flex flex-wrap gap-2"><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>setTick(t=>t+1)}><RefreshCw size={13}/>Refresh</button><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void download('/api/admin/reviews?format=csv',`yousra-feedback-${today()}.csv`)}><Download size={13}/>Feedback CSV</button><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void download('/api/admin/labels?format=jsonl',`yousra-modesty-labels-${today()}.jsonl`)}><Download size={13}/>Modesty labels (JSONL)</button><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void download('/api/admin/labels?format=csv',`yousra-modesty-labels-${today()}.csv`)}><Download size={13}/>Labels CSV</button></div></div>
  {error?<p role="alert" className="mb-6 text-sm text-red-700">{error}</p>:null}
  {!s?<p className="text-sm text-stone-400">Loading feedback…</p>:<>
   <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">{[
    ['Responses',String(s.count),s.legacy?`${s.legacy} from the old survey`:''],
    ['Overall feeling',s.overall!==null?`${s.overall} / 5`:'—',''],
    ['“Very disappointed”',s.veryDisappointed!==null?`${s.veryDisappointed}%`:'—',s.pmfResponses?`of ${s.pmfResponses} · 40%+ signals product-market fit`:'if Yousra disappeared'],
    ['Pieces rated',String(l?.labels??s.labeled),l?.products?`${l.products} products`:''],
    ['AI agrees with shoppers',l?.agreement!==null&&l?.agreement!==undefined?`${l.agreement}%`:'—','coverage level, per product'],
   ].map(([k,v,sub])=><div key={k} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"><p className="text-xs text-stone-400">{k}</p><p style={serif} className="mt-1 text-3xl text-stone-900">{v}</p>{sub?<p className="mt-1 text-[10px] leading-snug text-stone-400">{sub}</p>:null}</div>)}</div>
   <div className="mb-8 grid gap-3 md:grid-cols-2">
    <Bars title="Features people liked" items={s.liked.map(x=>({...x,value:x.count}))}/>
    <Bars title="What to build next" note="“Building” = already in progress" items={s.wanted.map(x=>({...x,value:x.count,tag:x.inProgress?'building':undefined}))}/>
    <Bars title="What shoppers prioritise" note="3 points for #1, 2 for #2, 1 for #3" items={s.priorities.map(x=>({...x,value:x.points}))}/>
    <Bars title="Where they shopped before" items={s.sites.filter(x=>x.count).map(x=>({...x,value:x.count}))}/>
   </div>
   {s.otherWishes.length||s.otherSites.length?<div className="mb-8 grid gap-3 md:grid-cols-2">
    {s.otherWishes.length?<div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-3 text-xl">Their own feature ideas</h2><div className="flex flex-wrap gap-1.5">{s.otherWishes.map((x,i)=><span key={i} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">{x}</span>)}</div></div>:null}
    {s.otherSites.length?<div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-3 text-xl">Other sites mentioned</h2><div className="flex flex-wrap gap-1.5">{s.otherSites.map((x,i)=><span key={i} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">{x}</span>)}</div></div>:null}
   </div>:null}
   {l&&l.products?<div className="mb-8 overflow-x-auto rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-1 text-xl">Coverage: shoppers vs AI</h2><p className="mb-4 text-[11px] text-stone-400">Rows are the shoppers&apos; majority level; columns are what the AI&apos;s attributes implied. Run <code>npm run eval:modesty</code> for the per-attribute breakdown.</p>
    <table className="text-xs"><thead><tr><th className="pr-4 text-left font-normal text-stone-400">Shoppers ↓ / AI →</th>{['conservative','moderate','relaxed'].map(m=><th key={m} className="px-3 font-normal text-stone-500">{m}</th>)}</tr></thead><tbody>{['conservative','moderate','relaxed','not_modest'].map(h=><tr key={h}><td className="py-1 pr-4 text-stone-600">{h.replace('_',' ')}</td>{['conservative','moderate','relaxed'].map(m=><td key={m} className={`px-3 text-center ${h===m?'font-semibold text-stone-900':'text-stone-500'}`}>{l.confusion[h]?.[m]||0}</td>)}</tr>)}</tbody></table>
   </div>:null}
   <input className={fieldClass+' mb-4 max-w-sm'} placeholder="Search responses" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search responses"/>
   {!shown.length?<p className="py-10 text-center text-sm text-stone-400">{data.reviews.length?'No responses match that search.':'No feedback yet. Share /feedback with your testers.'}</p>:<div className="space-y-3">{shown.map(r=><article key={r.id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-medium text-stone-800">{r.name||'Anonymous'} <span className="font-normal text-stone-400">{r.email||r.contact||''}</span></p><p className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleString('en-US')} · {words[r.overall]}{r.disappointed?` · ${r.disappointed} disappointed`:''}{r.labeled?` · rated ${r.labeled}`:''}{r.version!==2?' · old survey':''}</p></div>
    {r.sentence?<p style={serif} className="mb-3 text-xl leading-snug text-stone-800">“{r.sentence}”</p>:null}
    {r.version===2?<div className="space-y-1 text-xs text-stone-500">
     {r.liked?.length?<p><span className="text-stone-400">Liked:</span> {r.liked.map(x=>label(s.liked,x)).join(', ')}</p>:null}
     {r.wanted?.length||r.wantedOther?.length?<p><span className="text-stone-400">Wants:</span> {[...(r.wanted||[]).map(x=>label(s.wanted,x)),...(r.wantedOther||[])].join(', ')}</p>:null}
     {r.priorities?.length?<p><span className="text-stone-400">Priorities:</span> {r.priorities.map((x,i)=>`${i+1}. ${label(s.priorities,x)}`).join('  ')}</p>:null}
     {r.sites?.length||r.sitesOther?.length?<p><span className="text-stone-400">Shopped at:</span> {[...(r.sites||[]).map(x=>label(s.sites,x)),...(r.sitesOther||[])].join(', ')}</p>:null}
    </div>:<div className="space-y-1 text-sm text-stone-600">{r.loved?<p><span className="text-stone-400">Loved:</span> {r.loved}</p>:null}{r.improve?<p><span className="text-stone-400">Hard:</span> {r.improve}</p>:null}{r.wish?<p><span className="text-stone-400">Wish:</span> {r.wish}</p>:null}</div>}
    {r.quoteOk?<p className="mt-2 text-[11px] text-stone-400">OK to quote</p>:null}
   </article>)}</div>}
  </>}
 </div></main>;
}
