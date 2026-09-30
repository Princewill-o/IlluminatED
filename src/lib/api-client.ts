"use client";

import { readStore, STORAGE_KEYS, writeStore } from "@/lib/storage";

export type ApiErrorKind =
  | "offline"
  | "timeout"
  | "rate-limited"
  | "forbidden"
  | "not-found"
  | "invalid-response"
  | "unavailable"
  | "aborted";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export const ERROR_COPY: Record<ApiErrorKind, { title: string; body: string }> =
  {
    offline: {
      title: "You're offline",
      body: "Reconnect to the internet and try again. Saved results are shown where we have them.",
    },
    timeout: {
      title: "That took too long",
      body: "The service didn't answer in time. Try again in a moment.",
    },
    "rate-limited": {
      title: "Too many searches",
      body: "The service has asked us to slow down. Wait a minute, then try again.",
    },
    forbidden: {
      title: "Access refused",
      body: "The service refused this request. It may need a key we don't ship in the browser.",
    },
    "not-found": {
      title: "Nothing found",
      body: "The service couldn't find that item.",
    },
    "invalid-response": {
      title: "Unexpected response",
      body: "The service replied with data we couldn't read safely, so we didn't show it.",
    },
    unavailable: {
      title: "Service unavailable",
      body: "We couldn't reach the service. It may be down, or blocking browser requests. Try again later.",
    },
    aborted: { title: "Search cancelled", body: "" },
  };

interface CacheEntry {
  at: number;
  data: unknown;
}

const MAX_CACHE = 40;

function readCache(key: string): CacheEntry | undefined {
  return readStore<Record<string, CacheEntry>>(STORAGE_KEYS.cache, {})[key];
}

function writeCache(key: string, data: unknown) {
  const all = readStore<Record<string, CacheEntry>>(STORAGE_KEYS.cache, {});
  all[key] = { at: Date.now(), data };
  const trimmed = Object.entries(all)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_CACHE);
  writeStore(STORAGE_KEYS.cache, Object.fromEntries(trimmed));
}

export interface FetchResult<T> {
  data: T;
  fetchedAt: number;
  fromCache: boolean;
  stale: boolean;
  via: "proxy" | "direct" | "cache";
}

interface Options<T> {
  /** Our own same-origin route handler (preferred: no CORS, can identify the app). */
  proxy?: string;
  /** Public endpoint called directly when the proxy isn't available (e.g. static hosting). */
  direct?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  cacheKey: string;
  ttlMs: number;
  validate: (json: unknown) => json is T;
}

function statusToKind(status: number): ApiErrorKind {
  if (status === 429) return "rate-limited";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "unavailable";
}

async function attempt(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
) {
  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new DOMException("timeout", "TimeoutError")),
    timeoutMs,
  );
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok)
      throw new ApiError(statusToKind(res.status), `HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("json"))
      throw new ApiError("invalid-response", "Not JSON");
    return (await res.json()) as unknown;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (signal?.aborted) throw new ApiError("aborted", "Aborted");
    if (ctrl.signal.aborted) throw new ApiError("timeout", "Timed out");
    if (typeof navigator !== "undefined" && !navigator.onLine)
      throw new ApiError("offline", "Offline");
    throw new ApiError("unavailable", "Network or CORS failure");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Fetch JSON from our proxy (falling back to the public endpoint), validate it,
 * and cache it briefly in this browser. Remote data is never trusted as HTML.
 */
export async function fetchJson<T>(o: Options<T>): Promise<FetchResult<T>> {
  const cached = readCache(o.cacheKey);
  if (cached && Date.now() - cached.at < o.ttlMs && o.validate(cached.data)) {
    return {
      data: cached.data,
      fetchedAt: cached.at,
      fromCache: true,
      stale: false,
      via: "cache",
    };
  }
  const timeout = o.timeoutMs ?? 12000;
  const targets: [string, "proxy" | "direct"][] = [];
  if (o.proxy) targets.push([o.proxy, "proxy"]);
  if (o.direct) targets.push([o.direct, "direct"]);

  let lastError: ApiError = new ApiError("unavailable", "No endpoint");
  for (const [url, via] of targets) {
    try {
      const json = await attempt(url, o.signal, timeout);
      if (!o.validate(json))
        throw new ApiError("invalid-response", "Failed validation");
      writeCache(o.cacheKey, json);
      return {
        data: json,
        fetchedAt: Date.now(),
        fromCache: false,
        stale: false,
        via,
      };
    } catch (e) {
      lastError = e as ApiError;
      if (lastError.kind === "aborted") throw lastError;
      // Only fall through to the direct call when our proxy is missing or broken.
      const proxyMissing =
        via === "proxy" &&
        ["not-found", "unavailable", "invalid-response"].includes(
          lastError.kind,
        );
      if (!proxyMissing) break;
    }
  }
  if (cached && o.validate(cached.data)) {
    return {
      data: cached.data,
      fetchedAt: cached.at,
      fromCache: true,
      stale: true,
      via: "cache",
    };
  }
  throw lastError;
}

export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const str = (v: unknown, max = 400): string =>
  typeof v === "string" ? v.slice(0, max) : "";
export const safeUrl = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
};
export const fmtDate = (v: unknown) => {
  if (typeof v !== "string" && typeof v !== "number") return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};
