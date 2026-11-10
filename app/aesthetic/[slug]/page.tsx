import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";

type AestheticSlug = "minimal" | "romantic" | "streetwear" | "classic" | "casual";
const SLUGS: AestheticSlug[] = ["minimal", "romantic", "streetwear", "classic", "casual"];

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default async function AestheticPage({ params }: Props) {
  const { slug } = await params;
  const label = slug.charAt(0).toUpperCase() + slug.slice(1);
  const matched = products.filter((p) => p.aesthetic.toLowerCase() === slug);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 20px 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Link href="/explore"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#637180", textDecoration: "none", marginBottom: "24px" }}>
          <ArrowLeft size={13} /> Explore
        </Link>
        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(26px,3vw,36px)", color: "#352D27", marginBottom: "6px",
        }}>
          {label}
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "28px" }}>
          Explore {label.toLowerCase()} pieces that fit the look you love and the coverage you choose.
        </p>
        {matched.length === 0 ? (
          <p style={{ color: "#637180" }}>No pieces found for this aesthetic yet.</p>
        ) : (
          <div className="masonry">
            {matched.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}
