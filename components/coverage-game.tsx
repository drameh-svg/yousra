'use client';
// "Rate the coverage": shoppers rate 5–10 real listings Yusra found. Each rating is saved as a modesty label
// that we use to measure and improve coverage detection (see docs/MODESTY-LABELS.md).
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {Check,SkipForward} from 'lucide-react';
import {api} from '@/lib/api';

export type Level='conservative'|'moderate'|'relaxed'|'not_modest';
interface Item{id:string;title:string;store:string;category:string;image:string;images:string[]}
interface Label{productId:string;level:Level;issues:string[]}

export const LEVELS:{id:Level;label:string;hint:string;emoji:string}[]=[
 {id:'conservative',label:'Conservative',hint:'Long sleeves, high neck, loose, full length',emoji:'🧕'},
 {id:'moderate',label:'Moderate',hint:'Elbow sleeves or longer, no low neckline, midi or longer',emoji:'🌿'},
 {id:'relaxed',label:'Relaxed',hint:'Modest for some, or with a layer underneath',emoji:'🧥'},
 {id:'not_modest',label:'Not modest',hint:"I wouldn't wear this, even layered",emoji:'🚫'},
];
const ISSUES:{id:string;label:string}[]=[
 {id:'sleeves',label:'Sleeves too short'},{id:'neckline',label:'Neckline too low'},{id:'length',label:'Too short'},
 {id:'fit',label:'Too tight'},{id:'transparency',label:'See-through'},{id:'slits',label:'Slit'},{id:'cutouts',label:'Cutouts'},
];

function Photo({src,title}:{src:string;title:string}){
 const [failed,setFailed]=useState(false);
 return <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-stone-100">{src&&!failed?<Image src={src} alt={title} fill unoptimized sizes="(max-width:640px) 90vw, 360px" className="object-contain" onError={()=>setFailed(true)}/>:<div className="grid h-full place-items-center p-6 text-center text-xs text-stone-400">Photo unavailable — rate from the title, or skip</div>}</div>;
}

