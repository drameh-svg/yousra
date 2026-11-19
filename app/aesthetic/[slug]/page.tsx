import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {DiscoveryGrid} from "@/components/discovery-grid";

const AESTHETIC_SLUGS = [
  { slug: "y2k", label: "Y2K" },
  { slug: "whimsy", label: "Whimsy" },
  { slug: "90s-chic", label: "90s Chic" },
  { slug: "clean-girl", label: "Clean Girl" },
  { slug: "alternative", label: "Alternative" },
  { slug: "earthy", label: "Earthy" },
];

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return AESTHETIC_SLUGS.map(({ slug }) => ({ slug }));
}

export default async function AestheticPage({ params }: Props) {
  const { slug } = await params;
  const label = AESTHETIC_SLUGS.find(a => a.slug === slug)?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

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
        <DiscoveryGrid filters={{style:slug}}/>
      </div>
    </main>
  );
}
