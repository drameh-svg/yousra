import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.id }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = products.find((p) => p.id === slug);
  if (!product) notFound();

  const similar = products
    .filter((p) => p.aesthetic === product.aesthetic && p.id !== product.id)
    .slice(0, 5);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px 72px" }}>

        {/* ── Breadcrumb ── */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#637180",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={13} />
            For You
          </Link>
          <span style={{ fontSize: "12px", color: "rgba(99,113,128,0.4)" }}>/</span>
          <Link
            href={`/?aesthetic=${product.aesthetic}`}
            style={{ fontSize: "12px", color: "#637180", textDecoration: "none" }}
          >
            {product.aesthetic}
          </Link>
          <span style={{ fontSize: "12px", color: "rgba(99,113,128,0.4)" }}>/</span>
          <span
            style={{
              fontSize: "12px",
              color: "#352D27",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "200px",
            }}
          >
            {product.title}
          </span>
        </nav>

        {/* ── Main product panel ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}
             className="product-layout">

          {/* Left — image (links to seller) */}
          <div>
            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                borderRadius: "14px",
                overflow: "hidden",
                background: "#fff",
                position: "relative",
              }}
              aria-label={`View ${product.title} at ${product.store}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image}
                alt={product.title}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              {/* Hover hint */}
              <div
                style={{
                  position: "absolute",
                  bottom: "14px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(245,245,245,0.9)",
                  backdropFilter: "blur(6px)",
                  color: "#352D27",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "5px 14px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  opacity: 0,
                  transition: "opacity 0.2s",
                }}
                className="image-hint"
              >
                <ExternalLink size={11} />
                View at {product.store}
              </div>
            </a>
          </div>

          {/* Right — details */}
          <div style={{ position: "sticky", top: "80px" }}>

            {/* Aesthetic badge */}
            <span
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#352D27",
                background: "#DCFCFF",
                padding: "3px 11px",
                borderRadius: "999px",
                marginBottom: "16px",
              }}
            >
              {product.aesthetic}
            </span>

            {/* Title */}
            <h1
              style={{
                fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
                fontWeight: 400,
                fontSize: "clamp(24px, 3vw, 34px)",
                color: "#352D27",
                lineHeight: 1.2,
                marginBottom: "12px",
              }}
            >
              {product.title}
            </h1>

            {/* Price + store */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#352D27" }}>
                {product.price}
              </span>
              <span style={{ color: "rgba(99,113,128,0.4)", fontSize: "14px" }}>·</span>
              <span style={{ fontSize: "13px", color: "#637180" }}>{product.store}</span>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(53,45,39,0.08)", marginBottom: "24px" }} />

            {/* Description */}
            <p
              style={{
                fontSize: "14px",
                color: "#637180",
                lineHeight: 1.75,
                marginBottom: "28px",
              }}
            >
              {product.description}
            </p>

            {/* Sizes */}
            <div style={{ marginBottom: "32px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#352D27",
                  marginBottom: "10px",
                }}
              >
                Sizes available
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    style={{
                      fontSize: "12px",
                      padding: "5px 13px",
                      border: "1px solid rgba(53,45,39,0.2)",
                      borderRadius: "6px",
                      color: "#352D27",
                      background: "#fff",
                    }}
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            {/* Primary CTA — Shop at seller */}
            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                background: "#352D27",
                color: "#F5F5F5",
                fontSize: "14px",
                fontWeight: 600,
                padding: "14px 24px",
                borderRadius: "12px",
                textDecoration: "none",
                marginBottom: "12px",
                transition: "background 0.15s",
              }}
            >
              <ExternalLink size={15} />
              Shop at {product.store}
            </a>

            {/* Seller note */}
            <p
              style={{
                fontSize: "11px",
                color: "#637180",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Opens the seller&apos;s site · Check there for the latest price and availability
            </p>
          </div>
        </div>

        {/* ── Similar pieces ── */}
        {similar.length > 0 && (
          <section style={{ marginTop: "72px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Instrument Serif', Georgia, serif)",
                  fontWeight: 400,
                  fontSize: "22px",
                  color: "#352D27",
                }}
              >
                Keep looking?
              </h2>
              <span style={{ fontSize: "13px", color: "#637180" }}>
                More {product.aesthetic.toLowerCase()} pieces
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              {similar.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 700px) {
          .product-layout {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
        a:hover .image-hint {
          opacity: 1 !important;
        }
      `}</style>
    </main>
  );
}
