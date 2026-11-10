"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div className="masonry-item">
      <div
        style={{ position: "relative", borderRadius: "var(--radius)", overflow: "hidden" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            transition: "transform 0.35s ease",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />

        {/* Overlay — the entire overlay is the internal product page link */}
        <Link
          href={`/product/${product.id}`}
          style={{
            position: "absolute",
            inset: 0,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s ease",
            pointerEvents: hovered ? "auto" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "10px",
            background:
              "linear-gradient(180deg, rgba(53,45,39,0.55) 0%, transparent 35%, transparent 60%, rgba(53,45,39,0.45) 100%)",
            textDecoration: "none",
          }}
          aria-label={`View ${product.title}`}
        >
          {/* Top: title + Save */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#F5F5F5",
                lineHeight: 1.3,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                maxWidth: "calc(100% - 60px)",
              }}
            >
              {product.title}
            </span>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSaved((s) => !s);
              }}
              aria-label={saved ? "Unsave" : "Save"}
              style={{
                flexShrink: 0,
                background: saved ? "#DCFCFF" : "#F5F5F5",
                border: "none",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#352D27",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "background 0.15s",
              }}
            >
              <Bookmark size={11} style={{ fill: saved ? "#352D27" : "none", stroke: "#352D27" }} />
              {saved ? "Saved" : "Save"}
            </button>
          </div>

          {/* Bottom: Visit site (external) */}
          <div>
            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#F5F5F5",
                color: "#352D27",
                fontSize: "11px",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "999px",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={11} />
              Visit site
            </a>
          </div>
        </Link>
      </div>

      {/* Below-card label */}
      <div style={{ padding: "5px 2px 0" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--fg)",
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.title}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)" }}>{product.store}</span>
          <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg)" }}>{product.price}</span>
        </div>
      </div>
    </div>
  );
}
