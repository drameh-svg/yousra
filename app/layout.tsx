import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Yousra — Modest Shopping Made Easy",
  description:
    "Find modest fashion that feels like you. Search for the piece you have in mind, or discover something new in a feed shaped by your preferences.",
  keywords: ["modest clothing", "aesthetic modest clothes", "modest fashion", "find sutra"],
  openGraph: {
    title: "Yousra — Modest Shopping Made Easy",
    description:
      "Find modest fashion that feels like you. Search for the piece you have in mind, or discover something new in a feed shaped by your preferences.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans bg-[#FAF8F5] text-stone-900">
        <Nav />
        {children}
      </body>
    </html>
  );
}
