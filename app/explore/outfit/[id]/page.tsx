'use client';
// One community outfit: the photo, who posted it, and each piece in it with similar products to recreate the look.
import {useEffect,useState,type CSSProperties} from 'react';
import {useParams,useRouter} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft,ExternalLink,Flag,Heart,Search,Trash2} from 'lucide-react';
import {api,type ApiProduct} from '@/lib/api';
import {toCard} from '@/lib/catalog';
import {useSession} from '@/components/session-provider';
import {ProductCard} from '@/components/product-card';
import {STYLES,OCCASIONS} from '@/components/share-outfit';
import type {OutfitCard} from '@/lib/outfits';

interface Piece{label:string;category:string;colors:string[];query:string;searchUrl:string;products:ApiProduct[]}
interface Outfit extends OutfitCard{tagged:{label:string;url:string|null}[];pieces:Piece[]}
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};

export default function OutfitPage(){
 const {id}=useParams<{id:string}>(),router=useRouter(),{user}=useSession();
 const [look,setLook]=useState<Outfit|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{let live=true;api<Outfit>(`/outfits/${id}`).then(d=>{if(live)setLook(d)}).catch(e=>{if(live)setError((e as Error).message)});return()=>{live=false};},[id,tick]);
 // While the AI is still reading the photo, check back every few seconds.
 useEffect(()=>{if(look?.detection!=='pending')return;const t=setTimeout(()=>setTick(x=>x+1),4000);return()=>clearTimeout(t);},[look]);
 if(error)return <main className="mx-auto max-w-lg px-5 py-20 text-center"><p className="text-sm text-stone-500">This outfit isn&apos;t available.</p><Link href="/explore" className="mt-4 inline-block text-sm underline">Back to Explore</Link></main>;
 if(!look)return <main className="py-24 text-center text-sm text-stone-400">Loading…</main>;
 const like=async()=>{if(!user){setNotice('Sign in to like outfits');return;}setLook({...look,liked:!look.liked,likeCount:look.likeCount+(look.liked?-1:1)});try{await api(`/outfits/${id}/like`,'POST',{like:!look.liked});}catch{setTick(t=>t+1);}};
 const report=async()=>{if(!user){setNotice('Sign in to report');return;}if(!window.confirm('Report this outfit to the Yusra team?'))return;await api(`/outfits/${id}/report`,'POST',{reason:'reported from outfit page'}).catch(()=>{});setNotice('Thanks — the team will take a look.');};
 const remove=async()=>{if(!window.confirm('Delete your outfit? This cannot be undone.'))return;await api(`/outfits/${id}`,'DELETE');router.push('/explore');};
 const styleLabel=(s:string)=>STYLES.find(x=>x.id===s)?.label||s,occasionLabel=OCCASIONS.find(x=>x.id===look.occasion)?.label;
 return <main style={{minHeight:'100vh',background:'var(--bg)'}}><div className="mx-auto max-w-6xl px-5 py-8">
  <Link href="/explore" className="mb-5 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft size={15}/>Outfit inspo</Link>
  <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
   <div><div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-stone-100"><Image src={look.image} alt={look.caption||`Outfit by ${look.authorName}`} fill unoptimized priority sizes="(max-width:768px) 100vw, 480px" className="object-cover"/></div>
    <div className="mt-3 flex items-center justify-between"><p className="text-sm font-medium text-stone-800">{look.authorName}</p>
     <div className="flex items-center gap-3 text-stone-500">{look.status==='approved'?<button onClick={()=>void like()} className="flex items-center gap-1 text-sm"><Heart size={17} className={look.liked?'fill-[#C0504D] text-[#C0504D]':''}/>{look.likeCount||''}</button>:null}
      {look.mine?<button aria-label="Delete outfit" onClick={()=>void remove()}><Trash2 size={16}/></button>:<button aria-label="Report outfit" onClick={()=>void report()}><Flag size={15}/></button>}</div></div>
    {look.caption?<p className="mt-2 text-sm leading-relaxed text-stone-600">{look.caption}</p>:null}
    <div className="mt-2 flex flex-wrap gap-1.5">{look.styles.map(s=><span key={s} className="rounded-full bg-[#DDE5D3] px-2.5 py-0.5 text-[11px] text-stone-700">{styleLabel(s)}</span>)}{occasionLabel?<span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] text-stone-600">{occasionLabel}</span>:null}</div>
    {look.status!=='approved'?<p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{look.status==='rejected'?'The team did not approve this outfit, so only you can see it.':'Only you can see this until the team approves it.'}</p>:null}
    {notice?<p role="status" className="mt-3 text-xs text-stone-600">{notice}</p>:null}
    {look.tagged.length?<div className="mt-5"><p className="mb-1.5 text-xs uppercase tracking-wider text-stone-400">What she&apos;s wearing</p><ul className="space-y-1 text-sm text-stone-700">{look.tagged.map((t,i)=><li key={i}>{t.url?<a href={t.url} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 underline">{t.label}<ExternalLink size={12}/></a>:t.label}</li>)}</ul></div>:null}
   </div>

   <div><h1 style={serif} className="mb-1 text-3xl text-[#352D27]">Recreate the look</h1>
    <p className="mb-6 text-sm text-stone-500">{look.detection==='pending'?'Finding each piece in the photo…':look.pieces.length?'Similar pieces for each part of the outfit, filtered to your coverage settings when you’re signed in.':'We couldn’t pick out the pieces in this photo.'}</p>
    <div className="space-y-8">{look.pieces.map((p,i)=><section key={i}>
     <div className="mb-3 flex items-end justify-between gap-2"><h2 className="text-base font-medium capitalize text-stone-800">{p.label}</h2><Link href={p.searchUrl} className="inline-flex shrink-0 items-center gap-1 text-xs text-stone-500 underline"><Search size={12}/>More like this</Link></div>
     {p.products.length?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{p.products.map(x=><ProductCard key={x.id} product={toCard(x)}/>)}</div>
      :<Link href={p.searchUrl} className="block rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 hover:border-stone-500">{p.category==='hijab'?`Search for a ${p.query}`:'No close matches yet — search for similar pieces'}</Link>}
    </section>)}</div>
   </div>
  </div>
 </div></main>;
}
