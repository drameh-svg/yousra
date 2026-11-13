'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Search,SlidersHorizontal,RefreshCw} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {ProductCard} from '@/components/product-card';
import {aesthetics,type Aesthetic} from '@/lib/products';
import {categories,colors,pretty,type Filters,type Preferences} from '@/lib/api';
import {toCard} from '@/lib/catalog';
import {useCatalog} from '@/lib/use-catalog';
import {AccountGate} from '@/components/account-gate';
import {useSession} from '@/components/session-provider';
import {PreferenceForm,fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

export function Browse({initialQuery='',category='',mode='feed'}:{initialQuery?:string;category?:string;mode?:'feed'|'explore'|'search'}){return <AccountGate><BrowseBody initialQuery={initialQuery} category={category} mode={mode}/></AccountGate>}
function BrowseBody({initialQuery,category,mode}:{initialQuery:string;category:string;mode:string}){
 const router=useRouter(),{profile,reactions,sample}=useSession();const [draft,setDraft]=useState(initialQuery),[active,setActive]=useState<Aesthetic|null>(null),[filters,setFilters]=useState<Filters>({category:category||undefined}),[draftFilters,setDraftFilters]=useState<Filters>({category:category||undefined});
 const [temporary,setTemporary]=useState<Preferences|undefined>(),[editing,setEditing]=useState(false);
 const catalog=useCatalog(initialQuery,{...filters,...(active?{style:active.toLowerCase()}:{})},temporary),sentinel=useRef<HTMLDivElement>(null);
 const {canLoad,loading,more,error,loadMore}=catalog;
 const items=initialQuery?catalog.items:catalog.items.filter(p=>!reactions[p.id]?.disliked);
 useEffect(()=>{const node=sentinel.current;if(!node||!canLoad||loading||more||error||!('IntersectionObserver'in window))return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void loadMore()},{rootMargin:'350px'});observer.observe(node);return()=>observer.disconnect()},[canLoad,loading,more,error,loadMore]);
 function search(e:FormEvent){e.preventDefault();if(draft.trim())router.push('/search/results?q='+encodeURIComponent(draft.trim()))}
 function apply(e:FormEvent){e.preventDefault();setFilters(draftFilters)}
 const title=initialQuery?'Pieces that match your search':mode==='explore'?'Follow your style somewhere new.':category?`${categories.find(c=>c.id===category)?.label||'Clothing'}, your way.`:mode==='search'?"Know what you’re looking for?":"Find sutra with Yousra.";
 return <main className="min-h-screen bg-[#FAF8F5]">
  <section className="pt-12 pb-8 px-4 text-center"><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 mb-2">{title}</h1><p className="text-sm sm:text-base text-stone-500 max-w-sm mx-auto mb-7">{initialQuery?`Found for “${initialQuery}”, with your coverage preferences applied.`:mode==='explore'?'Find a piece you didn’t know you needed. Start with a style or clothing category.':'Modest fashion that feels like you. Search for something specific, or scroll through pieces picked for your preferences.'}</p>
   <form onSubmit={search} className="relative max-w-xl mx-auto"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"/><Input type="search" aria-label="Search clothing" placeholder={'What are you looking for? Try "black maxi skirt"'} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={300} required className="pl-10 pr-12 h-11 rounded-full bg-white border-stone-200 shadow-sm text-sm placeholder:text-stone-400 focus-visible:ring-stone-300"/><button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Search clothing now"><Search size={16}/></button></form>
  </section>
  <section className="px-4 pb-6"><div className="max-w-6xl mx-auto"><p className="text-xs uppercase tracking-widest text-stone-400 mb-3 font-medium">What&apos;s your vibe?</p><div className="flex flex-wrap gap-2">{aesthetics.map(a=><button key={a} aria-pressed={active===a} onClick={()=>setActive(active===a?null:a)} className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-200 ${active===a?'bg-stone-900 text-white border-stone-900':'bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900'}`}>{a}</button>)}</div>
   {mode==='explore'||mode==='search'?<div className="mt-5 flex flex-wrap gap-2">{categories.map(c=><Link key={c.id} href={'/category/'+c.id} className={secondaryClass}>{c.label}</Link>)}</div>:null}
   <div className="mt-5 flex flex-wrap items-start justify-between gap-3"><details className="group max-w-3xl flex-1"><summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs text-stone-500"><SlidersHorizontal size={13}/>Filters</summary><form onSubmit={apply} className="mt-3 grid gap-3 rounded-2xl border border-stone-100 bg-white p-4 sm:grid-cols-3">
    <label className="space-y-1 text-xs text-stone-500">Category<select className={fieldClass} value={draftFilters.category||''} onChange={e=>setDraftFilters(f=>({...f,category:e.target.value}))}><option value="">All clothing</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <label className="space-y-1 text-xs text-stone-500">Color<select className={fieldClass} value={draftFilters.color||''} onChange={e=>setDraftFilters(f=>({...f,color:e.target.value}))}><option value="">Any color</option>{colors.map(c=><option key={c} value={c}>{pretty(c)}</option>)}</select></label>
    <label className="space-y-1 text-xs text-stone-500">Size<input className={fieldClass} value={draftFilters.size||''} onChange={e=>setDraftFilters(f=>({...f,size:e.target.value.toLowerCase()}))} placeholder="M"/></label>
    <label className="space-y-1 text-xs text-stone-500">Minimum price (USD)<input className={fieldClass} type="number" min="0" value={draftFilters.minPrice||''} onChange={e=>setDraftFilters(f=>({...f,minPrice:e.target.value}))}/></label>
    <label className="space-y-1 text-xs text-stone-500">Maximum price (USD)<input className={fieldClass} type="number" min="0" value={draftFilters.maxPrice||''} onChange={e=>setDraftFilters(f=>({...f,maxPrice:e.target.value}))}/></label>
    <label className="space-y-1 text-xs text-stone-500">US delivery<select className={fieldClass} value={draftFilters.shipping||''} onChange={e=>setDraftFilters(f=>({...f,shipping:e.target.value}))}><option value="">Include unverified delivery</option><option value="confirmed">Confirmed US shipping only</option></select></label>
    <div className="flex flex-wrap gap-2 sm:col-span-3"><button className={primaryClass}>Apply filters</button><button type="button" className={secondaryClass} onClick={()=>{setFilters({});setDraftFilters({});setActive(null);setTemporary(undefined)}}>Reset filters</button>{initialQuery?<button type="button" className={secondaryClass} onClick={()=>setEditing(!editing)}>Coverage for this search</button>:<Link href="/profile/preferences" className={secondaryClass}>Edit coverage preferences</Link>}</div>
   </form></details><button type="button" onClick={catalog.reload} disabled={catalog.loading||catalog.more} className="flex items-center gap-1.5 text-xs text-stone-500 disabled:opacity-50"><RefreshCw size={12}/>Refresh</button></div>
   {editing&&profile?<div className="mt-5"><p className="mb-3 text-sm text-stone-500">These changes apply only to this search.</p><PreferenceForm initial={temporary||profile.preferences} label="Apply to this search" onSave={async p=>{setTemporary(p);setEditing(false)}}/><button className={secondaryClass+' mt-3'} onClick={()=>setEditing(false)}>Cancel</button></div>:null}
  </div></section>
  <section className="px-4 pb-16"><div className="max-w-6xl mx-auto">
   {profile?.preferences.budgetMax?<p className="mb-3 text-xs text-stone-500">Saved maximum price: ${profile.preferences.budgetMax}. <Link href="/profile/preferences" className="underline">Review preferences</Link></p>:null}
   {sample?<p className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">Private test catalog. Sample references are not verified current listings.</p>:null}
   <p role="status" className="mb-4 text-xs text-stone-400">{catalog.loading?'Finding pieces for you…':catalog.more?initialQuery?'Checking photos and product details…':'Finding more pieces…':`${items.length} pieces${temporary?' · Temporary search preferences':''}`}</p>
   {catalog.error?<div role="alert" className="mb-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">{catalog.error} <button onClick={catalog.reload} className="ml-2 underline">Try again</button></div>:null}
   {catalog.response?.warnings?.map(w=><p key={w} className="mb-3 text-xs text-stone-500">{w}</p>)}
   {!items.length&&!catalog.loading&&!catalog.more?<div className="text-center py-24 text-stone-400"><p className="text-sm">Nothing quite right yet?</p><p className="mx-auto mt-2 max-w-md text-xs">No pieces match this search and your saved preferences yet. Price and size limits exclude products with unknown information. Try another search or review your coverage and budget settings.</p><button onClick={()=>{setActive(null);setFilters({});setDraftFilters({});setTemporary(undefined)}} className="mt-3 text-sm underline underline-offset-2 hover:text-stone-600">Clear filters</button></div>:<div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">{items.map(product=><div key={product.id} className="break-inside-avoid"><ProductCard product={toCard(product)}/></div>)}</div>}
   <div ref={sentinel} className="mt-8 text-center">{catalog.canLoad?<button onClick={()=>void catalog.loadMore()} disabled={catalog.loading||catalog.more} className={secondaryClass}>{catalog.more?'Finding more pieces…':'More pieces'}</button>:!catalog.loading&&items.length?<p className="text-xs text-stone-400">You’re up to date. Refresh to find new pieces.</p>:null}</div>
   {items.length?<p className="text-center text-xs text-stone-300 mt-10">See something you love? Tap to view the details and shop from the store.</p>:null}
  </div></section>
 </main>;
}
