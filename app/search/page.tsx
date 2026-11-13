"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import {useRouter} from "next/navigation";

const SUGGESTED = ["Dresses", "Skirts", "Tops", "Activewear", "Swimwear", "Occasionwear"];

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
        <form onSubmit={e=>{e.preventDefault();if(query.trim())router.push("/search/results?q="+encodeURIComponent(query.trim()))}} style={{ position: "relative", marginBottom: "20px" }}>
          <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#637180", pointerEvents: "none" }} />
          <input
            aria-label="Search clothing"
            maxLength={300}
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "black maxi skirt" or "wedding guest dress"'
            style={{
              width: "100%", height: "44px", paddingLeft: "42px", paddingRight: "85px",
              border: "1px solid rgba(53,45,39,0.15)", borderRadius: "12px",
              background: "#fff", fontSize: "14px", color: "#352D27", outline: "none",
            }}
          />
          <button type="submit" style={{position:"absolute",right:10,top:7,padding:"7px 12px",border:0,borderRadius:8,background:"#352D27",color:"white",cursor:"pointer"}}>Search</button>
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
