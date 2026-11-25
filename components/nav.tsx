"use client";
// Desktop: links across the top. Phones: a slim top bar (logo, search, feedback) and an app-style tab bar
// fixed to the bottom of the screen. Sign out lives in Profile › Account on phones.
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bookmark, User, LogOut, Home, Compass, MessageCircleHeart } from "lucide-react";
import { useSession } from "@/components/session-provider";

const links = [
  { href: "/", label: "For You" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
  { href: "/feedback", label: "Feedback" },
];
const tabs = [
  { href: "/", label: "For You", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];
// Full-screen flows where the tab bar would get in the way.
const NO_TABS = ["/onboarding"];
const isActive = (pathname: string, href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

export function Nav() {
  const pathname = usePathname();
  const session = useSession();
  const showTabs = !NO_TABS.some((p) => pathname.startsWith(p));

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-100 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-stone-900 shrink-0">
            Yusra
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-stone-500">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`hover:text-stone-900 transition-colors ${isActive(pathname, l.href) ? "text-stone-900 font-medium" : ""}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop icons */}
          <div className="hidden md:flex items-center gap-3 text-stone-500">
            <Link href="/search" aria-label="Search" className="hover:text-stone-900 transition-colors p-1"><Search size={18} /></Link>
            <Link href="/saved" aria-label="Saved" className="hover:text-stone-900 transition-colors p-1"><Bookmark size={18} /></Link>
            <Link href="/profile" aria-label="Profile" className="hover:text-stone-900 transition-colors p-1"><User size={18} /></Link>
            {session.user && (
              <button onClick={() => void session.signOut()} aria-label="Sign out" title="Sign out" className="hover:text-stone-900 transition-colors p-1">
                <LogOut size={18} />
              </button>
            )}
          </div>

          {/* Phone: the tab bar has the main pages; feedback stays one tap away up here */}
          <Link href="/feedback" aria-label="Feedback"
            className={`md:hidden flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${isActive(pathname, "/feedback") ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
            <MessageCircleHeart size={14} />Feedback
          </Link>
        </div>
      </header>

      {showTabs ? (
        <nav aria-label="Main" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-[#FAF8F5]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
            {tabs.map(({ href, label, icon: Icon }) => {
              const on = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link href={href} aria-current={on ? "page" : undefined}
                    className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] transition-colors ${on ? "text-stone-900 font-semibold" : "text-stone-400"}`}>
                    <Icon size={21} strokeWidth={on ? 2.2 : 1.7} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
