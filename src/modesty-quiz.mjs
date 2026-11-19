// "Find my modesty": five real pieces with known coverage, one per question: "Would you wear this?" plus why.
// The answers are scored against the three presets (the one that agrees with the most answers wins, ties go to
// the more covering one). Specific "no" reasons tighten single rules; "with a layer" turns on layering.
import { store } from './store.mjs';
import { humanVerdict, presetRules, choices } from './preferences.mjs';
import { HttpError, hash, id, now, text } from './util.mjs';

export const PRESETS = ['relaxed', 'moderate', 'conservative'];
export const YES_REASONS = [
  { id: 'covers', label: 'Covers enough for me' }, { id: 'layer', label: "I'd wear it with a layer" },
  { id: 'loose', label: 'Loose enough' }, { id: 'style', label: 'Love the style' },
];
export const NO_REASONS = [
  { id: 'sleeves', label: 'Sleeves too short' }, { id: 'neckline', label: 'Neckline too low' }, { id: 'length', label: 'Too short' },
  { id: 'fit', label: 'Too tight' }, { id: 'transparency', label: 'See-through' }, { id: 'slits', label: 'Has a slit' },
  { id: 'cutouts', label: 'Has cutouts' }, { id: 'too_covered', label: 'More covered than I need' }, { id: 'style', label: 'Just not my style' },
];
const COVERAGE_NO = new Set(['sleeves', 'neckline', 'length', 'fit', 'transparency', 'slits', 'cutouts']);
const rank = level => PRESETS.indexOf(level);

// A piece's coverage level, only when we are reasonably sure: shoppers' consensus first, then verified attributes.
export function knownLevel(p) {
  const human = humanVerdict(p);
  if (human) return human.level === 'not_modest' ? 'relaxed' : human.level;
  const a = p.attributes || {}, sure = f => a[f] && a[f] !== 'unknown' && (p.evidence?.[f]?.confidence ?? p.confidence ?? 0) >= 0.65;
  const meets = level => Object.entries(presetRules(level, p.category)).every(([f, want]) => want === 'any' || (sure(f) && (choices[f].indexOf(a[f]) >= choices[f].indexOf(want) || a[f] === want)));
  if (meets('conservative')) return 'conservative';
  if (meets('moderate')) return 'moderate';
  const clearlyLess = (sure('sleeves') && ['sleeveless', 'short'].includes(a.sleeves)) || (sure('neckline') && a.neckline === 'open') || (['dress', 'skirt'].includes(p.category) && sure('length') && ['mini', 'knee'].includes(a.length));
  return clearlyLess ? 'relaxed' : null;
}
const usable = p => !p.demo && p.image && !p.excluded && p.productPage !== false && p.category && p.category !== 'unknown';

// 2 conservative, 2 moderate, 1 relaxed when available, different stores, a fresh mix each day.
export function quizItems(catalog, seed) {
  const pools = Object.fromEntries(PRESETS.map(l => [l, []]));
  for (const p of catalog) if (usable(p)) { const l = knownLevel(p); if (l) pools[l].push(p); }
  const order = list => [...list].sort((a, b) => hash(`${seed}:${a.id}`).localeCompare(hash(`${seed}:${b.id}`)));
  const picked = [], stores = new Set();
  const take = (level, n) => { for (const p of order(pools[level])) { if (n <= 0) break; if (stores.has(p.store) && pools[level].length > n * 2) continue; picked.push({ p, level }); stores.add(p.store); n--; } };
  take('conservative', 2); take('moderate', 2); take('relaxed', 1);
  for (const level of ['moderate', 'conservative', 'relaxed']) if (picked.length < 5) take(level, 5 - picked.length);
  return picked.slice(0, 5);
}

export function scoreQuiz(answers, levels) {
  const scored = answers.map(a => ({ ...a, level: levels.get(a.productId) })).filter(a => a.level);
  if (scored.length < 3) throw new HttpError(400, 'Answer at least 3 pieces to find your modesty level');
  const votes = Object.fromEntries(PRESETS.map(p => [p, 0]));
  let counted = 0;
  for (const a of scored) {
    const coverageNo = !a.wear && a.reasons.some(r => COVERAGE_NO.has(r)), tooCovered = !a.wear && a.reasons.includes('too_covered');
    if (!a.wear && !coverageNo && !tooCovered) continue; // "not my style" says nothing about coverage
    counted++;
    for (const preset of PRESETS) {
      const meets = rank(a.level) >= rank(preset);
      // Someone with this preset would wear pieces that meet it, and refuse ones that don't.
      if (a.wear ? meets : coverageNo ? !meets : rank(preset) < rank(a.level)) votes[preset]++;
    }
  }
  if (!counted) throw new HttpError(400, 'Tell us at least once whether a piece covers enough for you');
  // A plain "yes" is direct evidence: never suggest a level stricter than a piece she'd wear as-is.
  const worn = scored.filter(a => a.wear && !a.reasons.includes('layer')).map(a => rank(a.level));
  const ceiling = worn.length ? Math.min(...worn) : PRESETS.length - 1;
  const preset = PRESETS.filter(p => rank(p) <= ceiling).reverse().sort((x, y) => votes[y] - votes[x])[0];
  // Tighten single rules she called out on pieces this preset would otherwise allow.
  const tweaks = {}, conservative = presetRules('conservative', 'dress');
  for (const a of scored) if (!a.wear && rank(a.level) >= rank(preset)) for (const r of a.reasons) if (COVERAGE_NO.has(r) && presetRules(preset, 'dress')[r] !== conservative[r]) tweaks[r] = conservative[r];
  const allowLayering = scored.some(a => a.wear && a.reasons.includes('layer'));
  const agreement = Math.round(votes[preset] / counted * 100);
  return { preset, agreement, tweaks, allowLayering, answered: scored.length };
}

export async function saveQuiz(userId, answers, result) {
  await store.put('modesty_quiz', id(), { userId, answers, result, createdAt: now() }, userId).catch(() => {});
}
export function validateAnswers(input) {
  if (!Array.isArray(input) || !input.length || input.length > 10) throw new HttpError(400, 'Invalid answers');
  const ok = new Set([...YES_REASONS, ...NO_REASONS].map(r => r.id));
  return input.map(a => ({ productId: text(a?.productId, 120), wear: a?.wear === true, reasons: Array.isArray(a?.reasons) ? [...new Set(a.reasons.filter(r => ok.has(r)))] : [] }));
}
