import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.AUTH_MODE='local';process.env.STORAGE='local';process.env.NODE_ENV='test';process.env.PRIORITY_SITES='';process.env.STARTER_POOL='false';process.env.APP_ORIGIN='http://localhost:3000';
for(const k of ['SERPER_API_KEY','GEMINI_API_KEY','ANTHROPIC_API_KEY','DISCOVERY_PROVIDER','VISION_PROVIDER'])delete process.env[k];
process.env.ADMIN_EMAILS='team@example.com';process.env.OUTFIT_REPORTS_TO_HIDE='2';
process.env.LOCAL_DB_PATH=join(await mkdtemp(join(tmpdir(),'yousra-outfits-')),'test.sqlite');
const {handle}=await import('../src/api.mjs');
const {similarProducts}=await import('../src/outfits.mjs');
const {settleBackground}=await import('../src/background.mjs');
// 1x1 PNG.
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4/58BAAT/Af9N1T6FAAAAAElFTkSuQmCC';
const client=()=>{let jar='';return async(path,method='GET',data)=>{const r=await handle(new Request('http://localhost:3000/api'+path,{method,headers:{cookie:jar,...(method!=='GET'?{'content-type':'application/json',origin:'http://localhost:3000'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})}));const set=r.headers.getSetCookie();if(set.length)jar=set.map(x=>x.split(';')[0]).join('; ');return {status:r.status,type:r.headers.get('content-type'),data:r.headers.get('content-type')?.includes('json')?await r.json():null};};};

test('similar products: category, colour and words decide; coverage rules filter',()=>{
  const base={image:'x',attributes:{},evidence:{},confidence:0.9};
  const catalog=[{...base,id:'a',title:'Beige oversized knit cardigan',category:'outerwear',colors:['beige']},{...base,id:'b',title:'Black knit cardigan',category:'outerwear',colors:['black']},{...base,id:'c',title:'Beige linen trousers',category:'pants',colors:['beige']}];
  const got=similarProducts({label:'Beige cardigan',category:'outerwear',colors:['beige'],query:'beige oversized knit cardigan'},catalog,null,4).map(p=>p.id);
  assert.deepEqual(got.slice(0,2),['a','b']);assert.ok(!got.includes('c'));
});

test('outfit posts: private until approved, then likeable; reports hide them',async()=>{
  const ana=client(),team=client(),other=client(),anon=client();
  await ana('/auth/signup','POST',{email:'ana@example.com',password:'test-password-1'});
  await team('/auth/signup','POST',{email:'team@example.com',password:'test-password-1'});
  await other('/auth/signup','POST',{email:'other@example.com',password:'test-password-1'});
  assert.equal((await ana('/outfits','POST',{image:photo,caption:'Eid look'})).status,400,'consent required');
  const made=await ana('/outfits','POST',{image:photo,caption:'Eid look',styles:['earthy','nope'],occasion:'eid & events',consent:true,pieces:[{label:'Cream abaya',url:'javascript:alert(1)'}]});
  assert.equal(made.status,201);const id=made.data.post.id;assert.equal(made.data.post.status,'pending');
  await settleBackground();
  assert.equal((await other(`/outfits/${id}`)).status,404,'pending is private');
  assert.equal((await anon(`/outfits/${id}/image`)).status,404);
  assert.ok((await ana('/outfits')).data.items.some(x=>x.id===id),'author sees her own pending post');
  assert.equal((await other('/outfits')).data.items.length,0);
  const own=await ana(`/outfits/${id}`);assert.deepEqual(own.data.styles,['earthy']);assert.equal(own.data.tagged[0].url,null,'unsafe link dropped');
  assert.equal((await ana(`/admin/outfits`)).status,403);
  assert.equal((await team('/admin/outfits')).data.items.length,1);
  assert.equal((await team(`/admin/outfits/${id}`,'POST',{decision:'approved'})).status,200);
  assert.equal((await anon(`/outfits/${id}`)).status,200,'approved is public');
  const img=await anon(`/outfits/${id}/image`);assert.equal(img.status,200);assert.match(img.type,/^image\/(jpeg|png)$/);
  assert.equal((await other(`/outfits/${id}/like`,'POST',{like:true})).data.likeCount,1);
  assert.equal((await other('/outfits')).data.items[0].liked,true);
  await other(`/outfits/${id}/report`,'POST',{reason:'not an outfit'});await team(`/outfits/${id}/report`,'POST',{reason:'x'});
  assert.equal((await anon('/outfits')).data.items.length,0,'two reports hide it');
  assert.equal((await other(`/outfits/${id}`,'DELETE')).status,404,'only the author or team can delete');
  assert.equal((await ana(`/outfits/${id}`,'DELETE')).status,200);
  const teamPost=await team('/outfits','POST',{image:photo,consent:true});assert.equal(teamPost.data.post.status,'approved','team posts skip review');
  await settleBackground();
});

test('short feedback form (v3) is validated and summarised',async()=>{
  const {validateReview,summarize}=await import('../src/reviews.mjs');
  assert.throws(()=>validateReview({version:3,solution:4,overall:5,sentence:'Love it'}),/how hard/);
  assert.equal(validateReview({version:3,problem:2,solution:3,overall:4}).sentence,'','review text is optional');
  const r=validateReview({version:3,problem:5,solution:4,overall:5,sentence:'Love it',quoteOk:true});
  assert.equal(r.version,3);
  const s=summarize([r,{...r,problem:3,solution:2}]);
  assert.equal(s.problem,4);assert.equal(s.solution,3);assert.equal(s.problemHigh,50);assert.equal(s.v3,2);
});
