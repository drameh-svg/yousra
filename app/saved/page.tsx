"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useSession} from "@/components/session-provider";
import {api,type ApiProduct} from "@/lib/api";
import {toCard} from "@/lib/catalog";
import { Bookmark } from "lucide-react";
import { useSavedIds } from "@/lib/use-saved";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export default function SavedPage() {
  const ids = useSavedIds();
  const session=useSession();
  const [remote,setRemote]=useState<ApiProduct[]>([]),[error,setError]=useState('');
  const collection=session.collections.find(c=>!c.system&&c.name==='Saved');
  useEffect(()=>{let active=true;if(!session.user||!collection){queueMicrotask(()=>{if(active)setRemote([])});return()=>{active=false}}void api<{items:ApiProduct[]}>(`/collections/${collection.id}`).then(d=>{if(active){setRemote(d.items);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[session.user,collection]);
  const savedProducts = session.user?remote.map(toCard):products.filter((p) => ids.includes(p.id));

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(26px,3vw,36px)", color: "#352D27", marginBottom: "6px",
        }}>
          Good finds are worth keeping.
        </h1>
        <p style={{ fontSize: "13px", color: "#637180", marginBottom: "32px" }}>
          Your saved pieces are here whenever you&apos;re ready to come back.
        </p>

        {error?<p role="alert">{error}</p>:null}
        {session.loading?<p>Loading saved pieces…</p>:savedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <Bookmark size={36} style={{ color: "rgba(53,45,39,0.15)", marginBottom: "16px" }} />
            <p style={{ fontSize: "15px", color: "#637180", marginBottom: "8px" }}>
              Nothing saved yet.
            </p>
            <p style={{ fontSize: "13px", color: "#637180", marginBottom: "24px", maxWidth: "280px", margin: "0 auto 24px", lineHeight: 1.6 }}>
              Explore pieces and tap the save icon when something catches your eye.
            </p>
            <Link href="/"
              style={{
                display: "inline-block", background: "#352D27", color: "#F5F5F5",
                fontSize: "13px", fontWeight: 600, padding: "11px 24px",
                borderRadius: "999px", textDecoration: "none",
              }}>
              Start exploring →
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "12px", color: "#637180", marginBottom: "20px" }}>
              {savedProducts.length} {savedProducts.length === 1 ? "piece" : "pieces"} saved
            </p>
            <div className="masonry">
              {savedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
