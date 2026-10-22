"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Bus, Home, Briefcase, X } from "lucide-react";

import { BusJourneyScene, BusRide } from "./transport";

import { ARCADE } from "@/game/core/arcade";
import { createRng, newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

export type BusTrip =
  | { kind: "stop"; id: string; name: string }
  | { kind: "map"; mapId: string; label: string };

interface Stop {
  id: string;
  name: string;
  route: string;
}

/** A London bus stop: live departures board, pick where to go, and revise on the way. */
export function BusStop({
  here,
  stops,
  onGo,
  onClose,
  onPickOnMap,
  homework = [],
}: {
  here: string;
  stops: Stop[];
  onGo: (t: BusTrip, revised: boolean) => void;
  onClose: () => void;
  /** Hop on and choose any destination on the city map. */
  onPickOnMap?: () => void;
  homework?: string[];
}) {
  const current = stops.find((s) => s.id === here);
  const [revise, setRevise] = useState(true);
  const [riding, setRiding] = useState<BusTrip | null>(null);
  const [cruising, setCruising] = useState<
    (BusTrip & { route: string }) | null
  >(null);
  const mins = (i: number) => ((new Date().getMinutes() + i * 4) % 9) + 1;
  const trips: (BusTrip & { route: string })[] = [
    ...stops
      .filter((s) => s.id !== here)
      .map((s) => ({
        kind: "stop" as const,
        id: s.id,
        name: s.name,
        route: s.route,
      })),
    { kind: "map", mapId: "home", label: "Home", route: "35" },
    { kind: "map", mapId: "campus", label: "Careers Campus", route: "C1" },
  ];

  if (cruising) {
    const c = cruising;
    return (
      <BusRide
        route={c.route}
        to={c.kind === "stop" ? c.name : c.label}
        onArrive={() => onGo(c, false)}
      />
    );
  }
  if (riding)
    return (
      <Commute
        trip={riding}
        homework={homework}
        onArrive={(ok) => onGo(riding, ok)}
      />
    );

  return (
    <div
      className="absolute inset-0 z-[100004] grid place-items-end bg-black/60 md:place-items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Bus stop"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#f7f1e6] p-5 text-[#13203a] md:rounded-3xl"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#c8322d] text-white">
            <Bus className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.25em] text-[#c8322d] uppercase">
              Bus stop
            </p>
            <h2 className="truncate text-2xl font-black">
              {current?.name ?? "London"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="jelly grid size-9 place-items-center rounded-full bg-black/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          className="mt-4 rounded-2xl bg-[#13203a] p-3 font-mono text-sm text-[#f2d9a6]"
          aria-label="Departures"
        >
          {trips.slice(0, 4).map((t, i) => (
            <p
              key={t.kind === "stop" ? t.id : t.mapId}
              className="flex justify-between"
            >
              <span>
                {t.route.padEnd(4)} {t.kind === "stop" ? t.name : t.label}
              </span>
              <span>{i === 0 ? "due" : `${mins(i)} min`}</span>
            </p>
          ))}
        </div>

        {onPickOnMap && (
          <button type="button" onClick={onPickOnMap} className="jelly mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c8322d] p-3 text-sm font-black text-white">
            <Bus className="size-4" aria-hidden /> Hop on: pick anywhere on the map
          </button>
        )}
        <label className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={revise}
            onChange={(e) => setRevise(e.target.checked)}
            className="size-5 accent-[#1f4fbf]"
          />
          <span className="flex-1">
            {homework.length
              ? "Revise your homework topics on the way: 3 questions for +15 Focus"
              : "Revise on the way: 3 quick flashcards for +15 Focus"}
          </span>
        </label>

        <p className="mt-4 text-xs font-black tracking-widest text-[#5a6272] uppercase">
          Where to?
        </p>
        <ul className="mt-2 grid gap-2">
          {trips.map((t) => (
            <li key={t.kind === "stop" ? t.id : t.mapId}>
              <button
                type="button"
                onClick={() => (revise ? setRiding(t) : setCruising(t))}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-white bg-white/70 px-3 py-2.5 text-left font-bold hover:border-[#1f4fbf]"
              >
                <span className="grid h-7 min-w-10 place-items-center rounded-md bg-[#c8322d] px-1.5 text-xs font-black text-white">
                  {t.route}
                </span>
                <span className="flex-1">
                  {t.kind === "stop" ? t.name : t.label}
                </span>
                {t.kind === "map" &&
                  (t.mapId === "home" ? (
                    <Home className="size-4" aria-hidden />
                  ) : (
                    <Briefcase className="size-4" aria-hidden />
                  ))}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** On the bus: three quick flashcards while you ride. */
export function Commute({
  trip,
  onArrive,
  homework,
}: {
  trip: BusTrip;
  onArrive: (revised: boolean) => void;
  homework: string[];
}) {
  const quick = useMemo(() => {
    const rng = createRng(newSeed());
    const pool = ARCADE.filter((g) => g.id !== "binary-blitz");
    return Array.from({ length: 3 }, (_, i) =>
      pool[(i + Math.floor(rng() * pool.length)) % pool.length].make(rng),
    );
  }, []);
  // With homework due, the bus revises the same topics (different questions, so no spoilers).
  const [fromHomework, setFromHomework] = useState<
    { prompt: string; options: string[]; answer: number }[] | null
  >(null);
  const answered = useRef(false);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );
  useEffect(() => {
    let disposed = false;
    if (!homework.length) return;
    void import("@/lib/data/topics")
      .then(({ QUESTION_BANK }) => {
        const set = new Set(homework);
        const topics = new Set(
          QUESTION_BANK.filter((q) => set.has(q.key)).map((q) => q.topicId),
        );
        const pool = QUESTION_BANK.filter(
          (q) => topics.has(q.topicId) && !set.has(q.key),
        )
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        if (!disposed && !answered.current && pool.length === 3)
          setFromHomework(
            pool.map((q) => ({
              prompt: q.q,
              options: q.options,
              answer: q.answer,
            })),
          );
      })
      .catch(() => {
        /* Generated flashcards remain available offline. */
      });
    return () => {
      disposed = true;
    };
  }, [homework]);
  const cards = fromHomework ?? quick;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const name = trip.kind === "stop" ? trip.name : trip.label;
  const q = cards[i];

  return (
    <div className="absolute inset-0 z-[100005] grid place-items-center overflow-y-auto bg-[#13203a]/85 p-4">
      <div
        role="dialog"
        aria-label="On the bus"
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl bg-[#f7f1e6] text-[#13203a] [color-scheme:light]"
      >
        <div className="relative">
          <BusJourneyScene
            route={
              trip.kind === "stop"
                ? ((trip as BusTrip & { route?: string }).route ?? "BL1")
                : "BL1"
            }
            to={name}
            className="h-44"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#c8322d] px-4 py-1.5 text-sm font-black text-white">
            <span>Next stop: {name}</span>
            <span>{i + 1 > 3 ? 3 : i + 1}/3</span>
          </div>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={() => onArrive(false)}
            className="mb-3 text-sm font-bold text-[#1f4fbf] underline"
          >
            Skip revision and arrive
          </button>
          {i < cards.length ? (
            <>
              {fromHomework && (
                <p className="mb-2 text-center text-xs font-black tracking-widest text-[#1f4fbf] uppercase">
                  Practice for your homework
                </p>
              )}
              <p
                className={cn(
                  "text-center font-black",
                  fromHomework ? "text-lg" : "text-2xl",
                )}
              >
                {q.prompt}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {q.options.map((o, k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => {
                      if (advance.current) return;
                      answered.current = true;
                      setPicked(k);
                      if (k === q.answer) setRight((r) => r + 1);
                      advance.current = setTimeout(() => {
                        advance.current = null;
                        setPicked(null);
                        setI((n) => n + 1);
                      }, 650);
                    }}
                    className={cn(
                      "rounded-2xl border-2 bg-white px-2 py-3 text-sm leading-5 font-bold",
                      picked !== null && k === q.answer
                        ? "border-[#15987f] bg-[#e3f5ec]"
                        : picked === k
                          ? "border-[#c8322d] bg-[#fdeceb]"
                          : "border-white",
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-3xl font-black">{right}/3</p>
              <p className="mt-1 text-[#5a6272]">
                Revision done on the way. +15 Focus.
              </p>
              <button
                type="button"
                onClick={() => onArrive(true)}
                className="jelly mt-4 w-full rounded-full bg-[#1f4fbf] py-3 font-black text-white"
              >
                Get off at {name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
