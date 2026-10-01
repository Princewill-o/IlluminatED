import { NextResponse } from "next/server";

import {
  SET_TEXTS,
  type SetTextLinks,
  fallbackLinks,
} from "@/lib/data/set-texts";
import { fetchUpstreamJson } from "@/lib/server/proxy";

const WEEK = 604800;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Only ever link to Project Gutenberg itself. */
const gutenberg = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.host === "www.gutenberg.org"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
};

const format = (formats: Obj, prefix: string) => {
  for (const [type, url] of Object.entries(formats))
    if (type.startsWith(prefix)) {
      const ok = gutenberg(url);
      if (ok) return ok;
    }
  return null;
};

/**
 * Download links for the fixed list of set texts, from Gutendex (a free JSON
 * index of Project Gutenberg). One request by ID for all ten books, cached for
 * a week. If Gutendex is slow or down we still answer, with Gutenberg's
 * standard URLs.
 */
export async function GET() {
  const links = new Map<number, SetTextLinks>(
    SET_TEXTS.map((t) => [t.id, fallbackLinks(t.id)]),
  );
  let source: "gutendex" | "fallback" = "fallback";
  try {
    const json = await fetchUpstreamJson(
      `https://gutendex.com/books?ids=${SET_TEXTS.map((t) => t.id).join(",")}`,
      { revalidate: WEEK, timeoutMs: 8000 },
    );
    if (isObj(json) && Array.isArray(json.results)) {
      for (const b of json.results) {
        if (!isObj(b) || typeof b.id !== "number" || !links.has(b.id)) continue;
        if (b.copyright === true) continue;
        const formats = isObj(b.formats) ? b.formats : {};
        const base = links.get(b.id)!;
        links.set(b.id, {
          ...base,
          html: format(formats, "text/html") ?? base.html,
          epub: format(formats, "application/epub+zip") ?? base.epub,
        });
        source = "gutendex";
      }
    }
  } catch {
    // Fall back silently.
  }
  return NextResponse.json(
    { books: [...links.values()], source },
    {
      headers: {
        "cache-control":
          source === "gutendex"
            ? `public, max-age=86400, s-maxage=${WEEK}`
            : "public, max-age=300, s-maxage=3600",
        "x-source": "gutendex.com",
      },
    },
  );
}
