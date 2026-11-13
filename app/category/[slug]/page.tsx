import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {DiscoveryGrid} from "@/components/discovery-grid";
import { categories } from "@/lib/explore-data";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  const label = cat?.label ?? slug.charAt(0).toUpperCase() + slug.slice(1);

  const canonical:Record<string,string>={dresses:'dress',skirts:'skirt',tops:'top',pants:'pants',outerwear:'outerwear'};
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
        <DiscoveryGrid query={canonical[slug]?'':label.toLowerCase()+' clothing'} filters={canonical[slug]?{category:canonical[slug]}:{}}/>
      </div>
    </main>
  );
}
