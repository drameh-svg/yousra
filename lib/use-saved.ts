"use client";

import { useState, useEffect, useCallback } from "react";

const KEY = "yousra_saved";
const EV = "yousra_saved_change";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EV));
}

/** Per-product hook — stays in sync across all card instances on the page. */
export function useSaved(productId: string) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readIds().includes(productId));
    const sync = () => setSaved(readIds().includes(productId));
    window.addEventListener(EV, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EV, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  const toggle = useCallback(() => {
    const ids = readIds();
    const next = ids.includes(productId)
      ? ids.filter((x) => x !== productId)
      : [...ids, productId];
    writeIds(next);
    setSaved(!ids.includes(productId));
  }, [productId]);

  return { saved, toggle };
}

/** Whole-list hook — for the Saved page. */
export function useSavedIds() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readIds());
    const sync = () => setIds(readIds());
    window.addEventListener(EV, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EV, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ids;
}
