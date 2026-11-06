"use client";

import { useEffect } from "react";

import { ChevronLeft, ChevronRight, Radio } from "lucide-react";

import { HudSlot } from "./hud";

/** Stations on the in-car radio. Each plays one of the game's CC0 recordings. */
export const RADIO_STATIONS = [
  { id: "track-3", name: "Illum FM", tag: "Big city pop", colour: "#ff5a7a" },
  { id: "track-2", name: "Night Drive", tag: "Chill for the motorway", colour: "#7a5ce6" },
  { id: "track-4", name: "Pulse 101", tag: "Upbeat all day", colour: "#2b9be0" },
  { id: "track-1", name: "Highland Air", tag: "Folk and fresh air", colour: "#4caf6a" },
  { id: "track-0", name: "Study Beats", tag: "Lo-fi to revise to", colour: "#e0a22b" },
  { id: "off", name: "Radio off", tag: "Just the engine", colour: "#6b7280" },
] as const;
export type RadioStation = (typeof RADIO_STATIONS)[number]["id"];
const KEY = "illuminated:car-radio";

export function savedStation(): RadioStation {
  try { const v = localStorage.getItem(KEY); if (RADIO_STATIONS.some((s) => s.id === v)) return v as RadioStation; } catch { /* Default station. */ }
  return "track-3";
}

/** The car stereo: shows while you drive. Arrow buttons or the R key change station. */
export function CarRadio({ station, onChange }: { station: RadioStation; onChange: (s: RadioStation) => void }) {
  const i = Math.max(0, RADIO_STATIONS.findIndex((s) => s.id === station));
  const now = RADIO_STATIONS[i];
  const tune = (step: number) => {
    const next = RADIO_STATIONS[(i + step + RADIO_STATIONS.length) % RADIO_STATIONS.length].id;
    try { localStorage.setItem(KEY, next); } catch { /* This drive only. */ }
    onChange(next);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "r" || e.key === "R") tune(e.shiftKey ? -1 : 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const playing = station !== "off";
  return (
    <HudSlot area="bc" order={3}>
      <div className="flex items-center gap-2 rounded-2xl border-b-4 border-black/40 bg-[#14161c]/95 p-1.5 pr-3 text-white shadow-xl" role="group" aria-label="Car radio">
        <button type="button" onClick={() => tune(-1)} aria-label="Previous station" className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><ChevronLeft className="size-4" /></button>
        <div className="flex min-w-[150px] items-center gap-2 rounded-xl bg-black/50 px-3 py-1.5 font-mono" style={{ boxShadow: `inset 0 0 14px ${now.colour}55` }}>
          <Radio className="size-4 shrink-0" style={{ color: now.colour }} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black" style={{ color: now.colour }}>{now.name}</span>
            <span className="block truncate text-[10px] text-white/60">{now.tag}</span>
          </span>
          <span aria-hidden className="ml-auto flex h-4 items-end gap-[2px]">
            {[0, 1, 2, 3].map((b) => (
              <span key={b} className="w-[3px] rounded-sm" style={{ background: now.colour, height: playing ? undefined : 3, animation: playing ? `radio-eq .${6 + b}s ease-in-out ${b * 0.1}s infinite alternate` : "none" }} />
            ))}
          </span>
        </div>
        <button type="button" onClick={() => tune(1)} aria-label="Next station" className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><ChevronRight className="size-4" /></button>
        <span className="hidden text-[10px] font-bold text-white/50 sm:block">R to tune</span>
        <style>{"@keyframes radio-eq{from{height:3px}to{height:16px}}"}</style>
      </div>
    </HudSlot>
  );
}
