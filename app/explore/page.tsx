"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";
import { spotlighted, categories, brands, trending, alternatives } from "@/lib/explore-data";

const aestheticTiles = [
  { label: "Minimal", slug: "minimal", image: products.find((p) => p.id === "1")!.image },
  { label: "Romantic", slug: "romantic", image: products.find((p) => p.id === "7")!.image },
  { label: "Streetwear", slug: "streetwear", image: products.find((p) => p.id === "13")!.image },
  { label: "Classic", slug: "classic", image: products.find((p) => p.id === "19")!.image },
  { label: "Casual", slug: "casual", image: products.find((p) => p.id === "28")!.image },
];

export default function ExplorePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Hero: brand spotlight ── */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch" }}
             className="hero-grid">

          {/* Left — featured brand */}
          <div style={{
            background: "#352D27", borderRadius: "16px", padding: "36px",
            display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "340px",
          }}>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#DCFCFF" }}>
                Brand spotlight
              </span>
              <h2 style={{
                fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
                fontWeight: 400, fontSize: "clamp(26px,3vw,38px)", color: "#F5F5F5",
                lineHeight: 1.15, margin: "12px 0 10px",
              }}>
                {brands[0].name}
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(245,245,245,0.65)", lineHeight: 1.65, maxWidth: "340px", marginBottom: "20px" }}>
                {brands[0].tagline} {brands[0].pieceCount} pieces available through Yousra.
              </p>
            </div>
            <Link href={`/brand/${brands[0].slug}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "#DCFCFF", color: "#352D27",
                fontSize: "13px", fontWeight: 700, padding: "10px 20px",
                borderRadius: "999px", textDecoration: "none", alignSelf: "flex-start",
              }}>
              View all pieces <ArrowRight size={13} />
            </Link>
          </div>

          {/* Right — 2x2 product thumbnails */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {spotlighted.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`}
                style={{ display: "block", borderRadius: "12px", overflow: "hidden", textDecoration: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.title}
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 80px" }}>

        {/* ── Explore by style ── */}
        <section style={{ marginTop: "52px", marginBottom: "52px" }}>
          <SectionHeader title="Explore by style" subtitle="Browse pieces by the aesthetic that feels like you." />
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}
               className="hide-scroll">
            {aestheticTiles.map((tile) => (
              <Link key={tile.slug} href={`/aesthetic/${tile.slug}`}
                style={{ display: "block", textDecoration: "none", flexShrink: 0, width: "160px" }}>
                <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", marginBottom: "8px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tile.image} alt={tile.label}
                    style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(53,45,39,0.7) 0%, transparent 50%)",
                    display: "flex", alignItems: "flex-end", padding: "14px",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
                      fontSize: "17px", color: "#F5F5F5", fontWeight: 400,
                    }}>{tile.label}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Trending pieces ── */}
        <TrendingSection />

        {/* ── Browse by category ── */}
        <section style={{ marginBottom: "52px" }}>
          <SectionHeader title="Browse by category" subtitle="Start with the kind of clothing you need." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "10px" }}
               className="cat-grid">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`}
                style={{ display: "block", textDecoration: "none" }}>
                <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.image} alt={cat.label}
                    style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                </div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#352D27", marginBottom: "2px" }}>{cat.label}</p>
                <p style={{ fontSize: "11px", color: "#637180" }}>{cat.count} pieces</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Spotlighted brands this week ── */}
        <section style={{ marginBottom: "52px" }}>
          <SectionHeader title="Spotlighted brands this week" subtitle="Get to know the brands behind the pieces." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}
               className="brands-grid">
            {brands.map((brand) => (
              <Link key={brand.slug} href={`/brand/${brand.slug}`}
                style={{
                  display: "flex", gap: "14px", textDecoration: "none", alignItems: "center",
                  background: "#fff", borderRadius: "12px", padding: "14px",
                  border: "1px solid rgba(53,45,39,0.08)",
                }}>
                <div style={{ width: "60px", height: "75px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.image} alt={brand.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#352D27", marginBottom: "3px" }}>{brand.name}</p>
                  <p style={{ fontSize: "11px", color: "#637180", lineHeight: 1.5, marginBottom: "6px" }}>{brand.tagline}</p>
                  <span style={{ fontSize: "11px", color: "#637180" }}>{brand.pieceCount} pieces</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Brands like… ── */}
        <section style={{ marginBottom: "52px" }}>
          <SectionHeader title="Love a brand's style?" subtitle="Find modest alternatives with a similar feel." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}
               className="alt-grid">
            {alternatives.map((alt) => (
              <Link key={alt.slug} href={`/alternatives/${alt.slug}`}
                style={{ display: "block", textDecoration: "none", borderRadius: "14px", overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={alt.image} alt={alt.brand}
                  style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(53,45,39,0.82) 0%, transparent 55%)",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px",
                }}>
                  <p style={{ fontSize: "10px", color: "#DCFCFF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>
                    Modest alternatives to
                  </p>
                  <p style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontSize: "20px", color: "#F5F5F5", marginBottom: "6px" }}>
                    {alt.brand}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(245,245,245,0.7)", lineHeight: 1.4 }}>{alt.description}</p>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "10px", fontSize: "12px", fontWeight: 600, color: "#F5F5F5" }}>
                    Explore alternatives <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .hide-scroll { scrollbar-width: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 860px) {
          .hero-grid    { grid-template-columns: 1fr !important; }
          .cat-grid     { grid-template-columns: repeat(3,1fr) !important; }
          .brands-grid  { grid-template-columns: repeat(2,1fr) !important; }
          .alt-grid     { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .cat-grid     { grid-template-columns: repeat(2,1fr) !important; }
          .brands-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function TrendingSection() {
  const [offset, setOffset] = useState(0);
  const W = 190, G = 10;
  const max = Math.max(0, trending.length - 5);
  return (
    <section style={{ marginBottom: "52px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "18px" }}>
        <SectionHeader title="Trending pieces" subtitle="See what shoppers are exploring." inline />
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {[-1, 1].map((dir) => {
            const disabled = dir === -1 ? offset === 0 : offset >= max;
            return (
              <button key={dir} onClick={() => setOffset((o) => Math.max(0, Math.min(max, o + dir)))}
                disabled={disabled}
                style={{
                  width: "30px", height: "30px", borderRadius: "50%",
                  border: "1px solid rgba(53,45,39,0.2)",
                  background: disabled ? "transparent" : "#fff",
                  color: disabled ? "rgba(53,45,39,0.2)" : "#352D27",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: disabled ? "default" : "pointer",
                }}>
                {dir === -1 ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ overflow: "hidden" }}>
        <div style={{
          display: "flex", gap: `${G}px`,
          transform: `translateX(calc(-${offset} * (${W}px + ${G}px)))`,
          transition: "transform 0.35s ease",
        }}>
          {trending.map((p) => (
            <div key={p.id} style={{ width: `${W}px`, flexShrink: 0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, subtitle, inline }: { title: string; subtitle: string; inline?: boolean }) {
  if (inline) return (
    <div>
      <h2 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "20px", color: "#352D27", marginBottom: "2px" }}>{title}</h2>
      <p style={{ fontSize: "12px", color: "#637180" }}>{subtitle}</p>
    </div>
  );
  return (
    <div style={{ marginBottom: "18px" }}>
      <h2 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "20px", color: "#352D27", marginBottom: "2px" }}>{title}</h2>
      <p style={{ fontSize: "12px", color: "#637180" }}>{subtitle}</p>
    </div>
  );
}
