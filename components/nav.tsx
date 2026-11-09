"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bookmark, User, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/", label: "For You" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-semibold tracking-tight text-stone-900 shrink-0">
          Yousra
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-stone-500">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-stone-900 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop icons */}
        <div className="hidden md:flex items-center gap-3 text-stone-500">
          <button aria-label="Search" className="hover:text-stone-900 transition-colors p-1">
            <Search size={18} />
          </button>
          <button aria-label="Saved" className="hover:text-stone-900 transition-colors p-1">
            <Bookmark size={18} />
          </button>
          <button aria-label="Profile" className="hover:text-stone-900 transition-colors p-1">
            <User size={18} />
          </button>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden p-1 text-stone-600" aria-label="Open menu">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-[#FAF8F5] pt-10 px-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <p className="text-lg font-semibold mb-6 text-stone-900">Yousra</p>
            <Separator className="mb-6 bg-stone-100" />
            <nav className="flex flex-col gap-5 text-stone-600">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm hover:text-stone-900 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
