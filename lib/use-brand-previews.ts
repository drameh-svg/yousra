'use client';
// Listings for the Explore brand spotlight and brand cards, from each brand's own shop only.
import {useEffect,useState} from 'react';
import {api,type ApiProduct} from '@/lib/api';
import {useSession} from '@/components/session-provider';
export interface BrandPreview {items:ApiProduct[];total:number}
export function useBrandPreviews(brands:{domain:string;name:string}[],n=4){
 const {user}=useSession(),[data,setData]=useState<Record<string,BrandPreview>>({});
 const key=brands.map(b=>`${b.domain}|${encodeURIComponent(b.name)}`).join(',');
 useEffect(()=>{
  if(!user||!key)return;let live=true;
  api<{brands:Record<string,BrandPreview>}>(`/brand-previews?n=${n}&brands=${encodeURIComponent(key)}`).then(d=>{if(live)setData(d.brands)}).catch(()=>{});
  return()=>{live=false};
 },[user,key,n]);
 return data;
}
