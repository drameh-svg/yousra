import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {DiscoveryGrid} from "@/components/discovery-grid";
import { alternatives } from "@/lib/explore-data";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return alternatives.map((a) => ({ slug: a.slug }));
}

export default async function AlternativesPage({ params }: Props) {
  const { slug } = await params;
  const alt = alternatives.find((a) => a.slug === slug);
  const brandName = alt?.brand ?? slug.replace(/-/g, " ");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 20px 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Link href="/explore"
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#637180", textDecoration: "none", marginBottom: "24px" }}>
          <ArrowLeft size={13} /> Explore
        </Link>
        <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#352D27", background: "#DCFCFF", padding: "3px 10px", borderRadius: "999px", marginBottom: "12px" }}>
          Modest alternatives to
        </span>
        <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "clamp(26px,3vw,36px)", color: "#352D27", marginBottom: "8px" }}>
          {brandName}
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "8px", lineHeight: 1.6, maxWidth: "480px" }}>
          {alt?.description ?? `Modest pieces with a similar feel to styles from ${brandName}.`}
        </p>
        <p style={{ fontSize: "11px", color: "#637180", marginBottom: "28px", fontStyle: "italic" }}>
          These are independent suggestions. Yousra is not affiliated with {brandName}.
        </p>
        <DiscoveryGrid query={brandName+" inspired modest clothing"}/>
      </div>
    </main>
  );
}
