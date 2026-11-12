"use client";

import { useState, useEffect } from "react";

const KEY = "yousra_prefs";

export interface Prefs {
  name: string;
  email: string;
  aesthetics: string[];
  modesty: "Conservative" | "Moderate" | "Relaxed" | "";
  sizes: string[];
  budget: string;
  brands: string[];
  onboardingDone: boolean;
  styleVotes: {id:string;like:boolean}[];
}

const DEFAULT: Prefs = {
  name: "",
  email: "",
  aesthetics: [],
  modesty: "",
  sizes: [],
  budget: "",
  brands: [],
  onboardingDone: false,
  styleVotes: [],
};

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT;
  }
}

export function writePrefs(prefs: Partial<Prefs>) {
  const current = readPrefs();
  const next = { ...current, ...prefs };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("yousra_prefs_change"));
  return next;
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);

  useEffect(() => {
    queueMicrotask(()=>setPrefs(readPrefs()));
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("yousra_prefs_change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("yousra_prefs_change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (patch: Partial<Prefs>) => setPrefs(writePrefs(patch));
  return { prefs, save };
}
