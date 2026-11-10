'use client';
import {useState,type FormEvent} from 'react';
import {allStyles,categories,colors,pretty,type Preferences,type Category,type Rule} from '@/lib/api';
export const fieldClass='w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300';
export const primaryClass='rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50';
export const secondaryClass='rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:border-stone-400 disabled:opacity-50';
const choices:Record<keyof Rule,{label:string;values:string[]}>={
 sleeves:{label:'Minimum sleeve length',values:['any','sleeveless','short','elbow','long']},neckline:{label:'Minimum neckline coverage',values:['any','open','medium','high']},length:{label:'Minimum garment length',values:['any','mini','knee','midi','maxi']},fit:{label:'Minimum looseness',values:['any','fitted','regular','loose','wide']},transparency:{label:'Fabric coverage',values:['any','opaque']},slits:{label:'Slits',values:['any','none']},cutouts:{label:'Cutouts',values:['any','none']}
};
export function PreferenceForm({initial,onSave,label='Save preferences'}:{initial:Preferences;onSave:(p:Preferences)=>Promise<void>;label?:string}){
 const [p,setP]=useState<Preferences>(()=>structuredClone(initial)),[category,setCategory]=useState<Category>('dress'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const update=<K extends keyof Preferences>(key:K,value:Preferences[K])=>{setP(old=>({...old,[key]:value}));setSaved(false)};
 const toggle=(key:'styles'|'colors',value:string)=>update(key,p[key].includes(value)?p[key].filter(x=>x!==value):[...p[key],value]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await onSave(p);setSaved(true)}catch(e){setError(e instanceof Error?e.message:'Could not save preferences.')}finally{setBusy(false)}}
 return <form onSubmit={submit} className="space-y-7">
  <section className="rounded-2xl border border-stone-100 bg-white p-5 sm:p-7">
   <h2 className="mb-2 text-lg font-medium">Your coverage, your choice.</h2><p className="mb-5 text-sm text-stone-500">Choose a minimum for each category. Longer sleeves and looser fits are allowed. Unknown details stay labeled unverified.</p>
   <div className="mb-5 flex flex-wrap gap-2">{categories.map(c=><button type="button" key={c.id} onClick={()=>setCategory(c.id)} aria-pressed={category===c.id} className={category===c.id?primaryClass:secondaryClass}>{c.label}</button>)}</div>
   <div className="grid gap-4 sm:grid-cols-2">{Object.entries(choices).filter(([key])=>!['skirt','pants'].includes(category)||!['sleeves','neckline'].includes(key)).map(([key,choice])=><label key={key} className="space-y-1.5 text-xs font-medium text-stone-600"><span>{choice.label}</span><select className={fieldClass} value={p.rules[category][key as keyof Rule]} onChange={e=>update('rules',{...p.rules,[category]:{...p.rules[category],[key]:e.target.value}})}>{choice.values.map(v=><option key={v} value={v}>{v==='any'?'No restriction':v==='none'?'Not permitted':pretty(v)}</option>)}</select></label>)}</div>
   <div className="mt-5 space-y-3 text-sm text-stone-600"><label className="flex items-center gap-2"><input type="checkbox" checked={p.pantsAllowed} onChange={e=>update('pantsAllowed',e.target.checked)}/> Include pants</label><label className="flex items-center gap-2"><input type="checkbox" checked={p.allowLayering} onChange={e=>update('allowLayering',e.target.checked)}/> Allow pieces that need layering for sleeves, necklines, or coverage</label></div>
  </section>
  <section className="rounded-2xl border border-stone-100 bg-white p-5 sm:p-7"><h2 className="mb-4 text-lg font-medium">What feels like you?</h2><p className="mb-2 text-xs text-stone-500">Aesthetics</p><div className="mb-5 flex flex-wrap gap-2">{allStyles.map(s=><button type="button" key={s} aria-pressed={p.styles.includes(s)} className={p.styles.includes(s)?primaryClass:secondaryClass} onClick={()=>toggle('styles',s)}>{pretty(s)}</button>)}</div><p className="mb-2 text-xs text-stone-500">Colors</p><div className="flex flex-wrap gap-2">{colors.map(c=><button type="button" key={c} aria-pressed={p.colors.includes(c)} className={p.colors.includes(c)?primaryClass:secondaryClass} onClick={()=>toggle('colors',c)}>{pretty(c)}</button>)}</div></section>
  <section className="grid gap-4 rounded-2xl border border-stone-100 bg-white p-5 sm:grid-cols-2 sm:p-7">
   <label className="space-y-1.5 text-xs font-medium text-stone-600">Sizes, separated by commas<input className={fieldClass} value={p.sizes.join(', ')} onChange={e=>update('sizes',e.target.value.split(',').map(x=>x.trim().toLowerCase()))} placeholder="S, M, 8"/></label>
   <label className="space-y-1.5 text-xs font-medium text-stone-600">Maximum price (USD)<input className={fieldClass} type="number" min="1" max="100000" value={p.budgetMax??''} onChange={e=>update('budgetMax',e.target.value?Number(e.target.value):null)} placeholder="No limit"/></label>
   <label className="space-y-1.5 text-xs font-medium text-stone-600 sm:col-span-2">Excluded brands or stores, separated by commas<input className={fieldClass} value={p.excludedBrands.join(', ')} onChange={e=>update('excludedBrands',e.target.value.split(',').map(x=>x.trim().toLowerCase()))}/></label><p className="text-xs text-stone-400 sm:col-span-2">Shopping destination: United States. Unknown sizes and delivery information are never treated as confirmed.</p>
  </section>
  {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}{saved?<p role="status" className="text-sm text-stone-600">Your preferences are saved.</p>:null}<button disabled={busy} className={primaryClass}>{busy?'Saving…':label}</button>
 </form>;
}
