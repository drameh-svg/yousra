// Re-runs the CURRENT vision prompt on the pieces you labeled and compares it with your labels and with what
// the old prompt said at labeling time. Spends one Gemini call per piece (cached afterwards, so a second run
// is free unless the prompt version changes).
// Usage: npm run eval:prompt -- <attribute-labels.jsonl> [modesty-labels.jsonl] [--limit=60] [--rpm=12]
import fs from 'node:fs';
import { analyze, VISION_VERSION } from '../src/discovery.mjs';
import { predictedLevel, LEVELS } from '../src/preferences.mjs';
import { fieldsFor } from '../src/label-queue.mjs';
import { hiddenReason } from '../src/shop-filter.mjs';

const args = process.argv.slice(2), opt = k => args.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const files = args.filter(a => !a.startsWith('--'));
if (!files.length) { console.log('Usage: npm run eval:prompt -- <attribute-labels.jsonl> [modesty-labels.jsonl] [--limit=60]'); process.exit(1); }
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const rows = files.flatMap(read);
// Gemini's per-minute limit is low, so the default is one piece every 5 seconds (--rpm=12). Raise --rpm on a paid key.
const limit = Number(opt('limit') || 500), concurrency = Number(opt('concurrency') || 1), gap = 60000 / Number(opt('rpm') || 12);
process.env.GEMINI_RETRIES ??= '4';

// One entry per piece: attribute truth (from the labeling page) and every coverage vote (both files).
const pieces = new Map();
for (const r of rows) {
  const e = pieces.get(r.product_id) || { id: r.product_id, title: r.title, description: r.description || '', url: r.url || '', image: r.image_url,
    images: r.image_urls || [r.image_url], category: r.category, store: r.store, truth: null, oldAttrs: r.model_attributes || {}, oldLevel: r.model_level, votes: [] };
  if (r.human_attributes && !r.unsure) e.truth = r.human_attributes;
  if (r.human_level && !r.unsure && !e.votes.some(v => v.at === r.created_at)) e.votes.push({ level: r.human_level, at: r.created_at });
  pieces.set(r.product_id, e);
}
const list = [...pieces.values()].filter(p => p.image).slice(0, limit);
console.log(`Prompt ${VISION_VERSION}: re-analysing ${list.length} labeled pieces…`);

let i = 0; const out = [];
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (i < list.length) {
    const p = list[i++], started = Date.now();
    try {
      // pageFetchedAt skips re-reading the retailer page, so only the prompt changes between runs.
      const a = await analyze({ id: p.id, title: p.title, description: p.description, url: p.url, image: p.image, images: p.images, category: p.category, store: p.store, pageFetchedAt: new Date().toISOString() });
      out.push({ ...p, newAttrs: a.attributes || {}, newSource: a.analysisSource, note: a.analysisNote || '', analysisError: a.analysisError || '', newLevel: predictedLevel({ ...a, category: p.category }),
        hidden: hiddenReason({ ...a, category: a.category || p.category }), focus: a.focus || null, occasion: a.occasion || null, revealing: a.revealing });
    } catch (e) { out.push({ ...p, error: e.message }); }
    process.stdout.write(out.at(-1).newSource === 'vision+description' ? '.' : 'x');
    await new Promise(r => setTimeout(r, Math.max(0, gap - (Date.now() - started))));
  }
}));
console.log('\n');

const usedPhoto = out.filter(o => o.newSource === 'vision+description').length;
console.log(`Photo actually analysed: ${usedPhoto}/${out.length}${usedPhoto < out.length ? '  (the rest: ' + [...new Set(out.filter(o => o.newSource !== 'vision+description').map(o => o.analysisError || o.note || o.error || 'no photo'))].join('; ') + ')' : ''}\n`);

// Attribute accuracy. "unknown" counts as a miss: it makes the piece fail strict shoppers' filters.
const fields = ['sleeves', 'neckline', 'length', 'fit', 'transparency', 'slits', 'cutouts'];
console.log('Attribute'.padEnd(14) + 'old prompt'.padStart(14) + 'new prompt'.padStart(14) + '   labeled');
const tally = {};
for (const f of fields) {
  const rowsF = out.filter(o => o.truth && fieldsFor(o.category).includes(f) && o.truth[f] && o.truth[f] !== 'cant_tell'
    && !(f === 'length' && ['top', 'outerwear'].includes(o.category)));
  const score = k => rowsF.filter(o => o[k][f] === o.truth[f]).length;
  tally[f] = { n: rowsF.length, old: score('oldAttrs'), new: score('newAttrs') };
  const pct = n => rowsF.length ? `${Math.round(n / rowsF.length * 100)}%` : '–';
  console.log(f.padEnd(14) + pct(tally[f].old).padStart(14) + pct(tally[f].new).padStart(14) + String(rowsF.length).padStart(10));
}

// Coverage level (majority vote) vs the level the model's attributes imply.
const voted = out.filter(o => o.votes.length).map(o => {
  const c = {}; for (const v of o.votes) c[v.level] = (c[v.level] || 0) + 1;
  return { ...o, human: Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] };
});
const lvl = k => voted.filter(o => o[k] === o.human).length;
console.log(`\nCoverage level matches shoppers: old ${Math.round(lvl('oldLevel') / Math.max(1, voted.length) * 100)}%  →  new ${Math.round(lvl('newLevel') / Math.max(1, voted.length) * 100)}%  (${voted.length} pieces)`);
const order = [...LEVELS].reverse();
console.log('\nShoppers said ↓ / new model →'.padEnd(32) + order.map(l => l.padStart(13)).join(''));
for (const h of order) console.log(h.padEnd(31) + order.map(m => String(voted.filter(o => o.human === h && o.newLevel === m).length).padStart(13)).join(''));

// The "never show" rule on dresses.
const dresses = voted.filter(o => o.category === 'dress');
const bad = dresses.filter(o => o.human === 'not_modest'), good = dresses.filter(o => ['moderate', 'conservative'].includes(o.human));
console.log(`\nDresses shoppers rated not modest that are now hidden: ${bad.filter(o => o.hidden).length}/${bad.length}`);
console.log(`Dresses shoppers rated moderate/conservative that are wrongly hidden: ${good.filter(o => o.hidden).length}/${good.length}`);
for (const o of good.filter(o => o.hidden)) console.log(`   ${o.hidden.padEnd(18)} ${o.title.slice(0, 70)}`);

console.log('\nStill wrong with the new prompt:');
for (const o of out.filter(o => o.truth)) {
  const wrong = fields.filter(f => fieldsFor(o.category).includes(f) && o.truth[f] && o.truth[f] !== 'cant_tell' && !(f === 'length' && ['top', 'outerwear'].includes(o.category)) && o.newAttrs[f] !== o.truth[f]);
  if (wrong.length) console.log(`  ${o.title.slice(0, 55).padEnd(55)} ${wrong.map(f => `${f}: said ${o.newAttrs[f]}, label ${o.truth[f]}`).join(' · ')}`);
}
fs.mkdirSync('data', { recursive: true });
const file = `data/prompt-eval-${VISION_VERSION}-${new Date().toISOString().slice(0, 10)}.json`;
fs.writeFileSync(file, JSON.stringify({ version: VISION_VERSION, tally, results: out }, null, 1));
console.log(`\nFull results: ${file}`);
