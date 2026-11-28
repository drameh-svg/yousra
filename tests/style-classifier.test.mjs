import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.AUTH_MODE = 'local';
process.env.STORAGE = 'local';
process.env.NODE_ENV = 'test';
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.LOCAL_DB_PATH = join(await mkdtemp(join(tmpdir(), 'yousra-style-')), 'test.sqlite');
delete process.env.STYLE_WORKER_URL;
delete process.env.STYLE_WORKER_SECRET;
delete process.env.SERPER_API_KEY;

const { aestheticMatch, styleMatchPolicy, shouldClassify, classifyProduct } = await import('../src/style-classifier.mjs');
const { rankProducts } = await import('../src/rank.mjs');
const { defaultPreferences } = await import('../src/preferences.mjs');
const { discoveryCandidates } = await import('../src/discovery.mjs');
const { aestheticQueries } = await import('../src/aesthetic-sources.mjs');
const { preferenceMigrationPlan, migrateClearPreferences, AMBIGUOUS_PREF_MAP } = await import('../src/style-preferences.mjs');

const prefs = () => {
  const p = defaultPreferences();
  p.rules.dress.sleeves = 'long';
  p.rules.dress.length = 'maxi';
  return p;
};
const garment = (id, overrides = {}) => ({
  id,
  title: 'Blue maxi dress',
  description: '',
  category: 'dress',
  styles: ['earthy'],
  colors: ['blue'],
  attributes: { sleeves: 'long', length: 'maxi' },
  confidence: 0.9,
  analysisSource: 'vision+description',
  shippingUS: 'unknown',
  price: 40,
  currency: 'USD',
  sizes: ['m'],
  brand: 'Kotn',
  store: 'kotn.com',
  url: 'https://kotn.com/products/blue-maxi',
  productPage: true,
  image: 'https://cdn.example/img.jpg',
  ...overrides,
});

function withRanks(id, ranks, extra = {}) {
  return garment(id, {
    styleClassification: {
      status: 'ok',
      modelVersion: 'google/siglip2-base-patch16-224+trained_classifier',
      ranked: ranks.map((r, i) => ({ style: r.style, score: r.score, rank: i + 1 })),
      classifiedAt: '2026-11-28T00:00:00.000Z',
    },
    ...extra,
  });
}

test('no-style searches are not restricted to the seven classifier categories', () => {
  const profile = { preferences: prefs(), swipes: [] };
  const products = [
    garment('a', { styles: ['coquette'], styleClassification: undefined }),
    garment('b', { styles: ['earthy'] }),
  ];
  assert.equal(rankProducts(products, profile, [], [], {}).length, 2);
});

test('style in 2nd and 3rd position can match, with unequal rank weights', () => {
  const policy = styleMatchPolicy();
  assert.ok(policy.weights[1] > policy.weights[2]);
  assert.ok(policy.weights[2] > policy.weights[3]);
  const second = withRanks('s2', [
    { style: 'y2k', score: 0.4 },
    { style: 'earthy', score: 0.25 },
    { style: 'grunge', score: 0.1 },
  ]);
  const third = withRanks('s3', [
    { style: 'y2k', score: 0.4 },
    { style: 'grunge', score: 0.2 },
    { style: 'earthy', score: 0.15 },
  ]);
  assert.equal(aestheticMatch(second, 'earthy').pass, true);
  assert.equal(aestheticMatch(second, 'earthy').rank, 2);
  assert.equal(aestheticMatch(third, 'earthy').pass, true);
  assert.equal(aestheticMatch(third, 'earthy').rank, 3);
  assert.ok(aestheticMatch(second, 'earthy').weight > aestheticMatch(third, 'earthy').weight);

  const profile = { preferences: prefs(), swipes: [] };
  const ranked = rankProducts([second, third], profile, [], [], { style: 'earthy' });
  assert.deepEqual(ranked.map(x => x.id), ['s2', 's3']);
  assert.ok(ranked[0].match.score > ranked[1].match.score);
});

test('brand name alone never passes an aesthetic filter', () => {
  const kotnOnly = garment('brand', {
    brand: 'Kotn',
    store: 'kotn.com',
    styles: ['90s_minimalism'],
    styleClassification: { status: 'ok', ranked: [{ style: 'y2k', score: 0.5, rank: 1 }] },
  });
  assert.equal(aestheticMatch(kotnOnly, '90s_minimalism').pass, false);
  const profile = { preferences: prefs(), swipes: [] };
  assert.equal(rankProducts([kotnOnly], profile, [], [], { style: '90s_minimalism' }).length, 0);
});

test('Gemini/text style tags alone never pass when a style is selected', () => {
  const profile = { preferences: prefs(), swipes: [] };
  const geminiOnly = garment('g', { styles: ['earthy'], styleClassification: undefined });
  assert.equal(rankProducts([geminiOnly], profile, [], [], { style: 'earthy' }).length, 0);
});

