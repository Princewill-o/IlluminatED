"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Search } from "lucide-react";

import { Empty, ExternalLink, fieldCls, LinkList } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/lib/data/courses";
import { LIBRARY, LIBRARY_CATEGORIES } from "@/lib/data/library";
import { OFFICIAL_RESOURCES, RESOURCE_KINDS } from "@/lib/data/resources";
import { BOARDS, ROUTES } from "@/lib/data/routes";
import type { BoardId, RouteId } from "@/lib/types";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.toLowerCase().normalize("NFKD");
const matches = (hay: string, q: string) =>
  norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => norm(hay).includes(w));

const selectCls = cn(fieldCls, "h-9 w-auto min-w-0 pr-8");

/** Compact filter bar: search on its own line, selects in a wrapping row. */
function FilterBar({
  search,
  onSearch,
  placeholder,
  searchLabel,
  children,
  onReset,
  canReset,
  count,
  noun,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  searchLabel: string;
  children: React.ReactNode;
  onReset: () => void;
  canReset: boolean;
  count: number;
  noun: [string, string];
}) {
  return (
    <div className="mb-8 space-y-3" role="search" aria-label={searchLabel}>
      <div className="relative max-w-xl">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <label className="sr-only" htmlFor={`${noun[1]}-q`}>
          {searchLabel}
        </label>
        <input
          id={`${noun[1]}-q`}
          className={cn(fieldCls, "h-11 pl-9 text-base")}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {canReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear filters
          </Button>
        )}
        <span
          className="text-muted-foreground ml-auto text-sm"
          aria-live="polite"
        >
          {count} {count === 1 ? noun[0] : noun[1]}
        </span>
      </div>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
    </>
  );
}

