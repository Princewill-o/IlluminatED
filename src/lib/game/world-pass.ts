import "server-only";

import { createHmac, createPrivateKey, createPublicKey, sign } from "node:crypto";

import type { Occupation, WorldAffiliation } from "@/game/core/affiliation";

/**
 * World passes: who a player is in Worlds, signed by the server.
 *
 * Realtime presence is written by each player's own browser, so a modified
 * client could claim any name or a "verified employer" badge. Instead the
 * server signs { id, username, org, badge } with an Ed25519 key, and every
 * client checks that signature (with the public key) before showing anyone.
 * The key is derived from BILLING_CALLBACK_SECRET, so there's nothing new to set up.
 */
export interface WorldIdentity {
  id: string;
  username: string;
  /** Verified employer name, or null. */
  org: string | null;
  /** Company id whose parody logo they wear. */
  badge: string | null;
  affiliation?: WorldAffiliation | null;
  occupation?: Occupation | null;
  exp: number;
}

const PKCS8_ED25519 = Buffer.from("302e020100300506032b657004220420", "hex");

function keys() {
  const secret = process.env.BILLING_CALLBACK_SECRET?.trim();
  if (!secret) return null;
  const seed = createHmac("sha256", secret).update("illuminated-world-pass-v1").digest();
  const priv = createPrivateKey({ key: Buffer.concat([PKCS8_ED25519, seed]), format: "der", type: "pkcs8" });
  const spki = createPublicKey(priv).export({ format: "der", type: "spki" });
  return { priv, pub: Buffer.from(spki.subarray(spki.length - 32)).toString("base64url") };
}

/** A pass valid for 12 hours, plus the public key clients verify with (both null if no secret is set). */
export function worldPass(who: Omit<WorldIdentity, "exp">): { pass: string | null; publicKey: string | null } {
  const k = keys();
  if (!k) return { pass: null, publicKey: null };
  const body = Buffer.from(JSON.stringify({ ...who, exp: Date.now() + 12 * 3600_000 })).toString("base64url");
  const sig = sign(null, Buffer.from(body), k.priv).toString("base64url");
  return { pass: `${body}.${sig}`, publicKey: k.pub };
}
