"use client";

import {
  readAffiliation,
  type Occupation,
  type WorldAffiliation,
} from "@/game/core/affiliation";
import { roleOf } from "@/game/core/careers";
import { logoFor } from "@/game/core/logos";

export interface VerifiedIdentity {
  expiresAt?: number;
  id: string;
  username: string;
  org: string | null;
  badge: string | null;
  affiliation?: WorldAffiliation | null;
  occupation?: Occupation | null;
}

const b64 = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "===".slice((t.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

let keyPromise: Promise<CryptoKey | null> | null = null;
let keyFor = "";
const cache = new Map<string, Promise<VerifiedIdentity | null>>();

/** Checks a world pass signed by the server. Resolves null if it's forged, expired or unreadable. */
export function verifyPass(
  pass: unknown,
  publicKey: string,
): Promise<VerifiedIdentity | null> {
  if (typeof pass !== "string" || pass.length > 2000)
    return Promise.resolve(null);
  const cacheKey = `${publicKey}:${pass}`;
  const hit = cache.get(cacheKey);
  if (hit)
    return hit.then((who) =>
      who && (!who.expiresAt || who.expiresAt > Date.now()) ? who : null,
    );
  if (keyFor !== publicKey) {
    keyFor = publicKey;
    keyPromise = crypto.subtle
      .importKey("raw", b64(publicKey), { name: "Ed25519" }, false, ["verify"])
      .catch(() => null);
  }
  const job = (async () => {
    try {
      const [body, sig] = pass.split(".");
      if (!body || !sig) return null;
      const key = await keyPromise;
      if (!key) return null;
      const ok = await crypto.subtle.verify(
        { name: "Ed25519" },
        key,
        b64(sig),
        new TextEncoder().encode(body),
      );
      if (!ok) return null;
      const who = JSON.parse(new TextDecoder().decode(b64(body))) as Record<
        string,
        unknown
      >;
      if (
        typeof who.id !== "string" ||
        typeof who.username !== "string" ||
        typeof who.exp !== "number" ||
        who.exp < Date.now()
      )
        return null;
      const job = who.occupation as Occupation | null;
      return {
        id: who.id,
        expiresAt: who.exp,
        username: who.username.slice(0, 40),
        org: typeof who.org === "string" ? who.org.slice(0, 60) : null,
        badge:
          typeof who.badge === "string" && logoFor(who.badge)
            ? who.badge
            : null,
        affiliation: readAffiliation(who.affiliation),
        occupation:
          job &&
          typeof job.workplace === "string" &&
          typeof job.role === "string" &&
          roleOf(job.workplace, job.role)
            ? { workplace: job.workplace, role: job.role }
            : null,
      };
    } catch {
      return null;
    }
  })();
  cache.set(cacheKey, job);
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return job;
}
