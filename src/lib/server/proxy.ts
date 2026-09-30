import { NextResponse } from "next/server";

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
    const res = await fetch(target, {
      headers: { accept: "application/json", ...(opts.headers ?? {}) },
      next: { revalidate: opts.revalidate },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 10000),
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
