"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import {useSession} from '@/components/session-provider';
import {api} from '@/lib/api';
import { nextStylePiece, type StyleVote } from "@/lib/style-discovery";
import { writePrefs } from "@/lib/use-prefs";
import { BRAND_LIST } from "@/lib/brands";
import { products } from "@/lib/products";

type Aesthetic = "Minimal" | "Romantic" | "Streetwear" | "Classic" | "Casual";

const AESTHETICS: { label: Aesthetic; image: string; description: string }[] = [
  { label: "Minimal", image: products.find((p) => p.id === "1")!.image, description: "Clean lines, neutral tones" },
  { label: "Romantic", image: products.find((p) => p.id === "7")!.image, description: "Floral, lace, soft drapes" },
  { label: "Streetwear", image: products.find((p) => p.id === "13")!.image, description: "Urban, oversized, bold" },
  { label: "Classic", image: products.find((p) => p.id === "19")!.image, description: "Timeless, tailored, refined" },
  { label: "Casual", image: products.find((p) => p.id === "28")!.image, description: "Relaxed, everyday, easy" },
];

const MAX_CHOICES = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const session=useSession();
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [selectedAesthetics, setSelectedAesthetics] = useState<Aesthetic[]>([]);

  // Step 2
  const [votes,setVotes]=useState<StyleVote[]>([]);
  const [coverage,setCoverage]=useState<"Conservative"|"Moderate"|"Relaxed">("Moderate");
  const [budget,setBudget]=useState("");
  const [brandQuery,setBrandQuery]=useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const piece=nextStylePiece(selectedAesthetics,votes);
  const visibleBrands=BRAND_LIST.filter(b=>!selectedBrands.includes(b)&&b.toLowerCase().includes(brandQuery.toLowerCase())).slice(0,6);



  function toggleAesthetic(a: Aesthetic) {
    setSelectedAesthetics((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  function toggleBrand(b: string) {
    setSelectedBrands((prev) => {
      if (prev.includes(b)) return prev.filter((x) => x !== b);
      if (prev.length >= 3) return prev;
      return [...prev, b];
    });
  }

  function answerQuiz(like:boolean){
    if(!piece)return;
    const next=[...votes,{id:piece.id,like}];setVotes(next);
    if(next.length>=MAX_CHOICES||!nextStylePiece(selectedAesthetics,next))setStep(3);
  }
  async function finish(){
    if(saving||session.loading)return;
    setSaving(true);setSaveError('');
    try{
    if(session.user&&session.profile){
      const preferences=structuredClone(session.profile.preferences);
      preferences.preferredBrands=selectedBrands;preferences.styles=selectedAesthetics.map(s=>s.toLowerCase());preferences.budgetMax=budget?Number(budget):null;
      for(const [category,rule] of Object.entries(preferences.rules)){
        rule.sleeves=coverage==='Conservative'?'long':coverage==='Moderate'?'elbow':'any';
        rule.neckline=coverage==='Conservative'?'high':coverage==='Moderate'?'medium':'any';
        rule.fit=coverage==='Conservative'?'loose':'any';
        rule.length=['dress','skirt'].includes(category)?coverage==='Conservative'?'maxi':coverage==='Moderate'?'midi':'any':'any';
        rule.transparency=coverage==='Relaxed'?'any':'opaque';rule.slits=coverage==='Conservative'?'none':'any';rule.cutouts=coverage==='Relaxed'?'any':'none';
      }
      await api('/profile','PUT',{preferences,coveragePreset:coverage,styleVotes:votes,completeOnboarding:true});
      await session.reload();
    }
    writePrefs({aesthetics:selectedAesthetics,styleVotes:votes,modesty:coverage,budget,brands:selectedBrands,onboardingDone:true});
    router.push('/');
    }catch(e){setSaveError(e instanceof Error?e.message:'Could not save your preferences.')}finally{setSaving(false)}
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(53,45,39,0.08)" }}>
        <div style={{
          height: "100%", background: "#352D27",
          width: `${(step / 3) * 100}%`,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px" }}>
        <button onClick={() => { if(step===2)setStep(3);else finish(); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#637180", display: "flex", alignItems: "center", gap: "5px" }}>
          {step===2?"Skip examples":"Set up later"} <X size={13} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px 60px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>

        {/* ── Step 1: Aesthetics ── */}
        {step === 1 && (
          <>
            <StepHeader
              step={1} total={3}
              title="What's your style?"
              subtitle="Pick the styles you love. Next, just a few choices to fine-tune your feed."
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", width: "100%", marginBottom: "32px" }}
                 className="aesthetic-grid">
              {AESTHETICS.map((a) => {
                const active = selectedAesthetics.includes(a.label);
                return (
                  <button key={a.label} onClick={() => toggleAesthetic(a.label)}
                    style={{
                      position: "relative", border: `2px solid ${active ? "#352D27" : "transparent"}`,
                      borderRadius: "14px", overflow: "hidden", cursor: "pointer",
                      background: "none", padding: 0, textAlign: "left",
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image} alt={a.label} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(53,45,39,0.75) 0%, transparent 50%)",
                      display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "12px",
                    }}>
                      <p style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontSize: "16px", color: "#F5F5F5", fontWeight: 400, marginBottom: "2px" }}>{a.label}</p>
                      <p style={{ fontSize: "10px", color: "rgba(245,245,245,0.7)" }}>{a.description}</p>
                    </div>
                    {active && (
                      <div style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "#DCFCFF", borderRadius: "50%", width: "24px", height: "24px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Check size={13} color="#352D27" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <NavRow
              onNext={() => {setVotes([]);setStep(2)}}
              nextDisabled={selectedAesthetics.length === 0}
              nextLabel="Continue"
            />
          </>
        )}

        {/* ── Step 2: Modesty quiz ── */}
        {step === 2 && piece && (
          <>
            <StepHeader
              step={2} total={3}
              title="Is this your style?"
              subtitle={`${votes.length + 1} of ${MAX_CHOICES} quick choices · Each answer helps choose the next piece. Coverage comes separately.`}
            />
            <div style={{ width: "100%", maxWidth: "280px", marginBottom: "32px" }}>
              {/* Quiz image */}
              <div style={{ borderRadius: "16px", overflow: "hidden", marginBottom: "24px", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={piece.image} alt={piece.title}
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                {/* progress dots */}
                <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
                  {Array.from({length:MAX_CHOICES}, (_, i) => (
                    <div key={i} style={{
                      width: i === votes.length ? "18px" : "6px", height: "6px",
                      borderRadius: "999px", background: i <= votes.length ? "#F5F5F5" : "rgba(245,245,245,0.35)",
                      transition: "all 0.2s",
                    }} />
                  ))}
                </div>
              </div>

              {/* Yes / No */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => answerQuiz(false)}
                  style={{
                    flex: 1, padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
                    background: "#fff", border: "1px solid rgba(53,45,39,0.15)",
                    color: "#352D27", cursor: "pointer",
                  }}>
                  Not for me
                </button>
                <button onClick={() => answerQuiz(true)}
                  style={{
                    flex: 1, padding: "14px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
                    background: "#352D27", border: "none", color: "#F5F5F5", cursor: "pointer",
                  }}>
                  Love this
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Brands ── */}
        {step === 3 && (
          <>
            <StepHeader
              step={3} total={3}
              title="Make it comfortable."
              subtitle="Choose your coverage and optional budget. You can refine these in your profile anytime."
            />
            <div style={{width:'100%',maxWidth:520,marginBottom:24,display:'grid',gap:16}}>
              <label style={{fontSize:13}}>Coverage preference
                <select value={coverage} onChange={e=>setCoverage(e.target.value as typeof coverage)} style={{display:'block',width:'100%',padding:12,marginTop:6,border:'1px solid var(--border)',borderRadius:10,background:'white'}}>
                  <option value="Conservative">More coverage</option><option value="Moderate">Balanced coverage</option><option value="Relaxed">Flexible coverage</option>
                </select>
              </label>
              <label style={{fontSize:13}}>Maximum price in USD (optional)
                <input type="number" min="1" max="100000" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="No limit" style={{display:'block',width:'100%',padding:12,marginTop:6,border:'1px solid var(--border)',borderRadius:10,background:'white'}}/>
              </label>
              <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>More coverage: long sleeves, high necklines, loose fits and maxi skirts or dresses. Balanced: elbow-length sleeves, medium necklines and midi lengths. Flexible: no preset coverage limits. These presets can be refined in Profile preferences.</p>
              <details><summary style={{cursor:'pointer',fontSize:13}}>Brands you love? Optional · up to 3</summary>
              <label style={{display:'block',fontSize:12,marginTop:12}}>Find a brand
                <input type="search" value={brandQuery} onChange={e=>setBrandQuery(e.target.value)} placeholder="Search brands" style={{display:'block',width:'100%',padding:10,marginTop:6,border:'1px solid var(--border)',borderRadius:10,background:'white'}}/>
              </label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>{selectedBrands.map(b=><button key={b} aria-label={`Remove ${b}`} onClick={()=>toggleBrand(b)} style={{borderRadius:999,padding:'8px 12px',background:'#352D27',color:'white',border:'none'}}>{b} ×</button>)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
              {visibleBrands.map((brand) => {
                const active = selectedBrands.includes(brand);
                const full = selectedBrands.length >= 3 && !active;
                return (
                  <button key={brand} onClick={() => toggleBrand(brand)}
                    disabled={full}
                    style={{
                      fontSize: "13px", padding: "8px 16px", borderRadius: "999px",
                      border: "1px solid",
                      borderColor: active ? "#352D27" : "rgba(53,45,39,0.2)",
                      background: active ? "#352D27" : "#fff",
                      color: active ? "#F5F5F5" : full ? "rgba(53,45,39,0.3)" : "#352D27",
                      cursor: full ? "default" : "pointer",
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s",
                    }}>
                    {active && <Check size={11} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />}
                    {brand}
                  </button>
                );
              })}
            </div>
              {!visibleBrands.length?<p style={{fontSize:12,color:'var(--muted)'}}>No more matching brands.</p>:null}
              </details>
            </div>
            {saveError?<p role="alert">{saveError}</p>:null}
            <NavRow
              onNext={()=>{void finish()}}
              nextDisabled={saving||session.loading}
              nextLabel={saving?"Saving…":"Finish — take me to Yousra"}
              onBack={() => setStep(1)}
            />
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .aesthetic-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </main>
  );
}

function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "32px", paddingTop: "8px" }}>
      <p style={{ fontSize: "11px", color: "#637180", marginBottom: "10px", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>
        Step {step} of {total}
      </p>
      <h1 style={{
        fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
        fontWeight: 400, fontSize: "clamp(24px,3vw,36px)", color: "#352D27",
        marginBottom: "10px", lineHeight: 1.2,
      }}>{title}</h1>
      <p style={{ fontSize: "13px", color: "#637180", maxWidth: "420px", margin: "0 auto", lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

function NavRow({ onNext, nextDisabled, nextLabel, onBack }: {
  onNext: () => void; nextDisabled: boolean; nextLabel: string; onBack?: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      {onBack && (
        <button onClick={onBack}
          style={{ background: "none", border: "1px solid rgba(53,45,39,0.2)", borderRadius: "12px", padding: "12px 20px", fontSize: "13px", color: "#637180", cursor: "pointer" }}>
          Back
        </button>
      )}
      <button onClick={onNext} disabled={nextDisabled}
        style={{
          background: nextDisabled ? "rgba(53,45,39,0.15)" : "#352D27",
          border: "none", borderRadius: "12px", padding: "12px 28px",
          fontSize: "13px", fontWeight: 600, color: "#F5F5F5",
          cursor: nextDisabled ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
        {nextLabel} {!nextDisabled && <ChevronRight size={15} />}
      </button>
    </div>
  );
}
