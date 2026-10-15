"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { play, soundOn } from "../sound";
import { type Me, useLobby } from "./use-world";
import { WorldView } from "./world-view";

import {
  CITY,
  type OfficeOrg,
  type Portal,
  REGIONS,
  type RegionId,
  SERVERS,
  SERVER_CAPACITY,
  type WorldMap,
  campusMap,
  guessRegion,
  isRegion,
  officeMap,
  pickServer,
  safeSpot,
  serverById,
} from "@/game/core/world";
import { cn } from "@/lib/utils";

const REGION_KEY = "world-region";

function loadMap(id: string, offices: OfficeOrg[]): WorldMap | null {
  if (id === "city") return CITY;
  if (id === "campus") return campusMap(offices);
  if (id.startsWith("office-")) {
    const org = offices.find((o) => `office-${o.slug}` === id);
    return org ? officeMap(org) : null;
  }
  return null;
}

export interface OfficeStaff {
  userId: string;
  username: string;
  title: string | null;
}

export function WorldApp({
  me,
  offices,
  staff,
  initialMap,
  initialServer,
}: {
  me: Me;
  offices: OfficeOrg[];
  /** Verified staff for each office slug (for the Advice Desk). */
  staff: Record<string, OfficeStaff[]>;
  initialMap: string;
  initialServer: string | null;
}) {
  const router = useRouter();
  const [mapId, setMapId] = useState(() => (loadMap(initialMap, offices) ? initialMap : "city"));
  const [server, setServer] = useState<string | null>(initialServer && serverById(initialServer) ? initialServer : null);
  const [region, setRegion] = useState<RegionId>("lse");
  const [arrive, setArrive] = useState<{ x: number; y: number } | undefined>();
  const [desk, setDesk] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  }, []);
  const map = useMemo(() => loadMap(mapId, offices) ?? CITY, [mapId, offices]);
  const inOffice = mapId.startsWith("office-");
  const lobby = useLobby(server ? { map: mapId, server: inOffice ? "main" : server } : null, me.id);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGION_KEY);
      setRegion(saved && isRegion(saved) ? saved : guessRegion(Intl.DateTimeFormat().resolvedOptions().timeZone));
    } catch {
      setRegion(guessRegion(Intl.DateTimeFormat().resolvedOptions().timeZone));
    }
  }, []);

  // Keep the address bar shareable: /games/world?map=campus&server=lse-1
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("map", mapId);
    if (server) url.searchParams.set("server", server);
    else url.searchParams.delete("server");
    window.history.replaceState(null, "", url);
  }, [mapId, server]);

  const chooseRegion = (r: RegionId) => {
    setRegion(r);
    try {
      localStorage.setItem(REGION_KEY, r);
    } catch {
      // Not saved; fine for this visit.
    }
  };

  const onPortal = useCallback(
    (portal: Portal) => {
      const to = portal.to;
      if (to.kind === "game") router.push(`/games/promotion-panic/${to.companyId}`);
      else if (to.kind === "link") router.push(to.href);
      else if (to.kind === "desk") setDesk(true);
      else {
        const next = loadMap(to.mapId, offices);
        if (!next) return;
        // Arrive outside the door that leads back to where you came from.
        const back = next.portals.find((p) => p.to.kind === "map" && p.to.mapId === mapId);
        const spot = back
          ? safeSpot(next, back.rect.x + back.rect.w / 2, back.rect.y + (back.rect.y > next.height / 2 ? -50 : back.rect.h + 50))
          : next.spawn;
        // Fade to black, swap the map underneath, then fade back in.
        play("door", soundOn());
        setFading(true);
        setDesk(false);
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => {
          setArrive(spot);
          setMapId(to.mapId);
          fadeTimer.current = setTimeout(() => setFading(false), 120);
        }, 280);
      }
    },
    [router, offices, mapId],
  );

  const countFor = (m: string, s: string) => lobby.counts[`${m}:${s}`] ?? 0;
  const officeSlug = inOffice ? mapId.slice("office-".length) : null;
  const officeStaff = officeSlug ? (staff[officeSlug] ?? []) : [];

  if (!server) {
    const counts = Object.fromEntries(SERVERS.map((s) => [s.id, countFor(mapId, s.id)]));
    const best = pickServer(region, counts);
    return (
      <div className="mx-auto max-w-3xl px-4 pt-5 pb-10 md:pt-10">
        <p className="text-xs font-black tracking-[0.3em] text-[#a67fff] uppercase">Worlds</p>
        <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Join a server</h1>
        <p className="mt-2 text-[#b3abc4]">
          Walk around {map.name} with other learners, step into companies and meet verified employers. Servers are grouped by
          region so you meet people near you, and they all run in London for a fast connection across the UK.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Maps">
          {[
            { id: "city", name: "🏙️ IlluminatED City" },
            { id: "campus", name: "🏢 Careers Campus" },
          ].map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mapId === m.id}
              onClick={() => setMapId(m.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-extrabold",
                mapId === m.id ? "bg-[#f4f0ff] text-[#0b0910]" : "bg-[#1f1830]",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        <label className="mt-6 block text-sm font-bold" htmlFor="region">
          Your region
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => chooseRegion(e.target.value as RegionId)}
          className="mt-2 w-full rounded-2xl border border-white/15 bg-[#15111f] px-4 py-3 font-bold sm:w-80"
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setServer(best.id)}
          className="arcade-btn mt-6 w-full rounded-full bg-[#c6f36b] py-4 text-lg font-black text-[#0b0910] sm:w-auto sm:px-10"
        >
          Quick join: {best.name} →
        </button>

        <h2 className="mt-8 text-lg font-extrabold">All servers</h2>
        {!lobby.ready && <p className="mt-2 text-sm text-[#b3abc4]">Checking who&apos;s online…</p>}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SERVERS.filter((s) => s.region === region)
            .concat(SERVERS.filter((s) => s.region !== region))
            .map((s) => {
              const n = countFor(mapId, s.id);
              const full = n >= SERVER_CAPACITY;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => setServer(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border bg-[#15111f] px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40",
                      s.region === region ? "border-[#a67fff]/50" : "border-white/10",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.name}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full bg-[#5fd3a5]" style={{ width: `${(n / SERVER_CAPACITY) * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-sm font-black tabular-nums">
                      {full ? "Full" : `${n}/${SERVER_CAPACITY}`}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh">
      <WorldView
        key={`${mapId}:${server}`}
        map={map}
        serverId={inOffice ? "main" : server}
        me={me}
        arriveAt={arrive}
        onPortal={onPortal}
        onRoom={setRoom}
        onChangeServer={() => setServer(null)}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-[#0b0910] transition-opacity duration-300 motion-reduce:transition-none",
          fading ? "opacity-100" : "opacity-0",
        )}
      />
      {room && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-[#7c4dff] px-4 py-2 text-sm font-black" role="status">
          🚪 {room}
          {officeSlug && (
            <Link href={`/messages?org=${officeSlug}`} className="pointer-events-auto ml-2 underline">
              Open my meetings
            </Link>
          )}
        </div>
      )}
      {desk && officeSlug && (
        <div className="absolute inset-0 grid place-items-end bg-black/60 md:place-items-center" onClick={() => setDesk(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#15111f] p-5 md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Advice Desk"
          >
            <p className="text-xs font-black tracking-[0.25em] text-[#a67fff] uppercase">Advice Desk</p>
            <h2 className="mt-1 text-2xl font-black">{map.name}</h2>
            <p className="mt-1 text-sm text-[#b3abc4]">Verified people from this company who give advice to learners.</p>
            <ul className="mt-4 space-y-2">
              {officeStaff.length === 0 && <li className="text-sm text-[#b3abc4]">No advisers listed yet.</li>}
              {officeStaff.map((s) => (
                <li key={s.userId} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">@{s.username}</span>
                    {s.title && <span className="block truncate text-xs text-[#b3abc4]">{s.title}</span>}
                  </span>
                  {s.userId !== me.id && (
                    <Link href={`/messages/new?to=${s.userId}`} className="rounded-full bg-[#c6f36b] px-3 py-1.5 text-xs font-black text-[#0b0910]">
                      Message
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/companies/${officeSlug}`} className="rounded-full bg-[#7c4dff] py-2.5 text-center text-sm font-black">
                Company profile
              </Link>
              <Link href={`/companies/${officeSlug}#office-hours`} className="rounded-full bg-[#1f1830] py-2.5 text-center text-sm font-black">
                Book office hours
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
