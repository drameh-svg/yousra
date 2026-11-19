'use client';
// "Save to…" sheet: pick one or more collections for a piece, or create a new one on the spot.
import {useState,type FormEvent} from 'react';
import {Check,Globe,Lock,Plus} from 'lucide-react';
import {api,type Collection} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {fieldClass,primaryClass} from '@/components/preference-form';
export function SavePicker({id,title,open,onOpenChange}:{id:string;title?:string;open:boolean;onOpenChange:(open:boolean)=>void}){
 const {collections,reloadLibrary}=useSession(),[busy,setBusy]=useState(''),[error,setError]=useState(''),[name,setName]=useState('');
 const mine=collections.filter(c=>!c.system);
 async function toggle(c:Collection){setBusy(c.id);setError('');try{await api(`/collections/${c.id}`,'PATCH',{productId:id,remove:c.productIds.includes(id)});await reloadLibrary()}catch(e){setError(e instanceof Error?e.message:'Could not save.')}finally{setBusy('')}}
 async function create(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy('new');setError('');try{const d=await api<{collection:Collection}>('/collections','POST',{name:name.trim()});await api(`/collections/${d.collection.id}`,'PATCH',{productId:id});await reloadLibrary();setName('')}catch(e){setError(e instanceof Error?e.message:'Could not create collection.')}finally{setBusy('')}}
 return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full max-w-sm overflow-y-auto bg-[#FAF8F5] px-6 pt-12">
  <SheetTitle className="text-lg font-semibold">Save to a collection</SheetTitle>
  <SheetDescription className="text-sm text-stone-500">{title?<span className="line-clamp-1">{title}</span>:null}Pick as many as you like. Use the heart to add a piece to Likes.</SheetDescription>
  <div className="mt-5 space-y-2">{mine.length?mine.map(c=>{const on=c.productIds.includes(id);return <button key={c.id} type="button" aria-pressed={on} disabled={!!busy} onClick={()=>void toggle(c)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${on?'border-stone-900 bg-white':'border-stone-200 bg-white hover:border-stone-400'}`}>
   <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-300'}`}>{on?<Check size={12}/>:null}</span>
   <span className="flex-1 truncate">{c.name}<span className="ml-1.5 text-[11px] text-stone-400">{c.productIds.length}</span></span>
   {c.public?<Globe size={13} className="text-stone-400" aria-label="Public"/>:<Lock size={13} className="text-stone-400" aria-label="Private"/>}
   {busy===c.id?<span className="text-[11px] text-stone-400">Saving…</span>:null}
  </button>}):<p className="text-sm text-stone-500">No collections yet — make your first one below.</p>}</div>
  <form onSubmit={create} className="mt-6 space-y-3"><label className="block space-y-2 text-xs text-stone-500">New collection<input className={fieldClass} value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="e.g. Eid looks, Work wear" required/></label><button disabled={!!busy} className={primaryClass+' inline-flex items-center gap-1.5'}><Plus size={14}/>{busy==='new'?'Saving…':'Create and save'}</button></form>
  <p className="mt-4 text-[11px] text-stone-400">New collections are private. You can share one from the Saved page.</p>
  {error?<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>:null}
 </SheetContent></Sheet>;
}
