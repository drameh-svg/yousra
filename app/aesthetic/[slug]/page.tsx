import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {DiscoveryGrid} from "@/components/discovery-grid";

const AESTHETIC_SLUGS = [
  { slug: "90s_minimalism", label: "90s Minimalism" },
  { slug: "90s-minimalism", label: "90s Minimalism", style: "90s_minimalism" },
  { slug: "clean_girl", label: "Clean Girl" },
  { slug: "clean-girl", label: "Clean Girl", style: "clean_girl" },
  { slug: "coquette", label: "Coquette" },
  { slug: "earthy", label: "Earthy" },
  { slug: "grunge", label: "Grunge" },
  { slug: "streetwear", label: "Streetwear" },
  { slug: "y2k", label: "Y2K" },
];

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return AESTHETIC_SLUGS.map(({ slug }) => ({ slug }));
}

export default async function AestheticPage({ params }: Props) {
  const { slug } = await params;
  const entry = AESTHETIC_SLUGS.find(a => a.slug === slug);
  const label = entry?.label ?? slug.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const style = ("style" in (entry || {}) && entry && "style" in entry ? (entry as { style?: string }).style : undefined) || slug.replace(/-/g, "_");

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
        <DiscoveryGrid filters={{style}}/>
      </div>
    </main>
  );
}
