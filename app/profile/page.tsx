"use client";

import { useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefs, writePrefs, type Prefs } from "@/lib/use-prefs";
import {useSession} from "@/components/session-provider";
import {api} from "@/lib/api";
import {accountPreferences} from "@/lib/profile-preferences";
import { BRAND_LIST } from "@/lib/brands";
import { brandLogo } from "@/lib/brand-logos";
import { ModestyQuiz, type QuizResult } from "@/components/modesty-quiz";
import { styleLabel } from "@/lib/api";
import { LogOut, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SectionId = "modesty" | "aesthetics" | "sizes" | "budget" | "brands" | "account";
type Aesthetic = "Y2K" | "Coquette" | "90s Minimalism" | "Clean Girl" | "Grunge" | "Streetwear" | "Earthy";
const AESTHETICS: Aesthetic[] = ["90s Minimalism", "Clean Girl", "Coquette", "Earthy", "Grunge", "Streetwear", "Y2K"];
const AESTHETIC_IDS: Record<string, string> = {
  "90s Minimalism": "90s_minimalism",
  "Clean Girl": "clean_girl",
  Coquette: "coquette",
  Earthy: "earthy",
  Grunge: "grunge",
  Streetwear: "streetwear",
  Y2K: "y2k",
};
const ID_TO_AESTHETIC: Record<string, Aesthetic> = Object.fromEntries(
  Object.entries(AESTHETIC_IDS).map(([label, id]) => [id, label as Aesthetic]),
) as Record<string, Aesthetic>;
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
  const session=useSession(),router=useRouter();
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
  const [form, setForm] = useState({ ...prefs });
  const [saved, setSavedState] = useState(false);
  // Find my modesty: suggested level plus any single rules tightened by her answers.
  const [quizOpen, setQuizOpen] = useState(false), [quiz, setQuiz] = useState<QuizResult | null>(null);
  // Which setting is open (Modesty first). On phones the open setting replaces the list; "All settings" goes back.
  const [section, setSection] = useState<SectionId | null>("modesty");
  const [confirmDelete, setConfirmDelete] = useState(""), [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState("");

  useEffect(() => {queueMicrotask(()=>{
    if(session.user&&session.profile){const p=session.profile.preferences;setForm({...prefs,email:session.user.email,aesthetics:p.styles.map(s=>ID_TO_AESTHETIC[s]||styleLabel[s]||s).filter((s):s is Aesthetic=>AESTHETICS.includes(s as Aesthetic)),sizes:p.sizes.map(s=>s.toUpperCase()),brands:p.preferredBrands||[],budget:p.budgetMax==null?'':p.budgetMax===50?'Under $50':p.budgetMax===100?'$50–$100':p.budgetMax===200?'$100–$200':String(p.budgetMax),modesty:(session.profile.coveragePreset||'') as Prefs['modesty']});}
    else setForm({...prefs});
  });},[prefs,session.user,session.profile]);

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

  async function handleSave(){
    if(saving||session.loading)return;setSaving(true);setError('');
    try{
      if(session.user&&session.profile){const next=accountPreferences(form,session.profile.preferences,form.modesty!==(session.profile.coveragePreset||'')||!!quiz);if(quiz&&quiz.preset===form.modesty){for(const rule of Object.values(next.rules))Object.assign(rule,Object.fromEntries(Object.entries(quiz.tweaks).filter(([f])=>f in rule)));if(quiz.allowLayering)next.allowLayering=true;}await api('/profile','PUT',{preferences:next,...(form.modesty?{coveragePreset:form.modesty}:{})});await session.reload();}
      writePrefs(form);setQuiz(null);setSavedState(true);setTimeout(()=>setSavedState(false),2000);
    }catch(e){setError(e instanceof Error?e.message:'Could not save preferences.')}finally{setSaving(false)}
  }

  async function deleteAccount(){
    setDeleting(true);setDeleteError('');
    try{await api('/account','DELETE',{confirm:'DELETE'});localStorage.clear();await session.signOut().catch(()=>{});router.push('/');}
    catch(e){setDeleteError(e instanceof Error?e.message:'Could not delete your account.');setDeleting(false);}
  }

  const modestySection = (
    <>
      <button type="button" onClick={() => setQuizOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: "12px", borderRadius: "10px", border: "1px dashed rgba(53,45,39,0.35)", background: "#FAF8F5", cursor: "pointer" }}>
        <Sparkles size={16} color="#352D27" />
        <span><span style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#352D27" }}>Find my modesty</span><span style={{ display: "block", fontSize: "12px", color: "#637180" }}>Answer 5 quick “would you wear this?” questions and we&apos;ll suggest a level. You can still pick one yourself below.</span></span>
      </button>
      {quiz && quiz.preset === form.modesty ? <p style={{ fontSize: "12px", color: "#637180", marginBottom: "10px" }}>Suggested from your answers{Object.keys(quiz.tweaks).length ? `, with a few extra rules (${Object.keys(quiz.tweaks).join(", ")})` : ""}. Save to keep it.</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {MODESTY_OPTIONS.map((opt) => (
          <button key={opt} onClick={() => setForm((f) => ({ ...f, modesty: opt }))}
            style={{ display: "flex", flexDirection: "column", textAlign: "left", padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
              border: `1px solid ${form.modesty === opt ? "#352D27" : "rgba(53,45,39,0.15)"}`, background: form.modesty === opt ? "#352D27" : "#fff", transition: "all 0.15s" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: form.modesty === opt ? "#F5F5F5" : "#352D27", marginBottom: "3px" }}>{opt}</span>
            <span style={{ fontSize: "12px", color: form.modesty === opt ? "rgba(245,245,245,0.7)" : "#637180" }}>{opt !== "" ? MODESTY_DESC[opt] : ""}</span>
          </button>
        ))}
      </div>
    </>
  );
  const brandsSection = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
      {BRAND_LIST.map((brand) => {
        const active = form.brands.includes(brand);
        const full = form.brands.length >= 10 && !active;
        return (
          <button key={brand} onClick={() => toggleBrand(brand)} disabled={full}
            style={{ fontSize: "12px", padding: "6px 13px 6px 9px", borderRadius: "999px", border: `1px solid ${active ? "#352D27" : "rgba(53,45,39,0.2)"}`,
              background: active ? "#352D27" : "#fff", color: active ? "#F5F5F5" : full ? "rgba(53,45,39,0.3)" : "#352D27", cursor: full ? "default" : "pointer",
              fontWeight: active ? 600 : 400, display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {active && <Check size={10} />}
            {brandLogo(brand) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandLogo(brand)!} alt="" width={16} height={16} loading="lazy" style={{ width: 16, height: 16, borderRadius: 4, background: "#fff" }} onError={e => { e.currentTarget.style.display = "none"; }} />
            ) : null}
            {brand}
          </button>
        );
      })}
    </div>
  );
  const accountSection = (
    <>
      <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} /></Field>
      <Field label="Email"><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" type="email" style={inputStyle} /></Field>
      {session.user ? (
        <button type="button" onClick={() => void session.signOut().then(() => router.push("/"))}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "4px", padding: "9px 16px", borderRadius: "999px", border: "1px solid rgba(53,45,39,0.2)", background: "#fff", color: "#352D27", fontSize: "13px", cursor: "pointer" }}>
          <LogOut size={14} />Sign out
        </button>
      ) : null}
    </>
  );
  const sections: { id: SectionId; title: string; hint: string; summary: string; body: React.ReactNode }[] = [
    { id: "modesty", title: "Modesty preference", hint: "How much coverage your feed and search results must have.", summary: form.modesty || "Not set", body: modestySection },
    { id: "aesthetics", title: "Aesthetics", hint: "The styles you love. Pick as many as you like.", summary: form.aesthetics.length ? form.aesthetics.join(", ") : "None yet",
      body: <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>{AESTHETICS.map((a) => <Chip key={a} label={a} active={form.aesthetics.includes(a)} onClick={() => toggle("aesthetics", a)} />)}</div> },
    { id: "sizes", title: "Sizes", hint: "We show pieces available in these sizes first.", summary: form.sizes.length ? form.sizes.join(", ") : "Any size",
      body: <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>{SIZES.map((sz) => <Chip key={sz} label={sz} active={form.sizes.includes(sz)} onClick={() => toggle("sizes", sz)} />)}</div> },
    { id: "budget", title: "Budget", hint: "The most you usually want to spend on one piece.", summary: form.budget || "Any budget",
      body: <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>{BUDGETS.map((b) => <Chip key={b} label={b} active={form.budget === b} onClick={() => setForm((f) => ({ ...f, budget: b }))} />)}</div> },
    { id: "brands", title: "Brands I love", hint: `Up to 10. We show these brands more often (${form.brands.length}/10).`, summary: form.brands.length ? `${form.brands.length} brand${form.brands.length === 1 ? "" : "s"}` : "None yet", body: brandsSection },
    { id: "account", title: "Account", hint: "Your name, email and account settings.", summary: form.email || "Your details", body: accountSection },
  ];
  const current = sections.find((x) => x.id === section);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "1040px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "clamp(26px,3vw,36px)", color: "#352D27", marginBottom: "6px" }}>
          Your profile
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "28px", lineHeight: 1.6 }}>
          Choose a setting to change what shapes your feed and search results.{" "}
          {!prefs.onboardingDone && (<Link href="/onboarding" style={{ color: "#352D27", fontWeight: 600, textDecoration: "underline" }}>Complete onboarding →</Link>)}
          {session.user&&prefs.onboardingDone?<button type="button" onClick={()=>setForm({...prefs,email:session.user!.email})} style={{fontSize:12,color:'var(--muted)',textDecoration:'underline',background:'none',border:0,cursor:'pointer',marginLeft:8}}>Use earlier preferences saved on this device</button>:null}
        </p>

        <div className="profile-layout">
          {/* ── Sidebar: every setting with its current value ── */}
          <nav aria-label="Profile settings" className={`profile-nav${current ? " has-open" : ""}`}>
            {sections.map((x) => {
              const on = x.id === section;
              return (
                <button key={x.id} type="button" onClick={() => setSection(x.id)} aria-current={on ? "page" : undefined}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", textAlign: "left", padding: "13px 16px",
                    borderRadius: "12px", border: 0, cursor: "pointer", background: on ? "#352D27" : "transparent", transition: "background 0.15s" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 600, color: on ? "#F5F5F5" : "#352D27" }}>{x.title}</span>
                    <span style={{ display: "block", fontSize: "12px", color: on ? "rgba(245,245,245,0.7)" : "#637180", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.summary}</span>
                  </span>
                  <ChevronRight size={15} color={on ? "#F5F5F5" : "#9A938C"} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </nav>

          {/* ── The setting being edited ── */}
          <section className={`profile-panel${current ? " is-open" : ""}`} aria-live="polite">
            {current ? (
              <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid rgba(53,45,39,0.08)" }}>
                <button type="button" className="profile-back" onClick={() => setSection(null)}
                  style={{ alignItems: "center", gap: "4px", fontSize: "13px", color: "#637180", background: "none", border: 0, cursor: "pointer", padding: 0, marginBottom: "14px" }}>
                  <ChevronLeft size={15} />All settings
                </button>
                <h2 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "26px", color: "#352D27", marginBottom: "4px" }}>{current.title}</h2>
                <p style={{ fontSize: "12px", color: "#637180", marginBottom: "20px", lineHeight: 1.6 }}>{current.hint}</p>
                {current.body}

                {error?<p role="alert" style={{ fontSize: "12px", color: "#991B1B", marginTop: "16px" }}>{error}</p>:null}
                <button disabled={saving||session.loading} onClick={()=>void handleSave()}
                  style={{ marginTop: "24px", width: "100%", padding: "13px", borderRadius: "12px", background: saved ? "#DCFCFF" : "#352D27", border: "none",
                    color: saved ? "#352D27" : "#F5F5F5", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s" }}>
                  {saved ? <><Check size={16} /> Saved</> : saving?"Saving…":"Save"}
                </button>

                {current.id === "account" && session.user ? (
                  <div style={{ marginTop: "28px", borderRadius: "14px", padding: "18px 20px", border: "1px solid rgba(185,28,28,0.25)", background: "#fff" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#991B1B", letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: "8px" }}>Delete account</h3>
                    <p style={{ fontSize: "12px", color: "#637180", lineHeight: 1.6, marginBottom: "12px" }}>Permanently deletes your account, preferences, likes, collections (including shared ones) and feedback. This can&apos;t be undone.</p>
                    <label style={{ display: "block", fontSize: "12px", color: "#637180", marginBottom: "6px" }}>Type <strong>DELETE</strong> to confirm</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} aria-label="Type DELETE to confirm" style={{ ...inputStyle, maxWidth: "200px" }} />
                      <button type="button" disabled={confirmDelete !== "DELETE" || deleting} onClick={() => void deleteAccount()}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "40px", borderRadius: "999px", border: "none", background: confirmDelete === "DELETE" ? "#991B1B" : "rgba(153,27,27,0.25)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: confirmDelete === "DELETE" ? "pointer" : "default" }}>
                        <Trash2 size={14} />{deleting ? "Deleting…" : "Delete my account"}
                      </button>
                    </div>
                    {deleteError ? <p role="alert" style={{ fontSize: "12px", color: "#991B1B", marginTop: "8px" }}>{deleteError}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
        {quizOpen ? <ModestyQuiz onClose={() => setQuizOpen(false)} onApply={r => { setQuiz(r); setForm(f => ({ ...f, modesty: r.preset })); setQuizOpen(false); }} /> : null}
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
