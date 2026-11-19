"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import {useRouter} from "next/navigation";

const SUGGESTED = ["Dresses", "Skirts", "Tops", "Pants", "Abayas"];

export default function SearchPage() {
  const router=useRouter();
  const [query, setQuery] = useState("");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(24px,3vw,36px)", color: "#352D27", marginBottom: "8px",
        }}>
          Know what you&apos;re looking for?
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "24px" }}>
          Search for a piece, color, style, or occasion.
        </p>

        {/* Search input */}
        {/* Icon, field and button share one flex row, so the button stays centred whatever the font. */}
        <form onSubmit={e=>{e.preventDefault();if(query.trim())router.push("/search/results?q="+encodeURIComponent(query.trim()))}}
          style={{ display: "flex", alignItems: "center", gap: "8px", height: "48px", padding: "0 6px 0 14px", marginBottom: "20px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "12px", background: "#fff" }}>
          <Search size={15} aria-hidden style={{ color: "#637180", flexShrink: 0 }} />
          <input
            aria-label="Search clothing"
            maxLength={300}
            autoFocus
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "black maxi skirt" or "wedding guest dress"'
            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, background: "transparent", fontSize: "14px", color: "#352D27", outline: "none", padding: 0 }}
          />
          <button type="submit" style={{ flexShrink: 0, height: "36px", padding: "0 16px", border: 0, borderRadius: "8px", background: "#352D27", color: "#fff", fontSize: "13px", fontWeight: 600, lineHeight: 1, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>Search</button>
        </form>

        {/* Suggested categories */}
        {!query && (
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#637180", marginBottom: "10px" }}>
              Browse a category
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SUGGESTED.map((s) => (
                <Link key={s} href={`/category/${s.toLowerCase()}`}
                  style={{
                    fontSize: "13px", padding: "8px 16px", borderRadius: "999px",
                    border: "1px solid rgba(53,45,39,0.2)", background: "#fff",
                    color: "#352D27", textDecoration: "none",
                  }}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
