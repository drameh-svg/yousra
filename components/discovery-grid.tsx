"use client";
import {useEffect,useRef} from 'react';
import {useCatalog} from '@/lib/use-catalog';
import {toCard} from '@/lib/catalog';
import {type Filters} from '@/lib/api';
import {ProductCard} from './product-card';
import {AccountGate} from './account-gate';
export function DiscoveryGrid(props:{query?:string;filters?:Filters}){return <AccountGate><Grid {...props}/></AccountGate>}
function Grid({query='',filters={}}:{query?:string;filters?:Filters}){
 const c=useCatalog(query,filters),sentinel=useRef<HTMLDivElement>(null);
 const {canLoad,loading,more,error,loadMore}=c;
 useEffect(()=>{const node=sentinel.current;if(!node||!canLoad||loading||more||error)return;const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))void loadMore()},{rootMargin:'300px'});observer.observe(node);return()=>observer.disconnect()},[canLoad,loading,more,error,loadMore]);
 return <><p role="status" style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>{loading||more?'Finding pieces…':`${c.items.length} pieces found`}</p>{error?<p role="alert">{error} <button onClick={c.reload}>Try again</button></p>:null}{c.response?.warnings?.map(w=><p key={w} role="status">{w}</p>)}<div className="masonry">{c.items.map(p=><ProductCard key={p.id} product={toCard(p)}/>)}</div>{!loading&&!more&&!c.items.length&&!error?<p>No matching pieces yet. Check your saved coverage, budget and size preferences, or try a broader search.</p>:null}<div ref={sentinel} style={{textAlign:'center',padding:24}}>{canLoad?<button disabled={loading||more} onClick={()=>void loadMore()}>More pieces</button>:null}</div></>;
}
