'use client';
// "Find my modesty": five real pieces, "Would you wear this?" with reasons, then a suggested coverage level.
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {Check,X as Close,ThumbsDown,ThumbsUp} from 'lucide-react';
import {api,type ApiProduct} from '@/lib/api';

export type Preset='Conservative'|'Moderate'|'Relaxed';
export interface QuizResult {preset:Preset;agreement:number;tweaks:Record<string,string>;allowLayering:boolean}
interface Reason {id:string;label:string}
interface Answer {productId:string;wear:boolean;reasons:string[]}
const DESCRIBE:Record<Preset,string>={Conservative:'Long sleeves, high necklines, loose fits and full-length hems.',Moderate:'Elbow sleeves or longer, no low necklines, midi length or longer.',Relaxed:'Light coverage rules: you decide piece by piece.'};
const TWEAK_LABEL:Record<string,string>={sleeves:'long sleeves',neckline:'high necklines',length:'full-length hems',fit:'loose fits',transparency:'opaque fabric',slits:'no slits',cutouts:'no cutouts'};

export function ModestyQuiz({onClose,onApply}:{onClose:()=>void;onApply:(r:QuizResult)=>void}){
 const [items,setItems]=useState<ApiProduct[]|null>(null),[yes,setYes]=useState<Reason[]>([]),[no,setNo]=useState<Reason[]>([]),[error,setError]=useState('');
 const [index,setIndex]=useState(0),[wear,setWear]=useState<boolean|null>(null),[reasons,setReasons]=useState<string[]>([]),[answers,setAnswers]=useState<Answer[]>([]);
 const [result,setResult]=useState<QuizResult|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;api<{items:ApiProduct[];yes:Reason[];no:Reason[]}>('/modesty-quiz').then(d=>{if(!live)return;setItems(d.items);setYes(d.yes);setNo(d.no);}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)},[onClose]);
 async function next(){
  if(!items||wear===null)return;
  const all=[...answers,{productId:items[index].id,wear,reasons}];setAnswers(all);setWear(null);setReasons([]);
  if(index+1<items.length){setIndex(index+1);return;}
  setBusy(true);setError('');
  try{const r=await api<{preset:string}&Omit<QuizResult,'preset'>>('/modesty-quiz','POST',{answers:all});setResult({...r,preset:(r.preset.charAt(0).toUpperCase()+r.preset.slice(1)) as Preset});}
  catch(e){setError(e instanceof Error?e.message:'Could not work out your level')}finally{setBusy(false)}
 }
 const item=items?.[index],options=wear===null?[]:wear?yes:no;
 return <div role="dialog" aria-modal="true" aria-label="Find my modesty" className="fixed inset-0 z-[100] grid place-items-center bg-stone-900/40 p-4" onClick={onClose}>
  <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-5 shadow-xl sm:p-7" onClick={e=>e.stopPropagation()}>
   <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium uppercase tracking-widest text-stone-400">Find my modesty</p><p className="text-lg font-semibold text-stone-900">{result?'Your suggested level':'Would you wear this?'}</p></div><button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"><Close size={16}/></button></div>
   {error&&!result?<div className="text-sm text-stone-600"><p role="alert" className="mb-4">{error}</p><p className="mb-4 text-xs text-stone-400">You can still choose your level yourself on the profile page.</p><button onClick={onClose} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Choose manually</button></div>
   :result?<div>
    <p className="mb-1 text-3xl text-stone-900" style={{fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)"}}>{result.preset}</p>
    <p className="mb-4 text-sm text-stone-600">{DESCRIBE[result.preset]}</p>
    <ul className="mb-5 space-y-1 text-xs text-stone-500">
     <li>Matches {result.agreement}% of your answers.</li>
     {Object.keys(result.tweaks).length?<li>Plus, from your answers: {Object.keys(result.tweaks).map(k=>TWEAK_LABEL[k]||k).join(', ')}.</li>:null}
     {result.allowLayering?<li>We&apos;ll also show pieces you could wear with a layer.</li>:null}
    </ul>
    <div className="flex flex-wrap gap-2"><button onClick={()=>onApply(result)} className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white"><Check size={14}/>Use {result.preset}</button><button onClick={onClose} className="rounded-full border border-stone-200 px-5 py-2.5 text-sm text-stone-600">I&apos;ll choose myself</button></div>
   </div>
   :!items?<p role="status" className="py-12 text-center text-sm text-stone-400">Picking pieces…</p>
   :item?<div>
    <div className="mb-3 flex gap-1" aria-hidden>{items.map((_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<index?'bg-stone-800':i===index?'bg-stone-400':'bg-stone-200'}`}/>)}</div>
    <div className="relative mx-auto mb-3 aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl bg-stone-100">{item.image?<Image key={item.id} src={item.image} alt={item.title} fill unoptimized sizes="260px" className="object-contain"/>:null}</div>
    <p className="mb-4 text-center text-xs text-stone-500 line-clamp-1">{item.title}</p>
    <div className="mb-3 grid grid-cols-2 gap-2">
     <button aria-pressed={wear===true} onClick={()=>{setWear(true);setReasons([])}} className={`inline-flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm ${wear===true?'border-stone-900 bg-stone-900 text-white':'border-stone-200 hover:border-stone-400'}`}><ThumbsUp size={15}/>Yes, I&apos;d wear it</button>
     <button aria-pressed={wear===false} onClick={()=>{setWear(false);setReasons([])}} className={`inline-flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm ${wear===false?'border-stone-900 bg-stone-900 text-white':'border-stone-200 hover:border-stone-400'}`}><ThumbsDown size={15}/>No</button>
    </div>
    {options.length?<div className="mb-4"><p className="mb-2 text-xs text-stone-500">{wear?'Why yes?':'Why not?'} <span className="text-stone-400">(tap any)</span></p><div className="flex flex-wrap gap-1.5">{options.map(r=>{const on=reasons.includes(r.id);return <button key={r.id} aria-pressed={on} onClick={()=>setReasons(on?reasons.filter(x=>x!==r.id):[...reasons,r.id])} className={`rounded-full border px-3 py-1 text-[11px] ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 text-stone-600 hover:border-stone-400'}`}>{r.label}</button>})}</div></div>:null}
    {error?<p role="alert" className="mb-3 text-xs text-red-700">{error}</p>:null}
    <button disabled={wear===null||busy} onClick={()=>void next()} className="w-full rounded-full bg-stone-900 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy?'Working it out…':index+1<items.length?`Next (${index+1}/${items.length})`:'See my level'}</button>
   </div>:<p className="text-sm text-stone-500">We don&apos;t have enough pieces with confirmed coverage yet. Please choose your level yourself for now.</p>}
  </div>
 </div>;
}
