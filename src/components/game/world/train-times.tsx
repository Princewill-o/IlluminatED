"use client";

import { useEffect, useState } from "react";

import { HudSlot } from "./hud";
import { TRAIN_CALL } from "./train-state";

import { trainTimes } from "@/game/core/train";

export function TrainTimes() {
  const [times, setTimes] = useState<ReturnType<typeof trainTimes> | null>(null);
  useEffect(() => {
    const update = () => {
      if (TRAIN_CALL.at >= 0 && !document.hidden) {
        const next = trainTimes(performance.now() - TRAIN_CALL.at);
        setTimes(previous => previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      }
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, []);

  if (!times) return null;
  const status = times.phase === "arriving" ? `Arriving in ${times.arrivalSeconds}s`
    : times.phase === "opening" ? `Doors opening · board in ${times.boardingSeconds}s`
      : times.phase === "boarding" ? `Board now · doors close in ${times.closingSeconds}s`
        : times.phase === "closing" ? "Doors closing · stand clear"
          : times.phase === "departing" ? "Train departing" : "Waiting for next train";

  return (
    <HudSlot area="tl" order={30}><section aria-label="Station train times" className="pointer-events-none max-w-full rounded-2xl border border-[#ffd400]/40 bg-[#13203a]/95 px-4 py-3 text-xs text-[#ffd400] shadow-lg sm:top-28">
      <h2 className="font-black tracking-wider uppercase">Platform 1 · Revision line</h2>
      <p className="mt-1 font-bold" role="status">{status}</p>
      <p className="mt-1 text-white/90">
        {times.phase === "opening" || times.phase === "boarding" || times.phase === "closing"
          ? `Departs in ${times.departureSeconds}s`
          : `Next arrival in ${times.arrivalSeconds}s`}
        {" · Every 24s"}
      </p>
      <p className="mt-1 max-w-64 text-[10px] text-white/75">Walk through an open red doorway to board.</p>
    </section></HudSlot>
  );
}
