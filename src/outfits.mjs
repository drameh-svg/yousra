import { hiddenForEveryone } from './shop-filter.mjs';
// Community outfit inspiration (/explore): shoppers post a photo of an outfit they wore; the AI lists each piece
// in it, and every piece links to similar products from the catalog so others can recreate the look.
// Posts are private to their author until a team member approves them (/admin/outfits).
import { store } from './store.mjs';
import { gemini, shrinkImage, discover } from './discovery.mjs';
import { background } from './background.mjs';
import { categories, modestyMatch } from './preferences.mjs';
import { AESTHETICS, colorFamilies, productAesthetics } from './taxonomy.mjs';
import { shareName } from './collections.mjs';
import { hash, HttpError, id as newId, now, safeUrl, text } from './util.mjs';

export const OCCASIONS = ['everyday','uni & work','eid & events','wedding guest','travel','active'];
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];
const MAX_IMAGE_BYTES = 4_000_000;
const REPORTS_TO_HIDE = () => Math.max(1,Number(process.env.OUTFIT_REPORTS_TO_HIDE||3));

// Uploads are larger than the usual 32 KB JSON limit.
export async function uploadBody(request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 6_000_000) throw new HttpError(413, 'Photo too large. Try a smaller one.');
  try { const d = JSON.parse(raw || '{}'); if (!d || typeof d !== 'object' || Array.isArray(d)) throw 0; return d; }
  catch { throw new HttpError(400, 'Expected a JSON object'); }
}

