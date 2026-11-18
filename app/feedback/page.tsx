'use client';
// MVP validation survey: short, one question per card. Options come from /api/reviews/form so the
// dashboard and the form always use the same lists.
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Check,Hammer,Plus,Send,Sparkles,Star} from 'lucide-react';
import {api} from '@/lib/api';
import {useSession} from '@/components/session-provider';
import {CoverageGame} from '@/components/coverage-game';
import {fieldClass,primaryClass,secondaryClass} from '@/components/preference-form';

interface Option{id:string;label:string;emoji?:string}
interface Survey{version:number;working:Option[];inProgress:Option[];ideas:Option[];priorities:Option[];sites:Option[];disappointed:Option[];starters:string[]}
const ink='#352D27',muted='#637180',sage='#9FB08F',cream='#FAF8F5';
const serif:CSSProperties={fontFamily:"var(--font-serif,'Instrument Serif',Georgia,serif)",fontWeight:400};
const WORDS=['','Rough','Meh','Okay','Lovely','Pure sutra'];
function StarRating({value,onChange,label}:{value:number|null;onChange:(n:number|null)=>void;label:string}){
 const [hover,setHover]=useState<number|null>(null),shown=hover??value??0;
 return <div><div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={()=>setHover(null)}>{[1,2,3,4,5].map(n=>{const on=value===n;return <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n} star${n===1?'':'s'}: ${WORDS[n]}`} onClick={()=>onChange(on?null:n)} onMouseEnter={()=>setHover(n)} onFocus={()=>setHover(n)} onBlur={()=>setHover(null)} className="rounded-full p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"><Star size={36} strokeWidth={1.5} className={`transition-colors ${n<=shown?'fill-[#C9A24A] text-[#C9A24A]':'text-stone-300'}`}/></button>})}</div>
  <p aria-live="polite" className="mt-1 h-5 text-sm text-stone-500">{shown?`${shown} of 5 · ${WORDS[shown]}`:'Tap a star'}</p></div>;
}
const STEPS=['Loved','Wishlist','Priorities','Shopping','Coverage','Your words'] as const;
const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(x=>x!==id):[...list,id];

function Chip({on,onClick,children,badge}:{on:boolean;onClick:()=>void;children:ReactNode;badge?:string}){
 return <button type="button" aria-pressed={on} onClick={onClick} className={`relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all ${on?'border-stone-900 bg-stone-900 text-white shadow-sm -translate-y-0.5':'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{on?<Check size={13}/>:null}{children}{badge?<span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${on?'bg-white/20 text-white':'bg-[#DDE5D3] text-stone-600'}`}>{badge}</span>:null}</button>;
}
function AddOwn({placeholder,values,onChange}:{placeholder:string;values:string[];onChange:(v:string[])=>void}){
 const [draft,setDraft]=useState('');
 const add=()=>{const v=draft.trim();if(v&&values.length<3&&!values.includes(v))onChange([...values,v]);setDraft('');};
 return <div className="mt-4"><div className="flex flex-wrap gap-2">{values.map(v=><Chip key={v} on onClick={()=>onChange(values.filter(x=>x!==v))}>{v}</Chip>)}</div>
  {values.length<3?<div className="mt-2 flex gap-2"><input className={fieldClass} maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} placeholder={placeholder} aria-label={placeholder}/><button type="button" onClick={add} className={secondaryClass+' inline-flex shrink-0 items-center gap-1'}><Plus size={14}/>Add</button></div>:null}</div>;
}
function Card({kicker,title,sub,children}:{kicker:string;title:string;sub?:string;children:ReactNode}){
 return <div className="rounded-[28px] border border-stone-200 bg-white/95 p-6 shadow-md backdrop-blur-sm sm:p-8">
  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-400">{kicker}</p>
  <h2 style={{...serif,fontSize:'clamp(26px,4vw,36px)',color:ink,lineHeight:1.1}} className="mb-2">{title}</h2>
  {sub?<p className="mb-6 text-sm leading-relaxed" style={{color:muted}}>{sub}</p>:<div className="mb-6"/>}
  {children}
 </div>;
}

export default function FeedbackPage(){
 const {user}=useSession();
 const [survey,setSurvey]=useState<Survey|null>(null),[loadError,setLoadError]=useState('');
 const [step,setStep]=useState(-1);
 const [liked,setLiked]=useState<string[]>([]);
 const [wanted,setWanted]=useState<string[]>([]),[wantedOther,setWantedOther]=useState<string[]>([]);
 const [priorities,setPriorities]=useState<string[]>([]);
 const [sites,setSites]=useState<string[]>([]),[sitesOther,setSitesOther]=useState<string[]>([]);
 const [labeled,setLabeled]=useState(0);
 const [overall,setOverall]=useState<number|null>(null),[disappointed,setDisappointed]=useState(''),[sentence,setSentence]=useState('');
 const [followUp,setFollowUp]=useState(false),[name,setName]=useState(''),[contact,setContact]=useState(''),[quoteOk,setQuoteOk]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 useEffect(()=>{let live=true;api<Survey>('/reviews/form').then(d=>{if(live)setSurvey(d)}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:'Could not load the survey')});return()=>{live=false}},[]);
 const go=(n:number)=>{setStep(n);setError('');window.scrollTo({top:0,behavior:'smooth'});};
 const rank=(id:string)=>setPriorities(p=>p.includes(id)?p.filter(x=>x!==id):p.length<3?[...p,id]:p);
 async function submit(){
  if(overall===null){setError('Tap a star to rate Yousra overall.');return;}
  if(sentence.trim().length<3){setError('Write one sentence about how you liked the MVP.');return;}
  setBusy(true);setError('');
  try{await api('/reviews','POST',{overall,sentence,liked,wanted,wantedOther,priorities,sites,sitesOther,disappointed:disappointed||null,labeled,name,contact,quoteOk});setSent(true);window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){setError(e instanceof Error?e.message:'Could not send your feedback. Please try again.')}finally{setBusy(false)}
 }
 const progress=sent?100:step<0?0:Math.round((step+1)/(STEPS.length+1)*100);
 const nav=(next:ReactNode=null,skip=true)=><div className="mt-8 flex flex-wrap items-center justify-between gap-3">
  <button type="button" onClick={()=>go(step-1)} className="inline-flex items-center gap-1.5 text-xs text-stone-500"><ArrowLeft size={14}/>Back</button>
  <div className="flex items-center gap-3">{skip?<button type="button" onClick={()=>go(step+1)} className="text-xs text-stone-400 underline underline-offset-2">Skip</button>:null}{next??<button type="button" onClick={()=>go(step+1)} className={primaryClass+' inline-flex items-center gap-2'}>Next <ArrowRight size={14}/></button>}</div>
 </div>;

 return <main style={{minHeight:'100vh',background:cream,position:'relative'}}>
  <div style={{height:3,background:'rgba(53,45,39,0.08)',position:'sticky',top:56,zIndex:20}}><div style={{height:'100%',width:`${progress}%`,background:ink,transition:'width .4s ease'}}/></div>
  <div aria-hidden style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
   <div style={{position:'absolute',top:-120,left:-140,width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle at 40% 40%,rgba(159,176,143,.35),rgba(159,176,143,0) 70%)',filter:'blur(8px)'}}/>
   <div style={{position:'absolute',top:300,right:-160,width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(221,229,211,.7),rgba(221,229,211,0) 70%)',filter:'blur(10px)'}}/>
  </div>
  <div className="relative z-10 mx-auto max-w-2xl px-5 pb-24 pt-12">
  {!survey?<p role={loadError?'alert':'status'} className="py-20 text-center text-sm text-stone-500">{loadError||'Loading…'}</p>:sent?
   <div className="pt-6 text-center">
    <div className="mx-auto mb-8 grid h-24 w-24 -rotate-6 place-items-center rounded-full border-2 border-dashed text-4xl" style={{borderColor:sage,background:'rgba(221,229,211,.6)'}} aria-hidden>💌</div>
    <h1 style={{...serif,fontSize:'clamp(32px,5vw,48px)',color:ink,lineHeight:1.1}} className="mb-3">Sent with sutra.</h1>
    <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed" style={{color:muted}}>Thank you{labeled?` — and for rating ${labeled} piece${labeled===1?'':'s'}, which directly trains our coverage detection`:''}. Here&apos;s what we&apos;re building next:</p>
    <div className="mx-auto mb-10 flex max-w-md flex-wrap justify-center gap-2">{survey.inProgress.map(x=><span key={x.id} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600">{x.emoji} {x.label}</span>)}</div>
    <div className="flex flex-wrap justify-center gap-2"><Link href="/" className={primaryClass+' inline-flex items-center gap-2'}><Sparkles size={14}/>Back to my feed</Link><Link href="/search" className={secondaryClass}>Search for a piece</Link></div>
   </div>
  :step<0?<>
   <p className="mb-3 text-xs font-medium uppercase tracking-widest text-stone-400">2-minute check-in</p>
   <h1 style={{...serif,fontSize:'clamp(34px,5vw,54px)',lineHeight:1.05,color:ink}} className="mb-3">Help shape what Yousra becomes.</h1>
   <p className="mb-8 max-w-md text-sm leading-relaxed" style={{color:muted}}>Six quick taps: what you loved, what to build next, what matters to you, where you shop today, a mini coverage game, and one sentence. Skip anything.</p>
   <div className="mb-8 grid gap-3 sm:grid-cols-2">
    <div className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm"><p className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-white"><Check size={13}/></span>Working well today</p><ul className="space-y-1.5 text-sm text-stone-600">{survey.working.slice(0,6).map(x=><li key={x.id}>{x.emoji} {x.label}</li>)}</ul></div>
    <div className="rounded-3xl border border-dashed p-5" style={{borderColor:sage,background:'rgba(221,229,211,.35)'}}><p className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-stone-700"><Hammer size={13}/></span>What we&apos;re working on</p><ul className="space-y-1.5 text-sm text-stone-600">{survey.inProgress.map(x=><li key={x.id}>{x.emoji} {x.label}</li>)}</ul><p className="mt-3 text-[11px] text-stone-500">Your answers decide what ships first.</p></div>
   </div>
   <button className={primaryClass+' inline-flex items-center gap-2'} onClick={()=>go(0)}>Let&apos;s go <ArrowRight size={14}/></button>
  </>:<>
   <ol className="mb-6 flex flex-wrap gap-1.5" aria-label="Survey steps">{STEPS.map((s,i)=><li key={s}><button type="button" onClick={()=>go(i)} aria-current={i===step?'step':undefined} className={`rounded-full px-3 py-1 text-[11px] ${i===step?'bg-stone-900 text-white':i<step?'bg-[#DDE5D3] text-stone-700':'bg-white text-stone-400'}`}>{i+1}. {s}</button></li>)}</ol>

   {step===0?<Card kicker="What's working" title="Which parts did you actually enjoy?" sub="Tap everything that felt good. These are the features live in the MVP today.">
    <div className="flex flex-wrap gap-2">{survey.working.map(x=><Chip key={x.id} on={liked.includes(x.id)} onClick={()=>setLiked(toggle(liked,x.id))}>{x.emoji} {x.label}</Chip>)}</div>
    {nav()}
   </Card>:null}

   {step===1?<Card kicker="Your wishlist" title="What should we build next?" sub="Pick as many as you like. Items marked “building” are already in progress — a tap tells us to hurry.">
    <div className="flex flex-wrap gap-2">{survey.inProgress.map(x=><Chip key={x.id} badge="building" on={wanted.includes(x.id)} onClick={()=>setWanted(toggle(wanted,x.id))}>{x.emoji} {x.label}</Chip>)}{survey.ideas.map(x=><Chip key={x.id} on={wanted.includes(x.id)} onClick={()=>setWanted(toggle(wanted,x.id))}>{x.emoji} {x.label}</Chip>)}</div>
    <AddOwn placeholder="Your own idea, e.g. abaya size guide" values={wantedOther} onChange={setWantedOther}/>
    {nav()}
   </Card>:null}

   {step===2?<Card kicker="Priorities" title="When you shop, what matters most?" sub="Tap your top three in order — first tap is #1.">
    <div className="grid gap-2 sm:grid-cols-2">{survey.priorities.map(x=>{const n=priorities.indexOf(x.id);return <button key={x.id} type="button" aria-pressed={n>=0} onClick={()=>rank(x.id)} disabled={n<0&&priorities.length>=3} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all disabled:opacity-40 ${n>=0?'border-stone-900 bg-stone-900 text-white':'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${n>=0?'bg-white text-stone-900':'bg-stone-100 text-stone-400'}`}>{n>=0?n+1:x.emoji}</span>{x.label}</button>})}</div>
    {priorities.length===3?<p className="mt-3 text-xs text-stone-500">Tap a chosen one to change your order.</p>:null}
    {nav()}
   </Card>:null}

   {step===3?<Card kicker="Before Yousra" title="Where did you shop for modest pieces?" sub="Tap the sites and apps you used — this tells us who we're replacing and which retailers to add.">
    <div className="flex flex-wrap gap-2">{survey.sites.map(x=><Chip key={x.id} on={sites.includes(x.id)} onClick={()=>setSites(toggle(sites,x.id))}>{x.label}</Chip>)}</div>
    <AddOwn placeholder="Another site or shop" values={sitesOther} onChange={setSitesOther}/>
    {nav()}
   </Card>:null}

   {step===4?<Card kicker="Mini game · trains our AI" title="Rate the coverage" sub="These are real listings Yousra found. Tell us how modest each one is. Every rating teaches our coverage detection what modest means to you.">
    {user?<CoverageGame key="game" onDone={n=>{setLabeled(x=>x+n);go(5);}}/>:<div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500"><p className="mb-4">Sign in to play — your ratings are tied to your coverage settings so we can learn from them.</p><Link href="/profile" className={primaryClass+' inline-block'}>Sign in</Link></div>}
    {nav(user?<span/>:undefined)}
   </Card>:null}

   {step===5?<Card kicker="Last one" title="In one sentence, how did you like the MVP?" sub="Honest beats polite. Tap a starter if you're stuck.">
    <div className="mb-6"><p className="mb-2 text-sm font-medium text-stone-700">How would you rate Yousra overall? <span className="text-red-700">*</span></p><StarRating label="Overall rating" value={overall} onChange={setOverall}/></div>
    <label className="block text-sm font-medium text-stone-700">Your sentence <span className="text-red-700">*</span><textarea className={fieldClass+' mt-1.5 min-h-[84px]'} maxLength={300} value={sentence} onChange={e=>setSentence(e.target.value)} placeholder="Yousra made it easy to find a maxi dress I'd actually wear…"/></label>
    <div className="mt-2 flex flex-wrap gap-1.5">{survey.starters.map(s=><button key={s} type="button" onClick={()=>setSentence(v=>v.trim()?v:s+' ')} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] text-stone-600 hover:bg-stone-200">{s}</button>)}</div>
    <p className="mt-1 text-right text-[11px] text-stone-400">{sentence.length}/300</p>
    <div className="mt-5"><p className="mb-2 text-sm font-medium text-stone-700">If Yousra disappeared tomorrow, you&apos;d feel…</p><div className="flex flex-wrap gap-2">{survey.disappointed.map(x=><Chip key={x.id} on={disappointed===x.id} onClick={()=>setDisappointed(disappointed===x.id?'':x.id)}>{x.emoji} {x.label}</Chip>)}</div></div>
    <button type="button" onClick={()=>setFollowUp(!followUp)} className="mt-6 text-xs text-stone-500 underline underline-offset-2">{followUp?'Hide follow-up details':'Happy for us to follow up? (optional)'}</button>
    {followUp?<div className="mt-3 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 text-xs font-medium text-stone-600">First name<input className={fieldClass} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label className="block space-y-1.5 text-xs font-medium text-stone-600">Email<input className={fieldClass} type="email" maxLength={254} value={contact} onChange={e=>setContact(e.target.value)} placeholder={user?.email||'you@example.com'}/></label></div><label className="flex items-start gap-2 text-xs leading-relaxed text-stone-500"><input type="checkbox" className="mt-0.5" checked={quoteOk} onChange={e=>setQuoteOk(e.target.checked)}/>Yousra may quote my sentence (first name only).</label></div>:null}
    {error?<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>:null}
    {nav(<button type="button" disabled={busy} onClick={()=>void submit()} className={primaryClass+' inline-flex items-center gap-2'}>{busy?'Sending…':<>Send <Send size={14}/></>}</button>,false)}
    <p className="mt-3 text-right text-[11px] text-stone-400">{user?`Sending as ${user.email}`:'You can send this without an account.'}</p>
   </Card>:null}
  </>}
  </div>
 </main>;
}