test('style match still fails price and coverage filters', () => {
  const profile = { preferences: prefs(), swipes: [] };
  const styled = withRanks('ok', [
    { style: 'clean_girl', score: 0.5 },
    { style: 'earthy', score: 0.2 },
    { style: 'y2k', score: 0.1 },
  ]);
  const pricey = withRanks('pricey', [
    { style: 'clean_girl', score: 0.5 },
    { style: 'earthy', score: 0.2 },
    { style: 'y2k', score: 0.1 },
  ], { price: 200 });
  const immodest = withRanks('short', [
    { style: 'clean_girl', score: 0.5 },
    { style: 'earthy', score: 0.2 },
    { style: 'y2k', score: 0.1 },
  ], { attributes: { sleeves: 'short', length: 'maxi' } });

  assert.deepEqual(rankProducts([styled, pricey], profile, [], [], { style: 'clean_girl', maxPrice: 50 }).map(x => x.id), ['ok']);
  assert.deepEqual(rankProducts([styled, immodest], profile, [], [], { style: 'clean_girl' }).map(x => x.id), ['ok']);
});

test('duplicate Serper results collapse by URL hash', () => {
  const payloads = [{
    images: [
      { link: 'https://shop.example/products/linen-dress?utm_source=x', title: 'Linen maxi dress', imageUrl: 'https://cdn.example/a.jpg' },
      { link: 'https://shop.example/products/linen-dress', title: 'Linen maxi dress', imageUrl: 'https://cdn.example/b.jpg' },
    ],
  }];
  const found = discoveryCandidates(payloads);
  assert.equal(found.length, 1);
  assert.equal(found[0].image, 'https://cdn.example/a.jpg');
});

test('missing images and mocked worker failure leave non-style results; style filters fail closed', async () => {
  const missing = await classifyProduct(garment('m', { image: null }));
  assert.equal(missing.styleClassification.status, 'missing_image');
  const down = await classifyProduct(garment('d'));
  assert.equal(down.styleClassification.status, 'unavailable');
  const profile = { preferences: prefs(), swipes: [] };
  assert.equal(rankProducts([down], profile, [], [], {}).length, 1);
  assert.equal(rankProducts([down], profile, [], [], { style: 'earthy' }).length, 0);
});

test('reclassify after model-version or image change', () => {
  const p = withRanks('x', [{ style: 'earthy', score: 0.4 }, { style: 'y2k', score: 0.2 }, { style: 'grunge', score: 0.1 }], {
    styleImageHash: 'abc',
    image: 'https://cdn.example/old.jpg',
  });
  p.styleClassification.imageHash = 'abc';
  p.styleClassification.sourceImage = 'https://cdn.example/old.jpg';
  process.env.STYLE_MODEL_VERSION = 'google/siglip2-base-patch16-224+trained_classifier';
  assert.equal(shouldClassify(p).run, false);
  assert.equal(shouldClassify({ ...p, image: 'https://cdn.example/new.jpg', styleImageHash: 'abc' }).run, true);
  process.env.STYLE_MODEL_VERSION = 'google/siglip2-base-patch16-224+trained_classifier-v2';
  assert.equal(shouldClassify(p).run, true);
  delete process.env.STYLE_MODEL_VERSION;
});

test('aesthetic source config yields search hints for streetwear/earthy/clean_girl', () => {
  assert.ok(aestheticQueries('streetwear').some(q => /streetwear|oversized/i.test(q.q)));
  assert.ok(aestheticQueries('earthy').some(q => /earthy|linen|olive/i.test(q.q)));
  assert.ok(aestheticQueries('clean_girl').some(q => /clean girl|neutral|athleisure/i.test(q.q)));
  assert.ok(aestheticQueries('grunge').some(q => /Minga|grunge/i.test(q.q)));
});

test('preference migration: clear maps apply; ambiguous wait for confirmation', () => {
  const plan = preferenceMigrationPlan(['90s chic', 'clean girl', 'whimsy', 'alternative', 'sporty', 'y2k']);
  assert.ok(plan.clear.some(x => x.to === '90s_minimalism') || plan.already.some(x => x.to === '90s_minimalism'));
  assert.ok(plan.already.some(x => x.to === 'clean_girl') || plan.clear.some(x => x.to === 'clean_girl'));
  assert.ok(plan.ambiguous.some(x => x.from === 'whimsy' && x.proposed === 'coquette'));
  assert.ok(plan.ambiguous.some(x => x.from === 'alternative' && x.proposed === 'grunge'));
  assert.ok(plan.ambiguous.some(x => x.from === 'sporty'));
  assert.equal(plan.awaitingConfirmation, true);
  assert.ok(AMBIGUOUS_PREF_MAP.whimsy);
  const migrated = migrateClearPreferences(['90s chic', 'whimsy', 'y2k']);
  assert.ok(migrated.styles.includes('90s_minimalism'));
  assert.ok(migrated.styles.includes('y2k'));
  assert.ok(migrated.styles.includes('whimsy'), 'ambiguous whimsy kept until confirmed');
});
