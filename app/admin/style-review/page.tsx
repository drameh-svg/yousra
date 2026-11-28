"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Ranked = { style: string; score: number; rank: number };
type Item = {
  id: string;
  title: string;
  image: string | null;
  store?: string;
  ranked: Ranked[];
  modelVersion?: string;
};

export default function StyleReviewPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; agreed: number; agreementPct: number | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queue, summary] = await Promise.all([
        api<{ items: Item[]; styles: string[]; note?: string }>("/admin/style-review/items?count=12"),
        api<{ total: number; agreed: number; agreementPct: number | null }>("/admin/style-review/stats"),
      ]);
      setItems(queue.items || []);
      setStyles(queue.styles || []);
      setNote(queue.note || "");
      setStats(summary);
      setError(null);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      setError(err.status === 403 ? "forbidden" : err.message || "error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function label(productId: string, style: string) {
    setBusy(productId);
    try {
      await api("/admin/style-review/labels", "POST", { productId, style });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reclassify(productId: string) {
    setBusy(productId);
    try {
      await api("/admin/style-review/reclassify", "POST", { productId, force: true });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error === "forbidden") {
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <h1 className="mb-3 text-3xl">Team access only</h1>
        <p className="text-sm text-stone-500">
          Add your email to <code>ADMIN_EMAILS</code>, then reopen this page.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs uppercase tracking-widest text-stone-400">Admin</p>
      <h1 className="mb-2 text-3xl text-stone-900">Aesthetic classifier review</h1>
      <p className="mb-6 max-w-2xl text-sm text-stone-500">
        {note || "Review retailer product photos. Board/Colab metrics are not product accuracy."}
      </p>
      {stats ? (
        <p className="mb-6 text-sm text-stone-600">
          Labels: {stats.total} · Top-1 agreement: {stats.agreementPct ?? "—"}%
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="border border-stone-200 bg-white p-4">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="mb-3 aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="mb-3 flex aspect-[3/4] items-center justify-center bg-stone-100 text-sm text-stone-400">
                Missing image
              </div>
            )}
            <h2 className="mb-1 text-sm font-medium text-stone-900">{item.title}</h2>
            <p className="mb-2 text-xs text-stone-400">{item.store}</p>
            <ol className="mb-3 space-y-1 text-xs text-stone-600">
              {(item.ranked || []).map((r) => (
                <li key={r.rank}>
                  #{r.rank} {r.style} · {Number(r.score).toFixed(3)}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {styles.map((style) => (
                <button
                  key={style}
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => void label(item.id, style)}
                  className="border border-stone-300 px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  {style}
                </button>
              ))}
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => void reclassify(item.id)}
                className="border border-stone-300 px-2 py-1 text-[11px] text-stone-500"
              >
                Reclassify
              </button>
            </div>
          </article>
        ))}
      </div>
      {!items.length && !error ? (
        <p className="text-sm text-stone-500">No unclassified catalog items with style predictions yet.</p>
      ) : null}
    </main>
  );
}
