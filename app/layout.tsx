import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yousra — Modest Shopping Made Easy",
  description:
    "Find modest fashion that feels like you. Search for the piece you have in mind, or discover something new in a feed shaped by your preferences.",
  keywords: ["modest clothing", "aesthetic modest clothes", "modest fashion"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
