"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Database, Search } from "lucide-react";

import { ErrorState, FetchMeta, Loading } from "@/components/api-status";
import { Empty, ExternalLink, fieldCls, labelCls, Tag } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fetchJson, fmtDate, isObj, str } from "@/lib/api-client";

const EES = "https://api.education.gov.uk/statistics/v1";
const EES_DOCS = "https://api.education.gov.uk/statistics/docs/";
const EES_SITE =
  "https://explore-education-statistics.service.gov.uk/find-statistics";

interface Publication {
  id: string;
  title: string;
  slug: string;
  summary: string;
  lastPublished: string;
}
interface DataSet {
  id: string;
  title: string;
  summary: string;
  status: string;
  version: string;
  published: string;
  timeStart: string;
  timeEnd: string;
  geographies: string[];
  filters: string[];
  indicatorCount: number;
  indicatorsSample: string[];
}

interface Paged {
  paging: {
    page: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
  results: unknown[];
}
const isPaged = (j: unknown): j is Paged =>
  isObj(j) && isObj(j.paging) && Array.isArray(j.results);

const toPub = (r: unknown): Publication | null =>
  isObj(r) && typeof r.id === "string" && typeof r.title === "string"
    ? {
        id: str(r.id, 40),
        title: str(r.title, 200),
        slug: str(r.slug, 200),
        summary: str(r.summary, 500),
        lastPublished: str(r.lastPublished, 40),
      }
    : null;

const strArr = (v: unknown, n = 20) =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .slice(0, n)
        .map((x) => (x as string).slice(0, 160))
    : [];

const toDataSet = (r: unknown): DataSet | null => {
  if (!isObj(r) || typeof r.id !== "string") return null;
  const lv = isObj(r.latestVersion) ? r.latestVersion : {};
  const tp = isObj(lv.timePeriods) ? lv.timePeriods : {};
  const indicators = strArr(lv.indicators, 500);
  return {
    id: str(r.id, 40),
    title: str(r.title, 200),
    summary: str(r.summary, 500),
    status: str(r.status, 30),
    version: str(lv.version, 20),
    published: str(lv.published, 40),
    timeStart: str(tp.start, 20),
    timeEnd: str(tp.end, 20),
    geographies: strArr(lv.geographicLevels),
    filters: strArr(lv.filters),
    indicatorCount: indicators.length,
    indicatorsSample: indicators.slice(0, 6),
  };
};

/** Starter searches that are genuinely useful to learners. Users can search anything. */
const SUGGESTIONS = [
  "Key stage 4 performance",
  "A level and other 16 to 18 results",
  "Participation in education",
  "Further education and skills",
];

export function EducationData() {
  const [query, setQuery] = useState("Key stage 4 performance");
  const [pubs, setPubs] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        items: Publication[];
        total: number;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "idle" });
  const [selected, setSelected] = useState<Publication | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 3) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setPubs({ status: "loading" });
    setSelected(null);
    const qs = new URLSearchParams({
      search: term,
      page: "1",
      pageSize: "8",
    }).toString();
    try {
      const res = await fetchJson<Paged>({
        proxy: `/api/ees/publications?${qs}`,
        direct: `${EES}/publications?${qs}`,
        cacheKey: `ees:pubs:${qs}`,
        ttlMs: 1000 * 60 * 60 * 6,
        signal: c.signal,
        validate: isPaged,
      });
      setPubs({
        status: "done",
        items: res.data.results
          .slice(0, 8)
          .map(toPub)
          .filter(Boolean) as Publication[],
        total: res.data.paging.totalResults,
        fetchedAt: res.fetchedAt,
        stale: res.stale,
        fromCache: res.fromCache,
      });
    } catch (error) {
      if (!c.signal.aborted) setPubs({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    search("Key stage 4 performance");
    return () => ctrl.current?.abort();
  }, [search]);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <form
          role="search"
          aria-label="Search published statistics"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="space-y-2"
        >
          <label htmlFor="ees-q" className={labelCls}>
            Search DfE publications
          </label>
          <div className="flex gap-2">
            <input
              id="ees-q"
              className={fieldCls}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              minLength={3}
              placeholder="At least 3 characters"
            />
            <Button type="submit" aria-label="Search publications">
              <Search aria-hidden />
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                onClick={() => {
                  setQuery(s);
                  search(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        <div aria-live="polite">
          {pubs.status === "loading" && (
            <Loading label="Loading publications…" />
          )}
          {pubs.status === "error" && (
            <ErrorState error={pubs.error} onRetry={() => search(query)} />
          )}
          {pubs.status === "done" && (
            <div className="space-y-3">
              <FetchMeta
                fetchedAt={pubs.fetchedAt}
                stale={pubs.stale}
                fromCache={pubs.fromCache}
                source="DfE Explore Education Statistics API"
                sourceUrl={EES_DOCS}
              />
              {pubs.items.length === 0 ? (
                <Empty title="No publications found">
                  Try a broader search such as "attainment" or "absence".
                </Empty>
              ) : (
                <ul className="border-t">
                  {pubs.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        aria-pressed={selected?.id === p.id}
                        className="hover:bg-muted/60 aria-pressed:border-l-primary aria-pressed:bg-muted/60 w-full border-b border-l-2 border-l-transparent py-3 pr-2 pl-3 text-left"
                      >
                        <span className="block text-sm font-semibold">
                          {p.title}
                        </span>
                        <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs">
                          {p.summary}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          Last published {fmtDate(p.lastPublished)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pubs.total > 8 && (
                <p className="text-muted-foreground text-xs">
                  Showing 8 of {pubs.total}. Refine your search to narrow the
                  list.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        {selected ? (
          <DataSets pub={selected} />
        ) : (
          <Empty title="Choose a publication">
            Pick a publication to see the datasets the API exposes, with dates,
            geography and definitions.
          </Empty>
        )}
      </div>
    </div>
  );
}

function DataSets({ pub }: { pub: Publication }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        items: DataSet[];
        total: number;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setState({ status: "loading" });
    const qs = new URLSearchParams({
      publicationId: pub.id,
      page: "1",
      pageSize: "10",
    }).toString();
    fetchJson<Paged>({
      proxy: `/api/ees/data-sets?${qs}`,
      direct: `${EES}/publications/${encodeURIComponent(pub.id)}/data-sets?page=1&pageSize=10`,
      cacheKey: `ees:ds:${pub.id}`,
      ttlMs: 1000 * 60 * 60 * 6,
      signal: c.signal,
      validate: isPaged,
    })
      .then((res) =>
        setState({
          status: "done",
          items: res.data.results
            .slice(0, 10)
            .map(toDataSet)
            .filter(Boolean) as DataSet[],
          total: res.data.paging.totalResults,
          fetchedAt: res.fetchedAt,
          stale: res.stale,
          fromCache: res.fromCache,
        }),
      )
      .catch(
        (error) => !c.signal.aborted && setState({ status: "error", error }),
      );
    return () => c.abort();
  }, [pub.id, nonce]);

  return (
    <section aria-labelledby="ds-title" className="space-y-4">
      <div>
        <h3 id="ds-title" className="text-xl font-semibold">
          {pub.title}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">{pub.summary}</p>
        <p className="mt-2 text-sm">
          <ExternalLink
            href={`https://explore-education-statistics.service.gov.uk/find-statistics/${encodeURIComponent(pub.slug)}`}
          >
            Read the full release, methodology and definitions on GOV.UK
          </ExternalLink>
        </p>
      </div>
      {state.status === "loading" && <Loading label="Loading datasets…" />}
      {state.status === "error" && (
        <ErrorState
          error={state.error}
          onRetry={() => setNonce((n) => n + 1)}
        />
      )}
      {state.status === "done" && (
        <>
          <FetchMeta
            fetchedAt={state.fetchedAt}
            stale={state.stale}
            fromCache={state.fromCache}
            source="DfE Explore Education Statistics API"
            sourceUrl={EES_DOCS}
          />
          {state.items.length === 0 ? (
            <Empty title="No API datasets for this publication">
              Not every publication is available through the API. You can still
              read it on{" "}
              <a
                className="text-primary underline"
                href={EES_SITE}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explore education statistics
              </a>
              .
            </Empty>
          ) : (
            <ul className="border-t">
              {state.items.map((d) => (
                <li key={d.id} className="border-b py-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="flex items-center gap-2 font-semibold">
                      <Database className="text-primary size-4" aria-hidden />
                      {d.title}
                    </p>
                    <Tag>
                      v{d.version || "?"} · {d.status || "status unknown"}
                    </Tag>
                  </div>
                  {d.summary && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {d.summary}
                    </p>
                  )}
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium">Published</dt>
                      <dd className="text-muted-foreground">
                        {fmtDate(d.published)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Time period</dt>
                      <dd className="text-muted-foreground">
                        {d.timeStart && d.timeEnd
                          ? `${d.timeStart} to ${d.timeEnd}`
                          : "Not stated"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Geography</dt>
                      <dd className="text-muted-foreground">
                        {d.geographies.join(", ") || "Not stated"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Filters</dt>
                      <dd className="text-muted-foreground">
                        {d.filters.join(", ") || "None"}
                      </dd>
                    </div>
                  </dl>
                  {d.indicatorCount > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-medium">
                        Measures in this dataset ({d.indicatorCount})
                      </summary>
                      <ul className="text-muted-foreground mt-2 list-disc space-y-0.5 pl-5">
                        {d.indicatorsSample.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                        {d.indicatorCount > d.indicatorsSample.length && (
                          <li>
                            …and {d.indicatorCount - d.indicatorsSample.length}{" "}
                            more. See the release for definitions
                          </li>
                        )}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {state.total > state.items.length && (
            <p className="text-muted-foreground text-xs">
              Showing {state.items.length} of {state.total} datasets.
            </p>
          )}
        </>
      )}
    </section>
  );
}
