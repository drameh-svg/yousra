"use client";
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {api,type ApiProduct} from './api';
// Only a few visible unknowns refresh automatically; all requests share one queue.
let automaticChecks=0;
let queue:Promise<unknown>=Promise.resolve();
function queued<T>(run:()=>Promise<T>):Promise<T>{const result=queue.then(run,run);queue=result.catch(()=>{});return result}
export function useProductPrice(product:ApiProduct|undefined,node:RefObject<HTMLDivElement|null>,detail=false){
 const mounted=useRef(true),started=useRef(false);
 const [result,setResult]=useState<ApiProduct|undefined>(),[checking,setChecking]=useState(false),[error,setError]=useState('');
 const id=product?.id;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const check=useCallback(async()=>{
  if(!id||started.current)return;started.current=true;setChecking(true);setError('');
  try{const request=()=>mounted.current?api<{product:ApiProduct}>(`/products/${id}/price`,'POST',{}):Promise.reject(new Error('Card closed'));const d=await (detail?request():queued(request));if(mounted.current)setResult(d.product)}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Price lookup unavailable')}
  finally{if(mounted.current)setChecking(false);started.current=false}
 },[id,detail]);
 useEffect(()=>{
  const element=node.current;if(!element||!id||product?.demo||(product?.price!==null&&product?.availabilityCheckedAt&&Date.now()-Date.parse(product.availabilityCheckedAt)<6*3600000&&(!detail||product?.priceCheckedAt&&Date.now()-Date.parse(product.priceCheckedAt)<6*3600000))||automaticChecks>=6&&!detail||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(detail||automaticChecks<6){if(!detail)automaticChecks++;void check()}}},{rootMargin:'100px'});
  observer.observe(element);return()=>observer.disconnect();
 },[id,product?.demo,product?.price,product?.priceCheckedAt,product?.availabilityCheckedAt,check,node,detail]);
 return {product:result?.id===id?result:product,checking,error,check};
}
