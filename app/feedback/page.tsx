'use client';
import {useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {Check,Sparkles,Send,ArrowLeft,ArrowRight} from 'lucide-react';
import {api} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

const STAGES=[
 {id:'signup',label:'Creating your account',hint:'Signing up and getting in.',emoji:'🗝️'},
 {id:'swipes',label:'Style swipes',hint:'Telling us what you like.',emoji:'🫶'},
 {id:'coverage',label:'Coverage questions',hint:'Sleeves, length, fit — your way.',emoji:'🧕'},
 {id:'feed',label:'Your For You feed',hint:'Pieces picked for you.',emoji:'🌿'},
 {id:'search',label:'Searching for a piece',hint:'Finding something specific.',emoji:'🔎'},
 {id:'save',label:'Liking & saving',hint:'Building your collections.',emoji:'🔖'},
 {id:'shop',label:'Shopping at the retailer',hint:'Clicking through to buy.',emoji:'🛍️'},
] as const;
type StageId=typeof STAGES[number]['id'];
const TAGS=['Easy','Beautiful','Fast','Accurate','Fun','Confusing','Slow','Not modest enough','Wrong prices','Missing photos','Too few results','Skipped it'];
const SCALE=[{n:1,word:'Rough',face:'😣'},{n:2,word:'Meh',face:'😕'},{n:3,word:'Okay',face:'🙂'},{n:4,word:'Lovely',face:'😊'},{n:5,word:'Pure sutra',face:'🤍'}];
type Stage={rating:number|null;tags:string[];note:string};
const ink='#352D27',muted='#637180',sage='#9FB08F',cream='#FAF8F5';
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};

