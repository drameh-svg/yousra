"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import type { Product } from "@/lib/products";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="masonry-item group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image wrapper — no fill, let image dictate height for true masonry */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "6px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "cover",
            transition: "transform 0.4s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />

        {/* Hover overlay */}
        {hovered && (
          <a
            href={product.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: "10px",
            }}
          >
            <span
              style={{
                background: "#fff",
                color: "#1a1816",
                fontSize: "11px",
                fontWeight: 500,
                padding: "5px 12px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
              }}
            >
              Shop at {product.store} ↗
            </span>
          </a>
        )}

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
          aria-label={saved ? "Unsave" : "Save"}
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            background: "rgba(255,255,255,0.85)",
            border: "none",
            borderRadius: "50%",
            width: "26px",
            height: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: hovered || saved ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          <Bookmark
            size={12}
            style={{
              fill: saved ? "#1a1816" : "none",
              stroke: "#1a1816",
            }}
          />
        </button>
      </div>

      {/* Card info */}
      <div style={{ padding: "5px 2px 0" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "#1a1816",
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.title}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
          <span style={{ fontSize: "10px", color: "#78716c" }}>{product.store}</span>
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#1a1816" }}>
            {product.price}
          </span>
        </div>
      </div>
    </div>
  );
}
