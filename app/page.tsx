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

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Onboarding banner ── */}
      {showOnboardingBanner && (
        <div style={{
          background: "#352D27", padding: "12px 20px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap",
        }}>
          <p style={{ fontSize: "13px", color: "rgba(245,245,245,0.85)", margin: 0 }}>
            Personalise your feed — tell Yousra what you love.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/onboarding"
              style={{ background: "#DCFCFF", color: "#352D27", fontSize: "12px", fontWeight: 700, padding: "6px 16px", borderRadius: "999px", textDecoration: "none" }}>
              Get started
            </Link>
            <button onClick={() => setShowOnboardingBanner(false)}
              style={{ background: "none", border: "none", color: "rgba(245,245,245,0.6)", cursor: "pointer", fontSize: "12px" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Hero tagline ── */}
      <div style={{ textAlign: "center", padding: "32px 16px 0" }}>
        <h1
          style={{
            fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
            fontWeight: 400,
            fontSize: "clamp(28px, 5vw, 46px)",
            color: "#352D27",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            marginBottom: "6px",
          }}
        >
          Find sutra with Yousra.
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "#637180",
            maxWidth: "380px",
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          Modest fashion that feels like you — search for something specific, or scroll through
          pieces picked for your preferences.
        </p>
      </div>

      {/* ── Sticky search + filter bar ── */}
      <section
        style={{
          position: "sticky",
          top: "52px",
          zIndex: 30,
          background: "rgba(245,245,245,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(53,45,39,0.08)",
          padding: "10px 16px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: "520px", margin: "0 auto 10px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#637180",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              placeholder='Try "black maxi skirt" or "wedding guest dress"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                paddingLeft: "36px",
                paddingRight: "36px",
                border: "1px solid rgba(53,45,39,0.15)",
                borderRadius: "999px",
                background: "#fff",
                fontSize: "12px",
                color: "#352D27",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#637180")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(53,45,39,0.15)")}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  right: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#637180",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Aesthetic filter pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
            {aesthetics.map((a) => {
              const isActive = active === a;
              return (
                <button
                  key={a}
                  onClick={() => setActive(isActive ? null : a)}
                  style={{
                    fontSize: "11px",
                    padding: "4px 13px",
                    borderRadius: "999px",
                    border: "1px solid",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: isActive ? "#DCFCFF" : "#fff",
                    color: isActive ? "#352D27" : "#637180",
                    borderColor: isActive ? "#637180" : "rgba(53,45,39,0.15)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feed ── */}
      <section style={{ maxWidth: "1400px", margin: "0 auto", padding: "12px 12px 40px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 16px", color: "#637180" }}>
            <p style={{ fontSize: "14px", marginBottom: "12px" }}>
              Nothing quite right yet? Try removing a filter.
            </p>
            <button
              onClick={() => { setActive(null); setQuery(""); }}
              style={{
                fontSize: "12px",
                color: "#352D27",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="masonry">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(99,113,128,0.5)", marginTop: "32px" }}>
            See something you love? Tap to view the details and shop from the store.
          </p>
        )}
      </section>
    </main>
  );
}