function Watercolor(){return <div aria-hidden style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
 <div style={{position:'absolute',top:-120,left:-140,width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle at 40% 40%,rgba(159,176,143,.35),rgba(159,176,143,0) 70%)',filter:'blur(8px)'}}/>
 <div style={{position:'absolute',top:260,right:-160,width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle at 50% 50%,rgba(221,229,211,.7),rgba(221,229,211,0) 70%)',filter:'blur(10px)'}}/>
 <div style={{position:'absolute',bottom:-160,left:'20%',width:520,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(220,252,255,.55),rgba(220,252,255,0) 70%)',filter:'blur(12px)'}}/>
</div>}

function Scale({value,onChange,label}:{value:number|null;onChange:(n:number|null)=>void;label:string}){
 return <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">{SCALE.map(s=>{const on=value===s.n;return <button key={s.n} type="button" role="radio" aria-checked={on} onClick={()=>onChange(on?null:s.n)} className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-2xl border px-2 py-2 text-[11px] transition-all ${on?'border-stone-900 bg-stone-900 text-white shadow-sm -translate-y-0.5':'border-stone-200 bg-white text-stone-500 hover:border-stone-400'}`}><span aria-hidden className="text-lg leading-none">{s.face}</span>{s.word}</button>})}</div>;
}

export default function FeedbackPage(){
 const {user}=useSession();
 const [step,setStep]=useState(0);
 const [stages,setStages]=useState<Record<StageId,Stage>>(()=>Object.fromEntries(STAGES.map(s=>[s.id,{rating:null,tags:[],note:''}])) as unknown as Record<StageId,Stage>);
 const [open,setOpen]=useState<StageId|null>('signup');
 const [overall,setOverall]=useState<number|null>(null),[recommend,setRecommend]=useState<number|null>(null),[modesty,setModesty]=useState<number|null>(null);
 const [found,setFound]=useState(''),[heard,setHeard]=useState('');
 const [loved,setLoved]=useState(''),[improve,setImprove]=useState(''),[wish,setWish]=useState('');
 const [name,setName]=useState(''),[contact,setContact]=useState(''),[quoteOk,setQuoteOk]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const done=STAGES.filter(s=>stages[s.id].rating!==null||stages[s.id].tags.length).length;
 const patch=(id:StageId,p:Partial<Stage>)=>setStages(s=>({...s,[id]:{...s[id],...p}}));
 function next(id:StageId){const i=STAGES.findIndex(s=>s.id===id);setOpen(STAGES[i+1]?.id??null);}
 async function submit(){
  if(overall===null){setError('Choose an overall feeling so we know how the journey felt.');return;}
  setBusy(true);setError('');
  try{await api('/reviews','POST',{stages,overall,recommend,modestyAccuracy:modesty,foundPiece:found||null,heardFrom:heard||null,loved,improve,wish,name,contact,quoteOk});setStep(2);window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){setError(e instanceof Error?e.message:'Could not send your review. Please try again.')}finally{setBusy(false)}
 }
 const progress=step===2?100:step===1?70+(overall?15:0):Math.round(done/STAGES.length*65);
 return <main style={{minHeight:'100vh',background:cream,position:'relative'}}>
  <div style={{height:3,background:'rgba(53,45,39,0.08)',position:'sticky',top:56,zIndex:20}}><div style={{height:'100%',width:`${progress}%`,background:ink,transition:'width .4s ease'}}/></div>
  <Watercolor/>
  <div className="relative z-10 mx-auto max-w-2xl px-5 pb-24 pt-12">
  {step===0?<>
   <p className="mb-3 text-xs font-medium uppercase tracking-widest text-stone-400">Your Yousra journey</p>
   <h1 style={{...serif,fontSize:'clamp(32px,5vw,52px)',lineHeight:1.05,color:ink}} className="mb-3">How did your journey feel?</h1>
   <p className="mb-10 max-w-md text-sm leading-relaxed" style={{color:muted}}>Walk back through each stop and tell us how it went. Skip anything you didn&apos;t try. It takes about two minutes, and every answer shapes what we build next.</p>
   <ol className="relative">
    <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-0 border-l-2 border-dashed" style={{borderColor:'rgba(159,176,143,.7)'}}/>
    {STAGES.map((s,i)=>{const v=stages[s.id],answered=v.rating!==null||v.tags.length>0,isOpen=open===s.id;return <li key={s.id} className="relative mb-4 pl-14">
     <span aria-hidden className={`absolute left-0 top-3 grid h-10 w-10 place-items-center rounded-full border-2 text-base transition-all ${answered?'border-stone-900 bg-stone-900 text-white':'bg-white'}`} style={answered?{}:{borderColor:sage}}>{answered?<Check size={16}/>:s.emoji}</span>
     <div className={`rounded-2xl border bg-white/90 backdrop-blur-sm transition-shadow ${isOpen?'border-stone-200 shadow-md':'border-stone-100 shadow-sm'}`}>
      <button type="button" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:s.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
       <span><span className="block text-[10px] uppercase tracking-widest text-stone-400">Stop {i+1}</span><span style={{...serif,fontSize:22,color:ink}}>{s.label}</span></span>
       <span className="text-xs text-stone-400">{answered?(SCALE.find(x=>x.n===v.rating)?.word||'Noted'):isOpen?'':'Tap to rate'}</span>
      </button>
      {isOpen?<div className="space-y-4 px-5 pb-5">
       <p className="text-xs" style={{color:muted}}>{s.hint}</p>
       <Scale label={`Rate ${s.label}`} value={v.rating} onChange={n=>patch(s.id,{rating:n})}/>
       <div className="flex flex-wrap gap-1.5">{TAGS.map(t=>{const on=v.tags.includes(t);return <button key={t} type="button" aria-pressed={on} onClick={()=>patch(s.id,{tags:on?v.tags.filter(x=>x!==t):[...v.tags,t].slice(0,6)})} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-500 hover:border-stone-400'}`}>{t}</button>})}</div>
       <input className={fieldClass} maxLength={500} value={v.note} onChange={e=>patch(s.id,{note:e.target.value})} placeholder="Anything specific? (optional)" aria-label={`Note about ${s.label}`}/>
       <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 underline underline-offset-2" onClick={()=>next(s.id)}>{i<STAGES.length-1?<>Next stop <ArrowRight size={12}/></>:'Done with the journey'}</button>
      </div>:null}
     </div>
    </li>})}
   </ol>
   <div className="mt-8 flex flex-wrap items-center gap-3"><button className={primaryClass+' inline-flex items-center gap-2'} onClick={()=>{setStep(1);window.scrollTo({top:0,behavior:'smooth'})}}>Write my postcard <ArrowRight size={14}/></button><span className="text-xs text-stone-400">{done} of {STAGES.length} stops rated</span></div>
  </>:null}

  {step===1?<>
   <button onClick={()=>setStep(0)} className="mb-6 flex items-center gap-1.5 text-xs text-stone-500"><ArrowLeft size={14}/>Back to the journey</button>
   <div className="relative rounded-[28px] border border-stone-200 bg-white p-6 shadow-md sm:p-9" style={{backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(53,45,39,.04) 32px)'}}>
    <div aria-hidden className="absolute right-6 top-6 grid h-16 w-14 rotate-6 place-items-center rounded-md border-2 border-dashed text-2xl" style={{borderColor:sage,background:'rgba(221,229,211,.5)'}}>🌿</div>
    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-400">A postcard to the Yousra team</p>
    <h2 style={{...serif,fontSize:'clamp(28px,4vw,40px)',color:ink,lineHeight:1.1}} className="mb-7 max-w-[80%]">Dear Yousra,</h2>
    <div className="space-y-7">
     <section><p className="mb-2 text-sm font-medium text-stone-700">Overall, the journey felt… <span className="text-red-700">*</span></p><Scale label="Overall feeling" value={overall} onChange={setOverall}/></section>
     <section><p className="mb-2 text-sm font-medium text-stone-700">Did pieces match your coverage preferences?</p><Scale label="Coverage match" value={modesty} onChange={setModesty}/></section>
     <section><p className="mb-2 text-sm font-medium text-stone-700">Did you find a piece you&apos;d actually wear?</p><div className="flex flex-wrap gap-2">{[['yes','Yes! 🎉'],['almost','Almost'],['no','Not yet'],['not_yet','Still exploring']].map(([k,l])=><button key={k} type="button" aria-pressed={found===k} onClick={()=>setFound(found===k?'':k)} className={found===k?primaryClass:secondaryClass}>{l}</button>)}</div></section>
     <section><p className="mb-1 text-sm font-medium text-stone-700">How likely are you to tell a friend about Yousra?</p><p className="mb-3 text-xs text-stone-400">0 = not at all · 10 = already told them</p><div className="grid grid-cols-11 gap-1">{Array.from({length:11},(_,n)=><button key={n} type="button" aria-pressed={recommend===n} aria-label={`${n} out of 10`} onClick={()=>setRecommend(recommend===n?null:n)} className={`rounded-lg border py-2 text-xs transition-colors ${recommend===n?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{n}</button>)}</div></section>
     <label className="block space-y-1.5 text-sm font-medium text-stone-700">One thing you loved<textarea className={fieldClass+' min-h-[72px]'} maxLength={2000} value={loved} onChange={e=>setLoved(e.target.value)} placeholder="The swipes were fun, the feed found a skirt I loved…"/></label>
     <label className="block space-y-1.5 text-sm font-medium text-stone-700">One thing that felt hard or wrong<textarea className={fieldClass+' min-h-[90px]'} maxLength={4000} value={improve} onChange={e=>setImprove(e.target.value)} placeholder="A dress said long-sleeve but wasn't, prices were missing…"/></label>
     <label className="block space-y-1.5 text-sm font-medium text-stone-700">If Yousra could do one magic thing for you…<textarea className={fieldClass+' min-h-[60px]'} maxLength={1000} value={wish} onChange={e=>setWish(e.target.value)} placeholder="Build me a full outfit for Eid…"/></label>
     <label className="block space-y-1.5 text-sm font-medium text-stone-700">How did you hear about us?<select className={fieldClass} value={heard} onChange={e=>setHeard(e.target.value)}><option value="">Choose (optional)</option><option value="instagram">Instagram</option><option value="friend">A friend</option><option value="campus">Campus or community</option><option value="creator">A creator</option><option value="other">Somewhere else</option></select></label>
     <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-xs font-medium text-stone-600">Your name (optional)<input className={fieldClass} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label className="block space-y-1.5 text-xs font-medium text-stone-600">Email for a follow-up (optional)<input className={fieldClass} type="email" maxLength={254} value={contact} onChange={e=>setContact(e.target.value)} placeholder={user?.email||'you@example.com'}/></label></div>
     <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-500"><input type="checkbox" className="mt-0.5" checked={quoteOk} onChange={e=>setQuoteOk(e.target.checked)}/>Yousra may quote my words (first name only) when sharing feedback.</label>
    </div>
    {error?<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>:null}
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-stone-400">{user?`Sending as ${user.email}`:'You can send this without an account.'}</p><button disabled={busy} onClick={()=>void submit()} className={primaryClass+' inline-flex items-center gap-2'}>{busy?'Sending…':<>Send my postcard <Send size={14}/></>}</button></div>
   </div>
  </>:null}

  {step===2?<div className="pt-10 text-center">
   <div className="mx-auto mb-8 grid h-24 w-24 -rotate-6 place-items-center rounded-full border-2 border-dashed text-4xl" style={{borderColor:sage,background:'rgba(221,229,211,.6)'}} aria-hidden>💌</div>
   <h1 style={{...serif,fontSize:'clamp(32px,5vw,48px)',color:ink,lineHeight:1.1}} className="mb-3">Sent with sutra.</h1>
   <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed" style={{color:muted}}>Thank you for walking us through your journey. The whole team reads every postcard, and yours will shape what we fix and build next.</p>
   <div className="flex flex-wrap justify-center gap-2"><Link href="/" className={primaryClass+' inline-flex items-center gap-2'}><Sparkles size={14}/>Back to my feed</Link><Link href="/search" className={secondaryClass}>Search for a piece</Link></div>
  </div>:null}
  </div>
 </main>;
}
