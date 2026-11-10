'use client';
import {useState,type FormEvent} from 'react';
import {api,type Collection} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {fieldClass,primaryClass} from '@/components/preference-form';
export function SavePicker({id,open,onOpenChange}:{id:string;open:boolean;onOpenChange:(open:boolean)=>void}){
 const {collections,reloadLibrary}=useSession(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('');
 async function toggle(c:Collection){setBusy(true);setError('');try{await api(`/collections/${c.id}`,'PATCH',{productId:id,remove:c.productIds.includes(id)});await reloadLibrary()}catch(e){setError(e instanceof Error?e.message:'Could not save.')}finally{setBusy(false)}}
 async function create(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setError('');try{const d=await api<{collection:Collection}>('/collections','POST',{name:name.trim()});await api(`/collections/${d.collection.id}`,'PATCH',{productId:id});await reloadLibrary();setName('')}catch(e){setError(e instanceof Error?e.message:'Could not create collection.')}finally{setBusy(false)}}
 return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full max-w-sm bg-[#FAF8F5] px-6 pt-12"><SheetTitle className="text-lg font-semibold">Keep this find.</SheetTitle><SheetDescription className="text-sm text-stone-500">Choose a private collection. Use the heart to add a piece to Likes.</SheetDescription><div className="mt-4 space-y-3">{collections.filter(c=>!c.system).map(c=><label key={c.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm"><input type="checkbox" checked={c.productIds.includes(id)} disabled={busy} onChange={()=>void toggle(c)}/>{c.name}</label>)}</div><form onSubmit={create} className="mt-5 space-y-3"><label className="block space-y-2 text-xs text-stone-500">New collection<input className={fieldClass} value={name} onChange={e=>setName(e.target.value)} maxLength={60} required/></label><button disabled={busy} className={primaryClass}>{busy?'Saving…':'Create and save'}</button></form>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}</SheetContent></Sheet>;
}
