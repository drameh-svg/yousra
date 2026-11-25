// Re-analyses pieces whose analysis is from an older prompt, or that never had their photo analysed.
// Keeps labels, shopper votes and queue info. One Gemini call per piece.
// Usage: npm run vision:refresh -- [--kind=label_item|product|both] [--max=200] [--rpm=12] [--dry-run]
import { store } from '../src/store.mjs';
import { analyze, VISION_VERSION } from '../src/discovery.mjs';

const args = process.argv.slice(2), opt = k => args.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const kind = opt('kind') || 'both', max = Number(opt('max') || 200), concurrency = Number(opt('concurrency') || 1), dry = args.includes('--dry-run');
const gap = 60000 / Number(opt('rpm') || 12); process.env.GEMINI_RETRIES ??= '4';
const kinds = kind === 'both' ? ['label_item', 'product'] : [kind];
const stale = p => !p.demo && p.image && !p.excluded && p.visionVersion !== VISION_VERSION;

for (const k of kinds) {
  const all = await store.list(k, undefined, 20000), todo = all.filter(stale).slice(0, max);
  console.log(`${k}: ${all.filter(stale).length} of ${all.length} need the ${VISION_VERSION} prompt; doing ${dry ? 0 : todo.length}`);
  if (dry) continue;
  let i = 0, ok = 0, noPhoto = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < todo.length) {
      const p = todo[i++], started = Date.now();
      try {
        const a = await analyze(p), latest = await store.get(k, p.id) || p;
        await store.put(k, p.id, { ...a, labelQueue: latest.labelQueue ?? a.labelQueue, humanModesty: latest.humanModesty ?? a.humanModesty, verifiedAttributes: latest.verifiedAttributes ?? a.verifiedAttributes });
        if (a.analysisSource === 'vision+description') ok++; else noPhoto++;
        if (a.analysisNote?.includes('usage cap')) { console.log('\nGemini daily cap reached; run again tomorrow.'); i = todo.length; }
      } catch (e) { console.log(`\n${p.id}: ${e.message}`); }
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, Math.max(0, gap - (Date.now() - started))));
    }
  }));
  console.log(`\n${k}: ${ok} analysed with the photo, ${noPhoto} still without one`);
}
process.exit(0);
