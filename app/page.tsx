"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";
import { products, aesthetics, type Aesthetic } from "@/lib/products";

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Aesthetic | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesAesthetic = active ? p.aesthetic === active : true;
      const matchesQuery = query
        ? p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.store.toLowerCase().includes(query.toLowerCase()) ||
          p.aesthetic.toLowerCase().includes(query.toLowerCase())
        : true;
      return matchesAesthetic && matchesQuery;
    });
  }, [query, active]);

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Hero */}
      <section className="pt-12 pb-8 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 mb-2">
          Find sutra with Yousra.
        </h1>
        <p className="text-sm sm:text-base text-stone-500 max-w-sm mx-auto mb-7">
          Modest fashion that feels like you. Search for something specific, or scroll through
          pieces picked for your preferences.
        </p>

        {/* Search bar */}
        <div className="relative max-w-xl mx-auto">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <Input
            type="search"
            placeholder='What are you looking for? Try "black maxi skirt"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-4 h-11 rounded-full bg-white border-stone-200 shadow-sm text-sm placeholder:text-stone-400 focus-visible:ring-stone-300"
          />
        </div>
      </section>

      {/* Aesthetic filters */}
      <section className="px-4 pb-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-3 font-medium">
            What&apos;s your vibe?
          </p>
          <div className="flex flex-wrap gap-2">
            {aesthetics.map((a) => (
              <button
                key={a}
                onClick={() => setActive(active === a ? null : a)}
                className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-200 ${
                  active === a
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-24 text-stone-400">
              <p className="text-sm">Nothing quite right yet?</p>
              <button
                onClick={() => {
                  setActive(null);
                  setQuery("");
                }}
                className="mt-3 text-sm underline underline-offset-2 hover:text-stone-600"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
              {filtered.map((product) => (
                <div key={product.id} className="break-inside-avoid">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* Tagline at end of feed */}
          {filtered.length > 0 && (
            <p className="text-center text-xs text-stone-300 mt-10">
              See something you love? Tap to view the details and shop from the store.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
