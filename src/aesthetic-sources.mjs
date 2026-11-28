// Extra Serper queries when a classifier aesthetic is selected. Config-editable JSON; search hints only.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifierStyle } from './taxonomy.mjs';
import { serper, discoveryCandidates, keepPrioritySites } from './discovery.mjs';
import { hash } from './util.mjs';

const path = join(dirname(fileURLToPath(import.meta.url)), 'aesthetic-sources.json');
let sources;
try { sources = JSON.parse(readFileSync(path, 'utf8')); } catch { sources = {}; }

export function aestheticSourceConfig(style) {
  const key = classifierStyle(style);
  if (!key || !sources[key]) return null;
  return { style: key, ...sources[key] };
}

/** Build a capped list of Serper queries for an aesthetic (retailers + broad + marketplaces). */
export function aestheticQueries(style, { max = 8 } = {}) {
  const cfg = aestheticSourceConfig(style);
  if (!cfg) return [];
  const out = [];
  for (const q of cfg.queries || []) out.push({ kind: 'broad', q });
  for (const name of cfg.retailers || []) out.push({ kind: 'retailer', q: `${name} women clothing` });
  for (const m of cfg.marketplaces || []) {
    if (m.site && m.query) out.push({ kind: 'marketplace', q: `${m.query} site:${m.site}` });
  }
  return out.slice(0, max);
}

/**
 * Run additional aesthetic-scoped Serper searches and return deduped candidates
 * (same URL-hash dedupe as discoveryCandidates). Does not bypass coverage/price later.
 */
export async function discoverAestheticExtras(style, { page = 1, limit = 12 } = {}) {
  const queries = aestheticQueries(style);
  if (!queries.length || !process.env.SERPER_API_KEY) return [];
  const jobs = queries.flatMap(({ q }) => [
    serper('images', q, page),
    serper('shopping', q, page),
  ]);
  const settled = await Promise.allSettled(jobs);
  const payloads = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (!payloads.length) return [];
  const candidates = discoveryCandidates(payloads);
  // Stable secondary key so repeated aesthetic rounds dedupe against the main discover() set by id.
  return keepPrioritySites(candidates, limit).map(p => ({ ...p, discoverySource: p.discoverySource || 'serper', aestheticQuery: style, aestheticQueryKey: hash(`${style}:${p.url}`).slice(0, 16) }));
}

export { sources as aestheticSourcesFile };
