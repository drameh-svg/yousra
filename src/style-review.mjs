// Human review of classifier labels on real catalog product images (not Colab board metrics).
import { CLASSIFIER_STYLES } from './taxonomy.mjs';
import { store } from './store.mjs';
import { HttpError, id, now, text } from './util.mjs';

export async function styleReviewQueue({ limit = 12 } = {}) {
  const products = await store.list('product', undefined, 2000);
  const labels = await store.list('style_label', undefined, 5000);
  const labeled = new Set(labels.map(l => l.productId));
  const candidates = products
    .filter(p => p.image && p.styleClassification?.status === 'ok' && !labeled.has(p.id) && !p.demo)
    .sort((a, b) => String(b.styleClassification?.classifiedAt || '').localeCompare(String(a.styleClassification?.classifiedAt || '')))
    .slice(0, Math.max(1, Math.min(48, Number(limit) || 12)));
  return {
    items: candidates.map(p => ({
      id: p.id,
      title: p.title,
      image: p.image,
      store: p.store,
      ranked: p.styleClassification?.ranked || [],
      modelVersion: p.styleClassification?.modelVersion,
      classifiedAt: p.styleClassification?.classifiedAt,
    })),
    styles: CLASSIFIER_STYLES,
    note: 'Confirm or correct the top style for retailer photos. Colab board accuracy is not retailer accuracy.',
  };
}

export async function submitStyleLabel(body, user) {
  const productId = text(body?.productId, 80);
  const style = text(body?.style, 40);
  if (!productId || !CLASSIFIER_STYLES.includes(style)) throw new HttpError(400, 'productId and a classifier style are required');
  const product = await store.get('product', productId);
  if (!product) throw new HttpError(404, 'Product not found');
  const agreed = product.styleClassification?.ranked?.[0]?.style === style;
  const row = {
    id: id(),
    productId,
    style,
    agreed,
    predicted: product.styleClassification?.ranked || [],
    modelVersion: product.styleClassification?.modelVersion || null,
    image: product.image,
    reviewer: user.id,
    at: now(),
  };
  await store.put('style_label', `${productId}:${user.id}`, row, user.id);
  return row;
}

export function styleLabelSummary(labels) {
  const total = labels.length;
  const agreed = labels.filter(l => l.agreed).length;
  return { total, agreed, agreementPct: total ? Math.round((agreed / total) * 1000) / 10 : null, byStyle: Object.fromEntries(CLASSIFIER_STYLES.map(s => [s, labels.filter(l => l.style === s).length])) };
}
