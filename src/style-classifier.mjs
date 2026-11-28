// Client + match policy for the SigLIP2 aesthetic worker.
// Classification runs at ingestion / background jobs — never as a blocking shopper-path requirement
// when the worker is down (status is stored; aesthetic gates simply fail closed for unclassified rows).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { background } from './background.mjs';
import { external } from './network.mjs';
import { store } from './store.mjs';
import { hash, now, text } from './util.mjs';
import { classifierStyle, isClassifierStyle } from './taxonomy.mjs';

const defaultsPath = join(dirname(fileURLToPath(import.meta.url)), '../services/style-classifier/config.defaults.json');
let defaults;
try { defaults = JSON.parse(readFileSync(defaultsPath, 'utf8')); } catch { defaults = { match: { max_rank: 3, min_score: 0.1, rank_weights: { 1: 1, 2: 0.55, 3: 0.25 }, score_scale: 60 } }; }

export const STYLE_MODEL_ID = defaults.model_id || 'google/siglip2-base-patch16-224';
export const CLASSIFIER_STYLES = defaults.styles || ['90s_minimalism','clean_girl','coquette','earthy','grunge','streetwear','y2k'];

export function styleMatchPolicy() {
  const m = defaults.match || {};
  return {
    maxRank: Math.max(1, Math.min(3, Number(process.env.STYLE_MATCH_MAX_RANK ?? m.max_rank ?? 3))),
    minScore: Math.max(0, Number(process.env.STYLE_MATCH_MIN_SCORE ?? m.min_score ?? 0.1)),
    weights: {
      1: Number(process.env.STYLE_RANK_WEIGHT_1 ?? m.rank_weights?.[1] ?? 1),
      2: Number(process.env.STYLE_RANK_WEIGHT_2 ?? m.rank_weights?.[2] ?? 0.55),
      3: Number(process.env.STYLE_RANK_WEIGHT_3 ?? m.rank_weights?.[3] ?? 0.25),
    },
    scoreScale: Number(process.env.STYLE_RANK_SCORE_SCALE ?? m.score_scale ?? 60),
  };
}

export function styleWorkerConfigured() {
  return !!(process.env.STYLE_WORKER_URL && process.env.STYLE_WORKER_SECRET);
}

export function expectedModelVersion() {
  return process.env.STYLE_MODEL_VERSION || `${STYLE_MODEL_ID}+trained_classifier`;
}

export function aestheticMatch(product, style) {
  const want = classifierStyle(style);
  if (!want || !isClassifierStyle(want)) return { pass: false, rank: null, score: 0, weight: 0, reason: 'not a classifier style' };
  const ranked = product?.styleClassification?.ranked;
  if (!Array.isArray(ranked) || !ranked.length) return { pass: false, rank: null, score: 0, weight: 0, reason: 'unclassified' };
  const policy = styleMatchPolicy();
  const hit = ranked.find(r => r.style === want && Number(r.rank) >= 1 && Number(r.rank) <= policy.maxRank && Number(r.score) >= policy.minScore);
  if (!hit) return { pass: false, rank: null, score: 0, weight: 0, reason: 'no aesthetic match' };
  const rank = Number(hit.rank);
  return { pass: true, rank, score: Number(hit.score), weight: policy.weights[rank] ?? 0, reason: `style rank ${rank}` };
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function fetchImageBytes(url) {
  const image = await external(url, { maxBytes: 3_000_000, accept: 'image/jpeg,image/webp,image/png;q=0.9,image/*;q=0.5' });
  if (image.status !== 200) throw new Error(`Image fetch ${image.status}`);
  return Buffer.from(image.bytes);
}

export async function callStyleWorker({ imageUrl, imageBase64, topK = 3 } = {}) {
  const base = process.env.STYLE_WORKER_URL;
  const secret = process.env.STYLE_WORKER_SECRET;
  if (!base || !secret) {
    const err = new Error('Style worker not configured');
    err.code = 'STYLE_UNAVAILABLE';
    throw err;
  }
  const response = await fetch(`${base.replace(/\/$/, '')}/v1/classify`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl || undefined, image_base64: imageBase64 || undefined, top_k: topK }),
    signal: AbortSignal.timeout(Number(process.env.STYLE_WORKER_TIMEOUT_MS || 45000)),
  });
  if (response.status === 401) throw Object.assign(new Error('Style worker unauthorized'), { code: 'STYLE_AUTH' });
  if (response.status === 503) throw Object.assign(new Error('Style worker unavailable'), { code: 'STYLE_UNAVAILABLE' });
  if (!response.ok) throw Object.assign(new Error(`Style worker ${response.status}`), { code: 'STYLE_ERROR', status: response.status });
  return response.json();
}

