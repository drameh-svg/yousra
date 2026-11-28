"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { aesthetics, aestheticFilterId, type Aesthetic } from "@/lib/products";
import {useCatalog} from "@/lib/use-catalog";
import {toCard} from "@/lib/catalog";
import {AccountGate} from "@/components/account-gate";
import {useRouter} from "next/navigation";
import {useSession} from "@/components/session-provider";

const CLOTHING_TYPES = ["Dresses", "Skirts", "Tops", "Pants", "Abayas"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = ["Black", "White", "Brown", "Beige", "Green", "Blue", "Pink", "Red", "Purple", "Yellow"];

interface AdvancedFilters {
  color: string;
  size: string;
  clothingType: string;
  priceMin: string;
  priceMax: string;
}

const DEFAULT_ADVANCED: AdvancedFilters = { color: "", size: "", clothingType: "", priceMin: "", priceMax: "" };

export default function Home(){return <AccountGate><HomeFeed/></AccountGate>}

function HomeFeed() {
  const session=useSession(),router=useRouter();
  const [query,setQuery]=useState('');
  const [active,setActive]=useState<Aesthetic|null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  // The panel edits a draft; the feed reloads once on Apply instead of on every tap or keystroke.
  const [draft, setDraft] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const panelRef = useRef<HTMLDivElement>(null);

  const catalogParams: Record<string, string> = {};
  if (active) catalogParams.style = aestheticFilterId[active] || active.toLowerCase().replace(/\s+/g, "_");
  if (advanced.color) catalogParams.color = advanced.color.toLowerCase();
  if (advanced.size) catalogParams.size = advanced.size.toLowerCase();
  if (advanced.clothingType) catalogParams.category = advanced.clothingType.toLowerCase();
  // Price is filtered on the server so every page of the feed respects it, not just what is already loaded.
  const priceMin = Number(advanced.priceMin), priceMax = Number(advanced.priceMax);
  if (advanced.priceMin && Number.isFinite(priceMin) && priceMin >= 0) catalogParams.minPrice = String(priceMin);
  if (advanced.priceMax && Number.isFinite(priceMax) && priceMax > 0 && !(advanced.priceMin && priceMax < priceMin)) catalogParams.maxPrice = String(priceMax);

  const catalog=useCatalog('',catalogParams);
  const sentinel=useRef<HTMLDivElement>(null);
  const {canLoad,loading,more,error,loadMore}=catalog;

  const filtered=catalog.items.filter(p=>!session.reactions[p.id]?.disliked);

  useEffect(()=>{
    const node=sentinel.current;
    if(!node||!canLoad||loading||more||error||!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void loadMore()},{rootMargin:'400px'});
    observer.observe(node);return()=>observer.disconnect();
  },[canLoad,loading,more,error,loadMore]);

  useEffect(() => {
    if (!showPanel) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowPanel(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPanel]);

  function search(e:FormEvent){e.preventDefault();if(query.trim())router.push('/search/results?q='+encodeURIComponent(query.trim()))}

  const hasAdvanced = Object.values(advanced).some(Boolean);
  const clearAll = () => { setQuery(""); setActive(null); setAdvanced(DEFAULT_ADVANCED); };
  const hasFilters = !!query || !!active || hasAdvanced;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero */}
      <section style={{ padding: "40px 20px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,52px)", color: "#352D27", lineHeight: 1.1, marginBottom: "10px" }}>
          Find sutra with Yusra.
        </h1>
        <p style={{ fontSize: "14px", color: "#637180", maxWidth: "380px", margin: "0 auto 28px", lineHeight: 1.65 }}>
          Modest fashion that feels like you. Scroll your feed or search for a specific piece.
        </p>

        {/* Search */}
        <form onSubmit={search} style={{ position: "relative", maxWidth: "520px", margin: "0 auto" }}>
          <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#637180", pointerEvents: "none" }} />
          <input
            type="search"
            aria-label="Search clothing"
            maxLength={300}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "black maxi skirt" or "cream blazer"'
            style={{ width: "100%", height: "44px", paddingLeft: "40px", paddingRight: "40px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "999px", background: "#fff", fontSize: "13px", color: "#352D27", outline: "none" }}
          />
          <button type="submit" aria-label="Search clothing now" style={{position:"absolute",right:query?36:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#637180"}}><Search size={14}/></button>
          {query && (
            <button type="button" onClick={() => setQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#637180", display: "flex", alignItems: "center" }}>
              <X size={13} />
            </button>
          )}
        </form>
      </section>

      {/* Aesthetic filters + advanced filter toggle */}
      <section style={{ padding: "0 20px 16px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", alignItems: "center", position: "relative" }}>
        {aesthetics.map((a) => (
          <button
            key={a}
            onClick={() => setActive(active === a ? null : a)}
            style={{
              fontSize: "13px", padding: "7px 18px", borderRadius: "999px", border: "1px solid",
              borderColor: active === a ? "#352D27" : "rgba(53,45,39,0.2)",
              background: active === a ? "#352D27" : "#fff",
              color: active === a ? "#F5F5F5" : "#352D27",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {a}
          </button>
        ))}

        {/* Advanced filter toggle */}
        <button
          onClick={() => { if (!showPanel) setDraft(advanced); setShowPanel(v => !v); }}
          aria-label="Advanced filters"
          aria-expanded={showPanel}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "13px", padding: "7px 14px", borderRadius: "999px", border: "1px solid",
            borderColor: hasAdvanced ? "#352D27" : "rgba(53,45,39,0.2)",
            background: hasAdvanced ? "#352D27" : "#fff",
            color: hasAdvanced ? "#F5F5F5" : "#637180",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <SlidersHorizontal size={13} />
          {hasAdvanced ? `Filters (${Object.values(advanced).filter(Boolean).length})` : "Filters"}
        </button>

        {hasFilters && (
          <button onClick={clearAll} style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "999px", border: "1px solid rgba(53,45,39,0.2)", background: "transparent", color: "#637180", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <X size={11} /> Clear all
          </button>
        )}

        {/* Advanced filter panel */}
        {showPanel && (
          <div
            ref={panelRef}
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
              background: "#fff", border: "1px solid rgba(53,45,39,0.12)", borderRadius: "16px",
              padding: "20px", zIndex: 50, width: "min(360px, 90vw)",
              boxShadow: "0 8px 32px rgba(53,45,39,0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#352D27" }}>Advanced filters</p>
              {Object.values(draft).some(Boolean) && (
                <button onClick={() => setDraft(DEFAULT_ADVANCED)} style={{ fontSize: "11px", color: "#637180", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Reset
                </button>
              )}
            </div>

            <FilterGroup label="Clothing type">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {CLOTHING_TYPES.map(t => (
                  <PillButton key={t} label={t} active={draft.clothingType === t}
                    onClick={() => setDraft(f => ({ ...f, clothingType: f.clothingType === t ? "" : t }))} />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Size">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {SIZES.map(s => (
                  <PillButton key={s} label={s} active={draft.size === s}
                    onClick={() => setDraft(f => ({ ...f, size: f.size === s ? "" : s }))} />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Color">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {COLORS.map(c => (
                  <PillButton key={c} label={c} active={draft.color === c}
                    onClick={() => setDraft(f => ({ ...f, color: f.color === c ? "" : c }))} />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Price range">
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number" min="0" placeholder="Min $"
                  value={draft.priceMin}
                  onChange={e => setDraft(f => ({ ...f, priceMin: e.target.value }))}
                  style={{ flex: 1, height: "36px", padding: "0 10px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "8px", fontSize: "13px", color: "#352D27", outline: "none" }}
                />
                <span style={{ fontSize: "12px", color: "#637180" }}>–</span>
                <input
                  type="number" min="0" placeholder="Max $"
                  value={draft.priceMax}
                  onChange={e => setDraft(f => ({ ...f, priceMax: e.target.value }))}
                  style={{ flex: 1, height: "36px", padding: "0 10px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "8px", fontSize: "13px", color: "#352D27", outline: "none" }}
                />
              </div>
            </FilterGroup>

            <button
              onClick={() => { setAdvanced(draft); setShowPanel(false); }}
              style={{ width: "100%", marginTop: "4px", height: "38px", background: "#352D27", color: "#F5F5F5", border: "none", borderRadius: "999px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
            >
              Apply
            </button>
          </div>
        )}
      </section>

      {/* Results count */}
      <div style={{ padding: "0 20px 10px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#637180" }}>
          {loading?'Finding pieces for you…':`${filtered.length} pieces discovered`}
          {active ? ` · ${active}` : ""}
          {advanced.clothingType ? ` · ${advanced.clothingType}` : ""}
          {advanced.color ? ` · ${advanced.color}` : ""}
          {advanced.size ? ` · Size ${advanced.size}` : ""}
          {(advanced.priceMin || advanced.priceMax) ? ` · $${advanced.priceMin||"0"}–$${advanced.priceMax||"∞"}` : ""}
          {query ? ` · "${query}"` : ""}
        </p>
      </div>

      {/* Masonry feed */}
      <section style={{ padding: "0 12px 60px" }}>
        {!filtered.length&&!loading&&!more&&!canLoad&&!error ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#637180", fontSize: "14px", marginBottom: "12px" }}>Nothing matched — try a different search or remove the aesthetic filter.</p>
            <button onClick={clearAll} style={{ fontSize: "13px", color: "#352D27", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Clear all filters</button>
          </div>
        ) : (
          <div className="masonry">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={toCard(p)} />
            ))}
          </div>
        )}
        {error?<p role="alert" style={{textAlign:'center',fontSize:13,marginTop:20}}>{error} <button onClick={catalog.reload} style={{textDecoration:'underline'}}>Try again</button></p>:null}
        {catalog.response?.warnings?.map(w=><p key={w} role="status" style={{textAlign:'center',fontSize:12,color:'var(--muted)',marginTop:12}}>{w}</p>)}
        <div ref={sentinel} style={{textAlign:'center',padding:'32px 0'}}>
          {loading||more?<p role="status" style={{fontSize:13,color:'var(--muted)'}}>{more?'Finding more pieces…':'Finding pieces for you…'}</p>:canLoad?<button onClick={()=>void loadMore()} style={{border:'1px solid var(--border)',background:'white',borderRadius:999,padding:'10px 24px',cursor:'pointer'}}>More pieces</button>:filtered.length?<p style={{fontSize:12,color:'var(--muted)'}}>You&apos;re up to date for now. <button onClick={catalog.reload} style={{textDecoration:'underline'}}>Refresh discoveries</button></p>:null}
        </div>
      </section>
    </main>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#637180", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</p>
      {children}
    </div>
  );
}

function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: "12px", padding: "5px 12px", borderRadius: "999px", border: "1px solid",
        borderColor: active ? "#352D27" : "rgba(53,45,39,0.18)",
        background: active ? "#352D27" : "#fff",
        color: active ? "#F5F5F5" : "#352D27",
        cursor: "pointer", transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}