export function CourseDirectory({
  initialRoute = "all",
  initialQuery = "",
}: {
  initialRoute?: RouteId | "all";
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [route, setRoute] = useState<RouteId | "all">(initialRoute);
  const [level, setLevel] = useState("all");
  const [board, setBoard] = useState<BoardId | "all">("all");
  const [group, setGroup] = useState("all");

  const scope = COURSES.filter(
    (c) => initialRoute === "all" || c.route === initialRoute,
  );
  const levels = Array.from(new Set(scope.map((c) => c.level)));
  const boards = Array.from(new Set(scope.flatMap((c) => c.boards)));
  const groups = Array.from(
    new Set(
      scope
        .filter((c) => c.group && (route === "all" || c.route === route))
        .map((c) => c.group!),
    ),
  );

  const results = useMemo(
    () =>
      scope.filter(
        (c) =>
          matches(
            [
              c.title,
              c.subject,
              c.summary,
              c.group ?? "",
              ...c.commonAreas,
            ].join(" "),
            q,
          ) &&
          (route === "all" || c.route === route) &&
          (level === "all" || c.level === level) &&
          (board === "all" || c.boards.includes(board)) &&
          (group === "all" || c.group === group),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, route, level, board, group, initialRoute],
  );

  const reset = () => {
    setQ("");
    setRoute(initialRoute);
    setLevel("all");
    setBoard("all");
    setGroup("all");
  };
  const filtered =
    q !== "" ||
    route !== initialRoute ||
    level !== "all" ||
    board !== "all" ||
    group !== "all";
  const routesShown = ROUTES.filter((r) =>
    results.some((c) => c.route === r.id),
  );

  return (
    <div>
      <FilterBar
        search={q}
        onSearch={setQ}
        placeholder="Subject or topic, e.g. chemistry, cyber security, early years"
        searchLabel="Search courses"
        onReset={reset}
        canReset={filtered}
        count={results.length}
        noun={["course", "courses"]}
      >
        {initialRoute === "all" && (
          <Select
            id="cd-route"
            label="Qualification"
            value={route}
            onChange={(v) => {
              setRoute(v as RouteId | "all");
              setGroup("all");
            }}
          >
            <option value="all">All qualifications</option>
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        )}
        <Select id="cd-level" label="Level" value={level} onChange={setLevel}>
          <option value="all">Any level</option>
          {levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
        <Select
          id="cd-board"
          label="Awarding organisation"
          value={board}
          onChange={(v) => setBoard(v as BoardId | "all")}
        >
          <option value="all">Any awarding organisation</option>
          {boards.map((b) => (
            <option key={b} value={b}>
              {BOARDS[b].name}
            </option>
          ))}
        </Select>
        {groups.length > 0 && (
          <Select
            id="cd-group"
            label="Sector or type"
            value={group}
            onChange={setGroup}
          >
            <option value="all">Any sector or type</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        )}
      </FilterBar>

      {results.length === 0 ? (
        <Empty title="No courses match">
          Try fewer words, or{" "}
          <Link href={`/qualifications?title=${encodeURIComponent(q)}`}>
            search the Ofqual register
          </Link>{" "}
          for qualifications we don't cover yet.
        </Empty>
      ) : (
        <div className="space-y-12">
          {routesShown.map((r) => (
            <section key={r.id} aria-labelledby={`cd-${r.id}`}>
              {routesShown.length > 1 || initialRoute === "all" ? (
                <h3 id={`cd-${r.id}`} className="mb-2 text-lg font-semibold">
                  {r.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {r.years}
                  </span>
                </h3>
              ) : (
                <h3 id={`cd-${r.id}`} className="sr-only">
                  {r.name}
                </h3>
              )}
              <LinkList
                columns={2}
                items={results
                  .filter((c) => c.route === r.id)
                  .map((c) => ({
                    href: `/courses/${c.id}`,
                    title: c.title,
                    description: c.summary,
                    meta: c.boardFixed
                      ? c.boards.map((b) => BOARDS[b].short).join(", ")
                      : c.level,
                  }))}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceFinder() {
  const [q, setQ] = useState("");
  const [board, setBoard] = useState<string>("all");
  const [route, setRoute] = useState<RouteId | "all">("all");
  const [kind, setKind] = useState<string>("all");

  const results = OFFICIAL_RESOURCES.filter(
    (r) =>
      matches(`${r.title} ${r.provider} ${r.description}`, q) &&
      (board === "all" || r.board === board) &&
      (route === "all" || r.routes.includes(route)) &&
      (kind === "all" || r.kind === kind),
  );
  const boardOptions = Array.from(
    new Set(OFFICIAL_RESOURCES.map((r) => r.board)),
  );
  const kinds = RESOURCE_KINDS.filter((k) => results.some((r) => r.kind === k));
  const filtered =
    q !== "" || board !== "all" || route !== "all" || kind !== "all";

  return (
    <div>
      <FilterBar
        search={q}
        onSearch={setQ}
        placeholder="e.g. mark schemes, specification, T Level"
        searchLabel="Search official resources"
        onReset={() => {
          setQ("");
          setBoard("all");
          setRoute("all");
          setKind("all");
        }}
        canReset={filtered}
        count={results.length}
        noun={["link", "links"]}
      >
        <Select
          id="rf-route"
          label="Qualification"
          value={route}
          onChange={(v) => setRoute(v as RouteId | "all")}
        >
          <option value="all">All qualifications</option>
          {ROUTES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select
          id="rf-board"
          label="Exam board or organisation"
          value={board}
          onChange={setBoard}
        >
          <option value="all">All boards and bodies</option>
          {boardOptions.map((b) => (
            <option key={b} value={b}>
              {b === "gov" ? "GOV.UK, Ofqual and DfE" : BOARDS[b].name}
            </option>
          ))}
        </Select>
        <Select
          id="rf-kind"
          label="Resource type"
          value={kind}
          onChange={setKind}
        >
          <option value="all">All types</option>
          {RESOURCE_KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </Select>
      </FilterBar>
      {results.length === 0 ? (
        <Empty title="Nothing matches">
          Remove a filter, or use the qualification search to find a
          specification.
        </Empty>
      ) : (
        <div className="space-y-12">
          {kinds.map((k) => (
            <section key={k} aria-labelledby={`rk-${k}`}>
              <h3 id={`rk-${k}`} className="mb-2 text-lg font-semibold">
                {k}
              </h3>
              <ul className="border-t">
                {results
                  .filter((r) => r.kind === k)
                  .map((r) => (
                    <li
                      key={r.id}
                      className="grid gap-1 border-b py-4 md:grid-cols-[1fr_220px] md:gap-6"
                    >
                      <div>
                        <ExternalLink href={r.url}>{r.title}</ExternalLink>
                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                          {r.description}
                          {r.restricted &&
                            " Recent papers may only be available to teachers for a while."}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-sm md:text-right">
                        {r.host === "Official board" ? r.provider : r.host}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [subject, setSubject] = useState("all");
  const [uk, setUk] = useState(false);
  const subjects = Array.from(
    new Set(LIBRARY.flatMap((l) => l.subjects).filter((s) => s !== "All")),
  ).sort();
  const results = LIBRARY.filter(
    (l) =>
      matches(`${l.name} ${l.description} ${l.subjects.join(" ")}`, q) &&
      (cat === "all" || l.category === cat) &&
      (subject === "all" ||
        l.subjects.includes(subject) ||
        l.subjects.includes("All")) &&
      (!uk || l.ukRelevant),
  );
  const cats = LIBRARY_CATEGORIES.filter((c) =>
    results.some((r) => r.category === c),
  );
  const filtered = q !== "" || cat !== "all" || subject !== "all" || uk;
  return (
    <div>
      <FilterBar
        search={q}
        onSearch={setQ}
        placeholder="e.g. simulations, calculus, periodic table"
        searchLabel="Search the library"
        onReset={() => {
          setQ("");
          setCat("all");
          setSubject("all");
          setUk(false);
        }}
        canReset={filtered}
        count={results.length}
        noun={["site", "sites"]}
      >
        <Select id="lb-cat" label="Category" value={cat} onChange={setCat}>
          <option value="all">All categories</option>
          {LIBRARY_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select
          id="lb-subject"
          label="Subject"
          value={subject}
          onChange={setSubject}
        >
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            checked={uk}
            onChange={(e) => setUk(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          UK-focused only
        </label>
      </FilterBar>
      {results.length === 0 ? (
        <Empty title="Nothing matches">
          Try another subject, or clear the search.
        </Empty>
      ) : (
        <div className="space-y-12">
          {cats.map((c) => (
            <section key={c} aria-labelledby={`lc-${c}`}>
              <h3 id={`lc-${c}`} className="mb-2 text-lg font-semibold">
                {c}
              </h3>
              <ul className="border-t md:grid md:grid-cols-2 md:gap-x-10">
                {results
                  .filter((l) => l.category === c)
                  .map((l) => (
                    <li key={l.url} className="border-b py-4">
                      <ExternalLink href={l.url}>{l.name}</ExternalLink>
                      {l.ukRelevant && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          UK
                        </span>
                      )}
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {l.description}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
