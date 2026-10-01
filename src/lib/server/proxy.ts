import { NextResponse } from "next/server";

/**
 * Hosts our server may call. Anything else is refused, so a typo or a
 * crafted path can't turn a route handler into an open proxy.
 */
const ALLOWED_HOSTS = new Set([
  "register-api.ofqual.gov.uk",
  "api.education.gov.uk",
  "openlibrary.org",
  "www.gov.uk",
  "skillsengland.education.gov.uk",
  "gutendex.com",
]);

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Server-side GET to an allow-listed public API, with a timeout.
 * Pass `revalidate` to use the Next.js data cache, or `noStore` for responses
 * too large for it (the data cache skips anything over 2 MB).
 */
export async function fetchUpstream(
  url: string,
  opts: {
    revalidate?: number;
    noStore?: boolean;
    timeoutMs?: number;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const host = new URL(url).host;
  if (!ALLOWED_HOSTS.has(host))
    throw new UpstreamError(500, `Host not allowed: ${host}`);
  const timeout = AbortSignal.timeout(opts.timeoutMs ?? 10000);
  return fetch(url, {
    headers: { accept: "application/json", ...(opts.headers ?? {}) },
    ...(opts.noStore
      ? { cache: "no-store" as const }
      : { next: { revalidate: opts.revalidate ?? 3600 } }),
    signal: opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout,
  });
}

/** fetchUpstream, then parse JSON. Throws UpstreamError on a non-2xx reply. */
export async function fetchUpstreamJson(
  url: string,
  opts: Parameters<typeof fetchUpstream>[1] = {},
): Promise<unknown> {
  const res = await fetchUpstream(url, opts);
  if (!res.ok) throw new UpstreamError(res.status, `HTTP ${res.status}`);
  return res.json() as Promise<unknown>;
}

/**
 * Minimal, allow-listed GET proxy for public, key-free education APIs.
 * - Only whitelisted query parameters are forwarded, with length caps.
 * - No secrets are used or accepted.
 * - Responses are cached by Next.js for a short time to stay polite to the source.
 */
export async function proxyGet(
  req: Request,
  base: string,
  allowed: Record<string, number>,
  opts: {
    revalidate: number;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = { revalidate: 3600 },
) {
  const incoming = new URL(req.url).searchParams;
  const out = new URLSearchParams();
  for (const [name, maxLen] of Object.entries(allowed)) {
    const v = incoming.get(name);
    if (v) out.set(name, v.slice(0, maxLen));
  }
  const target = `${base}${out.size ? `?${out}` : ""}`;
  try {
    const res = await fetchUpstream(target, {
      revalidate: opts.revalidate,
      headers: opts.headers,
      timeoutMs: opts.timeoutMs,
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": res.ok
          ? `public, max-age=300, s-maxage=${opts.revalidate}`
          : "no-store",
        "x-source": new URL(base).host,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}
