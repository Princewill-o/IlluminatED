/** Private investor-preview gate. Runs in Next middleware's Edge runtime. */
export const PREVIEW_COOKIE = "illumed_preview_access";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const previewGateEnabled = process.env.PREVIEW_GATE_ENABLED === "1";

function signingSecret() {
  return process.env.PREVIEW_GATE_SECRET || "";
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function signature(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export async function makePreviewCookie() {
  if (!signingSecret()) throw new Error("Preview gate is missing its signing secret");
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `v1.${expires}`;
  return { value: `${payload}.${await signature(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export async function hasPreviewAccess(value: string | undefined) {
  if (!value || !signingSecret()) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d{10}$/.test(parts[1])) return false;
  const expires = Number(parts[1]);
  if (expires <= Date.now() / 1000 || expires > Date.now() / 1000 + MAX_AGE_SECONDS) return false;
  const supplied = parts[2];
  const expected = await signature(`${parts[0]}.${parts[1]}`);
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0;
}

export async function validPreviewCode(code: string) {
  const expected = process.env.PREVIEW_ACCESS_CODE || "";
  if (!expected || !signingSecret()) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  const aa = new Uint8Array(a);
  const bb = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < aa.length; i++) difference |= aa[i] ^ bb[i];
  return difference === 0;
}

export function safePreviewNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.length > 300) return "/";
  return raw;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function previewPage(next: string, error = false) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private preview | IlluminatED</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,Helvetica,sans-serif;color:white;background:radial-gradient(circle at 18% 15%,#2c69e9 0,transparent 30%),radial-gradient(circle at 88% 85%,#113caa 0,transparent 35%),#062875;overflow:hidden}.glow{position:fixed;inset:auto auto -18rem -12rem;width:45rem;height:45rem;border:2px solid #ffffff16;border-radius:50%;box-shadow:0 0 0 8rem #ffffff08,0 0 0 17rem #ffffff05;pointer-events:none}main{position:relative;width:min(100% - 2rem,440px);padding:3rem 2.25rem;text-align:center;border:1px solid #ffffff45;border-radius:32px;background:#ffffff17;box-shadow:0 24px 90px #001c5670;backdrop-filter:blur(18px)}img{display:block;max-width:260px;width:80%;height:auto;margin:0 auto 2.25rem}h1{font-size:clamp(2rem,6vw,2.8rem);line-height:1.08;letter-spacing:-.04em;margin:0 0 1rem}p{line-height:1.55;color:#e6eeff;margin:0 0 2rem}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#bcd2ff;margin-bottom:1rem}label{display:block;text-align:left;font-size:.9rem;font-weight:700;margin-bottom:.55rem}input{width:100%;height:3.5rem;border:2px solid #ffffff90;border-radius:14px;background:white;color:#102b6d;padding:0 1rem;font-size:1.15rem;letter-spacing:.08em;outline:none}input:focus{border-color:#ffdb69;box-shadow:0 0 0 4px #ffdb6955}button{width:100%;height:3.5rem;margin-top:1rem;border:0;border-radius:14px;background:#ffdc62;color:#062875;font-weight:800;font-size:1rem;cursor:pointer;box-shadow:0 6px 0 #e8b637}button:hover{background:#ffe68b}button:active{transform:translateY(3px);box-shadow:0 3px 0 #e8b637}.error{color:#fff;background:#9e2547;border-radius:10px;padding:.75rem;margin:0 0 1.25rem;font-weight:700}small{display:block;margin-top:1.5rem;color:#ccdcff}
  </style></head><body><div class="glow" aria-hidden="true"></div><main><img src="/brand/wordmark-white.webp" alt="IlluminatED"><div class="eyebrow">Private preview</div><h1>Welcome to IlluminatED</h1><p>This space is currently open by invitation. Enter your access code to explore.</p>${error ? '<div class="error" role="alert">That code didn’t work. Please try again.</div>' : ''}<form method="post" action="/api/preview-access"><input type="hidden" name="next" value="${escapeHtml(next)}"><label for="code">Access code</label><input id="code" name="code" type="password" required autofocus autocomplete="off" spellcheck="false" maxlength="100"><button type="submit">Enter the preview →</button></form><small>IlluminatED · Built for brighter learning</small></main></body></html>`;
}
