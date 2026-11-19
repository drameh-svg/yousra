'use client';
// A shared (public) collection, opened from a link or the Public collections tab.
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {api,type ApiProduct} from '@/lib/api';
import {toCard} from '@/lib/catalog';
import {AccountGate} from '@/components/account-gate';
import {ProductCard} from '@/components/product-card';

export default function SharedCollectionPage(){return <AccountGate><Shared/></AccountGate>}
function Shared(){
 const {id}=useParams<{id:string}>();
 const [data,setData]=useState<{collection:{name:string;ownerName:string};items:ApiProduct[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;api<{collection:{name:string;ownerName:string};items:ApiProduct[]}>(`/public-collections/${id}`).then(d=>{if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[id]);
 return <main className="mx-auto max-w-6xl px-4 py-10">
  <Link href="/saved" className="mb-6 inline-flex items-center gap-1 text-xs text-stone-500"><ArrowLeft size={13}/>Saved</Link>
  {error?<p role="alert" className="text-sm text-stone-500">{error}</p>:!data?<p role="status" className="text-sm text-stone-400">Loading collection…</p>:<>
   <p className="text-xs uppercase tracking-widest text-stone-400">Public collection</p>
   <h1 className="mb-1 text-3xl text-stone-900" style={{fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)"}}>{data.collection.name}</h1>
   <p className="mb-8 text-sm text-stone-500">by {data.collection.ownerName} · {data.items.length} piece{data.items.length===1?'':'s'} · tap the bookmark to save any of them to your own collections</p>
   {data.items.length?<div className="masonry">{data.items.map(p=><ProductCard key={p.id} product={toCard(p)}/>)}</div>:<p className="text-sm text-stone-500">This collection is empty right now.</p>}
  </>}
 </main>;
}
