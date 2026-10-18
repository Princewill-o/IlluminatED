"use client";

import { useEffect, useRef, useState } from "react";

import { Music2, VolumeX } from "lucide-react";

import { createMusic, type MusicScene } from "../music";

const KEY = "illuminated-music";
const LABELS: Record<MusicScene, string> = { city: "City grooves", nature: "Highland air", home: "Home comforts", study: "Quiet focus", station: "Platform pulse", journey: "Window seat", arcade: "Playtime", quiet: "A moment of calm", university: "Next chapter", work: "Finding your rhythm", shop: "Afternoon browse" };

export function SceneMusic({ scene }: { scene: MusicScene }) {
  const engine = useRef<ReturnType<typeof createMusic> | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const settings = useRef({ enabled: true, volume: 0.25 });
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.25);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved.enabled === "boolean" && Number.isFinite(saved.volume)) {
        settings.current = { enabled: saved.enabled, volume: Math.max(0, Math.min(1, saved.volume)) };
        setEnabled(settings.current.enabled); setVolume(settings.current.volume);
      }
    } catch { /* Use quiet defaults if storage is unavailable. */ }
    const start = () => {
      if (!settings.current.enabled || document.hidden) return;
      try {
        if (!engine.current) {
          engine.current = createMusic();
          engine.current.scene(sceneRef.current);
          engine.current.volume(settings.current.volume);
        }
        void engine.current.active(true).catch(() => {});
      } catch { /* Audio may be unavailable in this browser. */ }
    };
    const visibility = () => { if (document.hidden) engine.current?.suspend(); else start(); };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      document.removeEventListener("visibilitychange", visibility);
      engine.current?.dispose(); engine.current = null;
    };
  }, []);
  useEffect(() => { engine.current?.scene(scene); }, [scene]);
  const update = (on: boolean, level: number) => {
    settings.current = { enabled: on, volume: level };
    setEnabled(on); setVolume(level);
    try {
      if (on && !engine.current) { engine.current = createMusic(); engine.current.scene(scene); }
      engine.current?.volume(level);
      void engine.current?.active(on).catch(() => {});
      localStorage.setItem(KEY, JSON.stringify(settings.current));
    } catch { /* Controls remain usable without audio or storage access. */ }
  };
  return (
    <div className="absolute top-20 right-3 z-[70] text-[#fff3d8]">
      <button type="button" onClick={() => setOpen(value => !value)} aria-label="Music settings" aria-expanded={open} aria-controls="scene-music-settings" className="flex min-h-11 items-center gap-2 rounded-full border border-[#c8b182]/40 bg-[#183b35]/95 px-3 text-xs font-bold shadow-lg">
        {enabled && volume > 0 ? <Music2 className="size-4" /> : <VolumeX className="size-4" />} Music
      </button>
      {open && <section id="scene-music-settings" aria-label="Music settings" className="absolute top-13 right-0 w-60 rounded-2xl border border-[#c8b182]/40 bg-[#183b35] p-4 shadow-xl">
        <p className="text-sm font-bold">{LABELS[scene]}</p>
        <p className="mt-1 text-xs text-white/70">Original music for this scene</p>
        <button type="button" aria-pressed={enabled} onClick={() => update(!enabled, volume)} className="mt-3 min-h-11 w-full rounded-xl bg-[#fff3d8] px-3 text-xs font-bold text-[#183b35]">{enabled ? "Mute music" : "Play music"}</button>
        <label className="mt-3 block text-xs">Music volume · {Math.round(volume * 100)}%
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => update(enabled, Number(event.target.value))} className="mt-2 min-h-6 w-full accent-[#c8b182]" />
        </label>
      </section>}
    </div>
  );
}
