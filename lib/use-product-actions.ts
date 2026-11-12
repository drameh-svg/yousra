"use client";
import {useEffect,useState} from 'react';
import {useSession} from '@/components/session-provider';
import {useSaved} from './use-saved';
import {readPrefs,writePrefs} from './use-prefs';
import {type StyleVote} from './style-discovery';
const KEY='yousra_reactions';
export function readLocalVotes():StyleVote[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
export function useProductActions(id:string){
 const session=useSession(), local=useSaved(id);
 const [votes,setVotes]=useState<StyleVote[]>([]);
 useEffect(()=>{const sync=()=>setVotes(readLocalVotes());queueMicrotask(sync);window.addEventListener('yousra_reactions_change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('yousra_reactions_change',sync);window.removeEventListener('storage',sync)}},[]);
 const guest=!session.user;
 const saved=guest?local.saved:session.collections.some(c=>!c.system&&c.name==='Saved'&&c.productIds.includes(id));
 const reaction=guest?{liked:votes.some(v=>v.id===id&&v.like),disliked:votes.some(v=>v.id===id&&!v.like)}:session.reactions[id]||{};
 async function react(action:'like'|'dislike'|'clear'){
  if(session.loading)throw new Error('Your account is still loading. Please try again.');
  if(!guest)await session.react(id,action);
  const next=[...new Map([...readPrefs().styleVotes,...readLocalVotes()].map(v=>[v.id,v])).values()].filter(v=>v.id!==id);if(action!=='clear')next.push({id,like:action==='like'});
  writePrefs({styleVotes:next});localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('yousra_reactions_change'));
 }
 async function toggleSaved(){if(session.loading)throw new Error('Your account is still loading. Please try again.');if(guest)local.toggle();else await session.toggleSaved(id)}
 return {saved,liked:!!reaction.liked,disliked:!!reaction.disliked,react,toggleSaved,loading:session.loading};
}
