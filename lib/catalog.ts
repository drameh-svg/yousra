import { money, pretty, type ApiProduct } from '@/lib/api';
import type { CardProduct } from '@/components/product-card';

// Alias kept for callers that import CatalogProduct by name.
export type CatalogProduct = CardProduct & { raw: ApiProduct };

export function toCard(p: ApiProduct): CatalogProduct {
  return {
    id: p.id,
    title: p.title,
    store: p.store,
    price: money(p),
    image: p.image || '',
    aesthetic: p.styles?.[0] ? pretty(p.styles[0]) : 'Style unverified',
    storeUrl: `${p.shopPath}?surface=card`,
    pinUrl: '',
    raw: p,
  };
}
