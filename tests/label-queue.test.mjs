import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';process.env.PRIORITY_SITES='';process.env.STARTER_POOL='false';process.env.APP_ORIGIN='http://localhost:3000';
for(const k of ['SERPER_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','VISION_PROVIDER','HUMAN_LABEL_MIN'])delete process.env[k];
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-labelq-')),'test.sqlite');
const {QUEUE_KIND,planSearches,uncertainty,labelQueueItems,submitAttributeLabel,labelQueueStats,isBlind,fieldsFor,attributeLabelsCsv}=await import('../src/label-queue.mjs');
const {LABEL_BRANDS}=await import('../src/label-brands.mjs');
const {store}=await import('../src/store.mjs');

const sure={sleeves:{confidence:0.9},neckline:{confidence:0.9},length:{confidence:0.9},fit:{confidence:0.9},transparency:{confidence:0.9},slits:{confidence:0.9},cutouts:{confidence:0.9}};
const piece=(id,o={})=>({id,title:`Piece ${id}`,description:'',url:`https://${o.domain||'zara.com'}/p/${id}`,store:o.domain||'zara.com',image:'https://example.com/a.jpg',images:['https://example.com/a.jpg'],category:'dress',
  attributes:{sleeves:'long',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'none',cutouts:'none'},evidence:sure,confidence:0.9,
  labelQueue:{source:'brand',brand:'Zara',domain:o.domain||'zara.com',priority:1,query:'maxi dress',addedAt:'2026-11-23'},...o});

test('plan covers every brand by priority, plus random stores',()=>{
  const plan=planSearches();
  for(const b of LABEL_BRANDS)assert.ok(plan.some(s=>s.domain===b.domain),b.name);
  assert.equal(plan.filter(s=>s.domain==='zara.com').length,4,'priority 1 gets 4 queries');
  assert.equal(plan.filter(s=>s.domain==='nike.com').length,1,'priority 3 gets 1');
  assert.ok(plan.filter(s=>s.kind==='random').length>=10);
  assert.ok(planSearches({onlyPriority:1}).every(s=>s.kind==='random'||s.priority===1));
});

test('uncertain pieces score higher; pants skip sleeves and neckline',()=>{
  assert.equal(uncertainty(piece('a')),0);
  assert.ok(uncertainty(piece('b',{attributes:{...piece('b').attributes,sleeves:'unknown'}}))>0);
  assert.deepEqual(fieldsFor('pants'),['length','fit','transparency','slits','cutouts']);
});

test('queue serves least certain first, hides AI on blind items, and records labels',async()=>{
  await store.put(QUEUE_KIND,'sure',piece('sure'));await store.put('product','sure',{...piece('sure'),labelQueue:undefined});
  await store.put(QUEUE_KIND,'unsure',piece('unsure',{domain:'hm.com',evidence:{},confidence:0.3}));
  await store.put('product','notqueued',{...piece('notqueued'),labelQueue:undefined});
  const q=await labelQueueItems('u1',10);
  assert.equal(q.total,2);assert.equal(q.items[0].id,'unsure');
  for(const it of q.items)assert.equal(it.ai===null,isBlind('u1',it.id));
  await assert.rejects(submitAttributeLabel({productId:'sure',attributes:{sleeves:'long'}},{id:'u1'}),/Choose a value/);
  const all={sleeves:'short',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'cant_tell',cutouts:'none'};
  const r=await submitAttributeLabel({productId:'sure',attributes:all,level:'relaxed',seconds:7},{id:'u1'});
  assert.equal(r.changed,isBlind('u1','sure')?0:1);
  for(const kind of [QUEUE_KIND,'product']){const p=await store.get(kind,'sure');assert.equal(p.humanModesty.count,1,kind);assert.ok(p.verifiedAttributes);}
  assert.equal((await store.list('product')).filter(p=>p.labelQueue).length,0,'queue pieces stay out of the shopper catalog');
  assert.equal((await labelQueueItems('u1',10)).items.some(x=>x.id==='sure'),false,'labeled items leave your queue');
  assert.equal((await labelQueueItems('u2',10)).items.some(x=>x.id==='sure'),true,'other labelers still see it');
  const labels=await store.list('attribute_label');
  const s=labelQueueStats(labels,2);
  const sleeves=isBlind('u1','sure')?s.accuracy.sleeves.blind:s.accuracy.sleeves.shown;
  assert.equal(sleeves,0);assert.equal(s.accuracy.slits.checked,0,"can't tell is left out");
  assert.match(s.topMistakes[0].mistake,/sleeves: AI long → human short/);
  assert.match(attributeLabelsCsv(labels),/human_sleeves/);
});

test('label-queue API is admin-only and round-trips a label',async()=>{
  process.env.ADMIN_EMAILS='team@example.com';
  const {handle}=await import('../src/api.mjs');
  const client=()=>{let jar='';return async(path,method='GET',data)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{cookie:jar,...(method!=='GET'?{'content-type':'application/json',origin:'http://localhost:3000'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})}));const set=r.headers.getSetCookie();if(set.length)jar=set.map(x=>x.split(';')[0]).join('; ');return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};};};
  const shopper=client(),team=client();
  await shopper('/auth/signup','POST',{email:'shopper@example.com',password:'test-password-9'});
  assert.equal((await shopper('/admin/label-queue/items')).status,403);
  await team('/auth/signup','POST',{email:'team@example.com',password:'test-password-9'});
  await store.put(QUEUE_KIND,'api1',piece('api1',{domain:'uniqlo.com'}));
  const items=await team('/admin/label-queue/items?count=5');
  assert.equal(items.status,200);assert.ok(items.data.items.some(x=>x.id==='api1'));
  const all={sleeves:'long',neckline:'high',length:'maxi',fit:'loose',transparency:'opaque',slits:'none',cutouts:'none'};
  assert.equal((await team('/admin/label-queue/labels','POST',{productId:'api1',attributes:all,level:'conservative'})).status,201);
  const stats=await team('/admin/label-queue/stats');assert.equal(stats.status,200);assert.ok(stats.data.labels>=1);
  const csv=await team('/admin/label-queue/stats?format=csv');assert.match(csv.data,/api1/);
});
