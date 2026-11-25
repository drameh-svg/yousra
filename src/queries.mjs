// Every search phrase the app sends to Serper is built here, so the wording can be tuned in one place.
// Rules learned from the Nov 2026 labels:
// - keep queries short (4–6 words): long queries return fewer and odder results;
// - name the brand and a concrete garment ("Zara long sleeve maxi dress women"), not "modest"; the word
//   "modest" pulls results towards abaya-only shops, and mainstream brands never use it in titles;
// - always say "women" for mainstream brands (Uniqlo and Zara searches returned men's shirts and sweaters);
// - only add coverage words that make sense for the garment (no "long sleeve" on a skirt).
import { LABEL_BRANDS } from './label-brands.mjs';
import { AESTHETIC_SEARCH } from './taxonomy.mjs';
import { inferAttributes } from './discovery.mjs';

// Default feed brands: priority 1 and 2 from the brand research list (confirmed domains only).
// FEED_BRANDS in .env still overrides this when it is set.
// Left out: "Next" (too common a word to search by name) and Levi's (denim only, wrong for most garment words).
const NOT_IN_FEED = new Set(['Next', "Levi's"]);
export const DEFAULT_FEED_BRANDS = LABEL_BRANDS.filter(b => b.priority <= 2 && !b.verify && !NOT_IN_FEED.has(b.name)).map(b => b.name);
// Modest-only stores: everything they sell is aimed at modest shoppers, so no "women"/"modest" words needed.
export const MODEST_STORES = new Set(['modanisa','haute hijab','veiled collection','inayah','aab','shukr','east essence','poplook',
  "mariam's collection",'sabirah','mimu maxi','the frock nyc','louella','annah hariri','niswa fashion','anaqa inspired','chinutay & co','imaan active']);
export const isModestStore = name => MODEST_STORES.has(String(name || '').trim().toLowerCase());

// Several concrete garments per category; the feed rotates through them so pages don't repeat.
export const CATEGORY_NOUNS = {
  dress: ['long sleeve maxi dress', 'maxi dress', 'shirt dress', 'long sleeve midi dress'],
  top: ['long sleeve blouse', 'button down shirt', 'knit sweater', 'tunic top'],
  skirt: ['maxi skirt', 'pleated midi skirt', 'a-line maxi skirt'],
  outerwear: ['longline cardigan', 'trench coat', 'long coat'],
  pants: ['wide leg trousers', 'palazzo pants', 'linen trousers'],
  abaya: ['abaya', 'open abaya'],
};
const SIMPLE_NOUN = { dress: 'dress', top: 'top', skirt: 'skirt', pants: 'trousers', outerwear: 'cardigan', abaya: 'abaya' };
export const nounFor = (category, turn = 0) => { const list = CATEGORY_NOUNS[category] || ['clothing']; return list[Math.abs(turn) % list.length]; };

// At most one coverage word, and only one that fits the garment and isn't already in the noun.
export function coverageWord(category, rule = {}, noun = '') {
  const n = noun.toLowerCase(), c = category === 'abaya' ? 'dress' : category;
  if (['dress', 'top', 'outerwear'].includes(c) && rule.sleeves === 'long' && !n.includes('long sleeve')) return 'long sleeve';
  if (['dress', 'top'].includes(c) && rule.neckline === 'high') return 'high neck';
  if (['dress', 'skirt'].includes(c) && rule.length === 'maxi' && !n.includes('maxi')) return 'maxi';
  if (rule.fit === 'loose' && c !== 'pants' && !/loose|wide|palazzo|a-line/.test(n)) return 'loose';
  return '';
}
const join = words => words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
const genderWord = brand => (brand && isModestStore(brand) ? '' : 'women');

// For You feed: brand + (style) + (colour) + (one coverage word) + garment + (budget) + women.
export function feedSearch({ brand = '', category, rule = {}, style = '', color = '', budget = null, turn = 0 }) {
  const noun = nounFor(category, turn);
  return join([brand, AESTHETIC_SEARCH[style] || '', color, coverageWord(category, rule, noun), noun, budget ? `under $${budget}` : '', genderWord(brand)]);
}
// Brand pages (searched only on the brand's own site).
export function brandSearch({ brandName = '', category, style = '', color = '', turn = 0 }) {
  return join([brandName, AESTHETIC_SEARCH[style] || '', color, nounFor(category, turn)]);
}
// Starter pool for brand-new shoppers.
export const starterSearch = (brand, category, turn = 0) => join([brand, nounFor(category, turn), genderWord(brand)]);
// Explore brand previews.
export const brandWarmSearch = (name, turn = 0) => join([name, nounFor(['dress', 'top', 'skirt', 'outerwear'][Math.abs(turn) % 4], turn), genderWord(name)]);

// Search bar: keep what she typed, and only add words it is missing (colour, garment, "women", one coverage word).
export function searchBarQuery(query, filters = {}, prefs = {}) {
  const typed = String(query || '').trim(), low = typed.toLowerCase();
  const named = inferAttributes(typed).category;
  const category = filters.category || (named !== 'unknown' ? named : '');
  const words = [typed];
  if (filters.color && !low.includes(filters.color)) words.push(filters.color);
  if (filters.category && named === 'unknown') words.push(SIMPLE_NOUN[filters.category] || '');
  if (!category) words.push('women clothing');
  else if (!/\bwom[ae]n'?s?\b|\babayas?\b/.test(low)) words.push('women');
  if (category) words.splice(words.length - 1, 0, coverageWord(category, prefs.rules?.[category === 'abaya' ? 'dress' : category] || {}, low));
  // No style words here: she already said what she wants, and "linen" or "y2k" would override it.
  return join(words);
}
