"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { spotlighted, categories, brands, trending, alternatives } from "@/lib/explore-data";

export default function ExplorePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "48px 20px 40px" }}>
        <h1 style={{
          fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
          fontWeight: 400,
          fontSize: "clamp(30px, 5vw, 52px)",
          color: "#352D27",
          lineHeight: 1.1,
          marginBottom: "12px",
        }}>
          Follow your style somewhere new.
        </h1>
        <p style={{ fontSize: "14px", color: "#637180", maxWidth: "420px", margin: "0 auto", lineHeight: 1.65 }}>
          Find a piece you didn&apos;t know you needed, a brand you haven&apos;t met, or a new way to wear what you love.
        </p>
      </section>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 80px" }}>

        {/* ── Spotlighted pieces ── */}
        <Section
          title="Spotlighted pieces"
          subtitle="A closer look at pieces worth discovering."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}
               className="spotlight-grid">
            {spotlighted.map((p, i) => (
              <Link key={p.id} href={`/product/${p.id}`}
                style={{ display: "block", borderRadius: "14px", overflow: "hidden", position: "relative", textDecoration: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.title}
                  style={{
                    width: "100%",
                    aspectRatio: i === 0 ? "2/3" : "3/4",
                    objectFit: "cover",
                    display: "block",
                  }} />
                {/* Overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(53,45,39,0.75) 0%, transparent 50%)",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "16px",
                }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "#DCFCFF", marginBottom: "5px",
                  }}>{p.aesthetic}</span>
                  <p style={{
                    fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
                    fontSize: "16px", color: "#F5F5F5", lineHeight: 1.25, marginBottom: "4px",
                  }}>{p.title}</p>
                  <p style={{ fontSize: "11px", color: "rgba(245,245,245,0.65)" }}>{p.store} · {p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Browse by category ── */}
        <Section
          title="Browse by category"
          subtitle="Start with the kind of clothing you need."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}
               className="category-grid">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`}
                style={{ display: "block", textDecoration: "none" }}>
                <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", marginBottom: "8px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.image} alt={cat.label}
                    style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(53,45,39,0.15)",
                    transition: "background 0.2s",
                  }} />
                </div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#352D27", marginBottom: "2px" }}>{cat.label}</p>
                <p style={{ fontSize: "11px", color: "#637180" }}>{cat.count} pieces</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Spotlighted brands ── */}
        <Section
          title="Spotlighted brands this week"
          subtitle="Get to know the brands behind the pieces."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}
               className="brands-grid">
            {brands.map((brand) => (
              <Link key={brand.slug} href={`/brand/${brand.slug}`}
                style={{ display: "flex", gap: "14px", textDecoration: "none", alignItems: "center",
                         background: "#fff", borderRadius: "12px", padding: "14px", border: "1px solid rgba(53,45,39,0.08)" }}>
                {/* Brand image */}
                <div style={{ width: "64px", height: "80px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.image} alt={brand.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                {/* Brand info */}
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#352D27", marginBottom: "4px" }}>{brand.name}</p>
                  <p style={{ fontSize: "11px", color: "#637180", lineHeight: 1.5, marginBottom: "8px" }}>{brand.tagline}</p>
                  <span style={{ fontSize: "11px", color: "#637180" }}>{brand.pieceCount} pieces</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── Trending ── */}
        <TrendingSection />

        {/* ── Modest alternatives ── */}
        <Section
          title="Love a brand's style?"
          subtitle="Find modest alternatives with a similar feel."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}
               className="alt-grid">
            {alternatives.map((alt) => (
              <Link key={alt.slug} href={`/alternatives/${alt.slug}`}
                style={{ display: "block", textDecoration: "none", borderRadius: "14px", overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={alt.image} alt={alt.brand}
                  style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(53,45,39,0.8) 0%, transparent 55%)",
                  display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px",
                }}>
                  <p style={{ fontSize: "11px", color: "#DCFCFF", fontWeight: 600, marginBottom: "5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Modest alternatives to
                  </p>
                  <p style={{
                    fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
                    fontSize: "20px", color: "#F5F5F5", marginBottom: "6px",
                  }}>{alt.brand}</p>
                  <p style={{ fontSize: "12px", color: "rgba(245,245,245,0.7)", lineHeight: 1.4 }}>{alt.description}</p>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "12px",
                    fontSize: "12px", fontWeight: 600, color: "#F5F5F5",
                  }}>
                    Explore alternatives <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .spotlight-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .category-grid  { grid-template-columns: repeat(3, 1fr) !important; }
          .brands-grid    { grid-template-columns: repeat(2, 1fr) !important; }
          .alt-grid       { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .spotlight-grid { grid-template-columns: 1fr 1fr !important; }
          .category-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .brands-grid    { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

// ── Trending (carousel, client) ────────────────────────────────────────────

function TrendingSection() {
  const [offset, setOffset] = useState(0);
  const CARD_W = 190;
  const CARD_GAP = 10;
  const maxOffset = Math.max(0, trending.length - 5);

  return (
    <Section
      title="Trending"
      subtitle="See what shoppers are exploring."
      action={
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { dir: -1, icon: <ChevronLeft size={15} />, disabled: offset === 0 },
            { dir: 1, icon: <ChevronRight size={15} />, disabled: offset >= maxOffset },
          ].map(({ dir, icon, disabled }) => (
            <button key={dir}
              onClick={() => setOffset((o) => Math.max(0, Math.min(maxOffset, o + dir)))}
              disabled={disabled}
              style={{
                width: "30px", height: "30px", borderRadius: "50%",
                border: "1px solid rgba(53,45,39,0.2)",
                background: disabled ? "transparent" : "#fff",
                color: disabled ? "rgba(53,45,39,0.2)" : "#352D27",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
              }}>
              {icon}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ overflow: "hidden" }}>
        <div style={{
          display: "flex", gap: `${CARD_GAP}px`,
          transform: `translateX(calc(-${offset} * (${CARD_W}px + ${CARD_GAP}px)))`,
          transition: "transform 0.35s ease",
        }}>
          {trending.map((p) => (
            <div key={p.id} style={{ width: `${CARD_W}px`, flexShrink: 0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "60px" }}>
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        marginBottom: "20px", gap: "16px",
      }}>
        <div>
          <h2 style={{
            fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
            fontWeight: 400, fontSize: "22px", color: "#352D27", marginBottom: "3px",
          }}>
            {title}
          </h2>
          <p style={{ fontSize: "12px", color: "#637180" }}>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
