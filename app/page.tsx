"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { products, aesthetics, type Aesthetic } from "@/lib/products";
import { readPrefs } from "@/lib/use-prefs";

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Aesthetic | null>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  useEffect(() => {
    setShowOnboardingBanner(!readPrefs().onboardingDone);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesAesthetic = active ? p.aesthetic === active : true;
      const q = query.toLowerCase();
      const matchesQuery = q
        ? p.title.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q) ||
          p.aesthetic.toLowerCase().includes(q)
        : true;
      return matchesAesthetic && matchesQuery;
    });
  }, [query, active]);

  const clearAll = () => { setQuery(""); setActive(null); };
  const hasFilters = !!query || !!active;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div style={{ background: "#352D27", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <p style={{ fontSize: "13px", color: "rgba(245,245,245,0.85)", margin: 0 }}>Personalise your feed — tell Yousra what you love.</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/onboarding" style={{ background: "#DCFCFF", color: "#352D27", fontSize: "12px", fontWeight: 700, padding: "6px 16px", borderRadius: "999px", textDecoration: "none" }}>
              Get started
            </Link>
            <button onClick={() => setShowOnboardingBanner(false)} style={{ background: "none", border: "none", color: "rgba(245,245,245,0.6)", cursor: "pointer", fontSize: "12px" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "40px 20px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,52px)", color: "#352D27", lineHeight: 1.1, marginBottom: "10px" }}>
          Find sutra with Yousra.
        </h1>
        <p style={{ fontSize: "14px", color: "#637180", maxWidth: "380px", margin: "0 auto 28px", lineHeight: 1.65 }}>
          Modest fashion that feels like you. Scroll your feed or search for a specific piece.
        </p>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: "520px", margin: "0 auto" }}>
          <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#637180", pointerEvents: "none" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "black maxi skirt" or "cream blazer"'
            style={{ width: "100%", height: "44px", paddingLeft: "40px", paddingRight: "40px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "999px", background: "#fff", fontSize: "13px", color: "#352D27", outline: "none" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#637180", display: "flex", alignItems: "center" }}>
              <X size={13} />
            </button>
          )}
        </div>
      </section>

      {/* Aesthetic filters */}
      <section style={{ padding: "0 20px 16px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        {aesthetics.map((a) => (
          <button
            key={a}
            onClick={() => setActive(active === a ? null : a)}
            style={{
              fontSize: "13px", padding: "7px 18px", borderRadius: "999px", border: "1px solid",
              borderColor: active === a ? "#352D27" : "rgba(53,45,39,0.2)",
              background: active === a ? "#352D27" : "#fff",
              color: active === a ? "#F5F5F5" : "#352D27",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {a}
          </button>
        ))}
        {hasFilters && (
          <button onClick={clearAll} style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "999px", border: "1px solid rgba(53,45,39,0.2)", background: "transparent", color: "#637180", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <X size={11} /> Clear
          </button>
        )}
      </section>

      {/* Results count */}
      <div style={{ padding: "0 20px 10px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#637180" }}>
          {filtered.length === products.length ? `${products.length} pieces` : `${filtered.length} of ${products.length} pieces`}
          {active ? ` · ${active}` : ""}
          {query ? ` · "${query}"` : ""}
        </p>
      </div>

      {/* Masonry feed */}
      <section style={{ padding: "0 12px 60px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#637180", fontSize: "14px", marginBottom: "12px" }}>Nothing matched — try a different search or remove the aesthetic filter.</p>
            <button onClick={clearAll} style={{ fontSize: "13px", color: "#352D27", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Clear all filters</button>
          </div>
        ) : (
          <div className="masonry">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