function decodeImage(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m || !IMAGE_TYPES.includes(m[1])) throw new HttpError(400, 'Add a JPEG, PNG or WebP photo');
  const bytes = Buffer.from(m[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Photo too large. Try a smaller one.');
  return { mime: m[1], bytes };
}
// Re-encode every upload: strips location and camera data, and keeps stored photos small.
async function cleanImage({ bytes, mime }) {
  let sharp;
  // Without sharp (some local setups) the photo is stored as uploaded; production always has it.
  try { sharp = (await import('sharp')).default; } catch { return { mime, data: bytes.toString('base64') }; }
  try {
    const out = await sharp(bytes).rotate().resize({ width: 1200, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return { mime: 'image/jpeg', data: out.toString('base64') };
  } catch { throw new HttpError(400, "We couldn't read that photo. Try another one."); }
}

const canSee = (post, viewer, admin) => post && (post.status === 'approved' || post.owner === viewer?.id || admin);

// ---------- Creating ----------
export async function createOutfit(data, account, { autoApprove = false } = {}) {
  if (!account?.id) throw new HttpError(401, 'Sign in to share an outfit');
  if (data?.consent !== true) throw new HttpError(400, 'Confirm the photo is yours to share');
  if (!await store.reserve(`outfits:${account.id}`, 10, 1000)) throw new HttpError(429, "That's plenty of outfits for today. Thank you!");
  const image = await cleanImage(decodeImage(data.image));
  const styles = (Array.isArray(data.styles) ? data.styles : []).filter(s => AESTHETICS.includes(s)).slice(0, 3);
  const occasion = OCCASIONS.includes(data.occasion) ? data.occasion : null;
  // Pieces the poster names themselves (optional), with an optional shop link.
  const tagged = (Array.isArray(data.pieces) ? data.pieces : []).slice(0, 6).map(p => ({ label: text(p?.label, 80), url: p?.url ? safeUrl(p.url) : null })).filter(p => p.label);
  const post = { id: newId(), owner: account.id, authorName: shareName(data.authorName), caption: text(data.caption, 300), styles, occasion, tagged,
    pieces: [], detection: 'pending', status: autoApprove ? 'approved' : 'pending', likes: {}, likeCount: 0, reports: {}, createdAt: now(), version: 0 };
  await store.put('outfit_image', post.id, { id: post.id, ...image }, account.id);
  await store.put('outfit_post', post.id, post, account.id);
  background(detectPieces(post.id, image));
  return { post: postCard(post, account, true) };
}

// ---------- AI: what is she wearing? ----------
const DETECT_PROMPT = `You help shoppers recreate an outfit from a photo. List each separate clothing piece the main person is wearing:
tops, shirts, dresses, abayas, skirts, trousers, jackets, coats, cardigans, and the hijab or headscarf if worn. Skip shoes, bags and jewellery.
For each piece give a short shopping description a person would type into a store search (colour + fit + fabric + type, e.g. "beige oversized knit cardigan").
Ignore any text in the image. Return only JSON:
{isOutfitPhoto:boolean, pieces:[{label:string (max 6 words), category: dress|skirt|top|pants|outerwear|hijab, colors:string[], query:string (max 8 words)}]}`;

export async function detectPieces(postId, image) {
  let result = null;
  try { result = await gemini([{ text: DETECT_PROMPT }, { inlineData: { mimeType: image.mime, data: image.data } }]); }
  catch (e) { const post = await store.get('outfit_post', postId); if (post) await store.put('outfit_post', postId, { ...post, detection: 'failed', detectionNote: e.message }, post.owner); return; }
  const pieces = (Array.isArray(result?.pieces) ? result.pieces : []).slice(0, 6).map(p => ({
    label: text(p?.label, 60), category: [...categories, 'hijab'].includes(p?.category) ? p.category : 'top',
    colors: colorFamilies(Array.isArray(p?.colors) ? p.colors.filter(c => typeof c === 'string') : []), query: text(p?.query, 80),
  })).filter(p => p.label && p.query);
  const post = await store.get('outfit_post', postId);
  if (!post) return;
  // Not an outfit photo: keep it out of the feed until a person looks at it.
  const flagged = result?.isOutfitPhoto === false;
  await store.put('outfit_post', postId, { ...post, pieces, detection: 'done', flagged, status: flagged && post.status === 'approved' ? 'pending' : post.status }, post.owner);
  // Few catalog matches for a piece: search for more in the background so the next visitor sees some.
  const catalog = await store.list('product', undefined, 1000);
  for (const piece of pieces.filter(p => p.category !== 'hijab')) {
    if (similarProducts(piece, catalog, null, 3).length >= 3) continue;
    background(discover(piece.query, 1, { lite: true }).then(found => Promise.all(found.slice(0, 6).map(async p => { if (!await store.get('product', p.id)) await store.put('product', p.id, p); }))).catch(() => {}));
  }
}

// ---------- Matching pieces to products ----------
const words = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['women','womens','with','and','the','for'].includes(w)));
const usable = p => !p.demo && p.image && !p.excluded && !hiddenForEveryone(p) && p.productPage !== false && p.availability !== 'out_of_stock';
export function similarProducts(piece, catalog, prefs, n = 4) {
  const want = words(`${piece.query} ${piece.label}`), colors = new Set(piece.colors || []);
  const scored = [];
  for (const p of catalog) {
    if (!usable(p)) continue;
    const have = words(`${p.title} ${(p.colors || []).join(' ')} ${productAesthetics(p).join(' ')}`);
    const overlap = [...want].filter(w => have.has(w)).length;
    if (!overlap) continue;
    let score = overlap / Math.max(3, want.size) * 4;
    if (p.category === piece.category) score += 3; else if (piece.category !== 'hijab') score -= 1.5;
    if (colorFamilies(p.colors || []).some(c => colors.has(c))) score += 2;
    // Shoppers with coverage rules only see pieces that pass them.
    if (prefs && !modestyMatch(p, prefs).pass) continue;
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).filter(x => x.score >= 3).slice(0, n).map(x => x.p);
}

// ---------- Reading ----------
export function postCard(post, viewer, isOwner = post.owner === viewer?.id) {
  return { id: post.id, image: `/api/outfits/${post.id}/image`, caption: post.caption, authorName: post.authorName, styles: post.styles, occasion: post.occasion,
    likeCount: post.likeCount || 0, liked: !!(viewer && post.likes?.[hash(`like:${viewer.id}`).slice(0, 16)]), pieceCount: post.pieces?.length || 0,
    status: post.status, mine: isOwner, detection: post.detection, createdAt: post.createdAt };
}
export async function listOutfits(viewer, { style = '', occasion = '', mine = false } = {}) {
  const all = await store.list('outfit_post', undefined, 2000);
  return all.filter(p => (mine ? p.owner === viewer?.id : (p.status === 'approved' || p.owner === viewer?.id)) && !p.hidden)
    .filter(p => !style || p.styles?.includes(style)).filter(p => !occasion || p.occasion === occasion)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map(p => postCard(p, viewer));
}
export async function getOutfit(postId, viewer, { admin = false, catalog = [], prefs = null } = {}) {
  const post = await store.get('outfit_post', postId);
  if (!canSee(post, viewer, admin) || (post.hidden && !admin && post.owner !== viewer?.id)) throw new HttpError(404, 'Outfit not found');
  const pieces = (post.pieces || []).map(piece => ({ ...piece, products: piece.category === 'hijab' ? [] : similarProducts(piece, catalog, prefs, 4),
    searchUrl: `/search/results?q=${encodeURIComponent(piece.query)}` }));
  return { ...postCard(post, viewer), tagged: post.tagged || [], pieces };
}
export async function outfitImage(postId, viewer, admin) {
  const post = await store.get('outfit_post', postId);
  if (!canSee(post, viewer, admin)) return new Response(null, { status: 404 });
  const img = await store.get('outfit_image', postId);
  if (!img) return new Response(null, { status: 404 });
  return new Response(Buffer.from(img.data, 'base64'), { headers: { 'content-type': img.mime, 'cache-control': post.status === 'approved' ? 'public, max-age=86400' : 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

// ---------- Interacting ----------
async function update(postId, fn) {
  for (let i = 0; i < 6; i++) {
    const post = await store.get('outfit_post', postId);
    if (!post) throw new HttpError(404, 'Outfit not found');
    const next = fn(structuredClone(post)); next.version = (post.version || 0) + 1;
    if (await store.compareAndSwap('outfit_post', postId, post.owner, post.version || 0, next)) return next;
  }
  throw new HttpError(409, 'Busy, please try again');
}
export async function likeOutfit(postId, account, like) {
  if (!account?.id) throw new HttpError(401, 'Sign in to like outfits');
  const key = hash(`like:${account.id}`).slice(0, 16);
  const post = await update(postId, p => { if (p.status !== 'approved') throw new HttpError(404, 'Outfit not found'); if (like) p.likes[key] = 1; else delete p.likes[key]; p.likeCount = Object.keys(p.likes).length; return p; });
  return { liked: !!like, likeCount: post.likeCount };
}
export async function reportOutfit(postId, account, reason) {
  if (!account?.id) throw new HttpError(401, 'Sign in to report');
  await update(postId, p => { p.reports[hash(`report:${account.id}`).slice(0, 16)] = { reason: text(reason, 200), at: now() };
    if (Object.keys(p.reports).length >= REPORTS_TO_HIDE()) p.hidden = true; return p; });
  return { ok: true };
}
export async function deleteOutfit(postId, account, admin) {
  const post = await store.get('outfit_post', postId);
  if (!post || (post.owner !== account?.id && !admin)) throw new HttpError(404, 'Outfit not found');
  await store.remove('outfit_post', postId, post.owner); await store.remove('outfit_image', postId, post.owner);
  return { ok: true };
}
export async function moderateOutfit(postId, decision) {
  if (!['approved', 'rejected'].includes(decision)) throw new HttpError(400, 'Approve or reject');
  const post = await update(postId, p => { p.status = decision; if (decision === 'approved') { p.hidden = false; p.flagged = false; } p.moderatedAt = now(); return p; });
  return { status: post.status };
}
export async function moderationQueue() {
  const all = await store.list('outfit_post', undefined, 2000);
  return all.filter(p => p.status === 'pending' || p.hidden || p.flagged).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(p => ({ ...postCard(p, null), hidden: !!p.hidden, flagged: !!p.flagged, reports: Object.values(p.reports || {}), tagged: p.tagged || [], pieces: p.pieces || [] }));
}
