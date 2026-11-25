import test from 'node:test';
import assert from 'node:assert/strict';
const { hiddenReason, isMenswear } = await import('../src/shop-filter.mjs');
const { cropBox } = await import('../src/media.mjs');
const { focusFrom } = await import('../src/discovery.mjs');
const { searchBarQuery, coverageWord, DEFAULT_FEED_BRANDS } = await import('../src/queries.mjs');

const dress = (title, attributes = {}, extra = {}) => ({ id: 'x', title, category: 'dress', confidence: 0.8, attributes, ...extra });
test('party, sleeveless and revealing dresses are hidden; covered dresses stay', () => {
  assert.equal(hiddenReason(dress('Satin midi dress', { sleeves: 'sleeveless' })), 'sleeveless dress');
  assert.equal(hiddenReason(dress('ADYCE Elegant One-Shoulder Fitted Waist High Slit Bridesmaid Dress')), 'revealing');
  assert.equal(hiddenReason(dress('Tarah Low Back Maxi Dress', { sleeves: 'long', length: 'maxi' })), 'revealing');
  assert.equal(hiddenReason(dress('Sequin cocktail dress', { sleeves: 'short', length: 'knee' })), 'party dress');
  assert.equal(hiddenReason(dress('Long sleeve party maxi dress', { sleeves: 'long', length: 'maxi' })), null, 'covered party dresses stay');
  assert.equal(hiddenReason(dress('Linen maxi dress', { sleeves: 'long', length: 'maxi' }, { revealing: true })), 'revealing');
  assert.equal(hiddenReason(dress('Linen maxi dress', { sleeves: 'long', length: 'maxi' })), null);
  assert.equal(hiddenReason(dress('Rania Linen Maxi Dress', { sleeves: 'long', length: 'maxi' }, { humanModesty: { count: 1, level: 'not_modest', counts: { not_modest: 1 } } })), 'shoppers rated it not modest');
  assert.equal(hiddenReason({ title: 'Sleeveless linen top', category: 'top', attributes: { sleeves: 'sleeveless' } }), null, 'tops follow each shopper\'s own rules');
});
test('menswear is never shown', () => {
  assert.ok(isMenswear({ title: "UNIQLO Men's Soft Brushed T-Shirt | Long Sleeve" }));
  assert.ok(isMenswear({ title: 'Zara - Cable Knit Sweater - Ecru - M - Man' }));
  assert.ok(!isMenswear({ title: "Women's Rayon Blouse | UNIQLO US" }));
  assert.ok(!isMenswear({ title: 'Zara - Soft Knit Sweater - Gray Marl - S - Woman' }));
});
test('the main photo zooms onto the sale garment', () => {
  const focus = focusFrom([500, 300, 1000, 700]); // a skirt in the lower half of the photo
  assert.deepEqual(focus, { x: 0.3, y: 0.5, w: 0.4, h: 0.5 });
  const box = cropBox(focus, 1000, 1333);
  assert.ok(box.top > 500 && box.top + box.height <= 1333 && box.left >= 0 && box.left + box.width <= 1000);
  assert.ok(Math.abs(box.width / box.height - 0.75) < 0.02, 'keeps the 3:4 card shape');
  assert.equal(cropBox(focusFrom([20, 20, 990, 980]), 1000, 1333), null, 'no crop when the piece fills the photo');
  assert.equal(focusFrom(null), null); assert.equal(focusFrom([1, 2, 3]), null);
});
test('search bar keeps her words and adds only what is missing', () => {
  const rules = { skirt: { sleeves: 'long', fit: 'loose' }, dress: { sleeves: 'long' } };
  assert.equal(searchBarQuery('black maxi skirt', { category: 'skirt', color: 'black' }, { rules, styles: ['earthy'] }), 'black maxi skirt loose women');
  assert.equal(searchBarQuery('eid dress', {}, { rules }), 'eid dress long sleeve women');
  assert.equal(searchBarQuery('something cute', {}, { rules }), 'something cute women clothing');
  assert.equal(coverageWord('skirt', { sleeves: 'long' }), '', 'no sleeve words on skirts');
  assert.ok(DEFAULT_FEED_BRANDS.includes('Uniqlo') && DEFAULT_FEED_BRANDS.includes('Amazon') && !DEFAULT_FEED_BRANDS.includes('Next'));
});
