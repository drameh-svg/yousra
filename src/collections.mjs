// Public collections. A shopper's collections live in her private library record; when she makes one public,
// a copy is published as kind='public_collection' (owner = her id) and kept in sync on every change.
import { store } from './store.mjs';
import { HttpError, now, text } from './util.mjs';

export const shareName = value => text(value, 40) || 'A Yousra shopper';

export async function syncPublic(ownerId, collection) {
  if (!collection || collection.system || !collection.public) return store.remove('public_collection', collection?.id, ownerId);
  return store.put('public_collection', collection.id, {
    id: collection.id, name: collection.name, ownerName: shareName(collection.ownerName),
    productIds: collection.productIds.slice(0, 500), updatedAt: now(),
  }, ownerId);
}
export const unpublish = (ownerId, collectionId) => store.remove('public_collection', collectionId, ownerId);

// Newest first; empty collections are hidden. Covers are the first few pieces that still exist.
export async function listPublic(catalogById, limit = 60) {
  const all = (await store.list('public_collection', undefined, 200)).filter(c => c.productIds?.length);
  return all.slice(0, limit).map(c => {
    const items = c.productIds.map(id => catalogById.get(id)).filter(Boolean);
    return { id: c.id, name: c.name, ownerName: c.ownerName, count: items.length, updatedAt: c.updatedAt, cover: items.slice(0, 4) };
  }).filter(c => c.count);
}
export async function getPublic(id, catalogById) {
  const c = await store.get('public_collection', id);
  if (!c) throw new HttpError(404, 'This collection is private or no longer exists');
  return { collection: { id: c.id, name: c.name, ownerName: c.ownerName, updatedAt: c.updatedAt }, items: c.productIds.map(x => catalogById.get(x)).filter(Boolean) };
}
