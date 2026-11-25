// Fill the team labeling queue (/admin/label) with pieces from the priority brands plus random stores.
//   npm run label:queue -- --dry-run            show the planned searches, spend nothing
//   npm run label:queue -- --max=150            stop after 150 new pieces (default 300)
//   npm run label:queue -- --priority=1         only priority-1 brands (plus random stores)
//   npm run label:queue -- --per-search=4       pieces kept per search (default 6)
// Uses SERPER_API_KEY and GEMINI_API_KEY from .env, within the usual daily caps, and writes to the
// database in STORAGE (Supabase in production).
import { buildLabelQueue } from '../src/label-queue.mjs';
import { settleBackground } from '../src/background.mjs';

const arg=(name,fallback)=>{const a=process.argv.find(x=>x.startsWith(`--${name}=`));return a?a.split('=')[1]:fallback;};
const dryRun=process.argv.includes('--dry-run');
const opts={dryRun,maxProducts:Number(arg('max',300)),perSearch:Number(arg('per-search',6)),onlyPriority:arg('priority',null)?Number(arg('priority')):null,log:m=>console.log(m)};

const result=await buildLabelQueue(opts);
if(dryRun){
  const brand=result.plan.filter(s=>s.kind==='brand'),random=result.plan.filter(s=>s.kind==='random');
  console.log(`${result.searches} searches planned: ${brand.length} on brand sites, ${random.length} across any store.\n`);
  for(const s of result.plan)console.log(`${s.kind==='brand'?`P${s.priority} ${s.brand.padEnd(20)}`:'   any store           '} ${s.query}`);
  console.log(`\nEach brand search uses ~3 Serper calls; each new piece uses 1 Gemini call (cached pieces are free).`);
}else{
  console.log(`\nAdded ${result.added} pieces from ${result.searched} searches (${result.failed} failed).`);
  for(const [b,n] of Object.entries(result.byBrand).sort((a,b)=>b[1]-a[1]))console.log(`  ${String(n).padStart(3)}  ${b}`);
  console.log('\nOpen /admin/label to start labeling.');
}
await settleBackground();
process.exit(0);
