'use client';
// Feedback: how hard the problem is, how well Yusra solves it, a star rating and a short review — one page.
// Rating listings for the coverage model is optional, offered after sending.
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import Link from 'next/link';
import {Send,Sparkles,Star} from 'lucide-react';
import {api} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {CoverageGame} from '@/components/coverage-game';
import {fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

interface Option{id:string;label:string;emoji?:string}
interface Survey{version:number;inProgress:Option[];starters:string[];problem:{n:number;label:string}[];solution:{n:number;label:string}[]}
const ink='#352D27',muted='#637180',sage='#9FB08F',cream='#FAF8F5';
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const WORDS=['','Rough','Meh','Okay','Lovely','Pure sutra'];
function StarRating({value,onChange,label}:{value:number|null;onChange:(n:number|null)=>void;label:string}){
 const [hover,setHover]=useState<number|null>(null),shown=hover??value??0;
 return <div><div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={()=>setHover(null)}>{[1,2,3,4,5].map(n=>{const on=value===n;return <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n} star${n===1?'':'s'}: ${WORDS[n]}`} onClick={()=>onChange(on?null:n)} onMouseEnter={()=>setHover(n)} onFocus={()=>setHover(n)} onBlur={()=>setHover(null)} className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"><Star size={36} strokeWidth={1.5} className={`transition-colors ${n<=shown?'fill-[#C9A24A] text-[#C9A24A]':'text-stone-300'}`}/></button>})}</div>
  <p aria-live="polite" className="mt-1 h-5 text-sm text-stone-500">{shown?`${shown} of 5 · ${WORDS[shown]}`:'Tap a star'}</p></div>;
}
function Scale({options,value,onChange,label,low,high}:{options:{n:number;label:string}[];value:number|null;onChange:(n:number)=>void;label:string;low:string;high:string}){
 return <div><div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">{options.map(o=>{const on=value===o.n;return <button key={o.n} type="button" role="radio" aria-checked={on} onClick={()=>onChange(o.n)}
  className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 transition-all ${on?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
  <span className="text-lg font-semibold">{o.n}</span><span className="text-center text-[10px] leading-tight">{o.label}</span></button>;})}</div>
  <div className="mt-1.5 flex justify-between text-[10px] text-stone-400"><span>{low}</span><span>{high}</span></div></div>;
}
function Card({kicker,title,children}:{kicker:string;title:string;children:ReactNode}){
 return <div className="rounded-[28px] border border-stone-200 bg-white/95 p-6 shadow-md sm:p-7">
  <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-stone-400">{kicker}</p>
  <h2 style={{...serif,fontSize:'clamp(22px,3.4vw,30px)',color:ink,lineHeight:1.15}} className="mb-4">{title}</h2>
  {children}
 </div>;
}

export default function FeedbackPage(){
 const {user}=useSession();
 const [survey,setSurvey]=useState<Survey|null>(null),[loadError,setLoadError]=useState('');
 const [problem,setProblem]=useState<number|null>(null),[solution,setSolution]=useState<number|null>(null),[overall,setOverall]=useState<number|null>(null),[sentence,setSentence]=useState('');
 const [name,setName]=useState(''),[quoteOk,setQuoteOk]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false),[playing,setPlaying]=useState(false),[labeled,setLabeled]=useState(0);
 useEffect(()=>{let live=true;api<Survey>('/reviews/form').then(d=>{if(live)setSurvey(d)}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:'Could not load the form')});return()=>{live=false}},[]);
 async function submit(){
  if(problem===null){setError('Tell us how hard it is to find modest clothes you love.');return;}
  if(solution===null){setError('Tell us how well Yusra solves it.');return;}
  if(overall===null){setError('Tap a star to rate Yusra.');return;}
  setBusy(true);setError('');
  try{await api('/reviews','POST',{version:3,problem,solution,overall,sentence,name,quoteOk});setSent(true);window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){setError(e instanceof Error?e.message:'Could not send your feedback. Please try again.')}finally{setBusy(false)}
 }

 return <main style={{minHeight:'100vh',background:cream,position:'relative'}}>
  <div aria-hidden style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
   <div style={{position:'absolute',top:-120,left:-140,width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle at 40% 40%,rgba(159,176,143,.35),rgba(159,176,143,0) 70%)',filter:'blur(8px)'}}/>
   <div style={{position:'absolute',top:300,right:-160,width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(221,229,211,.7),rgba(221,229,211,0) 70%)',filter:'blur(10px)'}}/>
  </div>
  <div className="relative z-10 mx-auto max-w-2xl px-5 pb-24 pt-12">
  {!survey?<p role={loadError?'alert':'status'} className="py-20 text-center text-sm text-stone-500">{loadError||'Loading…'}</p>:sent?
   <div className="pt-6 text-center">
    <div className="mx-auto mb-8 grid h-24 w-24 -rotate-6 place-items-center rounded-full border-2 border-dashed text-4xl" style={{borderColor:sage,background:'rgba(221,229,211,.6)'}} aria-hidden>💌</div>
    <h1 style={{...serif,fontSize:'clamp(32px,5vw,48px)',color:ink,lineHeight:1.1}} className="mb-3">Sent with sutra.</h1>
    <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed" style={{color:muted}}>Thank you{labeled?` — and for rating ${labeled} piece${labeled===1?'':'s'}, which directly trains our coverage detection`:''}.</p>
    {!labeled?<div className="mb-10 text-left"><Card kicker="Optional · 1 minute" title="Help train our coverage AI">
     <p className="mb-4 text-sm leading-relaxed" style={{color:muted}}>Rate a few real listings Yusra found: how modest is each one? Every rating teaches our AI what modest means to you.</p>
     {!user?<div className="rounded-2xl border border-dashed border-stone-300 p-5 text-sm text-stone-500"><p className="mb-3">Sign in to play — your ratings are tied to your coverage settings.</p><Link href="/profile" className={primaryClass+' inline-block'}>Sign in</Link></div>
      :playing?<CoverageGame key="game" onDone={n=>{setLabeled(n);setPlaying(false);}}/>:<button className={primaryClass} onClick={()=>setPlaying(true)}>Rate a few pieces</button>}
    </Card></div>:null}
    <div className="flex flex-wrap justify-center gap-2"><Link href="/" className={primaryClass+' inline-flex items-center gap-2'}><Sparkles size={14}/>Back to my feed</Link><Link href="/explore" className={secondaryClass}>Outfit inspo</Link></div>
   </div>
  :<>
   <p className="mb-3 text-xs font-medium uppercase tracking-widest text-stone-400">1-minute feedback</p>
   <h1 style={{...serif,fontSize:'clamp(34px,5vw,52px)',lineHeight:1.05,color:ink}} className="mb-8">Help shape what Yusra becomes.</h1>
   <div className="space-y-4">
    <Card kicker="The problem" title="How hard is it to find modest clothes you love online?"><Scale label="How hard it is" options={survey.problem} value={problem} onChange={setProblem} low="Easy" high="Exhausting"/></Card>
    <Card kicker="The solution" title="How well does Yusra solve that for you?"><Scale label="How well Yusra solves it" options={survey.solution} value={solution} onChange={setSolution} low="Not at all" high="Perfectly"/></Card>
    <Card kicker="Your review" title="How would you rate Yusra?">
     <StarRating label="Star rating" value={overall} onChange={setOverall}/>
     <label className="mt-4 block text-sm font-medium text-stone-700">Write a short review <span className="font-normal text-stone-400">(optional)</span><textarea className={fieldClass+' mt-1.5 min-h-[96px]'} maxLength={500} value={sentence} onChange={e=>setSentence(e.target.value)} placeholder="What did you like, and what would make it perfect?"/></label>
     <div className="mt-2 flex flex-wrap gap-1.5">{survey.starters.map(s=><button key={s} type="button" onClick={()=>setSentence(v=>v.trim()?v:s+' ')} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] text-stone-600 hover:bg-stone-200">{s}</button>)}</div>
     <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-xs font-medium text-stone-600">First name (optional)<input className={fieldClass} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="flex items-end gap-2 pb-2 text-xs leading-relaxed text-stone-600"><input type="checkbox" checked={quoteOk} onChange={e=>setQuoteOk(e.target.checked)}/>Yusra can quote my review</label></div>
    </Card>
   </div>
   {error?<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>:null}
   <div className="mt-6 flex items-center justify-between gap-3"><p className="text-[11px] text-stone-400">{user?`Sending as ${user.email}`:'You can send this without an account.'}</p>
    <button type="button" disabled={busy} onClick={()=>void submit()} className={primaryClass+' inline-flex items-center gap-2'}>{busy?'Sending…':<>Send <Send size={14}/></>}</button></div>
  </>}
  </div>
 </main>;
}
