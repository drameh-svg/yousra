'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api,type ApiProduct,type Filters,type Preferences,type Results} from '@/lib/api';
import {useSession} from '@/components/session-provider';
interface State {key:string;items:ApiProduct[];response:Results|null;loading:boolean;more:boolean;error:string}
const cache=new Map<string,{state:State;at:number}>();
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export function useCatalog(query:string,filters:Filters,preferences?:Preferences){
 const {user,profile,revision}=useSession();const [refresh,setRefresh]=useState(0),[snapshotRevision,setSnapshotRevision]=useState(revision);
 const [state,setState]=useState<State>({key:'',items:[],response:null,loading:true,more:false,error:''});
 const current=useRef(state),generation=useRef(0),inFlight=useRef(false);
 const filterKey=JSON.stringify(filters),prefKey=JSON.stringify(preferences),cacheKey=`${user?.id}:${profile?.version}:${snapshotRevision}:${query}:${filterKey}:${prefKey}`;
 useEffect(()=>{current.current=state;if(state.key===cacheKey&&!state.loading&&state.response&&!state.more){if(cache.size>12)cache.delete(cache.keys().next().value!);cache.set(cacheKey,{state,at:Date.now()});}},[state,cacheKey]);
 useEffect(()=>{
  if(!user||!profile?.onboarded)return;
  const run=++generation.current,controller=new AbortController();inFlight.current=false;
  const saved=cache.get(cacheKey);
  if(!refresh&&saved&&Date.now()-saved.at<600000){setState(saved.state);return()=>{generation.current=run+1;controller.abort()};}
  setState({key:cacheKey,items:[],response:null,loading:true,more:false,error:''});
  const parsed=JSON.parse(filterKey) as Filters,override=prefKey?JSON.parse(prefKey) as Preferences:undefined;
  void (async()=>{
   try{
    const params=new URLSearchParams(Object.entries(parsed).filter(([,v])=>v));
    let result=query?await api<Results>('/search','POST',{query,filters:parsed,...(override?{preferences:override}:{})},controller.signal):await api<Results>('/feed?'+params,'GET',undefined,controller.signal);
    if(run!==generation.current)return;
    setState({key:cacheKey,items:result.items,response:result,loading:false,more:!!result.canAdvance,error:''});
    while(query&&result.canAdvance&&run===generation.current){
     if(result.status==='running')await pause(700);
     result=await api<Results>(`/search/${result.jobId}/advance`,'POST',{},controller.signal);
     if(run!==generation.current)return;
     setState({key:cacheKey,items:result.items,response:result,loading:false,more:!!result.canAdvance,error:''});
    }
   }catch(e){if(run===generation.current&&!controller.signal.aborted)setState(s=>({...s,loading:false,more:false,error:e instanceof Error?e.message:'Could not load pieces.'}));}
  })();
  return()=>{generation.current=run+1;controller.abort()};
 },[user,profile?.onboarded,cacheKey,filterKey,prefKey,query,refresh]);
 const loadMore=useCallback(async()=>{
  const before=current.current;if(before.key!==cacheKey||inFlight.current||before.loading||before.more||!before.response)return;
  const run=generation.current;let result=before.response;
  if(result.nextOffset===null&&!result.canDiscover)return;
  inFlight.current=true;setState(s=>({...s,more:true,error:''}));
  try{
   if(result.nextOffset!==null){const endpoint=query?`/search/${result.jobId}`:`/feed/${result.feedId}`;result=await api<Results>(`${endpoint}?offset=${result.nextOffset}`);}
   else if(!query&&result.canDiscover){
    for(let i=0;i<8;i++){
     result=await api<Results>(`/feed/${result.feedId}/advance?offset=${result.cursorEnd??before.items.length}`,'POST',{});
     if(run!==generation.current)return;
     if(result.items.length||!result.canDiscover)break;
     if(result.busy)await pause(700);
    }
   }
   if(run!==generation.current)return;
   const next=result;
   setState(s=>{const kept=s.items.filter(p=>!next.excludedIds?.includes(p.id)),seen=new Set(kept.map(p=>p.id));return {...s,items:[...kept,...next.items.filter(p=>!seen.has(p.id))],response:next,more:false}});
  }catch(e){if(run===generation.current)setState(s=>({...s,more:false,error:e instanceof Error?e.message:'More pieces could not be loaded.'}));}
  finally{if(run===generation.current)inFlight.current=false;}
 },[query,cacheKey]);
 const ready=state.key===cacheKey;
 return {...state,items:ready?state.items:[],response:ready?state.response:null,loading:state.loading||!ready,more:ready&&state.more,loadMore,reload:()=>{cache.delete(cacheKey);setSnapshotRevision(revision);setRefresh(r=>r+1)},canLoad:ready&&!!state.response&&(state.response.nextOffset!==null||!!state.response.canDiscover)};
}
