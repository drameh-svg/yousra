'use client';
// "Share your outfit": photo, caption, style and occasion, optional pieces with links, and consent.
// The photo is resized in the browser before upload, so phone photos stay well under the size limit.
import {useState,type CSSProperties} from 'react';
import Image from 'next/image';
import {ImagePlus,Plus,X} from 'lucide-react';
import {api} from '@/lib/api';
import {fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

export const STYLES=[{id:'clean girl',label:'Clean Girl'},{id:'earthy',label:'Earthy'},{id:'90s chic',label:'90s Chic'},{id:'whimsy',label:'Whimsy'},{id:'y2k',label:'Y2K'},{id:'alternative',label:'Alternative'}];
export const OCCASIONS=[{id:'everyday',label:'Everyday'},{id:'uni & work',label:'Uni & work'},{id:'eid & events',label:'Eid & events'},{id:'wedding guest',label:'Wedding guest'},{id:'travel',label:'Travel'},{id:'active',label:'Active'}];
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};

async function resize(file:File):Promise<string>{
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise<HTMLImageElement>((ok,bad)=>{const i=new window.Image();i.onload=()=>ok(i);i.onerror=()=>bad(new Error("We couldn't open that photo"));i.src=url;});
  const scale=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
  c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',0.85);
 }finally{URL.revokeObjectURL(url);}
}

export function ShareOutfit({onClose,onShared}:{onClose:()=>void;onShared:(approved:boolean)=>void}){
 const [image,setImage]=useState(''),[caption,setCaption]=useState(''),[styles,setStyles]=useState<string[]>([]),[occasion,setOccasion]=useState('');
 const [pieces,setPieces]=useState<{label:string;url:string}[]>([]),[name,setName]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pick=async(f?:File)=>{if(!f)return;setError('');try{setImage(await resize(f));}catch(e){setError((e as Error).message);}};
 const submit=async()=>{
  if(!image){setError('Add a photo of your outfit');return;}
  if(!consent){setError('Please confirm the photo is yours to share');return;}
  setBusy(true);setError('');
  try{const r=await api<{post:{status:string}}>('/outfits','POST',{image,caption,styles,occasion:occasion||null,pieces:pieces.filter(p=>p.label.trim()),authorName:name,consent});onShared(r.post.status==='approved');}
  catch(e){setError((e as Error).message);setBusy(false);}
 };
 return <div role="dialog" aria-modal="true" aria-label="Share your outfit" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
  <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#FAF8F5] p-6 sm:rounded-3xl" onClick={e=>e.stopPropagation()}>
   <div className="mb-4 flex items-start justify-between"><div><h2 style={serif} className="text-3xl text-stone-900">Share your outfit</h2><p className="mt-1 text-xs text-stone-500">We&apos;ll find similar pieces so others can recreate it.</p></div><button aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-stone-100"><X size={18}/></button></div>

   <label className="mb-4 block cursor-pointer">
    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>void pick(e.target.files?.[0])}/>
    {image?<div className="relative mx-auto aspect-[3/4] w-48 overflow-hidden rounded-2xl bg-stone-100"><Image src={image} alt="Your outfit" fill unoptimized className="object-cover"/></div>
     :<div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-sm text-stone-500"><ImagePlus size={28}/>Choose a photo</div>}
   </label>
   <p className="mb-4 text-[11px] leading-relaxed text-stone-400">Tip: a mirror selfie or a photo cropped at the shoulders works well if you&apos;d rather not show your face.</p>

   <textarea className={fieldClass+' mb-3'} rows={2} maxLength={300} placeholder="Caption (optional) — where did you wear it?" value={caption} onChange={e=>setCaption(e.target.value)}/>
   <p className="mb-1.5 text-xs text-stone-500">Style (up to 3)</p>
   <div className="mb-3 flex flex-wrap gap-1.5">{STYLES.map(s=>{const on=styles.includes(s.id);return <button key={s.id} type="button" onClick={()=>setStyles(c=>on?c.filter(x=>x!==s.id):c.length<3?[...c,s.id]:c)} className={`rounded-full border px-3 py-1 text-xs ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 text-stone-600'}`}>{s.label}</button>;})}</div>
   <p className="mb-1.5 text-xs text-stone-500">Occasion</p>
   <div className="mb-4 flex flex-wrap gap-1.5">{OCCASIONS.map(o=><button key={o.id} type="button" onClick={()=>setOccasion(c=>c===o.id?'':o.id)} className={`rounded-full border px-3 py-1 text-xs ${occasion===o.id?'border-stone-900 bg-stone-900 text-white':'border-stone-200 text-stone-600'}`}>{o.label}</button>)}</div>

   <p className="mb-1.5 text-xs text-stone-500">Pieces you&apos;re wearing <span className="text-stone-400">(optional · add a link if you have one)</span></p>
   {pieces.map((p,i)=><div key={i} className="mb-2 flex gap-2"><input className={fieldClass} placeholder="e.g. Uniqlo wide-leg trousers" value={p.label} maxLength={80} onChange={e=>setPieces(c=>c.map((x,j)=>j===i?{...x,label:e.target.value}:x))}/><input className={fieldClass} placeholder="Link (optional)" value={p.url} onChange={e=>setPieces(c=>c.map((x,j)=>j===i?{...x,url:e.target.value}:x))}/><button aria-label="Remove piece" onClick={()=>setPieces(c=>c.filter((_,j)=>j!==i))} className="px-1 text-stone-400"><X size={16}/></button></div>)}
   {pieces.length<6?<button type="button" onClick={()=>setPieces(c=>[...c,{label:'',url:''}])} className="mb-4 inline-flex items-center gap-1 text-xs text-stone-600 underline"><Plus size={12}/>Add a piece</button>:null}

   <input className={fieldClass+' mb-4'} maxLength={40} placeholder="Name to show (optional, e.g. Amani)" value={name} onChange={e=>setName(e.target.value)}/>
   <label className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-stone-600"><input type="checkbox" className="mt-0.5" checked={consent} onChange={e=>setConsent(e.target.checked)}/>This is my own photo, and everyone in it agreed to share it on Yusra. I understand the team reviews posts before they appear.</label>
   {error?<p role="alert" className="mb-3 text-xs text-red-700">{error}</p>:null}
   <div className="flex gap-2"><button className={primaryClass} disabled={busy} onClick={()=>void submit()}>{busy?'Sharing…':'Share outfit'}</button><button className={secondaryClass} onClick={onClose}>Cancel</button></div>
  </div>
 </div>;
}
