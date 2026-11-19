'use client';
// Saved: your collections (private by default, shareable) and everyone's public collections.
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Bookmark,Check,Copy,Globe,Lock,Plus,Trash2} from 'lucide-react';
import {api,type ApiProduct,type Collection} from '@/lib/api';
import {toCard} from '@/lib/catalog';
import {useSession} from '@/components/session-provider';
import {ProductCard} from '@/components/product-card';
import {fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

interface PublicCollection {id:string;name:string;ownerName:string;count:number;updatedAt:string;cover:ApiProduct[]}
const serif={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400} as const;

export function SavedPage(){
 const [tab,setTab]=useState<'mine'|'public'>('mine');
 return <main className="mx-auto max-w-6xl px-4 py-10">
  <h1 style={{...serif,fontSize:'clamp(26px,3vw,36px)',color:'#352D27'}} className="mb-1">Good finds are worth keeping.</h1>
  <p className="mb-6 text-sm text-stone-500">Sort your saves into collections. Keep them private, or share them with everyone.</p>
  <div role="tablist" className="mb-7 inline-flex rounded-full border border-stone-200 bg-white p-1">
   {([['mine','My collections'],['public','Public collections']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={`rounded-full px-4 py-1.5 text-sm ${tab===id?'bg-stone-900 text-white':'text-stone-500 hover:text-stone-800'}`}>{label}</button>)}
  </div>
  {tab==='mine'?<MyCollections/>:<PublicCollections/>}
 </main>;
}

function MyCollections(){
 const {collections,reloadLibrary,react}=useSession();
 const [selected,setSelected]=useState('likes'),[items,setItems]=useState<ApiProduct[]>([]),[loadedKey,setLoadedKey]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState(''),[rename,setRename]=useState(''),[deleting,setDeleting]=useState(false),[copied,setCopied]=useState(false);
 const collection=collections.find(c=>c.id===selected)||collections[0],ids=collection?.productIds.join(',')||'',key=`${collection?.id}:${ids}`,loading=loadedKey!==key;
 const [owner,setOwner]=useState('');
 useEffect(()=>{if(!collection)return;let live=true;void api<{items:ApiProduct[]}>(`/collections/${collection.id}`).then(d=>{if(live){setItems(d.items);setError('')}}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoadedKey(key)});return()=>{live=false}},[collection,key]);
 async function run(task:()=>Promise<void>,fallback:string){setBusy(true);setError('');try{await task()}catch(e){setError(e instanceof Error?e.message:fallback)}finally{setBusy(false)}}
 const create=(e:FormEvent)=>{e.preventDefault();void run(async()=>{const d=await api<{collection:Collection}>('/collections','POST',{name:name.trim()});await reloadLibrary();setSelected(d.collection.id);setName('')},'Could not create collection.')};
 const changeName=(e:FormEvent)=>{e.preventDefault();void run(async()=>{await api(`/collections/${collection!.id}`,'PATCH',{name:rename.trim()});await reloadLibrary();setRename('')},'Could not rename collection.')};
 const share=(on:boolean)=>run(async()=>{await api(`/collections/${collection!.id}`,'PATCH',{public:on,...(on?{ownerName:owner||collection!.ownerName||''}:{})});await reloadLibrary()},'Could not change sharing.');
 const removeCollection=()=>run(async()=>{await api(`/collections/${collection!.id}`,'DELETE',{});setSelected('likes');setDeleting(false);await reloadLibrary()},'Could not delete collection.');
 const remove=(id:string)=>run(async()=>{if(collection?.system)await react(id,'clear');else{await api(`/collections/${collection!.id}`,'PATCH',{productId:id,remove:true});await reloadLibrary()}setItems(old=>old.filter(p=>p.id!==id))},'Could not remove piece.');
 const link=collection?`${typeof window==='undefined'?'':window.location.origin}/collections/${collection.id}`:'';
 async function copy(){try{await navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError('Copy failed — select the link and copy it yourself.')}}
 if(!collection)return <p className="text-sm text-stone-400">Loading your collections…</p>;
 return <>
  <div className="mb-5 flex flex-wrap gap-2">
   {collections.map(c=><button key={c.id} aria-pressed={c.id===collection.id} onClick={()=>{setSelected(c.id);setDeleting(false)}} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${c.id===collection.id?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{!c.system?(c.public?<Globe size={12}/>:<Lock size={12}/>):null}{c.name}<span className="text-[11px] opacity-60">{c.productIds.length}</span></button>)}
  </div>
  <form onSubmit={create} className="mb-6 flex max-w-md gap-2"><input aria-label="New collection name" className={fieldClass} placeholder="New collection, e.g. Eid looks" value={name} onChange={e=>setName(e.target.value)} required maxLength={60}/><button disabled={busy} className={secondaryClass+' inline-flex shrink-0 items-center gap-1'}><Plus size={14}/>Create</button></form>

  {!collection.system?<div className="mb-7 rounded-2xl border border-stone-200 bg-white p-4 text-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="flex items-center gap-2 font-medium text-stone-800">{collection.public?<><Globe size={14}/>Public — anyone signed in to Yousra can see it</>:<><Lock size={14}/>Private — only you can see it</>}</p>
    <div role="radiogroup" aria-label="Who can see this collection" className="inline-flex rounded-full border border-stone-200 p-0.5">
     <button role="radio" aria-checked={!collection.public} disabled={busy} onClick={()=>void share(false)} className={`rounded-full px-3 py-1 text-xs ${!collection.public?'bg-stone-900 text-white':'text-stone-500'}`}>Private</button>
     <button role="radio" aria-checked={!!collection.public} disabled={busy} onClick={()=>void share(true)} className={`rounded-full px-3 py-1 text-xs ${collection.public?'bg-stone-900 text-white':'text-stone-500'}`}>Public</button>
    </div>
   </div>
   {!collection.public?<label className="mt-3 block max-w-xs text-xs text-stone-500">Name shown if you share it<input className={fieldClass+' mt-1'} maxLength={40} placeholder="A Yousra shopper" value={owner} onChange={e=>setOwner(e.target.value)}/></label>:
    <div className="mt-3 flex flex-wrap items-center gap-2"><input readOnly aria-label="Share link" value={link} className={fieldClass+' max-w-sm text-xs'} onFocus={e=>e.target.select()}/><button onClick={()=>void copy()} className={secondaryClass+' inline-flex items-center gap-1'}>{copied?<><Check size={13}/>Copied</>:<><Copy size={13}/>Copy link</>}</button><span className="text-[11px] text-stone-400">Shared as {collection.ownerName||'A Yousra shopper'}</span></div>}
   <details className="mt-3 text-xs text-stone-500"><summary className="w-fit cursor-pointer">Rename or delete</summary>
    <form onSubmit={changeName} className="my-3 flex max-w-md gap-2"><input aria-label="Rename collection" className={fieldClass} placeholder={collection.name} value={rename} onChange={e=>setRename(e.target.value)} required maxLength={60}/><button disabled={busy} className={secondaryClass}>Rename</button></form>
    {deleting?<p className="flex flex-wrap items-center gap-2">Delete “{collection.name}”? The pieces stay in Likes. <button onClick={()=>void removeCollection()} className="rounded-full bg-red-700 px-3 py-1 text-white">Delete</button><button onClick={()=>setDeleting(false)} className="underline">Cancel</button></p>:<button onClick={()=>setDeleting(true)} className="inline-flex items-center gap-1 text-red-700"><Trash2 size={12}/>Delete collection</button>}
   </details>
  </div>:<p className="mb-7 text-xs text-stone-400">Likes is your private list of hearted pieces.</p>}

  {error?<p role="alert" className="mb-5 text-sm text-red-700">{error}</p>:null}
  {loading?<p role="status" className="py-16 text-sm text-stone-400">Loading your finds…</p>:items.length?<div className="masonry">{items.map(p=><div key={p.id} className="break-inside-avoid"><ProductCard product={toCard(p)}/><button disabled={busy} onClick={()=>void remove(p.id)} className="mb-3 mt-1 text-[11px] text-stone-500 underline">Remove from {collection.name}</button></div>)}</div>:
   <div className="py-16 text-center"><Bookmark size={32} className="mx-auto mb-3 text-stone-200"/><p className="text-sm text-stone-500">Nothing in {collection.name} yet.</p><p className="mt-1 text-xs text-stone-400">Tap the bookmark on any piece to choose a collection.</p><Link href="/" className={primaryClass+' mt-5 inline-block'}>Browse For You</Link></div>}
 </>;
}

export function PublicCollections(){
 const [list,setList]=useState<PublicCollection[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;api<{collections:PublicCollection[]}>('/public-collections').then(d=>{if(live)setList(d.collections)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
 if(error)return <p role="alert" className="text-sm text-red-700">{error}</p>;
 if(!list)return <p role="status" className="text-sm text-stone-400">Loading public collections…</p>;
 if(!list.length)return <p className="py-16 text-center text-sm text-stone-500">No public collections yet. Make one of yours public to be the first.</p>;
 return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{list.map(c=><Link key={c.id} href={`/collections/${c.id}`} className="group block rounded-2xl border border-stone-100 bg-white p-2 shadow-sm hover:shadow-md">
  <div className="grid aspect-square grid-cols-2 gap-1 overflow-hidden rounded-xl bg-stone-100">{Array.from({length:4},(_,i)=>c.cover[i]?.image?<div key={i} className="relative"><Image src={c.cover[i].image!} alt="" fill unoptimized sizes="120px" className="object-cover"/></div>:<div key={i} className="bg-stone-100"/>)}</div>
  <p className="mt-2 truncate px-1 text-sm font-medium text-stone-800 group-hover:underline">{c.name}</p>
  <p className="truncate px-1 pb-1 text-[11px] text-stone-400">by {c.ownerName} · {c.count} piece{c.count===1?'':'s'}</p>
 </Link>)}</div>;
}