export function CoverageGame({count=8,source='feedback',onDone}:{count?:number;source?:'feedback'|'onboarding';onDone:(rated:number)=>void}){
 const [items,setItems]=useState<Item[]|null>(null),[error,setError]=useState('');
 const [index,setIndex]=useState(0),[photo,setPhoto]=useState(0),[level,setLevel]=useState<Level|null>(null),[issues,setIssues]=useState<string[]>([]);
 const [labels,setLabels]=useState<Label[]>([]),[saving,setSaving]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{let live=true;api<{items:Item[]}>(`/labeling/items?count=${count}`).then(d=>{if(live)setItems(d.items)}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Could not load pieces')});return()=>{live=false}},[count]);
 async function finish(all:Label[]){
  if(!all.length){onDone(0);return;}
  setSaving(true);setError('');setFailed(false);
  try{await api('/labeling','POST',{source,labels:all});onDone(all.length);}
  catch(e){setError(e instanceof Error?e.message:'Could not save your ratings');setFailed(true);setSaving(false);}
 }
 function advance(label:Label|null){
  const all=label?[...labels,label]:labels;setLabels(all);setLevel(null);setIssues([]);setPhoto(0);
  if(items&&index+1<items.length)setIndex(index+1);else void finish(all);
 }
 if(error&&!items)return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500"><p role="alert" className="mb-4">{error}</p><button className="text-xs underline" onClick={()=>onDone(0)}>Skip this step</button></div>;
 if(failed)return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500"><p role="alert" className="mb-4">{error}</p><div className="flex gap-3"><button className="rounded-full bg-stone-900 px-4 py-2 text-xs text-white" disabled={saving} onClick={()=>void finish(labels)}>{saving?'Saving…':'Try again'}</button><button className="text-xs underline" onClick={()=>onDone(0)}>Skip</button></div></div>;
 if(!items)return <p role="status" className="py-10 text-center text-sm text-stone-400">Picking pieces for you to rate…</p>;
 if(!items.length)return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500"><p className="mb-4">You have rated every piece we have right now. Thank you!</p><button className="text-xs underline" onClick={()=>onDone(0)}>Continue</button></div>;
 const item=items[index],shots=item.images.length?item.images:[item.image];
 return <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-md sm:p-7">
  <div className="mb-4 flex items-center justify-between text-xs text-stone-400"><span>Piece {index+1} of {items.length}</span><span className="flex gap-1" aria-hidden>{items.map((_,i)=><span key={i} className={`h-1.5 w-4 rounded-full ${i<index?'bg-stone-800':i===index?'bg-stone-400':'bg-stone-200'}`}/>)}</span></div>
  <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr]">
   <div><Photo key={shots[photo]} src={shots[photo]} title={item.title}/>{shots.length>1?<div className="mt-2 flex gap-1.5">{shots.map((_,i)=><button key={i} type="button" aria-label={`Photo ${i+1}`} aria-pressed={photo===i} onClick={()=>setPhoto(i)} className={`h-2 flex-1 rounded-full ${photo===i?'bg-stone-800':'bg-stone-200'}`}/>)}</div>:null}</div>
   <div>
    <p className="text-[10px] uppercase tracking-widest text-stone-400">{item.store}</p>
    <p className="mb-4 text-sm font-medium leading-snug text-stone-800">{item.title}</p>
    <p className="mb-2 text-sm text-stone-600">How much coverage does this give?</p>
    <div role="radiogroup" aria-label="Coverage level" className="grid gap-2">{LEVELS.map(l=>{const on=level===l.id;return <button key={l.id} type="button" role="radio" aria-checked={on} onClick={()=>setLevel(l.id)} className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white hover:border-stone-400'}`}><span aria-hidden className="text-lg leading-none">{l.emoji}</span><span><span className="block text-sm font-medium">{l.label}</span><span className={`block text-[11px] ${on?'text-stone-300':'text-stone-400'}`}>{l.hint}</span></span></button>})}</div>
    {level&&level!=='conservative'?<div className="mt-4"><p className="mb-2 text-xs text-stone-500">What&apos;s off? <span className="text-stone-400">(optional)</span></p><div className="flex flex-wrap gap-1.5">{ISSUES.map(x=>{const on=issues.includes(x.id);return <button key={x.id} type="button" aria-pressed={on} onClick={()=>setIssues(on?issues.filter(i=>i!==x.id):[...issues,x.id])} className={`rounded-full border px-3 py-1 text-[11px] ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 text-stone-500 hover:border-stone-400'}`}>{x.label}</button>})}</div></div>:null}
    {error?<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>:null}
    <div className="mt-5 flex flex-wrap items-center gap-3">
     <button type="button" disabled={!level||saving} onClick={()=>level&&advance({productId:item.id,level,issues})} className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"><Check size={14}/>{index+1<items.length?'Next piece':'Save my ratings'}</button>
     <button type="button" disabled={saving} onClick={()=>advance(null)} className="inline-flex items-center gap-1 text-xs text-stone-500 underline underline-offset-2"><SkipForward size={12}/>Not sure, skip</button>
    </div>
   </div>
  </div>
 </div>;
}

// One-tap version for product pages: "Is this rated right?"
export function CoverageVote({productId}:{productId:string}){
 const [choice,setChoice]=useState<Level|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function vote(level:Level){setBusy(true);setError('');try{await api('/labeling','POST',{source:'product',labels:[{productId,level,issues:[]}]});setChoice(level);}catch(e){setError(e instanceof Error?e.message:'Could not save')}finally{setBusy(false)}}
 return <div className="mb-6 rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
  <p className="mb-2 text-xs text-stone-500">{choice?'Thanks — this helps our coverage detection learn.':'How much coverage does this piece really give?'}</p>
  <div className="flex flex-wrap gap-1.5">{LEVELS.map(l=><button key={l.id} type="button" disabled={busy} aria-pressed={choice===l.id} title={l.hint} onClick={()=>void vote(l.id)} className={`rounded-full border px-3 py-1 text-[11px] ${choice===l.id?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{l.emoji} {l.label}</button>)}</div>
  {error?<p role="alert" className="mt-2 text-[11px] text-red-700">{error}</p>:null}
 </div>;
}
