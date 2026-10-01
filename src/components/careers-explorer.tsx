"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { ArrowRight, Search } from "lucide-react";

import { ErrorState, FetchMeta, Loading } from "@/components/api-status";
import { Empty, Tag, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fetchJson, isObj } from "@/lib/api-client";
import {
  type StandardSearch,
  type StandardSummary,
  levelLabel,
} from "@/lib/apprenticeships";

const isSearch = (j: unknown): j is StandardSearch =>
  isObj(j) &&
  Array.isArray(j.results) &&
  Array.isArray(j.routes) &&
  Array.isArray(j.levels);

const money = (n: number | null) =>
  n === null
    ? null
    : n.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      });

interface Filters {
  q: string;
  level: string;
  route: string;
  all: boolean;
}

export function CareersExplorer() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    level: "",
    route: "",
    all: false,
  });
  const [facets, setFacets] = useState<{ routes: string[]; levels: number[] }>({
    routes: [],
    levels: [],
  });
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        results: StandardSummary[];
        total: number;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "loading" });
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (f: Filters) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: "loading" });
    const params = new URLSearchParams();
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.level) params.set("level", f.level);
    if (f.route) params.set("route", f.route);
    if (f.all) params.set("all", "1");
    const qs = params.toString();
    try {
      const res = await fetchJson<StandardSearch>({
        proxy: `/api/apprenticeshipstandards${qs ? `?${qs}` : ""}`,
        cacheKey: `se:${qs}`,
        ttlMs: 1000 * 60 * 60 * 6,
        // The first search after a quiet spell builds the index from a large download.
        timeoutMs: 60000,
        signal: c.signal,
        validate: isSearch,
      });
      setFacets({ routes: res.data.routes, levels: res.data.levels });
      setState({
        status: "done",
        results: res.data.results,
        total: res.data.total,
        fetchedAt: res.fetchedAt,
        stale: res.stale,
        fromCache: res.fromCache,
      });
    } catch (error) {
      if (!c.signal.aborted) setState({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    run({ q: "", level: "", route: "", all: false });
    return () => ctrl.current?.abort();
  }, [run]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K], now = false) => {
    const next = { ...filters, [k]: v };
    setFilters(next);
    if (now) run(next);
  };

  return (
    <div className="space-y-6">
      <form
        role="search"
        aria-label="Search apprenticeships"
        onSubmit={(e) => {
          e.preventDefault();
          run(filters);
        }}
        className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <div>
          <label htmlFor="ap-q" className={labelCls}>
            Job or keyword
          </label>
          <input
            id="ap-q"
            className={fieldCls}
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="e.g. software, nursing, electrician, ST0116"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="ap-level" className={labelCls}>
            Level
          </label>
          <select
            id="ap-level"
            className={fieldCls}
            value={filters.level}
            onChange={(e) => set("level", e.target.value, true)}
          >
            <option value="">Any level</option>
            {facets.levels.map((l) => (
              <option key={l} value={l}>
                {levelLabel(l)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ap-route" className={labelCls}>
            Route
          </label>
          <select
            id="ap-route"
            className={fieldCls}
            value={filters.route}
            onChange={(e) => set("route", e.target.value, true)}
          >
            <option value="">Any route</option>
            {facets.routes.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto">
            <Search aria-hidden /> Search
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-4">
          <input
            type="checkbox"
            checked={filters.all}
            onChange={(e) => set("all", e.target.checked, true)}
            className="size-4"
          />
          Include apprenticeships that aren't taking new starts (retired, in
          development or paused)
        </label>
      </form>

      <div aria-live="polite">
        {state.status === "loading" && (
          <Loading label="Searching apprenticeships…" />
        )}
        {state.status === "error" && (
          <ErrorState error={state.error} onRetry={() => run(filters)} />
        )}
        {state.status === "done" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {state.total === 0
                ? "No matches."
                : state.total > state.results.length
                  ? `Showing ${state.results.length} of ${state.total}. Add a keyword or filter to narrow it down.`
                  : `${state.total} ${state.total === 1 ? "apprenticeship" : "apprenticeships"}`}
            </p>
            {state.results.length === 0 ? (
              <Empty title="No apprenticeships found">
                Try a broader word, such as "engineer" or "care", or clear the
                filters.
              </Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {state.results.map((s) => (
                  <li key={s.ref}>
                    <Link
                      href={`/careers/${s.ref.toLowerCase()}`}
                      className="group bg-card hover:border-primary/50 flex h-full flex-col rounded-lg border p-4 transition-colors"
                    >
                      <span className="font-semibold group-hover:underline group-hover:underline-offset-4">
                        {s.title}
                      </span>
                      <span className="text-muted-foreground mt-1 text-sm">
                        {levelLabel(s.level)}
                        {s.route && ` · ${s.route}`}
                      </span>
                      {s.jobTitles.length > 0 && (
                        <span className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                          Job titles: {s.jobTitles.slice(0, 3).join(", ")}
                        </span>
                      )}
                      <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                        {s.duration !== null && <Tag>{s.duration} months</Tag>}
                        {money(s.maxFunding) && (
                          <Tag>Funding up to {money(s.maxFunding)}</Tag>
                        )}
                        {!s.open && <Tag>{s.status || "Not open"}</Tag>}
                        <ArrowRight
                          className="text-muted-foreground ml-auto size-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <FetchMeta
              fetchedAt={state.fetchedAt}
              stale={state.stale}
              fromCache={state.fromCache}
              source="Skills England, Open Government Licence v3.0"
              sourceUrl="https://skillsengland.education.gov.uk/apprenticeships/"
            />
          </div>
        )}
      </div>
    </div>
  );
}
