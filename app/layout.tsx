import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { Nav } from "@/components/nav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yusra — Modest Shopping Made Easy",
  description:
    "Find modest fashion that feels like you. Search for the piece you have in mind, or discover something new in a feed shaped by your preferences.",
  keywords: ["modest clothing", "aesthetic modest clothes", "modest fashion"],
};

// viewport-fit=cover lets the phone tab bar sit above the home indicator (safe-area padding).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FAF8F5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body style={{ fontFamily: "'Alte Haas Grotesk', system-ui, sans-serif", background: "var(--bg, #F5F5F5)", color: "var(--fg, #352D27)" }}>
        <SessionProvider><Nav />{children}</SessionProvider>
      </body>
    </html>
  );
}
