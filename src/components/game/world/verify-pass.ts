"use client";

import { logoFor } from "@/game/core/logos";

export interface VerifiedIdentity {
  id: string;
  username: string;
  org: string | null;
  badge: string | null;
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
export function verifyPass(pass: unknown, publicKey: string): Promise<VerifiedIdentity | null> {
  if (typeof pass !== "string" || pass.length > 2000) return Promise.resolve(null);
  const hit = cache.get(pass);
  if (hit) return hit;
  if (keyFor !== publicKey) {
    keyFor = publicKey;
    keyPromise = crypto.subtle.importKey("raw", b64(publicKey), { name: "Ed25519" }, false, ["verify"]).catch(() => null);
  }
  const job = (async () => {
    try {
      const [body, sig] = pass.split(".");
      if (!body || !sig) return null;
      const key = await keyPromise;
      if (!key) return null;
      const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, b64(sig), new TextEncoder().encode(body));
      if (!ok) return null;
      const who = JSON.parse(new TextDecoder().decode(b64(body))) as Record<string, unknown>;
      if (typeof who.id !== "string" || typeof who.username !== "string" || typeof who.exp !== "number" || who.exp < Date.now()) return null;
      return {
        id: who.id,
        username: who.username.slice(0, 40),
        org: typeof who.org === "string" ? who.org.slice(0, 60) : null,
        badge: typeof who.badge === "string" && logoFor(who.badge) ? who.badge : null,
      };
    } catch {
      return null;
    }
  })();
  cache.set(pass, job);
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return job;
}
