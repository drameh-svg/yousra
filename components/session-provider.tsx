'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState, type ReactNode} from 'react';
import {api,ApiError,type Account,type Profile,type Collection,type Reaction} from '@/lib/api';

type SessionValue={user:Account|null;profile:Profile|null;collections:Collection[];reactions:Record<string,Reaction>;loading:boolean;error:string;revision:number;sample:boolean;reload:()=>Promise<void>;reloadLibrary:()=>Promise<void>;react:(id:string,action:'like'|'dislike'|'clear')=>Promise<void>;toggleSaved:(id:string)=>Promise<void>;signOut:()=>Promise<void>};
const Session=createContext<SessionValue|null>(null);
export function SessionProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<Account|null>(null),[profile,setProfile]=useState<Profile|null>(null);
 const [collections,setCollections]=useState<Collection[]>([]),[reactions,setReactions]=useState<Record<string,Reaction>>({});
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[sample,setSample]=useState(false),[revision,setRevision]=useState(0);
 const savedCreation=useRef<Promise<Collection>|null>(null),createdSaved=useRef<Collection|null>(null);
 useEffect(()=>{const current=collections.find(c=>!c.system&&c.name==='Saved');if(current||!savedCreation.current)createdSaved.current=current||null;},[collections]);
 const reloadLibrary=useCallback(async()=>{const [c,r]=await Promise.all([api<{collections:Collection[]}>('/collections'),api<{reactions:Record<string,Reaction>}>('/reactions')]);setCollections(c.collections);setReactions(r.reactions);setRevision(r=>r+1);},[]);
 const reload=useCallback(async()=>{
  try{const me=await api<{user:Account;profile:Profile}>('/me');setUser(me.user);setProfile(me.profile);setError('');if(me.profile.onboarded)await reloadLibrary();}
  catch(e){if(e instanceof ApiError&&e.status===401){setUser(null);setProfile(null);setCollections([]);setReactions({});setError('');}else setError(e instanceof Error?e.message:'Could not connect.');}
  finally{setLoading(false);}
 },[reloadLibrary]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void reload()});void api<{discovery:string}>('/health').then(d=>setSample(d.discovery==='sample')).catch(()=>{});return()=>{active=false};},[reload]);
 const react=useCallback(async(id:string,action:'like'|'dislike'|'clear')=>{const d=await api<{reaction:Reaction;collections:Collection[]}>(`/products/${id}/reaction`,'POST',{action});setReactions(r=>({...r,[id]:d.reaction}));setCollections(d.collections);setRevision(r=>r+1);},[]);
 const toggleSaved=useCallback(async(id:string)=>{
  let collection=collections.find(c=>!c.system&&c.name==='Saved')||createdSaved.current;
  if(!collection){
   if(!savedCreation.current)savedCreation.current=api<{collection:Collection}>('/collections','POST',{name:'Saved'}).then(d=>{createdSaved.current=d.collection;return d.collection}).finally(()=>{savedCreation.current=null;});
   collection=await savedCreation.current;
  }
  const d=await api<{collections:Collection[]}>(`/collections/${collection.id}`,'PATCH',{productId:id,remove:collection.productIds.includes(id)});
  setCollections(d.collections);setRevision(r=>r+1);
 },[collections]);
 const signOut=useCallback(async()=>{await api('/auth/signout','POST',{});setUser(null);setProfile(null);createdSaved.current=null;setCollections([]);setReactions({});setRevision(r=>r+1);},[]);
 return <Session.Provider value={{user,profile,collections,reactions,loading,error,revision,sample,reload,reloadLibrary,react,toggleSaved,signOut}}>{children}</Session.Provider>;
}
export function useSession(){const value=useContext(Session);if(!value)throw new Error('SessionProvider is required');return value;}
