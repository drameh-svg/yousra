#!/usr/bin/env node
/**
 * Enqueue / run aesthetic classification backfill against stored products.
 *
 *   node --env-file-if-exists=.env scripts/style-backfill.mjs
 *   node --env-file-if-exists=.env scripts/style-backfill.mjs --force --limit 50
 *
 * Requires STYLE_WORKER_URL + STYLE_WORKER_SECRET. Does not invent a classifier.
 */
import { store } from '../src/store.mjs';
import { classifyAndStore, shouldClassify, styleWorkerConfigured } from '../src/style-classifier.mjs';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 100;

if (!styleWorkerConfigured()) {
  console.error(JSON.stringify({
    ok: false,
    error: 'STYLE_WORKER_URL and STYLE_WORKER_SECRET required. Deliver style_classifier_and_config.joblib to the worker via STYLE_CLASSIFIER_PATH.',
  }));
  process.exit(2);
}

const products = await store.list('product', undefined, 5000);
const todo = products.filter(p => force || shouldClassify(p, { force }).run).slice(0, Math.max(1, limit));
let ok = 0, err = 0, skipped = 0;
for (const p of todo) {
  const updated = await classifyAndStore(p.id, { force });
  const status = updated?.styleClassification?.status;
  if (status === 'ok') ok++;
  else if (status === 'skipped') skipped++;
  else err++;
  console.log(JSON.stringify({ id: p.id, status, modelVersion: updated?.styleClassification?.modelVersion }));
}
console.log(JSON.stringify({ done: true, ok, err, skipped, attempted: todo.length }));
