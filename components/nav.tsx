"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bookmark, User, Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "For You" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,245,245,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(53,45,39,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 16px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontSize: "17px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#352D27",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Yousra
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", gap: "24px", fontSize: "13px" }} className="hidden md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ textDecoration: "none", color: "#637180", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#352D27")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#637180")}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop icons */}
          <div style={{ display: "flex", gap: "4px" }} className="hidden md:flex">
            {[Search, Bookmark, User].map((Icon, i) => (
              <button
                key={i}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px",
                  color: "#637180",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "8px",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#DCFCFF";
                  e.currentTarget.style.color = "#352D27";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#637180";
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#352D27",
              padding: "4px",
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(53,45,39,0.25)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "240px",
              height: "100%",
              background: "#F5F5F5",
              padding: "64px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={{ textDecoration: "none", fontSize: "15px", color: "#352D27" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
