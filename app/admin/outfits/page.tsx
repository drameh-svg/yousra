'use client';
// Team moderation for community outfits: new posts, AI-flagged photos and reported posts.
import {useEffect,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Check,X} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {AuthScreen} from '@/components/account-gate';
import {primaryClass,secondaryClass} from '@/components/preference-form';
import type {OutfitCard} from '@/lib/outfits';

interface Pending extends OutfitCard{hidden:boolean;flagged:boolean;reports:{reason:string;at:string}[];tagged:{label:string;url:string|null}[];pieces:{label:string}[]}
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};

export default function OutfitModeration(){
 const {user,loading}=useSession();
 const [items,setItems]=useState<Pending[]|null>(null),[error,setError]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{if(!user)return;let live=true;api<{items:Pending[]}>('/admin/outfits').then(d=>{if(live)setItems(d.items)}).catch(e=>{if(live)setError(e instanceof ApiError&&e.status===403?'forbidden':(e as Error).message)});return()=>{live=false};},[user,tick]);
 const decide=async(id:string,decision:'approved'|'rejected')=>{setItems(c=>c?.filter(x=>x.id!==id)??c);try{await api(`/admin/outfits/${id}`,'POST',{decision});}catch{setTick(t=>t+1);}};
 if(loading)return <main className="py-24 text-center text-sm text-stone-400">Loading…</main>;
 if(!user)return <AuthScreen/>;
 if(error==='forbidden')return <main className="mx-auto max-w-lg px-5 py-20"><h1 style={serif} className="mb-3 text-3xl">Team access only</h1><Link href="/" className="text-sm underline">Back to Yusra</Link></main>;
 return <main className="min-h-screen bg-[#FAF8F5] px-4 py-10"><div className="mx-auto max-w-6xl">
  <p className="text-xs uppercase tracking-widest text-stone-400">Team</p><h1 style={serif} className="mb-2 text-4xl text-stone-900">Outfit review</h1>
  <p className="mb-6 max-w-2xl text-sm text-stone-500">Approve outfits before they appear on Explore. Reject anything that isn&apos;t an outfit photo, shows someone who may not have agreed, or doesn&apos;t fit Yusra. Reported posts are hidden until you decide.</p>
  {error&&error!=='forbidden'?<p role="alert" className="mb-4 text-sm text-red-700">{error}</p>:null}
  {items===null?<p className="text-sm text-stone-400">Loading…</p>:!items.length?<p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-500 shadow-sm">Nothing waiting for review.</p>:
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(o=><div key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
   <div className="relative aspect-[3/4] bg-stone-100"><Image src={o.image} alt="" fill unoptimized sizes="33vw" className="object-cover"/></div>
   <div className="p-4 text-xs text-stone-600">
    <div className="mb-2 flex flex-wrap gap-1">{o.status==='pending'?<span className="rounded-full bg-stone-100 px-2 py-0.5">New</span>:null}{o.flagged?<span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">AI: may not be an outfit</span>:null}{o.hidden?<span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">Reported ×{o.reports.length}</span>:null}</div>
    <p className="font-medium text-stone-800">{o.authorName}</p>{o.caption?<p className="mt-1">{o.caption}</p>:null}
    {o.pieces.length?<p className="mt-1 text-stone-400">Pieces: {o.pieces.map(p=>p.label).join(', ')}</p>:null}
    {o.reports.map((r,i)=><p key={i} className="mt-1 text-red-700">“{r.reason}”</p>)}
    <div className="mt-3 flex gap-2"><button className={primaryClass+' inline-flex items-center gap-1 !px-4 !py-2'} onClick={()=>void decide(o.id,'approved')}><Check size={14}/>Approve</button><button className={secondaryClass+' inline-flex items-center gap-1'} onClick={()=>void decide(o.id,'rejected')}><X size={14}/>Reject</button></div>
   </div></div>)}</div>}
 </div></main>;
}
