'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={health:null,user:null,profile:null,page:'feed',photos:[],swipes:[],collections:[],reactions:{},items:[],filters:{},query:'',search:null,busy:false,nextOffset:null,activeCategory:'dress',preferences:null,collection:null,signup:true,searchPreferences:null,generation:0,feed:null};
const styles=['minimal','classic','casual','romantic','streetwear','elegant','boho','sporty'];
const colors=['black','white','blue','navy','green','pink','red','brown','beige','cream','gray','purple','yellow'];
const categories=['dress','skirt','top','pants','outerwear'];
const rules={sleeves:['any','sleeveless','short','elbow','long'],neckline:['any','open','medium','high'],length:['any','mini','knee','midi','maxi'],fit:['any','fitted','regular','loose','wide'],transparency:['any','opaque'],slits:['any','none'],cutouts:['any','none']};
const label=k=>({sleeves:'Minimum sleeve length',neckline:'Minimum neckline coverage',length:'Minimum hem / dress length',fit:'Minimum looseness',transparency:'Fabric coverage',slits:'Slits',cutouts:'Cutouts',outerwear:'Outerwear',pants:'Pants',dress:'Dresses',skirt:'Skirts',top:'Tops'}[k]||k);
async function api(path,method='GET',data,again=false){
 const response=await fetch('/api'+path,{method,headers:method==='GET'?{}:{'content-type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})});
 const result=await response.json();
 if(response.status===401&&!again&&S.health?.authMode==='supabase'&&!path.startsWith('/auth/')){const r=await fetch('/api/auth/refresh',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(r.ok)return api(path,method,data,true);}
 if(!response.ok)throw new Error(result.error||'Request failed');return result;
}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4500);}
function image(url,alt,cls=''){return url?`<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer">`:`<div class="card-img-placeholder">Product photo unavailable</div>`;}
function select(name,values,current='',title='Any'){return `<select name="${esc(name)}" aria-label="${esc(name)}">${title?`<option value="">${title}</option>`:''}${values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v==='any'?'No restriction':v)}</option>`).join('')}</select>`;}
function modeNotice(){return S.health?.discovery==='sample'?'<div class="notice">LOCAL TEST · Sample references, not verified live listings. Prices, stock and US delivery are unknown. Add your search and AI keys to test live discovery.</div>':!S.health?.vision?'<div class="notice">Live discovery is enabled. Image analysis is not configured yet; matches remain uncertain.</div>':'';}
function auth(){
 $('#app').innerHTML=`<main class="auth"><section class="auth-art"><div class="logo">yousra<span>✳</span></div><div class="art-oval"></div><div class="art-ring"></div><div class="auth-copy"><div class="eyebrow">A little more you.</div><h1>Find your kind<br>of modest.</h1><p>Your style. Your standards. A whole world of clothing, brought together.</p></div><small>Thoughtfully found. Personally yours.</small></section><section class="auth-form"><div><div class="eyebrow">Welcome to your next favorite find</div><h2>${S.signup?'Make yourself at home.':'Good to see you again.'}</h2><p class="muted">${S.signup?'A few choices. A feed that feels like you.':'Your finds are right where you left them.'}</p>${S.health?.authMode==='local'?'<div class="notice">Local test accounts only.</div>':''}<form id="auth-form"><label class="field">Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label class="field">Password<input name="password" type="password" minlength="8" maxlength="128" autocomplete="${S.signup?'new-password':'current-password'}" required placeholder="At least 8 characters"></label>${S.signup?'<label class="row" style="margin:16px 0;font-size:13px"><input type="checkbox" name="newsletterOptIn"> Email me occasional Yousra news and updates (optional).</label>':''}<div id="auth-error" class="error" role="alert"></div><button class="btn" type="submit">${S.signup?'Create account':'Sign in'} ↗</button></form><p style="text-align:center;margin-top:23px;font-size:12px">${S.signup?'Already have an account?':'New here?'} <button class="link-btn" data-action="auth-toggle">${S.signup?'Sign in':'Create account'}</button></p><small>We use your preferences and interactions to personalize your feed and measure product interest. No payment happens here.</small></div></section></main>`;
}
function onboarding(){
 if(S.swipes.length===15){S.preferences=structuredClone(S.profile.preferences);questionnaire(true);return;}
 const photo=S.photos[S.swipes.length];
 $('#app').innerHTML=`<main class="onboarding"><div class="row between"><div class="logo">yousra<span>✳</span></div><button class="link-btn" data-action="signout">Sign out</button></div><div class="onboarding-header"><div class="eyebrow">Getting to know your style · ${S.swipes.length+1} of 15</div><h1>Would you wear this?</h1><p class="muted">Go with your first feeling. There’s no right answer.</p><div class="progress"><div style="width:${S.swipes.length/15*100}%"></div></div></div><div class="swipe-card" id="swipe-card">${image(photo.image,photo.title)}<p style="margin:12px 0 3px">${esc(photo.title)}</p><a class="source" href="${esc(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">Photo reference ↗</a><div class="swipe-actions"><button class="icon-btn" aria-label="I wouldn't wear this" data-action="swipe-no">×</button><button class="icon-btn active" aria-label="I'd wear this" data-action="swipe-yes">♡</button></div><small>Swipe left / right, use the buttons, or your arrow keys.</small></div></main>`;
 let start;$('#swipe-card').addEventListener('pointerdown',e=>start=e.clientX);$('#swipe-card').addEventListener('pointerup',e=>{if(start!==undefined&&Math.abs(e.clientX-start)>70)swipe(e.clientX>start);start=undefined;});
}
function swipe(like){if(!$('#swipe-card'))return;S.swipes.push({id:S.photos[S.swipes.length].id,like});onboarding();}
function preferenceForm(){const p=S.preferences,c=S.activeCategory;
 return `<form id="preferences-form" class="stack"><div class="panel"><h2 style="font-size:25px">The things that feel like you</h2><div class="form-grid"><label class="field">Styles (comma separated)<input name="styles" value="${esc(p.styles.join(', '))}" placeholder="minimal, casual, classic"></label><label class="field">Colors (comma separated)<input name="colors" value="${esc(p.colors.join(', '))}" placeholder="black, blue, cream"></label><label class="field">Your sizes (comma separated)<input name="sizes" value="${esc(p.sizes.join(', '))}" placeholder="s, m, 8"></label><label class="field">Maximum item price in USD<input name="budgetMax" type="number" min="1" max="100000" value="${esc(p.budgetMax??'')}" placeholder="Any budget"></label><label class="field">Excluded brands / stores<input name="excludedBrands" value="${esc(p.excludedBrands.join(', '))}" placeholder="Optional, comma separated"></label><label class="field">Ships to<input value="United States" disabled></label></div></div><div class="panel"><h2 style="font-size:25px">Your modesty, your definition</h2><p class="muted">Set a minimum for each category. Unknown coverage will appear lower in results.</p><div class="row wrap" style="margin-bottom:20px"><label class="check"><input name="pantsAllowed" type="checkbox" ${p.pantsAllowed?'checked':''}> Include pants (off = dresses & skirts for bottoms)</label><label class="check"><input name="allowLayering" type="checkbox" ${p.allowLayering?'checked':''}> Open to pieces that need layering</label></div><div class="chips category-tabs">${categories.map(x=>`<button type="button" class="chip ${c===x?'active':''}" data-action="category" data-category="${x}">${label(x)}</button>`).join('')}</div><div class="rule-grid">${Object.entries(rules).filter(([k])=>!['pants','skirt'].includes(c)||!['sleeves','neckline'].includes(k)).map(([k,values])=>`<label class="field">${label(k)}${select('rule-'+k,values,p.rules[c][k],null)}</label>`).join('')}</div></div><button class="btn" type="submit">${!S.profile.onboarded?'Find my style ↗':S.searchEdit?'Apply to this search':'Save preferences'}</button></form>`;
}
function harvest(){const form=$('#preferences-form');if(!form)return;const d=new FormData(form);for(const k of ['styles','colors','sizes','excludedBrands'])S.preferences[k]=String(d.get(k)||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);S.preferences.budgetMax=d.get('budgetMax')?Number(d.get('budgetMax')):null;S.preferences.pantsAllowed=d.has('pantsAllowed');S.preferences.allowLayering=d.has('allowLayering');for(const k of Object.keys(rules))if(d.has('rule-'+k))S.preferences.rules[S.activeCategory][k]=d.get('rule-'+k);}
function questionnaire(initial=false){
 if(initial)$('#app').innerHTML=`<main class="onboarding"><div class="logo">yousra<span>✳</span></div><div class="onboarding-header"><div class="eyebrow">One last thing</div><h1>Let’s set your standards.</h1><p class="muted">You can change all of this in your profile anytime.</p></div>${preferenceForm()}</main>`;
 else if(S.searchEdit){$('#modal').innerHTML=`<div class="row between"><h2>Preferences for this search</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">×</button></div>${preferenceForm()}`;if(!$('#modal').open)$('#modal').showModal();}
 else{shell();$('#page').innerHTML=`<div class="header"><div><div class="eyebrow">Make it yours</div><h1>Your preferences</h1><p>Adjust what your feed learns about you.</p></div></div>${preferenceForm()}<div class="panel"><h3>Your activity</h3><div id="metrics" class="metric-grid"></div><div class="spacer"></div><button class="btn secondary small" data-action="signout">Sign out</button></div>`;api('/metrics').then(m=>{if($('#metrics'))$('#metrics').innerHTML=`<div class="metric"><strong>${m.likes}</strong>Liked pieces</div><div class="metric"><strong>${m.clicks}</strong>Real retailer clicks</div><div class="metric"><strong>${m.collections}</strong>Private collections</div>`;}).catch(e=>toast(e.message));}
}
function shell(){
 $('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="logo">yousra<span>✳</span></div><nav class="nav" aria-label="Main navigation">${[['feed','✳','For you'],['collections','▤','Collections'],['profile','◯','Your profile']].map(([page,icon,name])=>`<button class="${S.page===page?'active':''}" data-action="nav" data-page="${page}"><span>${icon}</span>${name}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="row"><div class="avatar">${esc(S.user.email[0].toUpperCase())}</div><span style="overflow:hidden;text-overflow:ellipsis">${esc(S.user.email)}</span></div><p class="muted" style="margin-top:23px">A little more you.<br>A little less searching.</p><button class="link-btn" data-action="signout">Sign out</button></div></aside><main class="content"><header class="topbar"><div class="logo mobile-logo">yousra<span>✳</span></div><form class="searchbar" id="search-form"><span aria-hidden="true">⌕</span><input name="query" value="${esc(S.query)}" placeholder="Try ‘a blue maxi dress under $50’" aria-label="Search clothing" list="search-suggestions" required maxlength="300"><datalist id="search-suggestions"></datalist><button class="btn" type="submit">Search ↗</button></form><span class="eyebrow" style="margin:0">Your style. Your standards.</span></header>${modeNotice()}<section id="page"></section><p class="footer-note">Prices and availability can change. Confirm sizing and delivery with the retailer.<br>Some shopping links may earn us a commission. Your price stays the same.</p></main></div>`;
 api('/search/suggestions').then(d=>{if($('#search-suggestions'))$('#search-suggestions').innerHTML=[...d.recent,...d.suggested].map(x=>`<option value="${esc(x)}"></option>`).join('');}).catch(()=>{});
}
function filterBar(){return `<form id="filters-form" class="filters">${select('style',styles,S.filters.style,'Aesthetic / style')}${select('color',colors,S.filters.color,'Color')}${select('category',categories,S.filters.category,'Clothing category')}<input type="number" name="minPrice" placeholder="Min $" min="0" value="${esc(S.filters.minPrice??'')}" aria-label="Minimum price"><input type="number" name="maxPrice" placeholder="Max $" min="0" value="${esc(S.filters.maxPrice??'')}" aria-label="Maximum price"><input name="size" placeholder="Size" value="${esc(S.filters.size||'')}" aria-label="Size">${select('shipping',['confirmed'],S.filters.shipping,'US shipping: include unknown')}<button class="chip" type="submit">Apply</button><button class="chip" type="button" data-action="reset-filters">Reset</button><button class="chip" type="button" data-action="search-preferences">Modesty preferences ↗</button></form>`;}
function card(p){const r=S.reactions[p.id]||{};
 return `<article class="card" data-product="${esc(p.id)}"><div class="card-image"><a href="/products/${esc(p.id)}" target="_top" aria-label="View ${esc(p.title)}">${image(p.image,p.title)}</a><div class="card-actions"><button class="icon-btn ${r.liked?'active':''}" data-action="like" data-id="${esc(p.id)}" aria-label="${r.liked?'Unlike':'Like'} ${esc(p.title)}">♡</button><button class="icon-btn ${r.disliked?'active':''}" data-action="dislike" data-id="${esc(p.id)}" aria-label="Dislike ${esc(p.title)}">×</button><button class="icon-btn" data-action="save" data-id="${esc(p.id)}" aria-label="Save to collection">＋</button></div><a class="shop-pill" href="${esc(p.shopPath)}?surface=card" target="_blank" rel="noopener noreferrer">${p.demo?'View source':'Shop'} ↗${p.affiliate?' · affiliate':''}</a></div><h3><a href="/products/${esc(p.id)}" target="_top">${esc(p.title)}</a></h3><div class="card-meta"><span>${esc(p.store)}</span><strong>${p.price===null?'Price unknown':esc((p.currency||'')+' '+p.price.toFixed(2))}</strong></div>${p.demo?'<span class="tag">Sample reference</span>':p.match?.uncertain?'<span class="tag">Coverage uncertain · check details</span>':''}${p.shippingUS!=='yes'?'<span class="tag"> · US delivery unverified</span>':''}</article>`;
}
function renderBrowse(){
 shell();const searching=S.page==='search';
 $('#page').innerHTML=`<div class="header"><div><div class="eyebrow">${searching?'Your next discovery':'A selection, just for you'}</div><h1>${searching?'Found for you.':'Your kind of modest.'}</h1><p>${searching?esc(S.query):'Pieces that fit your style, and your standards.'}</p></div><button class="btn secondary small" data-action="${S.busy?'stop':'refresh'}">${S.busy?'Stop discovery':'↻ Refresh'}</button></div>${filterBar()}<div id="search-status" class="status" role="status"></div><div id="product-grid" class="grid"></div><div id="load-more" style="text-align:center;margin:25px"></div>`;
 renderItems();
}
let pagingObserver, loadingMore=false;
function renderItems(){
 if(!$('#product-grid'))return;
 const grid=$('#product-grid'),existing=[...grid.querySelectorAll(':scope > .card')];
 const prefix=S.page==='feed'&&existing.length>0&&existing.length<=S.items.length&&existing.every((el,i)=>el.dataset.product===S.items[i].id);
 if(prefix){grid.insertAdjacentHTML('beforeend',S.items.slice(existing.length).map(card).join(''));for(const el of existing){const liked=!!S.reactions[el.dataset.product]?.liked,button=el.querySelector('[data-action=like]');if(button){button.classList.toggle('active',liked);button.setAttribute('aria-label',(liked?'Unlike ':'Like ')+S.items.find(p=>p.id===el.dataset.product).title);}}}
 else grid.innerHTML=S.items.length?S.items.map(card).join(''):`<div class="empty"><h2>${S.busy?'Looking for your next favorite…':'A fresh start.'}</h2><p>${S.busy?'Results will appear as we discover and analyze products.':'Try a search or adjust your filters. Unknown prices and sizes are excluded when you filter for them.'}</p></div>`;
 $('#search-status').textContent=S.search?`${S.search.demo?'Sample search':S.search.status==='complete'?'Discovery complete':S.busy?'Discovering & checking pieces…':'Discovery paused'} · ${S.search.discovered} discovered · ${S.search.processed} analyzed${S.search.warnings?.length?' · '+S.search.warnings.join(' '):''}`:S.busy?'Loading…':`${S.items.length} pieces · ${S.feed?.warnings?.length?S.feed.warnings.join(' '):'Picked for your style · Keep scrolling for more'}`;
 const canLoad=S.nextOffset!==null||(S.page==='feed'&&S.feed?.canDiscover);
 $('#load-more').innerHTML=canLoad?`<button class="btn secondary" data-action="load-more" ${loadingMore?'disabled':''}>${loadingMore?'Finding more pieces…':'More pieces ↓'}</button>`:S.page==='feed'?'<p class="muted">You’re up to date. Refresh for new recommendations.</p>':'';
 if(pagingObserver)pagingObserver.disconnect();
 if(canLoad&&!S.busy&&'IntersectionObserver' in window){pagingObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!loadingMore)loadMore().catch(e=>toast(e.message));},{rootMargin:'120px'});pagingObserver.observe($('#load-more'));}
}
async function loadMore(){
 if(loadingMore||S.page==='search'&&S.nextOffset===null)return;
 loadingMore=true;const generation=S.generation;
 try{
  if(S.page==='search'){const d=await api(`/search/${S.search.jobId}?offset=${S.nextOffset}`);if(generation!==S.generation)return;S.items.push(...d.items);S.nextOffset=d.nextOffset;}
  else if(S.page==='feed'&&S.feed){
   const count=S.items.length;
   let d;
   if(S.nextOffset!==null)d=await api(`/feed/${S.feed.feedId}?offset=${S.nextOffset}`);
   else if(S.feed.canDiscover){
    $('#search-status').textContent='Finding more pieces for your style…';
    for(let i=0;i<8;i++){
     d=await api(`/feed/${S.feed.feedId}/advance?offset=${S.feed.cursorEnd??S.items.length}`,'POST',{});
     if(generation!==S.generation)return;
     S.feed=d;if(d.excludedIds?.length)S.items=S.items.filter(p=>!d.excludedIds.includes(p.id));
     if(d.items.length||!d.canDiscover)break;
     if(d.busy)await new Promise(r=>setTimeout(r,1000));
    }
   }
   if(d){if(generation!==S.generation)return;S.feed=d;if(d.excludedIds?.length)S.items=S.items.filter(p=>!d.excludedIds.includes(p.id));const seen=new Set(S.items.map(p=>p.id));S.items.push(...d.items.filter(p=>!seen.has(p.id)));S.nextOffset=d.nextOffset;}
  }
 }catch(e){toast(e.message);if(S.feed){S.feed.canDiscover=false;S.feed.warnings=[e.message];}}
 finally{loadingMore=false;if(generation===S.generation)renderItems();}
}
async function loadFeed(){
 S.page='feed';S.search=null;S.feed=null;
 const params=new URLSearchParams(Object.entries(S.filters).filter(([,v])=>v!==''));
 const d=await api('/feed?'+params);S.feed=d;S.items=d.items;S.nextOffset=d.nextOffset;renderBrowse();
 if(!S.items.length&&d.canDiscover)await loadMore();
}
async function loadLibrary(){const [c,r]=await Promise.all([api('/collections'),api('/reactions')]);S.collections=c.collections;S.reactions=r.reactions;}
async function runSearch(query=S.query){
 const generation=++S.generation;S.query=query;S.page='search';S.busy=true;S.search=null;S.items=[];S.nextOffset=null;renderBrowse();
 try{
  let result=await api('/search','POST',{query,filters:S.filters,...(S.searchPreferences?{preferences:S.searchPreferences}:{})});
  if(generation!==S.generation)return;applySearch(result);
  while(result.canAdvance&&generation===S.generation&&S.busy){result=await api(`/search/${result.jobId}/advance`,'POST',{});if(generation!==S.generation)return;applySearch(result);if(result.status==='running'){await new Promise(r=>setTimeout(r,1000));}}
 }finally{if(generation===S.generation){S.busy=false;if(S.page==='search')renderBrowse();}}
}
function applySearch(d){S.search=d;S.items=d.items;S.nextOffset=d.nextOffset;renderItems();}
async function showCollections(){S.page='collections';await loadLibrary();shell();$('#page').innerHTML=`<div class="header"><div><div class="eyebrow">Keep what catches your eye</div><h1>Your collections.</h1><p>Private little corners for your favorite finds.</p></div><button class="btn" data-action="new-collection">＋ New collection</button></div><div class="collection-grid">${S.collections.map(c=>`<button class="collection" data-action="collection" data-id="${esc(c.id)}"><span>${c.system?'♡':'▤'} &nbsp; Private</span><div><h2>${esc(c.name)}</h2><small>${c.productIds.length} pieces</small></div></button>`).join('')}</div>`;}
async function showCollection(key){const d=await api('/collections/'+key);S.collection=d.collection;S.items=d.items;S.page='collections';shell();$('#page').innerHTML=`<div class="header"><div><button class="link-btn" data-action="nav" data-page="collections">← All collections</button><h1 style="margin-top:15px">${esc(d.collection.name)}</h1><p>Private · ${d.items.length} pieces</p></div>${!d.collection.system?`<div class="row"><button class="btn secondary small" data-action="rename-collection" data-id="${esc(key)}">Rename</button><button class="btn secondary small" data-action="delete-collection" data-id="${esc(key)}">Delete</button></div>`:''}</div><div class="grid">${d.items.length?d.items.map(p=>`<div>${card(p)}${!d.collection.system?`<button class="link-btn" data-action="remove-item" data-id="${esc(p.id)}">Remove from collection</button>`:''}</div>`).join(''):'<div class="empty"><h2>Room for your next find.</h2><p>Save pieces here as you browse.</p></div>'}</div>`;}
async function detail(key){S.page='product';S.generation++;S.busy=false;const d=await api('/products/'+key),p=d.product;shell();document.title=p.title+' · Yousra';$('#page').innerHTML=`<div class="row between"><span class="eyebrow" style="margin:0">A closer look</span><button class="btn secondary small" data-action="back-to-browse">← Back to browsing</button></div><div class="detail"><div>${image(p.image,p.title)}<div class="detail-thumbs">${(p.images||[]).slice(0,5).map(url=>image(url,p.title)).join('')}</div></div><div><div class="eyebrow">${esc(p.store)}</div><h1>${esc(p.title)}</h1><h3>${p.price===null?'Check retailer for price':esc((p.currency||'')+' '+p.price.toFixed(2))}</h3>${p.demo?'<div class="notice">Sample reference. This is not a verified current listing.</div>':p.analysisSource!=='vision+description'||Object.values(p.attributes||{}).some(v=>v==='unknown')?'<div class="notice">Some coverage details are unverified. Check the photos and retailer details against your preferences.</div>':''}<p class="description">${esc(p.description)}</p><dl><dt>Brand</dt><dd>${esc(p.brand||'Not provided')}</dd><dt>Available sizes</dt><dd>${esc(p.sizes?.join(', ')||'Unverified — check retailer')}</dd><dt>US shipping</dt><dd>${p.shippingUS==='yes'?'Listed for US; confirm address at checkout':'Unverified — check retailer'}</dd><dt>Stock</dt><dd>${esc(p.availability||'unknown')}</dd><dt>Analyzed using</dt><dd>${esc(p.analysisSource)}</dd><dt>Last checked</dt><dd>${esc(p.pageFetchedAt||p.analyzedAt||'Not checked')}</dd>${Object.entries(p.attributes||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="row wrap"><a class="btn" href="${esc(p.shopPath)}?surface=detail" target="_blank" rel="noopener noreferrer">${p.demo?'View original source':'Shop at retailer'} ↗</a><button class="btn secondary" data-action="save" data-id="${esc(p.id)}">Save</button></div>${p.affiliate?'<p class="tag">Affiliate link: we may earn a commission.</p>':''}</div></div><h2 style="margin:30px 0 20px">More like this</h2><div class="grid">${d.similar.map(card).join('')}</div>`;window.scrollTo(0,0);}
async function saveModal(key){await loadLibrary();$('#modal').innerHTML=`<div class="row between"><h2>Save to a collection</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">×</button></div><div class="stack">${S.collections.filter(c=>!c.system).map(c=>`<button class="btn secondary" data-action="save-to" data-id="${esc(key)}" data-collection="${esc(c.id)}">${esc(c.name)}</button>`).join('')}<button class="btn" data-action="new-collection" data-product="${esc(key)}">＋ Create a collection</button><small>Use the heart to add a piece to Likes.</small></div>`;if(!$('#modal').open)$('#modal').showModal();}
function nameDialog(action,key='',product=''){const current=S.collections.find(c=>c.id===key);$('#modal').innerHTML=`<div class="row between"><h2>${action==='rename'?'Rename':'New'} collection</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">×</button></div><form id="collection-form" class="stack" data-id="${esc(key)}" data-product="${esc(product)}"><label class="field">Collection name<input name="name" value="${esc(current?.name||'')}" required maxlength="60"></label><button class="btn">Save collection</button></form>`;if(!$('#modal').open)$('#modal').showModal();}
async function navigate(page){S.generation++;S.busy=false;S.searchEdit=false;S.page=page;S.searchPreferences=null;S.activeCategory='dress';if(page==='profile'){S.preferences=structuredClone(S.profile.preferences);questionnaire();}else if(page==='collections')await showCollections();else {S.query='';await loadLibrary();await loadFeed();}}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,key=el.dataset.id;
 try{
  if(a==='back-to-browse'){if(document.referrer.startsWith(location.origin))history.back();else location.assign('/');}
  else if(a==='auth-toggle'){S.signup=!S.signup;auth();}
  else if(a==='signout'){await api('/auth/signout','POST',{});S.user=null;sessionStorage.removeItem('yousraBrowse');S.generation++;S.busy=false;S.swipes=[];S.filters={};S.query='';auth();}
  else if(a==='swipe-yes'||a==='swipe-no')swipe(a==='swipe-yes');
  else if(a==='category'){harvest();S.activeCategory=el.dataset.category;questionnaire(!S.profile.onboarded);}
  else if(a==='nav'){if(location.pathname.startsWith('/products/')||new URLSearchParams(location.search).has('product')){window.top.location.href='/?view='+el.dataset.page;}else await navigate(el.dataset.page);}
  else if(a==='refresh'){if(S.page==='search')await runSearch();else{await loadLibrary();await loadFeed();}}
  else if(a==='stop'){S.busy=false;S.generation++;renderBrowse();}
  else if(a==='reset-filters'){S.filters={};S.searchPreferences=null;if(S.page==='search')await runSearch();else await loadFeed();}
  else if(a==='seed-feed')await runSearch(`${S.profile.preferences.styles[0]||'modest'} ${S.profile.preferences.colors[0]||''} maxi dress long sleeve`);
  else if(a==='search-preferences'){S.searchEdit=true;S.preferences=structuredClone(S.searchPreferences||S.profile.preferences);questionnaire();}
  else if(a==='like'||a==='dislike'){const current=S.reactions[key];const action=(a==='like'&&current?.liked)||(a==='dislike'&&current?.disliked)?'clear':a;const d=await api(`/products/${key}/reaction`,'POST',{action});S.reactions[key]=d.reaction;S.collections=d.collections;toast(action==='like'?'Added to Likes':action==='dislike'?'We’ll show you fewer pieces like this':'Reaction removed');if(S.page==='collections'&&S.collection?.id==='likes')await showCollection('likes');else if(S.page==='feed'&&action==='dislike'){S.items=S.items.filter(p=>p.id!==key);renderItems();}else if($('#product-grid'))renderItems();}
  else if(a==='detail')await detail(key);
  else if(a==='close-modal'){$('#modal').close();S.searchEdit=false;}
  else if(a==='save')await saveModal(key);
  else if(a==='save-to'){await api('/collections/'+el.dataset.collection,'PATCH',{productId:key});$('#modal').close();toast('Saved to your collection');}
  else if(a==='new-collection')nameDialog('new','',el.dataset.product||'');
  else if(a==='rename-collection')nameDialog('rename',key);
  else if(a==='collection')await showCollection(key);
  else if(a==='delete-collection'){$('#modal').innerHTML=`<h2>Delete this collection?</h2><p>The saved pieces will remain available to browse.</p><div class="row"><button class="btn danger" data-action="confirm-delete" data-id="${esc(key)}">Delete collection</button><button class="btn secondary" data-action="close-modal">Cancel</button></div>`;$('#modal').showModal();}
  else if(a==='confirm-delete'){await api('/collections/'+key,'DELETE',{});$('#modal').close();await showCollections();}
  else if(a==='remove-item'){await api('/collections/'+S.collection.id,'PATCH',{productId:key,remove:true});await showCollection(S.collection.id);}
  else if(a==='load-more')await loadMore();
 }catch(error){toast(error.message);}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]')||form.querySelector('button');if(button)button.disabled=true;
 try{
  if(form.id==='auth-form'){const data=Object.fromEntries(new FormData(form));if(S.signup)data.newsletterOptIn=form.elements.newsletterOptIn.checked;const d=await api(S.signup?'/auth/signup':'/auth/signin','POST',data);if(d.confirmationRequired){toast(d.message);S.signup=false;auth();}else await boot();}
  else if(form.id==='preferences-form'){harvest();if(S.searchEdit){S.searchPreferences=structuredClone(S.preferences);S.searchEdit=false;$('#modal').close();if(S.page==='search')await runSearch();else{const params=new URLSearchParams(Object.entries(S.filters).filter(([,v])=>v));S.query='';await runSearch(`${S.preferences.styles[0]||'modest'} clothing`);}}else{const d=await api('/profile','PUT',{preferences:S.preferences,...(!S.profile.onboarded?{swipes:S.swipes,completeOnboarding:true}:{})});S.profile=d.profile;toast('Your preferences are saved');await navigate('feed');}}
  else if(form.id==='search-form'){const query=new FormData(form).get('query').trim();if(S.page==='product'){window.top.location.href='/?q='+encodeURIComponent(query);return;}S.searchPreferences=null;await runSearch(query);}
  else if(form.id==='filters-form'){S.filters=Object.fromEntries([...new FormData(form)].filter(([,v])=>v!==''));if(S.page==='search')await runSearch();else await loadFeed();}
  else if(form.id==='collection-form'){const name=new FormData(form).get('name');if(form.dataset.id)await api('/collections/'+form.dataset.id,'PATCH',{name});else{const d=await api('/collections','POST',{name});if(form.dataset.product)await api('/collections/'+d.collection.id,'PATCH',{productId:form.dataset.product});}$('#modal').close();toast('Collection saved');if(S.page==='collections')await showCollections();}
 }catch(error){if(form.id==='auth-form'&&$('#auth-error'))$('#auth-error').textContent=error.message;else toast(error.message);}
 finally{if(button)button.disabled=false;}
});
document.addEventListener('keydown',e=>{if($('#swipe-card')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();swipe(e.key==='ArrowRight');}if(e.key==='Enter'&&e.target.matches('[role=button][data-action=detail]'))detail(e.target.dataset.id).catch(e=>toast(e.message));});
$('#modal').addEventListener('click',e=>{if(e.target===e.currentTarget){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){$('#modal').close();S.searchEdit=false;}}});
async function boot(){
 S.health=await api('/health');
 try{const d=await api('/me');S.user=d.user;S.profile=d.profile;}catch{auth();return;}
 if(!S.profile.onboarded){const d=await api('/onboarding');S.photos=d.photos;S.swipes=[];onboarding();}
 else{await loadLibrary();const key=location.pathname.match(/^\/products\/([\w-]+)$/)?.[1]||new URLSearchParams(location.search).get('product');if(key)await detail(key);else {
   let saved;try{saved=JSON.parse(sessionStorage.getItem('yousraBrowse')||'null');}catch{}
   const back=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
   if(back&&saved?.userId===S.user.id&&Date.now()-saved.at<1800000){Object.assign(S,saved.state,{busy:false});renderBrowse();requestAnimationFrame(()=>window.scrollTo(0,saved.scroll));}
   else if(new URLSearchParams(location.search).get('q'))await runSearch(new URLSearchParams(location.search).get('q'));
   else await navigate(['profile','collections'].includes(new URLSearchParams(location.search).get('view'))?new URLSearchParams(location.search).get('view'):'feed');
  }}
}
document.addEventListener('click',e=>{
 if(e.target.closest('a[href^="/products/"]')&&['feed','search'].includes(S.page)){
  const state=Object.fromEntries(['page','feed','search','items','nextOffset','filters','query'].map(k=>[k,S[k]]));
  try{sessionStorage.setItem('yousraBrowse',JSON.stringify({userId:S.user.id,at:Date.now(),scroll:window.scrollY,state}));}catch{}
 }
},true);
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){const fallback=document.createElement('div');fallback.className='card-img-placeholder';fallback.textContent='Photo unavailable from retailer';e.target.replaceWith(fallback);}},true);
const measuredCards=new Set();let masonryFrame;
function scheduleMasonry(){if(masonryFrame)return;masonryFrame=requestAnimationFrame(()=>{
 masonryFrame=null;const present=new Set();
 for(const grid of document.querySelectorAll('.grid')){
  const gap=parseFloat(getComputedStyle(grid).rowGap)||12;
  for(const child of grid.children){present.add(child);if(!measuredCards.has(child)){measuredCards.add(child);masonryObserver?.observe(child);}
   const span=Math.max(1,Math.ceil((child.getBoundingClientRect().height+gap)/(1+gap)));
   if(child.style.gridRowEnd!=='span '+span)child.style.gridRowEnd='span '+span;
  }
 }
 for(const child of measuredCards)if(!present.has(child)){masonryObserver?.unobserve(child);measuredCards.delete(child);}
});}
const masonryObserver=typeof ResizeObserver==='function'?new ResizeObserver(scheduleMasonry):null;
new MutationObserver(scheduleMasonry).observe($('#app'),{childList:true,subtree:true});
window.addEventListener('resize',scheduleMasonry);
boot().catch(e=>{$('#app').innerHTML=`<main class="onboarding"><h1>Let’s get connected.</h1><p>${esc(e.message)}</p><p>Check your server environment configuration, then refresh.</p></main>`;});
