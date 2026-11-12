"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { aesthetics, type Aesthetic } from "@/lib/products";
import {useCatalog} from "@/lib/use-catalog";
import {toCard} from "@/lib/catalog";
import {AccountGate} from "@/components/account-gate";
import {useRouter} from "next/navigation";
import {useSession} from "@/components/session-provider";

export default function Home(){return <AccountGate><HomeFeed/></AccountGate>}
function HomeFeed() {
  const session=useSession(),router=useRouter();
  const [query,setQuery]=useState('');
  const [active,setActive]=useState<Aesthetic|null>(null);
  const catalog=useCatalog('',active?{style:active.toLowerCase()}:{});
  const sentinel=useRef<HTMLDivElement>(null);
  const {canLoad,loading,more,error,loadMore}=catalog;
  const filtered=catalog.items.filter(p=>!session.reactions[p.id]?.disliked);
  useEffect(()=>{
    const node=sentinel.current;
    if(!node||!canLoad||loading||more||error||!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void loadMore()},{rootMargin:'400px'});
    observer.observe(node);return()=>observer.disconnect();
  },[canLoad,loading,more,error,loadMore]);
  function search(e:FormEvent){e.preventDefault();if(query.trim())router.push('/search/results?q='+encodeURIComponent(query.trim()))}
  const clearAll = () => { setQuery(""); setActive(null); };
  const hasFilters = !!query || !!active;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero */}
      <section style={{ padding: "40px 20px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,52px)", color: "#352D27", lineHeight: 1.1, marginBottom: "10px" }}>
          Find sutra with Yousra.
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

      {/* Aesthetic filters */}
      <section style={{ padding: "0 20px 16px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
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
        {hasFilters && (
          <button onClick={clearAll} style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "999px", border: "1px solid rgba(53,45,39,0.2)", background: "transparent", color: "#637180", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <X size={11} /> Clear
          </button>
        )}
      </section>

      {/* Results count */}
      <div style={{ padding: "0 20px 10px", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#637180" }}>
          {loading?'Finding pieces for you…':`${filtered.length} pieces discovered`}
          {active ? ` · ${active}` : ""}
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
          {loading||more?<p role="status" style={{fontSize:13,color:'var(--muted)'}}>{more?'Finding more pieces…':'Finding pieces for you…'}</p>:canLoad?<button onClick={()=>void loadMore()} style={{border:'1px solid var(--border)',background:'white',borderRadius:999,padding:'10px 24px',cursor:'pointer'}}>More pieces</button>:filtered.length?<p style={{fontSize:12,color:'var(--muted)'}}>You’re up to date for now. <button onClick={catalog.reload} style={{textDecoration:'underline'}}>Refresh discoveries</button></p>:null}
        </div>
      </section>
    </main>
  );
}
