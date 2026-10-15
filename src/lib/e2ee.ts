"use client";

/**
 * End-to-end encryption for adult conversations (18+ learner ↔ verified staff).
 *
 * - Each device makes an ECDH P-256 key pair with WebCrypto. The private key is
 *   created non-extractable and kept in this browser's IndexedDB, so it never
 *   leaves the device. Only the public key is published (public.user_keys).
 * - Both sides derive the same AES-GCM 256 key from their private key and the
 *   other person's public key. Every message gets a fresh random 96-bit IV.
 * - The server only ever stores ciphertext and IV.
 *
 * Limitations (shown in the UI): keys are per device, so messages sent before you
 * signed in on a new device can't be read there; and if someone's key changes
 * their security code changes, which we flag.
 */
const DB = "illuminated-e2ee";
const STORE = "keys";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  const db = await idb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const e2eeSupported = () => typeof window !== "undefined" && Boolean(window.crypto?.subtle && window.indexedDB);

export interface DeviceKeys {
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}

/** This device's key pair for a user, creating it on first use. */
export async function deviceKeys(userId: string): Promise<DeviceKeys> {
  const saved = await idbGet<DeviceKeys>(`user:${userId}`);
  if (saved?.privateKey && saved.publicJwk) return saved;
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"])) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const keys = { privateKey: pair.privateKey, publicJwk: { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y } };
  await idbSet(`user:${userId}`, keys);
  return keys;
}

export async function sharedKey(mine: CryptoKey, theirs: JsonWebKey) {
  const pub = await crypto.subtle.importKey("jwk", theirs, { name: "ECDH", namedCurve: "P-256" }, false, []);
  return crypto.subtle.deriveKey({ name: "ECDH", public: pub }, mine, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encrypt(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: b64(data), iv: b64(iv) };
}

export async function decrypt(key: CryptoKey, ciphertext: string, iv: string) {
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ciphertext));
  return new TextDecoder().decode(data);
}

/** A short "security code" both people can compare to check nobody swapped keys. */
export async function securityCode(a: JsonWebKey, b: JsonWebKey) {
  const parts = [`${a.x}${a.y}`, `${b.x}${b.y}`].sort();
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|"))));
  return Array.from(hash.slice(0, 10), (n) => String(n % 100).padStart(2, "0"))
    .join("")
    .replace(/(\d{5})(?=\d)/g, "$1 ");
}
