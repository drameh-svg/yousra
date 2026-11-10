import type { Metadata } from "next";
import { Instrument_Serif, Atkinson_Hyperlegible } from "next/font/google";
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

const hyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yousra — Modest Shopping Made Easy",
  description:
    "Find modest fashion that feels like you. Search for the piece you have in mind, or discover something new in a feed shaped by your preferences.",
  keywords: ["modest clothing", "aesthetic modest clothes", "modest fashion"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${hyperlegible.variable}`}>
      <body style={{ fontFamily: "var(--font-sans, 'Atkinson Hyperlegible', system-ui, sans-serif)", background: "var(--bg, #F5F5F5)", color: "var(--fg, #352D27)" }}>
        <SessionProvider><Nav />{children}</SessionProvider>
      </body>
    </html>
  );
}
