import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";
import { categories } from "@/lib/explore-data";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  const label = cat?.label ?? slug.charAt(0).toUpperCase() + slug.slice(1);

  // Filter by rough keyword match; in production this comes from a real catalog
  const matched = products.filter((p) =>
    p.title.toLowerCase().includes(slug.replace(/-/g, " ")) ||
    p.aesthetic !== undefined
  ).slice(0, 20);

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
          {label}, your way.
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "28px" }}>
          Explore {label.toLowerCase()} across styles and stores.
        </p>
        <div className="masonry">
          {matched.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </main>
  );
}
