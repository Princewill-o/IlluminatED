"use client";

import { useRef, useState } from "react";

import { BookOpen, Search } from "lucide-react";

import { ErrorState, FetchMeta, Loading } from "@/components/api-status";
import {
  Callout,
  Empty,
  ExternalLink,
  fieldCls,
  labelCls,
} from "@/components/kit";
import { Button } from "@/components/ui/button";
import { ApiError, fetchJson, isObj, safeUrl, str } from "@/lib/api-client";

interface Summary {
  title: string;
  extract: string;
  type: string;
  url: string;
}
const isSummary = (j: unknown): j is Record<string, unknown> =>
  isObj(j) && typeof j.title === "string";

export function WikiLookup() {
  const [term, setTerm] = useState("");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        s: Summary;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);

  const run = async () => {
    const t = term.trim();
    if (!t) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: "loading" });
    const title = encodeURIComponent(t.replaceAll(" ", "_"));
    try {
      const res = await fetchJson<Record<string, unknown>>({
        direct: `https://en.wikipedia.org/api/rest_v1/page/summary/${title}?redirect=true`,
        cacheKey: `wiki:${t.toLowerCase()}`,
        ttlMs: 1000 * 60 * 60 * 24,
        signal: c.signal,
        validate: isSummary,
      });
      const d = res.data;
      const urls =
        isObj(d.content_urls) && isObj(d.content_urls.desktop)
          ? d.content_urls.desktop
          : {};
      setState({
        status: "done",
        s: {
          title: str(d.title, 200),
          extract: str(d.extract, 1500),
          type: str(d.type, 40),
          url: safeUrl(urls.page) ?? `https://en.wikipedia.org/wiki/${title}`,
        },
        fetchedAt: res.fetchedAt,
        stale: res.stale,
        fromCache: res.fromCache,
      });
    } catch (error) {
      if (!c.signal.aborted) setState({ status: "error", error });
    }
  };

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label="Background reading lookup"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="space-y-2"
      >
        <label htmlFor="wiki-q" className={labelCls}>
          Look up a topic
        </label>
        <div className="flex gap-2">
          <input
            id="wiki-q"
            className={fieldCls}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. Photosynthesis, Weimar Republic, Supply and demand"
          />
          <Button type="submit">
            <Search aria-hidden /> Look up
          </Button>
        </div>
      </form>
      <div aria-live="polite">
        {state.status === "loading" && <Loading label="Looking that up…" />}
        {state.status === "error" &&
          (state.error instanceof ApiError &&
          state.error.kind === "not-found" ? (
            <Empty title="No summary found">
              Check the spelling or try a more specific topic name.
            </Empty>
          ) : (
            <ErrorState error={state.error} onRetry={run} />
          ))}
        {state.status === "done" && (
          <article className="bg-card space-y-3 rounded-lg border p-5">
            <h3 className="text-lg font-semibold">{state.s.title}</h3>
            {state.s.type === "disambiguation" ? (
              <p className="text-muted-foreground text-sm">
                That term has several meanings. Try adding more detail, for
                example "Mercury (planet)".
              </p>
            ) : (
              <p className="text-sm leading-relaxed">
                {state.s.extract || "No summary text available."}
              </p>
            )}
            <p className="text-sm">
              <ExternalLink href={state.s.url}>
                Read the full article on Wikipedia
              </ExternalLink>
            </p>
            <FetchMeta
              fetchedAt={state.fetchedAt}
              stale={state.stale}
              fromCache={state.fromCache}
              source="Wikipedia (CC BY-SA 4.0), via Wikimedia REST API"
              sourceUrl="https://www.mediawiki.org/wiki/Wikimedia_REST_API"
            />
            <Callout tone="warn">
              Background reading only. Wikipedia is not an exam-board
              specification. Use your course materials for what you need to
              know.
            </Callout>
          </article>
        )}
      </div>
    </div>
  );
}

interface Book {
  key: string;
  title: string;
  authors: string;
  year: string;
  editions: number;
}
interface OLResult {
  numFound: number;
  docs: unknown[];
}
const isOL = (j: unknown): j is OLResult => isObj(j) && Array.isArray(j.docs);

let lastBookRequest = 0;

export function BookSearch() {
  const [term, setTerm] = useState("");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        books: Book[];
        total: number;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);

  const run = async () => {
    const t = term.trim();
    if (t.length < 2) return;
    // Stay within Open Library's default guidance of about one request per second.
    const wait = Math.max(0, 1100 - (Date.now() - lastBookRequest));
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: "loading" });
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (c.signal.aborted) return;
    lastBookRequest = Date.now();
    const qs = new URLSearchParams({
      q: t,
      limit: "8",
      fields: "key,title,author_name,first_publish_year,edition_count",
    }).toString();
    try {
      const res = await fetchJson<OLResult>({
        proxy: `/api/books?${qs}`,
        direct: `https://openlibrary.org/search.json?${qs}`,
        cacheKey: `ol:${qs}`,
        ttlMs: 1000 * 60 * 60 * 24,
        signal: c.signal,
        validate: isOL,
      });
      const books = res.data.docs.slice(0, 8).flatMap((d): Book[] => {
        if (
          !isObj(d) ||
          typeof d.key !== "string" ||
          !d.key.startsWith("/works/")
        )
          return [];
        return [
          {
            key: d.key.slice(0, 40),
            title: str(d.title, 200),
            authors: Array.isArray(d.author_name)
              ? d.author_name
                  .filter((a) => typeof a === "string")
                  .slice(0, 3)
                  .join(", ")
              : "",
            year:
              typeof d.first_publish_year === "number"
                ? String(d.first_publish_year)
                : "",
            editions: typeof d.edition_count === "number" ? d.edition_count : 0,
          },
        ];
      });
      setState({
        status: "done",
        books,
        total:
          typeof res.data.numFound === "number"
            ? res.data.numFound
            : books.length,
        fetchedAt: res.fetchedAt,
        stale: res.stale,
        fromCache: res.fromCache,
      });
    } catch (error) {
      if (!c.signal.aborted) setState({ status: "error", error });
    }
  };

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label="Book search"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="space-y-2"
      >
        <label htmlFor="ol-q" className={labelCls}>
          Find a book
        </label>
        <div className="flex gap-2">
          <input
            id="ol-q"
            className={fieldCls}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Title, author or topic, e.g. An Inspector Calls"
          />
          <Button type="submit">
            <BookOpen aria-hidden /> Search
          </Button>
        </div>
      </form>
      <div aria-live="polite">
        {state.status === "loading" && (
          <Loading label="Searching Open Library…" />
        )}
        {state.status === "error" && (
          <ErrorState error={state.error} onRetry={run} />
        )}
        {state.status === "done" && (
          <div className="space-y-3">
            <FetchMeta
              fetchedAt={state.fetchedAt}
              stale={state.stale}
              fromCache={state.fromCache}
              source="Open Library"
              sourceUrl="https://openlibrary.org/developers/api"
            />
            {state.books.length === 0 ? (
              <Empty title="No books found">
                Try a different title or author.
              </Empty>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {state.books.map((b) => (
                  <li key={b.key} className="bg-card rounded-lg border p-4">
                    <p className="font-semibold">{b.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {b.authors || "Unknown author"}
                      {b.year && ` · first published ${b.year}`}
                    </p>
                    <p className="mt-2 text-sm">
                      <ExternalLink href={`https://openlibrary.org${b.key}`}>
                        View on Open Library
                      </ExternalLink>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground text-xs">
              Book details come from Open Library, a community catalogue. Your
              school or local library can tell you which edition your course
              uses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
