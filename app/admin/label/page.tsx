'use client';
// Team labeling: check the AI's coverage attributes one product at a time (see docs/LABELING.md).
// Keys: 1–7 pick a row · ←/→ change its answer · C/M/R/N coverage level · Enter save · U not sure · K skip.
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Download,ExternalLink,EyeOff,Keyboard,RefreshCw,SkipForward} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {AuthScreen} from '@/components/account-gate';
import {primaryClass,secondaryClass} from '@/components/preference-form';

type Field='sleeves'|'neckline'|'length'|'fit'|'transparency'|'slits'|'cutouts';
type Level='conservative'|'moderate'|'relaxed'|'not_modest';
interface AiValue{value:string;confidence:number;reason:string}
interface Item{id:string;title:string;description:string;store:string;url:string;category:string;brand:string|null;source:'brand'|'random';priority:number|null;images:string[];fields:Field[];blind:boolean;uncertainty:number;ai:Record<string,AiValue>|null;aiLevel:Level|null}
interface Queue{items:Item[];remaining:number;total:number;labeled:number;values:Record<Field,string[]>;levels:Level[]}
interface Stats{queue:number;labels:number;unsure:number;changedShare:number|null;avgSeconds:number|null;blindItems:number;accuracy:Record<Field,{shown:number|null;blind:number|null;checked:number}>;topMistakes:{mistake:string;count:number}[];byStore:{store:string;agreement:number|null;checked:number}[]}

