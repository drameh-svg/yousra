import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { products } from "@/lib/products";
import { notFound } from "next/navigation";

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

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Back */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "#637180",
            textDecoration: "none",
            marginBottom: "24px",
          }}
        >
          <ArrowLeft size={14} /> Back
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
            alignItems: "start",
          }}
          className="product-grid"
        >
          {/* Image */}
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.title}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Info */}
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#637180",
                background: "#DCFCFF",
                padding: "3px 10px",
                borderRadius: "999px",
                marginBottom: "14px",
              }}
            >
              {product.aesthetic}
            </span>

            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#352D27",
                lineHeight: 1.3,
                marginBottom: "8px",
              }}
            >
              {product.title}
            </h1>

            <p style={{ fontSize: "13px", color: "#637180", marginBottom: "4px" }}>
              {product.store}
            </p>

            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#352D27",
                marginBottom: "28px",
              }}
            >
              {product.price}
            </p>

            <p style={{ fontSize: "13px", color: "#637180", lineHeight: 1.6, marginBottom: "28px" }}>
              Check the seller&apos;s page for the latest availability, sizing, and purchase information.
            </p>

            <a
              href={product.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#352D27",
                color: "#F5F5F5",
                fontSize: "13px",
                fontWeight: 600,
                padding: "12px 24px",
                borderRadius: "999px",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} />
              Shop at {product.store}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
