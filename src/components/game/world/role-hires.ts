"use client";

import { useEffect, useState } from "react";

import { loadRoleCareers, loadRoleHires } from "@/app/games/world/actions";

const KEY = "illuminated:hired-roles";
const EVENT = "illumed:hires";

function localHires(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

/** Remember a hire on this device too (guests and previews have no account to save it to). */
export function addLocalHire(role: string) {
  try { localStorage.setItem(KEY, JSON.stringify(Array.from(new Set([...localHires(), role])))); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}

/** Roles you've been hired for: passed the interview, or already worked before interviews existed. */
export const useRoleHires = () => useRoleHiresState().hires;

export function useRoleHiresState() {
  const [hires, setHires] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => Promise.all([loadRoleHires().catch(() => []), loadRoleCareers().catch(() => ({}))]).then(([hired, careers]) => {
      if (!alive) return;
      const worked = Object.entries(careers as Record<string, { xp: number; jobs: number }>).filter(([, c]) => c.jobs > 0 || c.xp > 0).map(([id]) => id);
      setHires(new Set([...hired, ...worked, ...localHires()]));
      setReady(true);
    });
    void load();
    window.addEventListener(EVENT, load);
    return () => { alive = false; window.removeEventListener(EVENT, load); };
  }, []);
  return { hires, ready };
}
