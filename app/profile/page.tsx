"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { usePrefs, writePrefs, type Prefs } from "@/lib/use-prefs";
import { BRAND_LIST } from "@/lib/brands";
import Link from "next/link";

type Aesthetic = "Minimal" | "Romantic" | "Streetwear" | "Classic" | "Casual";
const AESTHETICS: Aesthetic[] = ["Minimal", "Romantic", "Streetwear", "Classic", "Casual"];
const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];
const BUDGETS = ["Under $50", "$50–$100", "$100–$200", "$200+"];
const MODESTY_OPTIONS: Prefs["modesty"][] = ["Conservative", "Moderate", "Relaxed"];

const MODESTY_DESC = {
  Conservative: "Full coverage — longer hemlines, higher necklines, loose fits.",
  Moderate: "A balance — some pieces more covered, others less.",
  Relaxed: "Light coverage preferences — the detail matters more than length.",
};

export default function ProfilePage() {
  const { prefs } = usePrefs();
  const [form, setForm] = useState({ ...prefs });
  const [saved, setSavedState] = useState(false);

  useEffect(() => { queueMicrotask(()=>setForm({ ...prefs })); }, [prefs]);

  function toggle<K extends keyof Prefs>(key: K, value: string) {
    setForm((f) => {
      const arr = (f[key] as string[]) ?? [];
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...f, [key]: next };
    });
  }

  function toggleBrand(b: string) {
    setForm((f) => {
      const arr = f.brands ?? [];
      if (arr.includes(b)) return { ...f, brands: arr.filter((x) => x !== b) };
      if (arr.length >= 10) return f;
      return { ...f, brands: [...arr, b] };
    });
  }

  function handleSave() {
    writePrefs(form);
    setSavedState(true);
    setTimeout(() => setSavedState(false), 2000);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(26px,3vw,36px)", color: "#352D27",
          marginBottom: "6px",
        }}>
          Your preferences
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "36px", lineHeight: 1.6 }}>
          Update what shapes your feed and search results.{" "}
          {!prefs.onboardingDone && (
            <Link href="/onboarding" style={{ color: "#352D27", fontWeight: 600, textDecoration: "underline" }}>
              Complete onboarding →
            </Link>
          )}
        </p>

        {/* ── Account ── */}
        <Card title="Account">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              style={inputStyle} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" type="email"
              style={inputStyle} />
          </Field>
        </Card>

        {/* ── Modesty ── */}
        <Card title="Modesty preference">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {MODESTY_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => setForm((f) => ({ ...f, modesty: opt }))}
                style={{
                  display: "flex", flexDirection: "column", textAlign: "left",
                  padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
                  border: `1px solid ${form.modesty === opt ? "#352D27" : "rgba(53,45,39,0.15)"}`,
                  background: form.modesty === opt ? "#352D27" : "#fff",
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: form.modesty === opt ? "#F5F5F5" : "#352D27", marginBottom: "3px" }}>{opt}</span>
                <span style={{ fontSize: "12px", color: form.modesty === opt ? "rgba(245,245,245,0.7)" : "#637180" }}>{opt !== "" ? MODESTY_DESC[opt] : ""}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Aesthetics ── */}
        <Card title="Aesthetics">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {AESTHETICS.map((a) => {
              const active = form.aesthetics.includes(a);
              return (
                <Chip key={a} label={a} active={active} onClick={() => toggle("aesthetics", a)} />
              );
            })}
          </div>
        </Card>

        {/* ── Sizes ── */}
        <Card title="Sizes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {SIZES.map((s) => {
              const active = form.sizes.includes(s);
              return <Chip key={s} label={s} active={active} onClick={() => toggle("sizes", s)} />;
            })}
          </div>
        </Card>

        {/* ── Budget ── */}
        <Card title="Budget">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {BUDGETS.map((b) => (
              <Chip key={b} label={b} active={form.budget === b}
                onClick={() => setForm((f) => ({ ...f, budget: b }))} />
            ))}
          </div>
        </Card>

        {/* ── Brands I love ── */}
        <Card title={`Brands I love (${form.brands.length}/10)`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {BRAND_LIST.map((brand) => {
              const active = form.brands.includes(brand);
              const full = form.brands.length >= 10 && !active;
              return (
                <button key={brand} onClick={() => toggleBrand(brand)} disabled={full}
                  style={{
                    fontSize: "12px", padding: "6px 13px", borderRadius: "999px",
                    border: `1px solid ${active ? "#352D27" : "rgba(53,45,39,0.2)"}`,
                    background: active ? "#352D27" : "#fff",
                    color: active ? "#F5F5F5" : full ? "rgba(53,45,39,0.3)" : "#352D27",
                    cursor: full ? "default" : "pointer",
                    fontWeight: active ? 600 : 400,
                    display: "inline-flex", alignItems: "center", gap: "4px",
                  }}>
                  {active && <Check size={10} />}
                  {brand}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Save ── */}
        <button onClick={handleSave}
          style={{
            width: "100%", padding: "14px", borderRadius: "12px",
            background: saved ? "#DCFCFF" : "#352D27",
            border: "none", color: saved ? "#352D27" : "#F5F5F5",
            fontSize: "14px", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "background 0.2s",
          }}>
          {saved ? <><Check size={16} /> Preferences saved</> : "Save preferences"}
        </button>
      </div>
    </main>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", height: "40px", padding: "0 14px",
  border: "1px solid rgba(53,45,39,0.15)", borderRadius: "8px",
  fontSize: "13px", color: "#352D27", background: "#fff", outline: "none",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 20px", marginBottom: "16px", border: "1px solid rgba(53,45,39,0.07)" }}>
      <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#352D27", letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: "16px" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#637180", marginBottom: "6px" }}>{label}</label>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        fontSize: "12px", padding: "7px 14px", borderRadius: "999px",
        border: `1px solid ${active ? "#352D27" : "rgba(53,45,39,0.2)"}`,
        background: active ? "#352D27" : "#fff",
        color: active ? "#F5F5F5" : "#352D27",
        cursor: "pointer", fontWeight: active ? 600 : 400,
        display: "inline-flex", alignItems: "center", gap: "5px",
        transition: "all 0.15s",
      }}>
      {active && <Check size={11} />}
      {label}
    </button>
  );
}
