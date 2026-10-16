"use client";

import { useEffect, useState } from "react";

import { type Activity, type Needs, apply, decay, fresh } from "@/game/core/needs";

const KEY = "illuminated:needs";
const EVENT = "illuminated:needs";

function read(): Needs {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return decay(JSON.parse(raw) as Needs, now);
  } catch {
    // Storage blocked: start fresh each visit.
  }
  return fresh(now);
}

function write(n: Needs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(n));
  } catch {
    // Not saved; fine for this visit.
  }
}

/** Do something that changes your needs, from anywhere in the app. */
export function doActivity(a: Activity) {
  if (typeof window === "undefined") return;
  const n = apply(read(), a, Date.now());
  write(n);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: a }));
}

/** Your needs, kept up to date as time passes and you do things. */
export function useNeeds() {
  const [needs, setNeeds] = useState<Needs | null>(null);
  const [last, setLast] = useState<Activity | null>(null);
  useEffect(() => {
    setNeeds(read());
    const tick = setInterval(() => setNeeds(read()), 30_000);
    const on = (e: Event) => {
      setNeeds(read());
      setLast((e as CustomEvent<Activity>).detail);
    };
    window.addEventListener(EVENT, on);
    return () => {
      clearInterval(tick);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), 2500);
    return () => clearTimeout(t);
  }, [last]);
  return { needs, last };
}