export function shouldClassify(product, { force = false } = {}) {
  if (!product?.image) return { run: false, status: 'missing_image' };
  if (force) return { run: true };
  const sc = product.styleClassification;
  if (!sc) return { run: true };
  if (sc.status === 'error' || sc.status === 'unavailable' || sc.status === 'missing_image') return { run: true };
  if (sc.modelVersion !== expectedModelVersion()) return { run: true };
  // Image URL or bytes identity changed → reclassify. Prefer sourceImage; fall back to stored hash pair.
  if (sc.sourceImage && sc.sourceImage !== product.image) return { run: true };
  if (!sc.sourceImage && sc.imageHash && product.styleImageHash && product.styleImageHash !== sc.imageHash) return { run: true };
  if (sc.status === 'ok' && Array.isArray(sc.ranked) && sc.ranked.length) return { run: false, status: 'ok' };
  return { run: true };
}

export async function classifyProduct(product, { force = false } = {}) {
  const gate = shouldClassify(product, { force });
  if (!product?.image) {
    return { ...product, styleClassification: { status: 'missing_image', modelVersion: expectedModelVersion(), ranked: [], classifiedAt: now(), error: null } };
  }
  if (!gate.run) return product;
  if (!styleWorkerConfigured()) {
    return { ...product, styleClassification: { status: 'unavailable', modelVersion: expectedModelVersion(), ranked: [], classifiedAt: now(), error: 'STYLE_WORKER_URL/SECRET unset' } };
  }
  try {
    let payload;
    try {
      payload = await callStyleWorker({ imageUrl: product.image });
    } catch (first) {
      // Retry once with bytes when URL fetch from the worker fails or for broken CDN auth.
      if (first.code === 'STYLE_UNAVAILABLE') throw first;
      const bytes = await fetchImageBytes(product.image);
      const digest = sha256(bytes);
      payload = await callStyleWorker({ imageBase64: bytes.toString('base64') });
      payload.imageHash = payload.imageHash || digest;
      payload.imageId = payload.imageId || digest;
    }
    const ranked = Array.isArray(payload.ranked) ? payload.ranked.slice(0, 3).map((r, i) => ({
      style: text(r.style, 40),
      score: Number(r.score) || 0,
      rank: Number(r.rank) || i + 1,
    })) : [];
    return {
      ...product,
      styleImageHash: payload.imageHash || null,
      styleClassification: {
        status: payload.status || 'ok',
        modelVersion: payload.modelVersion || expectedModelVersion(),
        imageId: payload.imageId || payload.imageHash || hash(product.image).slice(0, 32),
        imageHash: payload.imageHash || null,
        sourceImage: product.image,
        ranked,
        classifiedAt: payload.classifiedAt || now(),
        error: null,
      },
    };
  } catch (e) {
    const status = e.code === 'STYLE_UNAVAILABLE' ? 'unavailable' : 'error';
    return {
      ...product,
      styleClassification: {
        status,
        modelVersion: expectedModelVersion(),
        imageId: null,
        imageHash: null,
        sourceImage: product.image,
        ranked: [],
        classifiedAt: now(),
        error: text(e.message, 200),
      },
    };
  }
}

export async function classifyAndStore(productId, { force = false } = {}) {
  const product = await store.get('product', productId);
  if (!product) return null;
  const updated = await classifyProduct(product, { force });
  return store.put('product', productId, updated);
}

export function enqueueStyleClassification(productIds, { force = false } = {}) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return;
  background((async () => {
    for (const id of ids) {
      try { await classifyAndStore(id, { force }); } catch { /* non-blocking */ }
    }
  })());
}
