"use client";

import { useEffect, useState } from "react";

import { CalendarDays, ExternalLink, X } from "lucide-react";

import { useIllumship } from "./city/membership";

export interface TechEvent {
  id: string;
  name: string;
  url: string;
  start: string;
  where: string;
  host: string | null;
  free: boolean | null;
  hackathon: boolean;
  source: "Luma" | "Eventbrite";
}

let cache: Promise<TechEvent[]> | null = null;
/** Real hackathons and tech events in London (from Luma, and Eventbrite when set up). */
export function useTechEvents() {
  const vip = useIllumship();
  const [events, setEvents] = useState<TechEvent[]>([]);
  useEffect(() => {
    if (vip) return;
    cache ??= fetch("/api/events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events?: TechEvent[] }) => d.events ?? [])
      .catch(() => []);
    let alive = true;
    void cache.then((e) => alive && setEvents(e));
    return () => {
      alive = false;
    };
  }, [vip]);
  return vip ? [] : events;
}

export const eventWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Europe/London" });

function AdCard({ e, onClose }: { e: TechEvent; onClose?: () => void }) {
  return (
    <div className="ad-in relative overflow-hidden rounded-3xl border-2 border-white bg-[#13203a] text-white shadow-2xl">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_90%_10%,#6bc6ff,transparent_45%),radial-gradient(circle_at_0%_100%,#7a5ce6,transparent_50%)]" />
      <div className="relative p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#ffd166] px-2 py-0.5 text-[10px] font-black tracking-widest text-[#13203a] uppercase">{e.hackathon ? "Hackathon" : "Tech event"}</span>
          <span className="text-[10px] font-bold text-white/60">Ad · via {e.source}</span>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Hide this advert" className="jelly ml-auto grid size-7 place-items-center rounded-full bg-white/15">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-base leading-snug font-black">{e.name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
          <CalendarDays className="size-3.5" aria-hidden /> {eventWhen(e.start)} · {e.where}
          {e.free ? " · Free" : ""}
        </p>
        {e.host && <p className="mt-0.5 truncate text-xs text-white/60">Hosted by {e.host}</p>}
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="jelly mt-3 inline-flex items-center gap-1 rounded-full bg-[#f2d9a6] px-4 py-2 text-xs font-black text-[#13203a]">
          See the event <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

/** In-game advert that pops up now and then while you play (a different real event each time). */
export function EventAdPopup({ events, firstAfter = 40_000, every = 240_000 }: { events: TechEvent[]; firstAfter?: number; every?: number }) {
  const vip = useIllumship();
  const [i, setI] = useState(-1);
  useEffect(() => {
    if (vip || !events.length) return;
    const first = setTimeout(() => setI(0), firstAfter);
    const loop = setInterval(() => setI((n) => (n < 0 ? 0 : n + 1)), every);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, [events.length, firstAfter, every, vip]);
  // Each advert hides itself after 14 seconds.
  useEffect(() => {
    if (i < 0) return;
    const t = setTimeout(() => setI((n) => (n === i ? -1 - i : n)), 14_000);
    return () => clearTimeout(t);
  }, [i]);
  if (vip || i < 0 || !events.length) return null;
  return (
    <div className="absolute bottom-24 left-3 z-[100001] w-[min(330px,calc(100%-24px))]">
      <AdCard e={events[i % events.length]} onClose={() => setI(-1 - i)} />
    </div>
  );
}

/** A strip of upcoming events (for the Games Hub). */
export function EventAdStrip({ events }: { events: TechEvent[] }) {
  const vip = useIllumship();
  if (vip || !events.length) return null;
  return (
    <section className="mt-6" aria-label="Hackathons and tech events">
      <p className="text-xs font-black tracking-[0.2em] text-[#13203a]/60 uppercase">Hackathons and tech events in London · Ads</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((e) => (
          <AdCard key={e.id} e={e} />
        ))}
      </div>
    </section>
  );
}
