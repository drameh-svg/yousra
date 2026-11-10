import Link from "next/link";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 20px 80px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(28px,4vw,44px)", color: "#352D27",
          lineHeight: 1.15, marginBottom: "24px",
        }}>
          Modest fashion should be easier to find.
        </h1>
        <p style={{ fontSize: "15px", color: "#637180", lineHeight: 1.75, marginBottom: "20px" }}>
          Searching store after store for a piece that fits your style, preferences, and budget takes time. Yousra brings clothing discovery into one place, so you can focus on what you love.
        </p>
        <p style={{ fontSize: "15px", color: "#637180", lineHeight: 1.75, marginBottom: "36px" }}>
          We believe modesty is personal. Yousra helps you search on your own terms, discover new pieces and brands, and shop directly from the stores that sell them.
        </p>

        <div style={{ background: "#352D27", borderRadius: "14px", padding: "28px 32px", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "22px", color: "#F5F5F5", marginBottom: "12px" }}>
            How it works
          </h2>
          {["Yousra indexes pieces from stores that sell modest clothing.",
            "You search, browse, or scroll a personalized For You feed.",
            "When you find something you love, we redirect you to the seller.",
            "Yousra does not sell products directly — purchases happen on the seller's site."]
            .map((line, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <span style={{ color: "#DCFCFF", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <p style={{ fontSize: "14px", color: "rgba(245,245,245,0.75)", lineHeight: 1.6 }}>{line}</p>
              </div>
            ))}
        </div>

        <Link href="/"
          style={{
            display: "inline-block", background: "#352D27", color: "#F5F5F5",
            fontSize: "13px", fontWeight: 600, padding: "12px 24px",
            borderRadius: "999px", textDecoration: "none",
          }}>
          Find your next piece →
        </Link>
      </div>
    </main>
  );
}
