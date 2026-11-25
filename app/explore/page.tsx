'use client';
// Explore: outfit inspiration posted by the Yusra community. Each outfit links to similar pieces so shoppers
// can recreate it.
import {useEffect,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Heart,Plus,Shirt} from 'lucide-react';
import {api} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {ShareOutfit,STYLES,OCCASIONS} from '@/components/share-outfit';
import type {OutfitCard} from '@/lib/outfits';

const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const chip=(on:boolean)=>`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors ${on?'border-[#352D27] bg-[#352D27] text-white':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`;

export default function ExplorePage(){
 const {user}=useSession();
 const [items,setItems]=useState<OutfitCard[]|null>(null),[style,setStyle]=useState(''),[occasion,setOccasion]=useState(''),[sharing,setSharing]=useState(false),[notice,setNotice]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;const q=new URLSearchParams();if(style)q.set('style',style);if(occasion)q.set('occasion',occasion);
  api<{items:OutfitCard[]}>(`/outfits?${q}`).then(d=>{if(live)setItems(d.items)}).catch(()=>{if(live)setItems([])});return()=>{live=false};},[style,occasion,tick,user]);
 const like=async(o:OutfitCard)=>{if(!user){setNotice('Sign in to like outfits');return;}
  setItems(c=>c?.map(x=>x.id===o.id?{...x,liked:!o.liked,likeCount:x.likeCount+(o.liked?-1:1)}:x)??c);
  try{await api(`/outfits/${o.id}/like`,'POST',{like:!o.liked});}catch{setTick(t=>t+1);}};
 return <main style={{minHeight:'100vh',background:'var(--bg)'}}>
  <section className="mx-auto max-w-6xl px-5 pb-16 pt-8">
   <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">Community</p><h1 style={serif} className="text-4xl text-[#352D27] sm:text-5xl">Outfit inspo</h1><p className="mt-1 max-w-md text-sm text-stone-500">Real outfits from Yusra girls. Tap one to shop similar pieces and recreate the look.</p></div>
    <button onClick={()=>user?setSharing(true):setNotice('Sign in to share your outfit')} className="inline-flex items-center gap-1.5 rounded-full bg-[#352D27] px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"><Plus size={15}/>Share your outfit</button>
   </div>
   {notice?<p role="status" className="mb-4 text-sm text-stone-600">{notice} {!user?<Link href="/profile" className="underline">Sign in</Link>:null}</p>:null}
   <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1"><button className={chip(!style)} onClick={()=>setStyle('')}>All styles</button>{STYLES.map(s=><button key={s.id} className={chip(style===s.id)} onClick={()=>setStyle(c=>c===s.id?'':s.id)}>{s.label}</button>)}</div>
   <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1"><button className={chip(!occasion)} onClick={()=>setOccasion('')}>Any occasion</button>{OCCASIONS.map(o=><button key={o.id} className={chip(occasion===o.id)} onClick={()=>setOccasion(c=>c===o.id?'':o.id)}>{o.label}</button>)}</div>

   {items===null?<p className="py-16 text-center text-sm text-stone-400">Loading outfits…</p>
   :!items.length?<div className="rounded-3xl border border-stone-100 bg-white px-6 py-14 text-center shadow-sm"><Shirt className="mx-auto mb-3 text-stone-300" size={32}/><h2 style={serif} className="text-2xl text-[#352D27]">{style||occasion?'No outfits here yet':'Be the first to share an outfit'}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">Post a look you love. We&apos;ll find similar pieces so other girls can recreate it.</p></div>
   :<div className="masonry">{items.map(o=><div key={o.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm">
     <Link href={`/explore/outfit/${o.id}`} className="block"><div className="relative aspect-[3/4] w-full bg-stone-100"><Image src={o.image} alt={o.caption||`Outfit by ${o.authorName}`} fill unoptimized sizes="(max-width:600px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"/>
      {o.status!=='approved'?<span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-stone-700">{o.status==='rejected'?'Not approved':'Waiting for review'}</span>:null}</div></Link>
     <div className="flex items-center justify-between gap-2 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-medium text-stone-800">{o.authorName}</p><p className="truncate text-[11px] text-stone-400">{o.pieceCount?`${o.pieceCount} pieces to shop`:o.detection==='pending'?'Finding pieces…':(o.caption||'Outfit')}</p></div>
      <button aria-label={o.liked?'Unlike':'Like'} onClick={()=>void like(o)} disabled={o.status!=='approved'} className="flex shrink-0 items-center gap-1 text-xs text-stone-500 disabled:opacity-30"><Heart size={15} className={o.liked?'fill-[#C0504D] text-[#C0504D]':''}/>{o.likeCount||''}</button></div>
    </div>)}</div>}
  </section>
  {sharing?<ShareOutfit onClose={()=>setSharing(false)} onShared={approved=>{setSharing(false);setNotice(approved?'Your outfit is live!':'Thanks! Your outfit will appear once the team has had a look.');setTick(t=>t+1);}}/>:null}
 </main>;
}
