"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Search, Bookmark, User, Menu, X, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/session-provider";

const links = [
  { href: "/", label: "For You" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
  { href: "/feedback", label: "Feedback" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const session = useSession();

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
              className={`hover:text-stone-900 transition-colors ${pathname===l.href?"text-stone-900 font-medium":""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop icons */}
        <div className="hidden md:flex items-center gap-3 text-stone-500">
          <Link href="/search" aria-label="Search" className="hover:text-stone-900 transition-colors p-1">
            <Search size={18} />
          </Link>
          <Link href="/saved" aria-label="Saved" className="hover:text-stone-900 transition-colors p-1">
            <Bookmark size={18} />
          </Link>
          <Link href="/profile" aria-label="Profile" className="hover:text-stone-900 transition-colors p-1">
            <User size={18} />
          </Link>
          {session.user && (
            <button
              onClick={() => void session.signOut()}
              aria-label="Sign out"
              className="hover:text-stone-900 transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden p-1 text-stone-600" aria-label="Open menu">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="w-64 bg-[#FAF8F5] pt-10 px-6">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
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
              {session.user && (
                <>
                  <Separator className="bg-stone-100" />
                  <button
                    onClick={() => { void session.signOut(); setOpen(false); }}
                    className="text-sm text-left text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
