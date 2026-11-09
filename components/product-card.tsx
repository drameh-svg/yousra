"use client";

import { useState } from "react";
import Image from "next/image";
import { Bookmark, ExternalLink } from "lucide-react";
import type { Product } from "@/lib/products";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-stone-100">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-stone-50 overflow-hidden">
        {!imgError ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
            <span className="text-xs text-stone-400 text-center px-4">{product.title}</span>
          </div>
        )}

        {/* Hover overlay — visit seller */}
        <a
          href={product.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100"
          aria-label={`Shop at ${product.store}`}
        >
          <span className="inline-flex items-center gap-1.5 bg-white text-stone-900 text-xs font-medium px-4 py-2 rounded-full shadow">
            Shop at {product.store}
            <ExternalLink size={11} />
          </span>
        </a>

        {/* Save button */}
        <button
          onClick={() => setSaved((s) => !s)}
          aria-label={saved ? "Unsave" : "Save"}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
        >
          <Bookmark
            size={14}
            className={saved ? "fill-stone-900 text-stone-900" : "text-stone-400"}
          />
        </button>

        {/* Aesthetic badge */}
        <span className="absolute top-3 left-3 text-[10px] font-medium bg-white/80 backdrop-blur-sm text-stone-600 px-2 py-0.5 rounded-full border border-stone-100">
          {product.aesthetic}
        </span>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium text-stone-800 leading-snug line-clamp-1">
          {product.title}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-stone-400">{product.store}</span>
          <span className="text-xs font-semibold text-stone-900">{product.price}</span>
        </div>
      </div>
    </div>
  );
}
