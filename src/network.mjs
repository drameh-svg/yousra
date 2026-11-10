import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { HttpError, safeUrl } from './util.mjs';

export function publicAddress(address) {
  if (isIP(address)===4) {
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
  }
  // Only global-unicast IPv6; block documentation, transition and special-purpose prefixes.
  return isIP(address)===6 && /^[23]/i.test(address) && !/^200[12]:|^2001:(db8|0|10|20):/i.test(address);
}
export async function external(url, {maxBytes=2_000_000,accept='text/html',redirects=3}={}) {
  if (!safeUrl(url)) throw new HttpError(400,'Only public HTTPS URLs are allowed');
  const target=new URL(url), hostname=target.hostname.replace(/^\[|\]$/g,'');
  const answers=isIP(hostname)?[{address:hostname,family:isIP(hostname)}]:await lookup(hostname,{all:true});
  if (!answers.length||answers.some(x=>!publicAddress(x.address))) throw new HttpError(400,'Private network destinations are blocked');
  const pinned=answers[0];
  const response=await new Promise((resolve,reject)=>{
    const req=https.get(target,{headers:{'user-agent':'YousraMVPBot/0.1 (+product discovery; respects robots.txt)',accept},
      lookup:(_name,options,callback)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy();reject(new Error('Remote response too large'));}else chunks.push(chunk);});
      res.on('error',reject); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)}));
    });
    req.setTimeout(7000,()=>req.destroy(new Error('Remote request timed out'))); req.on('error',reject);
  });
  if ([301,302,303,307,308].includes(response.status)) {
    if (!redirects||!response.headers.location) throw new Error('Redirect limit exceeded');
    return external(new URL(response.headers.location,target).href,{maxBytes,accept,redirects:redirects-1});
  }
  return {...response,url:target.href};
}
const robotCache=new Map();
export function robotsAllowed(content,path,agent='yousramvpbot') {
  const groups=[];let current={agents:[],rules:[]},hadRules=false;
  for (const raw of content.split(/\r?\n/)) {
    const clean=raw.split('#')[0],i=clean.indexOf(':');if(i<0) continue;
    const key=clean.slice(0,i).trim().toLowerCase(),value=clean.slice(i+1).trim();
    if (key==='user-agent') {if(hadRules){groups.push(current);current={agents:[],rules:[]};hadRules=false;} current.agents.push(value.toLowerCase());}
    else if(['allow','disallow'].includes(key)&&current.agents.length){hadRules=true;if(value)current.rules.push({allow:key==='allow',path:value});}
  }
  groups.push(current);
  const specific=groups.filter(g=>g.agents.some(x=>x!=='*'&&agent.includes(x)));
  const matched=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const rules=matched.flatMap(g=>g.rules).filter(r=>{
    const escaped=r.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
    return new RegExp('^'+escaped).test(path);
  }).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !rules.length||rules[0].allow;
}
export async function allowedByRobots(url) {
  const u=new URL(url);let entry=robotCache.get(u.origin);
  if(!entry||entry.expires<Date.now()) {
    try {
      const res=await external(`${u.origin}/robots.txt`,{maxBytes:128000,accept:'text/plain'});
      entry={content:res.status===404?'':res.status===200?res.bytes.toString():null,expires:Date.now()+3600000};
    } catch {entry={content:null,expires:Date.now()+60000};}
    robotCache.set(u.origin,entry);
  }
  return entry.content!==null&&robotsAllowed(entry.content,u.pathname+u.search);
}
