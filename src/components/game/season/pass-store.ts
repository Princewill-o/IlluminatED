"use client";

import { useCallback, useEffect, useState } from "react";

import { currentEvent } from "@/game/core/live-events";
import { type PassState, type XpReason, claim as claimTier, freshPass, readPass, writePass, xpGain } from "@/game/core/season";

/**
 * Browser-side Season Pass progress. XP is earned from anywhere in the app with
 * earnSeasonXp(reason); the account it belongs to is remembered when a signed-in
 * page mounts usePass(userId).
 */
const USER_KEY = "illuminated:pass-user";
export const PASS_EVENT = "illuminated:pass";

const store = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function earnSeasonXp(reason: XpReason) {
  const s = store();
  const user = s?.getItem(USER_KEY);
  if (!user) return;
  const pass = readPass(s, user);
  const gained = xpGain(reason, currentEvent().event.xpBoost, pass, Date.now());
  const next = { ...pass, xp: pass.xp + gained };
  writePass(s, user, next);
  window.dispatchEvent(new CustomEvent(PASS_EVENT, { detail: { gained, reason, xp: next.xp } }));
}

export function usePass(userId: string) {
  const [pass, setPass] = useState<PassState>(freshPass);
  useEffect(() => {
    const s = store();
    try {
      s?.setItem(USER_KEY, userId);
    } catch {
      /* ignore */
    }
    setPass(readPass(s, userId));
    const refresh = () => setPass(readPass(store(), userId));
    window.addEventListener(PASS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PASS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);
  const claim = useCallback(
    (tier: number, track: "free" | "premium", premium: boolean) => {
      setPass((p) => {
        const next = claimTier(p, tier, track, premium, Date.now());
        writePass(store(), userId, next);
        return next;
      });
    },
    [userId],
  );
  const setTitle = useCallback(
    (title: string | null) => {
      setPass((p) => {
        const next = { ...p, title };
        writePass(store(), userId, next);
        return next;
      });
    },
    [userId],
  );
  return { pass, claim, setTitle };
}
