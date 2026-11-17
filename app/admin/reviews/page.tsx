'use client';
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {Download,RefreshCw} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {AuthScreen} from '@/components/account-gate';
import {fieldClass,secondaryClass} from '@/components/preference-form';

interface StageAnswer{rating:number|null;tags:string[];note?:string}
interface Review{id:string;createdAt:string;name:string;email:string|null;contact:string;overall:number;recommend:number|null;modestyAccuracy:number|null;foundPiece:string|null;heardFrom:string|null;loved:string;improve:string;wish:string;quoteOk:boolean;stages:Record<string,StageAnswer>}
interface Summary{count:number;overall:number|null;modestyAccuracy:number|null;nps:number|null;npsResponses:number;foundPiece:Record<string,number>;stages:{id:string;label:string;average:number|null;responses:number}[];topTags:{tag:string;count:number}[]}
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const words=['','Rough','Meh','Okay','Lovely','Pure sutra'];
async function downloadCsv(){const r=await fetch('/api/admin/reviews?format=csv',{credentials:'same-origin'});if(!r.ok)return;const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=`yousra-reviews-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);}

export default function ReviewsAdmin(){
 const {user,loading}=useSession();
 const [data,setData]=useState<{summary:Summary;reviews:Review[]}|null>(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{if(!user)return;let live=true;api<{summary:Summary;reviews:Review[]}>('/admin/reviews').then(d=>{if(live){setData(d);setError('')}}).catch(e=>{if(live)setError(e instanceof ApiError&&e.status===403?'forbidden':e.message)});return()=>{live=false}},[user,tick]);
 const shown=useMemo(()=>{const q=query.toLowerCase().trim();return (data?.reviews||[]).filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q));},[data,query]);
 if(loading)return <main className="py-24 text-center text-sm text-stone-400">Loading…</main>;
 if(!user)return <AuthScreen/>;
 if(error==='forbidden')return <main className="mx-auto max-w-lg px-5 py-20"><h1 style={serif} className="mb-3 text-3xl">Team access only</h1><p className="text-sm leading-relaxed text-stone-500">This page shows every journey review. Ask whoever manages the Vercel project to add <code className="rounded bg-stone-100 px-1">{user.email}</code> to the <code className="rounded bg-stone-100 px-1">ADMIN_EMAILS</code> environment variable (comma-separated), then redeploy.</p><Link href="/" className="mt-6 inline-block text-sm underline">Back to Yousra</Link></main>;
 const s=data?.summary;
 return <main className="min-h-screen bg-[#FAF8F5] px-4 py-10"><div className="mx-auto max-w-6xl">
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-stone-400">Team dashboard</p><h1 style={serif} className="text-4xl text-stone-900">Journey reviews</h1></div>
   <div className="flex gap-2"><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>setTick(t=>t+1)}><RefreshCw size={13}/>Refresh</button><button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void downloadCsv()}><Download size={13}/>Download CSV</button></div></div>
  {error?<p role="alert" className="mb-6 text-sm text-red-700">{error}</p>:null}
  {!s?<p className="text-sm text-stone-400">Loading reviews…</p>:<>
   <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Reviews',String(s.count)],['Overall feeling',s.overall!==null?`${s.overall} / 5`:'—'],['Coverage match',s.modestyAccuracy!==null?`${s.modestyAccuracy} / 5`:'—'],['Net promoter score',s.nps!==null?`${s.nps>0?'+':''}${s.nps}`:'—']].map(([k,v])=><div key={k} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"><p className="text-xs text-stone-400">{k}</p><p style={serif} className="mt-1 text-3xl text-stone-900">{v}</p></div>)}</div>
   <div className="mb-8 grid gap-3 md:grid-cols-2">
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-4 text-xl">Each stop of the journey</h2>{s.stages.map(st=><div key={st.id} className="mb-3"><div className="mb-1 flex justify-between text-xs"><span className="text-stone-600">{st.label}</span><span className="text-stone-400">{st.average!==null?`${st.average} · ${st.responses} rating${st.responses===1?'':'s'}`:'No ratings yet'}</span></div><div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-stone-800" style={{width:`${(st.average||0)/5*100}%`}}/></div></div>)}</div>
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-4 text-xl">What people tagged</h2><div className="flex flex-wrap gap-2">{s.topTags.length?s.topTags.map(t=><span key={t.tag} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">{t.tag} · {t.count}</span>):<p className="text-xs text-stone-400">No tags yet.</p>}</div>
     <h3 className="mb-2 mt-6 text-xs uppercase tracking-widest text-stone-400">Found a piece they&apos;d wear</h3><p className="text-sm text-stone-600">Yes {s.foundPiece.yes||0} · Almost {s.foundPiece.almost||0} · Not yet {s.foundPiece.no||0} · Exploring {s.foundPiece.not_yet||0}</p></div>
   </div>
   <input className={fieldClass+' mb-4 max-w-sm'} placeholder="Search reviews" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search reviews"/>
   {!shown.length?<p className="py-10 text-center text-sm text-stone-400">{data.reviews.length?'No reviews match that search.':'No reviews yet. Share /feedback with your testers.'}</p>:<div className="space-y-3">{shown.map(r=><article key={r.id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-medium text-stone-800">{r.name||'Anonymous'} <span className="font-normal text-stone-400">{r.email||r.contact||''}</span></p><p className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleString('en-US')} · overall {words[r.overall]}{r.recommend!==null?` · NPS ${r.recommend}`:''}{r.modestyAccuracy?` · coverage ${r.modestyAccuracy}/5`:''}</p></div>
    {r.loved?<p className="mb-1 text-sm text-stone-600"><span className="text-stone-400">Loved:</span> {r.loved}</p>:null}{r.improve?<p className="mb-1 text-sm text-stone-600"><span className="text-stone-400">Hard:</span> {r.improve}</p>:null}{r.wish?<p className="mb-1 text-sm text-stone-600"><span className="text-stone-400">Wish:</span> {r.wish}</p>:null}
    <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(r.stages||{}).map(([k,v])=><span key={k} title={v.note||''} className="rounded-full bg-stone-50 px-2.5 py-1 text-[11px] text-stone-500">{k}: {v.rating?words[v.rating]:'—'}{v.tags?.length?` · ${v.tags.join(', ')}`:''}{v.note?' · 💬':''}</span>)}</div>
    {r.quoteOk?<p className="mt-2 text-[11px] text-stone-400">OK to quote</p>:null}
   </article>)}</div>}
  </>}
 </div></main>;
}
