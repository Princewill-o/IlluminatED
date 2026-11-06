"use client";

import type { MusicScene } from "./music";

/** Locally hosted CC0 recordings; provenance and original notices are in /audio/credits.json. */
const TRACKS: Record<MusicScene, string> = {
  city: "track-3", nature: "track-1", home: "track-0", study: "track-0",
  station: "track-4", journey: "track-2", arcade: "track-3", quiet: "track-1",
  university: "track-4", work: "track-4", shop: "track-3",
};
export function createRecordedMusic() {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "none";
  let enabled = false;
  let closed = false;
  let track = "";
  return {
    scene(scene: MusicScene) {
      const next = `/audio/${TRACKS[scene]}.ogg`;
      if (closed || next === track) return;
      track = next;
      audio.pause();
      audio.src = track;
      if (enabled && !document.hidden) void audio.play().catch(() => {});
    },
    /** Play a named track directly (the in-car radio). */
    track(name: string) {
      const next = `/audio/${name}.ogg`;
      if (closed || next === track) return;
      track = next;
      audio.pause();
      audio.src = track;
      if (enabled && !document.hidden) void audio.play().catch(() => {});
    },
    volume(level: number) { audio.volume = Math.max(0, Math.min(1, level)); },
    async active(value: boolean) {
      enabled = value;
      if (closed) return;
      if (value && !document.hidden) await audio.play(); else audio.pause();
    },
    suspend() { audio.pause(); },
    dispose() { closed = true; enabled = false; audio.pause(); audio.removeAttribute("src"); audio.load(); },
  };
}
