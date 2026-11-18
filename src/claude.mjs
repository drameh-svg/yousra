// Claude (Anthropic Messages API) for product discovery (server-side web search) and garment image analysis.
// Server only: ANTHROPIC_API_KEY must never be exposed to the browser.
import { reserve } from './store.mjs';
import { HttpError, host, safeUrl, text } from './util.mjs';

const API='https://api.anthropic.com/v1/messages';
const BLOCKED=['pinterest.com','instagram.com','facebook.com','tiktok.com','youtube.com','reddit.com','quora.com'];
export const claudeModel=()=>process.env.CLAUDE_MODEL||'claude-haiku-5-5';
export const claudeSearchModel=()=>process.env.CLAUDE_SEARCH_MODEL||claudeModel();

export function discoveryProvider() {
  const wanted=(process.env.DISCOVERY_PROVIDER||'').toLowerCase();
  const claude=!!process.env.ANTHROPIC_API_KEY,serper=!!process.env.SERPER_API_KEY;
  if(wanted==='both')return claude&&serper?'both':claude?'claude':serper?'serper':null;
  if(wanted==='serper')return serper?'serper':null;
  if(wanted==='claude')return claude?'claude':null;
  // Default: Serper when configured; Claude is opt-in (DISCOVERY_PROVIDER=claude) or the fallback.
  return serper?'serper':claude?'claude':null;
}

export async function claudeRequest(payload,{timeout=60000}={}) {
  if(!process.env.ANTHROPIC_API_KEY)throw new HttpError(503,'Add ANTHROPIC_API_KEY to use Claude');
  const response=await fetch(API,{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const status=response.status===429?429:503;
    throw new HttpError(status,status===429?'Claude rate limit reached. Cached products are still available.':`Claude unavailable (${response.status}${data?.error?.type?` ${data.error.type}`:''}). Cached products are still available.`);
  }
  return data;
}
export const blockText=content=>(content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
export function parseJson(value) {
  const raw=String(value||'').trim();
  const tagged=raw.match(/<products>([\s\S]*?)<\/products>/i)?.[1];
  const candidates=[tagged,raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1],raw,raw.slice(raw.indexOf('['),raw.lastIndexOf(']')+1),raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)].filter(Boolean);
  for(const c of candidates){try{return JSON.parse(c.trim());}catch{}}
  return null;
}
// Normalize a URL for "did search actually return this page?" checks.
function pageKey(value){try{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(gclid|fbclid|srsltid)$/i.test(k))u.searchParams.delete(k);return (u.hostname.replace(/^www\./,'')+u.pathname.replace(/\/+$/,'')).toLowerCase();}catch{return null}}

export function discoveryPrompt(query,page,hint='') {
  return `Find individual women's clothing products for this shopper's search: "${query}".
${hint?`The shopper dresses modestly and needs: ${hint}. Strongly prefer pieces that meet these needs.\n`:''}${page>1?`This is results page ${page}: find different products and retailers than the most obvious first results.\n`:''}Rules:
- Use the web_search tool. Prefer retailers that ship to the United States and modest-fashion retailers when they fit the search.
- Only return INDIVIDUAL product pages (one specific item you can buy), never category, collection, search, blog, social or marketplace-listing pages.
- Only use URLs that appeared in your search results. Never invent or guess a URL, price or image.
- Clothing only: no shoes, bags, jewelry, scarves or accessories, unless the search asks for them.
- Include price and currency ONLY if a search result showed them for that exact product; otherwise null.
- Up to 12 products, best match first.
Reply with only this, no other text:
<products>[{"url":"https://...","title":"product name","store":"retailer name","price":49.99,"currency":"USD","description":"one sentence about cut, sleeves, neckline, length, fit and fabric as stated by the retailer"}]</products>`;
}

export async function claudeDiscover(query,page=1,hint='') {
  await reserve('claude_search');
  const maxUses=Math.max(1,Math.min(5,Number(process.env.CLAUDE_MAX_SEARCHES||3)));
  const messages=[{role:'user',content:discoveryPrompt(text(query,300),page,text(hint,300))}];
  const tools=[{type:'web_search_20250305',name:'web_search',max_uses:maxUses,blocked_domains:BLOCKED,user_location:{type:'approximate',country:'US'}}];
  let data,content=[];
  // Server tools can pause long turns; continue at most twice.
  for(let turn=0;turn<3;turn++){
    data=await claudeRequest({model:claudeSearchModel(),max_tokens:4000,messages,tools},{timeout:90000});
    content=[...content,...(data.content||[])];
    if(data.stop_reason!=='pause_turn')break;
    messages.push({role:'assistant',content:data.content});
  }
  const seen=new Map();
  for(const block of content)if(block.type==='web_search_tool_result'&&Array.isArray(block.content))for(const r of block.content)if(r.type==='web_search_result'&&r.url){const key=pageKey(r.url);if(key)seen.set(key,r);}
  const parsed=parseJson(blockText(data.content));
  const list=Array.isArray(parsed)?parsed:Array.isArray(parsed?.products)?parsed.products:[];
  const curated=[];
  for(const item of list.slice(0,20)){
    const url=safeUrl(item?.url);if(!url)continue;
    const source=seen.get(pageKey(url));
    // Reject any URL Claude did not actually retrieve from search: no hallucinated product links.
    if(!source)continue;
    const price=Number(item.price),currency=typeof item.currency==='string'&&/^[A-Z]{3}$/.test(item.currency)?item.currency:null;
    curated.push({link:url,title:text(item.title,300)||text(source.title,300),snippet:text(item.description,1000),store:text(item.store,80)||host(url),...(Number.isFinite(price)&&price>0&&currency?{price,currency}:{}),source:'claude'});
  }
  return {curated,usage:data?.usage||null};
}

export async function claudeVision(prompt,images,legacyData) {
  // Accepts [{mime,data}] (several photos of one product) or the older (prompt, mediaType, base64) form.
  const photos=Array.isArray(images)?images:[{mime:images,data:legacyData}];
  await reserve('claude_vision');
  const data=await claudeRequest({model:claudeModel(),max_tokens:1600,system:'You are a careful fashion product analyst. Reply with one JSON object only.',messages:[{role:'user',content:[...photos.map(x=>({type:'image',source:{type:'base64',media_type:x.mime,data:x.data}})),{type:'text',text:prompt}]}]},{timeout:30000});
  const parsed=parseJson(blockText(data.content));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Claude returned no garment JSON');
  return parsed;
}
