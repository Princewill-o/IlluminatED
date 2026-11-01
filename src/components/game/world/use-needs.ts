"use client";

import { useEffect, useState } from "react";

import { outfitPerks, type OutfitPerks } from "@/game/core/blocky-outfits";
import { earnSeasonXp } from "@/components/game/season/pass-store";
import { type Activity, type Needs, apply, decay, fresh } from "@/game/core/needs";

const KEY = "illuminated:needs";
const EVENT = "illuminated:needs";
let memory: Needs | null = null;
let perks: OutfitPerks = outfitPerks();

export function readNeeds(): Needs {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const old=JSON.parse(raw) as Needs,next=decay(old,now);
      next.energy=old.energy+(next.energy-old.energy)*perks.energyDecayMultiplier;
      next.focus=old.focus+(next.focus-old.focus)*perks.focusDecayMultiplier;
      return next;
    }
  } catch {
    // Storage blocked: start fresh each visit.
  }
  return memory ? decay(memory,now) : fresh(now);
}

function write(n: Needs) {
  memory=n;
  try {
    localStorage.setItem(KEY, JSON.stringify(n));
  } catch {
    // Not saved; fine for this visit.
  }
}

/** Do something that changes your needs, from anywhere in the app. */
export function doActivity(a: Activity) {
  if (typeof window === "undefined") return;
  const n = apply(readNeeds(), a, Date.now());
  if(a==="study")n.focus=Math.min(100,n.focus+perks.studyFocusBonus);
  if(a==="wave")n.social=Math.min(100,n.social+perks.socialBonus);
  if(a==="shower"||a==="bathroom")n.hygiene=Math.min(100,n.hygiene+perks.hygieneBonus);
  write(n);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: a }));
  earnSeasonXp("activity");
}

/** Capture elapsed needs with the previous outfit before changing its small life bonuses. */
export function setNeedsOutfit(top?:string) {
  if(typeof window==="undefined")return;
  write(readNeeds());perks=outfitPerks(top);window.dispatchEvent(new CustomEvent(EVENT));
}

/** Immediate street damage, clamped to the same persistent energy meter. */
export function damageEnergy(amount:number) {
  const n=readNeeds();n.energy=Math.max(0,n.energy-Math.max(0,Number.isFinite(amount)?amount:0));write(n);
  window.dispatchEvent(new CustomEvent(EVENT));return n.energy;
}

/** Your needs, kept up to date as time passes and you do things. */
export function useNeeds() {
  const [needs, setNeeds] = useState<Needs | null>(null);
  const [last, setLast] = useState<Activity | null>(null);
  useEffect(() => {
    setNeeds(readNeeds());
    const tick = setInterval(() => setNeeds(readNeeds()), 30_000);
    const on = (e: Event) => {
      setNeeds(readNeeds());
      setLast((e as CustomEvent<Activity>).detail ?? null);
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
