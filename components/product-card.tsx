'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, ExternalLink, Heart, X } from 'lucide-react';
import { useProductActions } from '@/lib/use-product-actions';

// Minimal interface accepted by this card — compatible with both the local
// static Product type and the API-derived CatalogProduct.
export interface CardProduct {
  id: string;
  title: string;
  store: string;
  price: string;
  image: string;
  aesthetic: string;
  storeUrl: string;
  pinUrl?: string;
  raw?: { demo?: boolean; match?: { uncertain?: boolean } | null; affiliate?: boolean };
}

export function ProductCard({ product }: { product: CardProduct }) {
  const {saved,liked,disliked,toggleSaved,react,loading} = useProductActions(product.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  const detailPath=product.raw?`/products/${product.id}`:`/product/${product.id}`;
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await run(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not update this piece.'); } finally { setBusy(false); }
  }

  return (
    <div data-product={product.id} className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-stone-100">
      <div className="relative aspect-[3/4] bg-stone-50 overflow-hidden">
        <Link href={detailPath} className="absolute inset-0" aria-label={`View ${product.title}`}>
          {product.image && !imgError
            ? <Image src={product.image} alt={product.title} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImgError(true)} unoptimized />
            : <div className="absolute inset-0 flex items-center justify-center bg-stone-100"><span className="text-xs text-stone-400 text-center px-4">Photo unavailable from retailer</span></div>}
          <span className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-300" />
        </Link>
        <a href={product.storeUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex max-w-[calc(100%-24px)] items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-medium text-stone-900 shadow sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label={`Shop at ${product.store}`} onClick={e => e.stopPropagation()}>
          <span className="truncate">Shop at {product.store}</span><ExternalLink size={11} className="shrink-0" />
        </a>
        <button disabled={busy||loading} onClick={e => { e.preventDefault(); void action(() => toggleSaved()); }} aria-label={saved ? 'Unsave' : 'Save'} aria-pressed={saved} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors disabled:opacity-50">
          <Bookmark size={14} className={saved ? 'fill-stone-900 text-stone-900' : 'text-stone-400'} />
        </button>
        <span className="absolute top-3 left-3 max-w-[calc(100%-60px)] truncate text-[10px] font-medium bg-white/80 backdrop-blur-sm text-stone-600 px-2 py-0.5 rounded-full border border-stone-100">{product.aesthetic}</span>
        <div className="absolute bottom-3 left-3 flex gap-1 sm:bottom-auto sm:top-12 sm:left-auto sm:right-3">
          <button disabled={busy||loading} aria-label={`${liked ? 'Unlike' : 'Like'} ${product.title}`} aria-pressed={liked} onClick={e => { e.preventDefault(); void action(() => react(liked ? 'clear' : 'like')); }} className="rounded-full bg-white/85 p-1.5 text-stone-500 shadow-sm hover:bg-white"><Heart size={13} className={liked ? 'fill-stone-900 text-stone-900' : ''} /></button>
          <button disabled={busy||loading} aria-label={`${disliked ? 'Undo dislike' : 'Dislike'} ${product.title}`} aria-pressed={disliked} onClick={e => { e.preventDefault(); void action(() => react(disliked ? 'clear' : 'dislike')); }} className="rounded-full bg-white/85 p-1.5 text-stone-500 shadow-sm hover:bg-white"><X size={13} /></button>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <Link href={detailPath} className="text-xs font-medium text-stone-800 leading-snug line-clamp-1">{product.title}</Link>
        <div className="flex flex-wrap items-center justify-between gap-1 mt-1">
          <span className="text-[11px] text-stone-400 truncate">{product.store}</span>
          <span className="text-xs font-semibold text-stone-900">{product.price}</span>
        </div>
        {product.raw?.demo ? <p className="mt-1 text-[10px] text-stone-400">Sample reference · not a current listing</p> : product.raw?.match?.uncertain ? <p className="mt-1 text-[10px] text-stone-400">Coverage unverified</p> : null}
        {product.raw?.affiliate ? <p className="mt-1 text-[10px] text-stone-400">Affiliate link</p> : null}
        {error ? <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
