// Explore page brand previews: a few listings per brand, taken only from that brand's own site (or listed
// under its name). Brands with too few pieces get a background search of their site, so they fill in.
import { store } from './store.mjs';
import { background } from './background.mjs';
import { discover } from './discovery.mjs';
import { filtersFrom } from './preferences.mjs';
import { fromBrand, rankProducts } from './rank.mjs';
import { onboarding } from './seed.mjs';
import { hash, text } from './util.mjs';

const usable = p => !p.demo && p.image && !p.excluded && p.productPage !== false && p.availability !== 'out_of_stock';

export function parseBrands(value) {
  return String(value || '').split(',').slice(0, 8).map(entry => {
    const [domain, name = ''] = entry.split('|');
    return { domain: filtersFrom({ brand: domain }).brand, name: text(decodeURIComponent(name), 60) };
  });
}

// Search a brand's own site at most every BRAND_WARM_HOURS, saving what it finds.
export function warmBrand({ domain, name }) {
  return background((async () => {
    const key = `brand-warm-v1:${hash(domain)}`, last = await store.get('cache', key);
    if (last && last.until > Date.now()) return;
    await store.put('cache', key, { until: Date.now() + Number(process.env.BRAND_WARM_HOURS || 6) * 3600000 });
    const found = await discover(`${name} modest women clothing`.trim(), 1, { site: domain });
    await Promise.all(found.map(async p => { const old = await store.get('product', p.id); return store.put('product', p.id, old ? { ...p, ...old } : p); }));
  })());
}

export function brandPreviews(specs, catalog, profile, interactions, n = 4) {
  const out = {};
  for (const spec of specs) {
    const mine = catalog.filter(p => usable(p) && fromBrand(p, spec.domain, spec.name));
    // Signed-in shoppers see the brand's pieces that also pass their own coverage rules, best match first.
    const ranked = profile?.onboarded ? rankProducts(mine, profile, interactions, onboarding, {}, '', false, catalog) : mine;
    out[spec.domain] = { items: ranked.slice(0, n), total: ranked.length };
    if (mine.length < Math.max(n, 8)) warmBrand(spec);
  }
  return out;
}