const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const CANT='cant_tell';
const FIELD_LABEL:Record<Field,string>={sleeves:'Sleeves',neckline:'Neckline',length:'Length',fit:'Fit',transparency:'Fabric',slits:'Slits',cutouts:'Cutouts'};
const VALUE_LABEL:Record<string,string>={sleeveless:'Sleeveless',short:'Short',elbow:'Elbow / ¾',long:'Long',open:'Open / low',medium:'Medium',high:'High',mini:'Mini',knee:'Knee',midi:'Midi',maxi:'Maxi',fitted:'Fitted',regular:'Regular',loose:'Loose',wide:'Wide',opaque:'Opaque',sheer:'Sheer',none:'None',present:'Has one',[CANT]:"Can't tell",unknown:'Unknown'};
const LEVELS:{id:Level;key:string;label:string}[]=[{id:'conservative',key:'c',label:'Conservative'},{id:'moderate',key:'m',label:'Moderate'},{id:'relaxed',key:'r',label:'Relaxed'},{id:'not_modest',key:'n',label:'Not modest'}];
const today=()=>new Date().toISOString().slice(0,10);
async function download(path:string,filename:string){const r=await fetch(path,{credentials:'same-origin'});if(!r.ok)return;const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

function startAnswers(item:Item):Record<string,string>{
 if(item.blind||!item.ai)return {};
 // Pre-select the AI's answer only where it gave one; "unknown" stays blank so the labeler must decide.
 return Object.fromEntries(item.fields.map(f=>[f,item.ai?.[f]?.value&&item.ai[f].value!=='unknown'?item.ai[f].value:'']).filter(([,v])=>v));
}

interface Meta{remaining:number;total:number;labeled:number;values:Record<Field,string[]>;levels:Level[]}
interface Saved{changed:boolean;seconds:number}

// One product. Keyed by product id, so its answers reset whenever the next piece comes up.
function ItemCard({item,meta,onSaved,onSkip}:{item:Item;meta:Meta;onSaved:(s:Saved)=>void;onSkip:()=>void}){
 const [answers,setAnswers]=useState<Record<string,string>>(()=>startAnswers(item)),[level,setLevel]=useState<Level|null>(null),[row,setRow]=useState(0),[photo,setPhoto]=useState(0);
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const started=useRef(0);
 useEffect(()=>{started.current=Date.now();},[]);
 const changed=useMemo(()=>!item.blind&&item.ai?item.fields.filter(f=>answers[f]&&answers[f]!==CANT&&answers[f]!==item.ai?.[f]?.value):[],[item,answers]);

 const save=useCallback(async(unsure=false)=>{
  if(saving)return;
  const missing=item.fields.filter(f=>!answers[f]);
  if(!unsure&&missing.length){setError(`Answer ${missing.map(f=>FIELD_LABEL[f]).join(', ')} (or pick "Can't tell")`);setRow(item.fields.indexOf(missing[0]));return;}
  setSaving(true);setError('');
  const seconds=(Date.now()-started.current)/1000;
  try{await api('/admin/label-queue/labels','POST',{productId:item.id,attributes:answers,level,unsure,seconds});onSaved({changed:changed.length>0,seconds});}
  catch(e){setError((e as Error).message);setSaving(false);}
 },[item,saving,answers,level,changed.length,onSaved]);

 const cycle=useCallback((dir:1|-1)=>{
  const f=item.fields[row];const opts=[...meta.values[f],CANT];
  setAnswers(a=>{const i=opts.indexOf(a[f]);return {...a,[f]:opts[i<0?(dir===1?0:opts.length-1):(i+dir+opts.length)%opts.length]};});
 },[item,meta,row]);

 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   const tag=(e.target as HTMLElement)?.tagName;
   if(e.metaKey||e.ctrlKey||e.altKey||tag==='INPUT'||tag==='TEXTAREA')return;
   const k=e.key.toLowerCase();
   if(/^[1-7]$/.test(k)&&Number(k)<=item.fields.length){setRow(Number(k)-1);e.preventDefault();}
   else if(k==='arrowright'){cycle(1);e.preventDefault();}else if(k==='arrowleft'){cycle(-1);e.preventDefault();}
   else if(k==='arrowdown'){setRow(r=>Math.min(item.fields.length-1,r+1));e.preventDefault();}else if(k==='arrowup'){setRow(r=>Math.max(0,r-1));e.preventDefault();}
   else if(k==='enter'){void save(false);e.preventDefault();}else if(k==='u'){void save(true);}else if(k==='k'){onSkip();}
   else if(k==='p'){setPhoto(p=>(p+1)%Math.max(1,item.images.length));}
   else{const l=LEVELS.find(x=>x.key===k);if(l)setLevel(cur=>cur===l.id?null:l.id);}
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[item,cycle,save,onSkip]);

 return <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
   <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-stone-100">
     <Image key={item.images[photo]} src={item.images[photo]||item.images[0]} alt={item.title} fill unoptimized sizes="(max-width:768px) 90vw, 480px" className="object-contain"/>
    </div>
    {item.images.length>1?<div className="mt-2 flex gap-2">{item.images.map((src,i)=><button key={src} onClick={()=>setPhoto(i)} className={`relative h-20 w-16 overflow-hidden rounded-lg border-2 ${i===photo?'border-stone-800':'border-transparent'}`}><Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover"/></button>)}</div>:null}
    <a href={item.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-stone-500 underline"><ExternalLink size={12}/>Open on {item.store}</a>
   </div>

   <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider">
     <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">{item.category}</span>
     <span className="rounded-full bg-[#DDE5D3] px-2 py-0.5 text-stone-700">{item.source==='brand'?`${item.brand} · P${item.priority}`:`Random · ${item.store}`}</span>
     {item.blind?<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"><EyeOff size={10}/>Blind check</span>:null}
     {!item.blind&&item.uncertainty>=0.4?<span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">AI unsure</span>:null}
    </div>
    <h2 className="mb-1 text-base font-medium leading-snug text-stone-900">{item.title}</h2>
    {item.description?<details className="mb-4 text-xs text-stone-500"><summary className="cursor-pointer select-none">Listing description</summary><p className="mt-1 leading-relaxed">{item.description}</p></details>:<div className="mb-4"/>}

    <div className="space-y-2">{item.fields.map((f,i)=>{
     const ai=item.ai?.[f],opts=[...(meta.values[f]||[]),CANT],active=i===row,low=ai&&(ai.value==='unknown'||ai.confidence<0.65);
     return <div key={f} onClick={()=>setRow(i)} className={`rounded-xl border p-2.5 ${active?'border-stone-800':'border-stone-100'} ${low?'bg-orange-50/50':''}`}>
      <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-stone-700"><span className="mr-1.5 text-stone-400">{i+1}</span>{FIELD_LABEL[f]}</span>
       {ai?<span className="text-[10px] text-stone-400" title={ai.reason}>AI: {VALUE_LABEL[ai.value]||ai.value} · {Math.round(ai.confidence*100)}%</span>:item.blind?<span className="text-[10px] text-amber-700">AI hidden</span>:null}</div>
      <div className="flex flex-wrap gap-1.5">{opts.map(v=>{const on=answers[f]===v,isAi=ai?.value===v;return <button key={v} type="button" onClick={e=>{e.stopPropagation();setRow(i);setAnswers(a=>({...a,[f]:v}));}}
       className={`rounded-full border px-3 py-1 text-xs transition-colors ${on?(isAi||item.blind?'border-stone-900 bg-stone-900 text-white':'border-[#7A5C2E] bg-[#7A5C2E] text-white'):'border-stone-200 text-stone-600 hover:border-stone-400'} ${v===CANT?'italic':''}`}>{VALUE_LABEL[v]||v}</button>;})}</div>
     </div>;})}</div>

    <div className="mt-4"><p className="mb-1.5 text-xs text-stone-500">Overall coverage <span className="text-stone-400">(optional · also counts as a shopper vote)</span>{item.aiLevel?<span className="ml-1 text-[10px] text-stone-400">AI: {LEVELS.find(l=>l.id===item.aiLevel)?.label}</span>:null}</p>
     <div className="flex flex-wrap gap-1.5">{LEVELS.map(l=><button key={l.id} type="button" onClick={()=>setLevel(c=>c===l.id?null:l.id)} className={`rounded-full border px-3 py-1 text-xs ${level===l.id?'border-stone-900 bg-stone-900 text-white':'border-stone-200 text-stone-600 hover:border-stone-400'}`}><span className="mr-1 opacity-50">{l.key.toUpperCase()}</span>{l.label}</button>)}</div></div>

    {error?<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>:null}
    <div className="mt-5 flex flex-wrap items-center gap-2">
     <button className={primaryClass} disabled={saving} onClick={()=>void save(false)}>{saving?'Saving…':`Save & next${changed.length?` · ${changed.length} changed`:''}`}</button>
     <button className={secondaryClass} disabled={saving} onClick={()=>void save(true)}>Not sure (U)</button>
     <button className={secondaryClass+' inline-flex items-center gap-1'} onClick={onSkip}><SkipForward size={13}/>Skip (K)</button>
    </div>
   </div>
  </div>;
}

export default function LabelPage(){
 const {user,loading}=useSession();
 const [queue,setQueue]=useState<Item[]>([]),[meta,setMeta]=useState<Meta|null>(null),[error,setError]=useState('');
 const [session,setSession]=useState({done:0,changed:0,seconds:0}),[stats,setStats]=useState<Stats|null>(null),[help,setHelp]=useState(false),[tick,setTick]=useState(0),[statsTick,setStatsTick]=useState(0);
 const exclude=useRef<Set<string>>(new Set());
 const item=queue[0];

 // Fetch more pieces whenever tick changes (first load, and when the local queue runs low).
 useEffect(()=>{if(!user)return;let live=true;
  api<Queue>('/admin/label-queue/items?count=12').then(({items,...rest})=>{if(!live)return;setMeta(rest);setError('');setQueue(cur=>{const have=new Set([...cur.map(x=>x.id),...exclude.current]);return [...cur,...items.filter(x=>!have.has(x.id))];});})
   .catch(e=>{if(live)setError(e instanceof ApiError&&e.status===403?'forbidden':(e as Error).message);});
  return()=>{live=false};},[user,tick]);
 useEffect(()=>{if(!user)return;let live=true;api<Stats>('/admin/label-queue/stats').then(s=>{if(live)setStats(s)}).catch(()=>{});return()=>{live=false};},[user,statsTick]);

 const next=useCallback((id:string)=>{exclude.current.add(id);setQueue(cur=>{const rest=cur.filter(x=>x.id!==id);if(rest.length<4)setTick(t=>t+1);return rest;});},[]);
 const onSaved=useCallback((s:Saved)=>{if(!item)return;
  setSession(x=>{const done=x.done+1;if(done%10===0)setStatsTick(t=>t+1);return {done,changed:x.changed+(s.changed?1:0),seconds:x.seconds+s.seconds};});
  setMeta(m=>m?{...m,labeled:m.labeled+1,remaining:Math.max(0,m.remaining-1)}:m);next(item.id);},[item,next]);
 const onSkip=useCallback(()=>{if(item)next(item.id);},[item,next]);

 const avg=(key:'shown'|'blind')=>{if(!stats)return null;const v=Object.values(stats.accuracy).map(x=>x[key]).filter((x):x is number=>x!==null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;};
 const overall=avg('shown'),overallBlind=avg('blind');

 if(loading)return <main className="py-24 text-center text-sm text-stone-400">Loading…</main>;
 if(!user)return <AuthScreen/>;
 if(error==='forbidden')return <main className="mx-auto max-w-lg px-5 py-20"><h1 style={serif} className="mb-3 text-3xl">Team access only</h1><p className="text-sm leading-relaxed text-stone-500">Add <code className="rounded bg-stone-100 px-1">{user.email}</code> to <code className="rounded bg-stone-100 px-1">ADMIN_EMAILS</code>, then redeploy.</p><Link href="/" className="mt-6 inline-block text-sm underline">Back to Yusra</Link></main>;

 return <main className="min-h-screen bg-[#FAF8F5] px-4 py-8"><div className="mx-auto max-w-6xl">
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-xs uppercase tracking-widest text-stone-400">Team labeling</p><h1 style={serif} className="text-4xl text-stone-900">Check the AI</h1></div>
   <div className="flex flex-wrap gap-2">
    <button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>setHelp(h=>!h)}><Keyboard size={13}/>Shortcuts</button>
    <button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>setStatsTick(t=>t+1)}><RefreshCw size={13}/>Stats</button>
    <button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void download('/api/admin/label-queue/stats?format=jsonl',`yousra-attribute-labels-${today()}.jsonl`)}><Download size={13}/>JSONL</button>
    <button className={secondaryClass+' inline-flex items-center gap-1.5'} onClick={()=>void download('/api/admin/label-queue/stats?format=csv',`yousra-attribute-labels-${today()}.csv`)}><Download size={13}/>CSV</button>
   </div>
  </div>

  <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{[
   ['You labeled',String(meta?.labeled??'—'),`${session.done} this session`],
   ['Left for you',String(meta?.remaining??'—'),`of ${meta?.total??'—'} in the queue`],
   ['AI right (shown)',overall!==null?`${overall}%`:'—','per attribute, AI answer visible'],
   ['AI right (blind)',overallBlind!==null?`${overallBlind}%`:'—',`${stats?.blindItems??0} blind checks · the honest number`],
   ['You changed the AI',session.done?`${Math.round(session.changed/session.done*100)}%`:'—',session.done?`${Math.round(session.seconds/session.done)}s per item`:'of items this session'],
  ].map(([k,v,sub])=><div key={k} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"><p className="text-xs text-stone-400">{k}</p><p style={serif} className="mt-1 text-3xl text-stone-900">{v}</p><p className="mt-1 text-[10px] leading-snug text-stone-400">{sub}</p></div>)}</div>

  {help?<div className="mb-5 rounded-2xl border border-stone-100 bg-white p-4 text-xs leading-relaxed text-stone-600 shadow-sm">
   <b>1–7</b> pick a row · <b>←/→</b> change its answer · <b>↑/↓</b> move rows · <b>C M R N</b> coverage level (optional) · <b>P</b> next photo · <b>Enter</b> save · <b>U</b> not sure · <b>K</b> skip for now.<br/>
   Judge only the piece for sale, not what the model wears under or over it. Pick <b>Can&apos;t tell</b> when the photos don&apos;t show it (for example, slits from a front photo only). About 1 in 10 items are <b>blind</b>: the AI&apos;s answer is hidden so we can measure it honestly.
  </div>:null}

  {error&&error!=='forbidden'?<p role="alert" className="mb-4 text-sm text-red-700">{error}</p>:null}

  {!item||!meta?<div className="rounded-2xl border border-stone-100 bg-white p-10 text-center text-sm text-stone-500 shadow-sm">{meta&&meta.total===0?<>The queue is empty. Run <code className="rounded bg-stone-100 px-1">npm run label:queue</code> to fill it with pieces from the priority brands.</>:meta?'All caught up — nothing left for you to label.':'Loading pieces…'}</div>
   :<ItemCard key={item.id} item={item} meta={meta} onSaved={onSaved} onSkip={onSkip}/>}

  {stats&&stats.labels?<div className="mt-8 grid gap-3 md:grid-cols-2">
   <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-3 text-xl">AI accuracy by attribute</h2>
    <table className="w-full text-xs"><thead><tr className="text-left text-stone-400"><th className="pb-2 font-normal">Attribute</th><th className="pb-2 font-normal">Shown</th><th className="pb-2 font-normal">Blind</th><th className="pb-2 font-normal">Checked</th></tr></thead>
     <tbody>{(Object.keys(stats.accuracy) as Field[]).map(f=>{const a=stats.accuracy[f];return <tr key={f} className="border-t border-stone-100"><td className="py-1.5">{FIELD_LABEL[f]}</td><td>{a.shown!==null?`${a.shown}%`:'—'}</td><td>{a.blind!==null?`${a.blind}%`:'—'}</td><td className="text-stone-400">{a.checked}</td></tr>;})}</tbody></table></div>
   <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><h2 style={serif} className="mb-3 text-xl">Most common AI mistakes</h2>
    {stats.topMistakes.length?<ul className="space-y-1.5 text-xs">{stats.topMistakes.map(m=><li key={m.mistake} className="flex justify-between gap-2"><span className="text-stone-600">{m.mistake}</span><span className="text-stone-400">{m.count}</span></li>)}</ul>:<p className="text-xs text-stone-400">None yet.</p>}</div>
  </div>:null}
 </div></main>;
}
