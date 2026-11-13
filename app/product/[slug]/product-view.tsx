"use client";

import { useState,useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, ExternalLink, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/products";
import {api,type ApiProduct} from "@/lib/api";
import {toCard} from "@/lib/catalog";
import {useSession} from "@/components/session-provider";
import {isProductUrl} from "@/src/product-url.mjs";
import { ProductCard,type CardProduct } from "@/components/product-card";

import {useProductActions} from '@/lib/use-product-actions';

interface Props {
  product: Product;
  similar: CardProduct[];
}

export function ProductView({ product, similar:initialSimilar }: Props) {
  const session=useSession();
  const [similar,setSimilar]=useState<CardProduct[]>(initialSimilar);
  useEffect(()=>{let active=true;if(session.user&&session.profile?.onboarded)void api<{similar:ApiProduct[]}>(`/products/${product.id}`).then(d=>{if(active)setSimilar(d.similar.map(toCard))}).catch(()=>{});return()=>{active=false}},[product.id,session.user,session.profile?.onboarded]);
  const shopAvailable=isProductUrl(product.storeUrl);
  const shopHref=shopAvailable?`/api/products/${product.id}/outbound?surface=detail`:`/search/results?q=${encodeURIComponent(product.title)}`;
  const {saved,toggleSaved,loading}=useProductActions(product.id);
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  async function save(){if(saving||loading)return;setSaving(true);setSaveError('');try{await toggleSaved()}catch(e){setSaveError(e instanceof Error?e.message:'Could not save this piece.')}finally{setSaving(false)}}
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [carouselOffset, setCarouselOffset] = useState(0);

  const CARD_W = 196;
  const CARD_GAP = 12;
  const maxOffset = Math.max(0, similar.length - 5);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 20px 80px" }}>

        {/* ── Breadcrumb ── */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
          <Link href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#637180", textDecoration: "none" }}>
            <ArrowLeft size={13} /> For You
          </Link>
          <Slash />
          <span style={{ fontSize: "12px", color: "#637180" }}>{product.aesthetic}</span>
          <Slash />
          <span style={{ fontSize: "12px", color: "#352D27", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.title}
          </span>
        </nav>

        {/* ── Two-panel layout ── */}
        <div
          className="product-layout"
          style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "52px", alignItems: "start" }}
        >
          {/* LEFT — image */}
          <div style={{ display: "flex", gap: "10px" }}>

            {/* Thumbnail strip */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "62px", height: "78px", borderRadius: "8px", overflow: "hidden",
                  border: `2px solid ${i === 0 ? "#352D27" : "rgba(53,45,39,0.1)"}`,
                  cursor: "pointer", flexShrink: 0,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>

            {/* Main image — links to seller */}
            <a href={shopHref} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", flex: 1, borderRadius: "14px", overflow: "hidden", position: "relative", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.title} style={{ width: "100%", height: "auto", display: "block" }} />

              {/* Bookmark on image */}
              <button
                aria-label={saved?"Unsave":"Save"} aria-pressed={saved} disabled={saving||loading} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void save(); }}
                style={{
                  position: "absolute", top: "14px", right: "14px",
                  background: "rgba(245,245,245,0.9)", backdropFilter: "blur(6px)",
                  border: "none", borderRadius: "50%", width: "36px", height: "36px",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                <Bookmark size={15} style={{ fill: saved ? "#352D27" : "none", stroke: "#352D27" }} />
              </button>
            </a>
          </div>

          {/* RIGHT — details (sticky) */}
          <div style={{ position: "sticky", top: "76px" }}>

            {saveError?<p role="alert">{saveError}</p>:null}
            {/* Brand row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#352D27" }}>
                  {product.store}
                </span>
                <button onClick={() => void save()}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                  <Bookmark size={14} style={{ fill: saved ? "#352D27" : "none", stroke: saved ? "#352D27" : "#637180" }} />
                </button>
              </div>
              <AestheticBadge label={product.aesthetic} />
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
              fontWeight: 400, fontSize: "clamp(22px, 2.5vw, 30px)",
              color: "#352D27", lineHeight: 1.2, marginBottom: "10px",
            }}>
              {product.title}
            </h1>

            {/* Price */}
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#352D27", marginBottom: "16px" }}>
              {product.price}
            </p>

            <Divider />

            {/* Product details accordion */}
            <button onClick={() => setDetailsOpen((o) => !o)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer", padding: "12px 0",
              fontSize: "13px", fontWeight: 600, color: "#352D27",
            }}>
              Product details
              <ChevronDown size={14} style={{
                transform: detailsOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", color: "#637180",
              }} />
            </button>

            {detailsOpen && (
              <p style={{ fontSize: "13px", color: "#637180", lineHeight: 1.75, paddingBottom: "12px" }}>
                {product.description}
              </p>
            )}

            <Divider />

            {/* Size */}
            <div style={{ padding: "16px 0" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#352D27", marginBottom: "10px" }}>Size:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {product.sizes.map((size) => {
                  const active = selectedSize === size;
                  return (
                    <button key={size} onClick={() => setSelectedSize(active ? null : size)} style={{
                      fontSize: "12px", padding: "6px 14px",
                      border: `1px solid ${active ? "#352D27" : "rgba(53,45,39,0.2)"}`,
                      borderRadius: "7px", cursor: "pointer",
                      background: active ? "#352D27" : "#fff",
                      color: active ? "#F5F5F5" : "#352D27",
                      transition: "all 0.15s",
                    }}>
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action row */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
              <a href={shopHref} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                background: "#352D27", color: "#F5F5F5",
                fontSize: "13px", fontWeight: 600, padding: "11px 12px",
                borderRadius: "10px", textDecoration: "none", gap: "6px",
              }}>
                {shopAvailable?"Purchase Now":"Find current listings"}
              </a>
              <button onClick={() => void save()} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                background: saved ? "#DCFCFF" : "#fff",
                border: "1px solid rgba(53,45,39,0.2)", borderRadius: "10px",
                fontSize: "13px", fontWeight: 600, color: "#352D27",
                padding: "11px 12px", cursor: "pointer", transition: "background 0.15s",
              }}>
                <Bookmark size={13} style={{ fill: saved ? "#352D27" : "none", stroke: "#352D27" }} />
                {saved ? "Saved" : "+ Save"}
              </button>
            </div>

            {/* Attribution */}
            <p style={{ fontSize: "11px", color: "#637180", marginBottom: "16px", lineHeight: 1.6 }}>
              Sourced from{" "}
              <a href={shopHref} target="_blank" rel="noopener noreferrer"
                style={{ color: "#352D27", fontWeight: 600, textDecoration: "none" }}>
                {product.store}
              </a>
              {" "}· Yousra does not sell this product.
            </p>

            {/* Big CTA */}
            <a href={shopHref} target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                background: "#352D27", color: "#F5F5F5",
                padding: "18px 24px", borderRadius: "14px", textDecoration: "none",
              }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700 }}>
                {shopAvailable?`Shop at ${product.store}`:"Find current listings"} <ExternalLink size={15} />
              </span>
              <span style={{ fontSize: "11px", color: "rgba(245,245,245,0.55)", marginTop: "3px" }}>
                {shopAvailable?"View the retailer’s product page":"This reference has no verified product link"}
              </span>
            </a>
          </div>
        </div>

        {/* ── Similar pieces carousel ── */}
        {similar.length > 0 && (
          <section style={{ marginTop: "68px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div>
                <h2 style={{
                  fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
                  fontWeight: 400, fontSize: "20px", color: "#352D27", marginBottom: "2px",
                }}>
                  Similar pieces
                </h2>
                <p style={{ fontSize: "12px", color: "#637180" }}>
                  Similar garments that meet your preferences
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { dir: -1, label: <ChevronLeft size={15} />, disabled: carouselOffset === 0 },
                  { dir: 1, label: <ChevronRight size={15} />, disabled: carouselOffset >= maxOffset },
                ].map(({ dir, label, disabled }) => (
                  <button key={dir}
                    onClick={() => setCarouselOffset((o) => Math.max(0, Math.min(maxOffset, o + dir)))}
                    disabled={disabled}
                    style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      border: "1px solid rgba(53,45,39,0.2)",
                      background: disabled ? "transparent" : "#fff",
                      color: disabled ? "rgba(53,45,39,0.2)" : "#352D27",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: disabled ? "default" : "pointer",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflow: "hidden" }}>
              <div style={{
                display: "flex", gap: `${CARD_GAP}px`,
                transform: `translateX(calc(-${carouselOffset} * (${CARD_W}px + ${CARD_GAP}px)))`,
                transition: "transform 0.35s ease",
              }}>
                {similar.map((p) => (
                  <div key={p.id} style={{ width: `${CARD_W}px`, flexShrink: 0 }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        @media (max-width: 760px) {
          .product-layout {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </main>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function Slash() {
  return <span style={{ fontSize: "12px", color: "rgba(99,113,128,0.35)" }}>/</span>;
}

function Divider() {
  return <div style={{ height: "1px", background: "rgba(53,45,39,0.08)" }} />;
}

function AestheticBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
      color: "#352D27", background: "#DCFCFF", padding: "3px 10px", borderRadius: "999px",
    }}>
      {label}
    </span>
  );
}
