"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products, aesthetics, type Aesthetic } from "@/lib/products";

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Aesthetic | null>(null);

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

  const clearAll = () => {
    setQuery("");
    setActive(null);
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Search + filters bar */}
      <section
        style={{
          position: "sticky",
          top: "52px",
          zIndex: 30,
          background: "rgba(250,248,245,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e7e5e4",
          padding: "10px 16px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Search input */}
          <div style={{ position: "relative", maxWidth: "520px", margin: "0 auto 10px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#a8a29e",
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
                paddingLeft: "34px",
                paddingRight: "36px",
                border: "1px solid #e7e5e4",
                borderRadius: "999px",
                background: "#fff",
                fontSize: "12px",
                color: "#1a1816",
                outline: "none",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#a8a29e",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Aesthetic filters */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {aesthetics.map((a) => (
              <button
                key={a}
                onClick={() => setActive(active === a ? null : a)}
                style={{
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  border: "1px solid",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: active === a ? "#1a1816" : "#fff",
                  color: active === a ? "#fff" : "#57534e",
                  borderColor: active === a ? "#1a1816" : "#d6d3d1",
                  fontWeight: active === a ? 500 : 400,
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feed */}
      <section style={{ maxWidth: "1400px", margin: "0 auto", padding: "12px 12px 32px" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 16px",
              color: "#a8a29e",
            }}
          >
            <p style={{ fontSize: "14px", marginBottom: "12px" }}>
              Nothing quite right yet? Try removing a filter.
            </p>
            <button
              onClick={clearAll}
              style={{
                fontSize: "12px",
                color: "#57534e",
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
          <p
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#d6d3d1",
              marginTop: "32px",
            }}
          >
            See something you love? Tap to view the details and shop from the store.
          </p>
        )}
      </section>
    </main>
  );
}
