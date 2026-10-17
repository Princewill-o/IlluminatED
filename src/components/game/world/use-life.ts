"use client";

import { useCallback, useEffect, useState } from "react";

import { type LifeState, cooled, freshLife } from "@/game/core/law";

const KEY = "illuminated:life";
const EVENT = "illuminated:life";

export function readLife(): LifeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return cooled({ ...freshLife(), ...(JSON.parse(raw) as LifeState) }, Date.now());
  } catch {
    // Storage blocked: fresh each visit.
  }
  return freshLife();
}

export function writeLife(s: LifeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Not saved; fine for this visit.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Your wanted level, health and prison state, kept in the browser and ticking with the clock. */
export function useLife() {
  const [life, setLife] = useState<LifeState>(freshLife);
  useEffect(() => {
    setLife(readLife());
    const t = setInterval(() => setLife(readLife()), 1000);
    const on = () => setLife(readLife());
    window.addEventListener(EVENT, on);
    return () => {
      clearInterval(t);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  const update = useCallback((f: (s: LifeState) => LifeState) => {
    const next = f(readLife());
    writeLife(next);
    setLife(next);
  }, []);
  return { life, update };
}
