import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";
import { brands } from "@/lib/explore-data";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }));
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = brands.find((b) => b.slug === slug);
  const name = brand?.name ?? slug.replace(/-/g, " ");

  const matched = products.filter((p) =>
    p.store.toLowerCase().replace(/\s+/g, "-").includes(slug.split("-")[0])
  );
  const fallback = matched.length === 0 ? products.slice(0, 6) : matched;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 20px 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Link href="/explore"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#637180", textDecoration: "none", marginBottom: "24px" }}>
          <ArrowLeft size={13} /> Explore
        </Link>

        {brand && (
          <div style={{ background: "#352D27", borderRadius: "14px", padding: "28px 32px", marginBottom: "32px", display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ width: "80px", height: "100px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.image} alt={brand.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "28px", color: "#F5F5F5", marginBottom: "6px" }}>
                {brand.name}
              </h1>
              <p style={{ fontSize: "13px", color: "rgba(245,245,245,0.65)", lineHeight: 1.6 }}>{brand.tagline}</p>
              <p style={{ fontSize: "12px", color: "#DCFCFF", marginTop: "8px" }}>{brand.pieceCount} pieces on Yousra</p>
            </div>
          </div>
        )}

        {!brand && (
          <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "32px", color: "#352D27", marginBottom: "28px" }}>
            Meet {name}.
          </h1>
        )}

        <div className="masonry">
          {fallback.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  );
}
