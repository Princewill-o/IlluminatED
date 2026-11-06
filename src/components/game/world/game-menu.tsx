"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Globe2, GraduationCap, Home, LayoutDashboard, LogOut, MapPin, Play, Save, Settings } from "lucide-react";

import { inGameDashboard, type InGameDashboard } from "@/app/games/world/actions";
import { DailyGoals } from "@/components/game/engagement";
import { GRAPHICS_KEY, readGraphicsSetting } from "@/game/core/visual-quality";
import { browserSupabase } from "@/lib/supabase-browser";

/** Where a player left off, so "Continue playing" can drop them back there. */
export type ResumeSpot = { map: string; name: string; x: number; y: number; at: number };

const RESUME_KEY = "illuminated:resume";
const keyFor = (userId: string) => `${RESUME_KEY}:${userId}`;

export function saveResume(userId: string, spot: Omit<ResumeSpot, "at">) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ ...spot, x: Math.round(spot.x), y: Math.round(spot.y), at: Date.now() }));
  } catch { /* Resume is a convenience; play on without it. */ }
}

export function loadResume(userId: string): ResumeSpot | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const s = JSON.parse(raw) as ResumeSpot;
    return typeof s.map === "string" && Number.isFinite(s.x) && Number.isFinite(s.y) ? s : null;
  } catch { return null; }
}

export const resumeHref = (s: ResumeSpot) => `/games/world?map=${encodeURIComponent(s.map)}&x=${s.x}&y=${s.y}`;

type Tab = "menu" | "learning" | "settings";
const readLocal = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeLocal = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Optional. */ } };
/** Tell the running world a setting changed (graphics, motion, the Learn card). */
export const announceSettings = (detail: Record<string, unknown>) => window.dispatchEvent(new CustomEvent("illumed:world-settings", { detail }));

/**
 * The pause menu (Esc or Backspace): resume, save, your learning dashboard
 * and settings without leaving the game, back to the main menu, or log out.
 */
export function GameMenu({ place, onContinue, onLeave, onSwitch, onEvents, onSave }: { place: string; onContinue: () => void; onLeave: () => void; onSwitch?: () => void; onEvents?: () => void; onSave?: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("menu");
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { first.current?.focus(); }, []);
  const logOut = async () => {
    setLeaving(true);
    onSave?.();
    await browserSupabase()?.auth.signOut().catch(() => {});
    window.location.assign("/");
  };
  return (
    <div className="pixel-menu-backdrop absolute inset-0 z-[100012] grid place-items-center p-4" onClick={onContinue}>
      <section role="dialog" aria-modal="true" aria-labelledby="game-menu-title" onClick={(e) => e.stopPropagation()}
        className="pixel-panel pixel-menu flex max-h-[min(92dvh,46rem)] w-full max-w-lg flex-col">
        <div className="pixel-ribbon text-center text-sm">Game paused</div>
        <div className="pixel-menu-body flex min-h-0 flex-1 flex-col">
          <h2 id="game-menu-title" className="sr-only">Pause menu</h2>
          <p className="flex items-center gap-1.5 text-sm font-bold"><MapPin className="size-4 shrink-0" aria-hidden />{place}</p>
          <div role="tablist" aria-label="Pause menu" className="mt-3 grid grid-cols-3 gap-2">
            {([["menu", "Menu", Play], ["learning", "Learning", GraduationCap], ["settings", "Settings", Settings]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`pixel-button flex min-h-11 items-center justify-center gap-1.5 px-2 text-sm ${tab === id ? "pixel-button--purple" : ""}`}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {tab === "menu" && (
              <div className="grid gap-3">
                <button ref={first} type="button" onClick={onContinue} className="pixel-button pixel-button--green flex min-h-12 items-center justify-center gap-2 px-5">
                  <Play className="size-4 fill-current" aria-hidden /> Resume
                </button>
                <button type="button" onClick={() => { onSave?.(); setSaved(true); window.setTimeout(() => setSaved(false), 2500); }} className="pixel-button flex min-h-12 items-center justify-center gap-2 px-5">
                  <Save className="size-4" aria-hidden /> {saved ? "Saved ✓" : "Save game"}
                </button>
                {onEvents && <button type="button" onClick={onEvents} className="pixel-button pixel-button--purple min-h-12 px-5">Racing, Championship & What If</button>}
                {onSwitch && (
                  <button type="button" onClick={onSwitch} className="pixel-button flex min-h-12 items-center justify-center gap-2 px-5">
                    <Globe2 className="size-4" aria-hidden /> Switch server
                  </button>
                )}
                <button type="button" onClick={onLeave} className="pixel-button pixel-button--orange flex min-h-12 items-center justify-center gap-2 px-5">
                  <Home className="size-4" aria-hidden /> Save and back to main menu
                </button>
                <button type="button" disabled={leaving} onClick={() => void logOut()} className="pixel-button flex min-h-12 items-center justify-center gap-2 px-5 disabled:opacity-50">
                  <LogOut className="size-4" aria-hidden /> {leaving ? "Logging out…" : "Save and log out"}
                </button>
                <p className="text-center text-xs font-semibold leading-5">Your spot and progress save automatically. Esc or Backspace closes this menu.</p>
              </div>
            )}
            {tab === "learning" && <LearningTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Your learning dashboard without leaving the game. */
function LearningTab() {
  const [data, setData] = useState<InGameDashboard | null | undefined>(undefined);
  useEffect(() => { void inGameDashboard().then(setData).catch(() => setData(null)); }, []);
  if (data === undefined) return <p className="text-sm font-bold">Loading your progress…</p>;
  if (!data) return <p className="text-sm">Sign in and pick your subjects to see your progress here. <a href="/dashboard/settings" className="font-black underline">Add subjects</a></p>;
  return (
    <div className="grid gap-4 text-sm">
      <section><h3 className="mb-2 font-black">Today&apos;s goals</h3><DailyGoals tone="light" /></section>
      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
        <div className="pixel-panel p-1.5"><p className="text-lg font-black">{data.thisWeek}</p>This week</div>
        <div className="pixel-panel p-1.5"><p className="text-lg font-black text-[#c8322d]">{data.mastery.needsWork}</p>Needs work</div>
        <div className="pixel-panel p-1.5"><p className="text-lg font-black text-[#b7791f]">{data.mastery.gettingThere}</p>Getting there</div>
        <div className="pixel-panel p-1.5"><p className="text-lg font-black text-[#15803d]">{data.mastery.secure}</p>Secure</div>
      </div>
      <section>
        <h3 className="font-black">Your subjects</h3>
        {!data.subjects.length && <p className="mt-1">No subjects yet. <a href="/dashboard/settings" className="font-black underline">Add your subjects</a></p>}
        <ul className="mt-2 grid gap-2">
          {data.subjects.map((s) => (
            <li key={s.courseId} className="pixel-panel flex items-center gap-3 p-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">{s.subject}</span>
                <span className="block text-xs">{s.started}/{s.topics} topics{s.accuracy !== null && ` · ${Math.round(s.accuracy * 100)}% right`}{s.next && ` · aim for ${s.next}`}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/15" aria-hidden><span className="block h-full bg-[#6cc04a]" style={{ width: `${s.topics ? (s.started / s.topics) * 100 : 0}%` }} /></span>
              </span>
              <span className="shrink-0 text-center"><span className="block rounded-lg bg-[#f2d9a6] px-2 text-lg font-black text-[#0d1726]">{s.grade ?? "?"}</span><span className="text-[10px]">estimate</span></span>
            </li>
          ))}
        </ul>
      </section>
      {data.learnNext.length > 0 && (
        <section>
          <h3 className="font-black">Learn next</h3>
          <ul className="mt-2 grid gap-1.5">
            {data.learnNext.map((t) => (
              <li key={`${t.courseId}-${t.topicId}`}><a href={`/courses/${t.courseId}/${t.topicId}`} target="_blank" rel="noreferrer" className="pixel-panel block p-2.5 hover:brightness-95"><span className="block font-black">{t.title}</span><span className="block text-xs">{t.subject} · {t.reason}</span></a></li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Questions you answer anywhere in the world count towards these. The Learn card at the top left runs quick rounds.</p>
        </section>
      )}
      <a href="/dashboard" className="pixel-button flex min-h-11 items-center justify-center gap-2 px-4"><LayoutDashboard className="size-4" aria-hidden /> Full dashboard</a>
    </div>
  );
}

/** Game settings: graphics, motion and the Learn card. Saved on this device. */
function SettingsTab() {
  const [graphics, setGraphics] = useState("auto");
  const [immersive, setImmersive] = useState(false);
  const [learnCard, setLearnCard] = useState(true);
  const [autoTier, setAutoTier] = useState("balanced");
  useEffect(() => {
    setGraphics(readGraphicsSetting(readLocal(GRAPHICS_KEY)));
    setImmersive(readLocal("world-immersive-motion") === "on");
    setLearnCard(readLocal("world-learn-card") !== "off");
    try { setAutoTier(sessionStorage.getItem("world-graphics-auto") ?? "balanced"); } catch { /* Optional. */ }
  }, []);
  const name = (t: string) => (t === "high" ? "High" : t === "performance" ? "Performance" : "Balanced");
  return (
    <div className="grid gap-4 text-sm">
      <fieldset>
        <legend className="font-black">Graphics</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([["auto", `Auto (${name(autoTier)})`], ["high", "High: best looking"], ["balanced", "Balanced"], ["performance", "Performance: smoothest"]] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={graphics === v} onClick={() => { setGraphics(v); writeLocal(GRAPHICS_KEY, v); announceSettings({ graphics: v }); }}
              className={`pixel-button min-h-11 px-2 text-xs ${graphics === v ? "pixel-button--green" : ""}`}>{label}</button>
          ))}
        </div>
        <p className="mt-1.5 text-xs">If the game lags, pick Performance. Auto steps down by itself when frames stay slow.</p>
      </fieldset>
      <label className="pixel-panel flex min-h-12 items-center justify-between gap-3 px-3">
        <span><span className="block font-black">Immersive motion</span><span className="block text-xs">Subtle camera sway when walking and driving.</span></span>
        <input type="checkbox" aria-label="Immersive motion" className="size-5" checked={immersive} onChange={(e) => { setImmersive(e.target.checked); writeLocal("world-immersive-motion", e.target.checked ? "on" : "off"); announceSettings({ immersive: e.target.checked }); }} />
      </label>
      <label className="pixel-panel flex min-h-12 items-center justify-between gap-3 px-3">
        <span><span className="block font-black">Learn card</span><span className="block text-xs">Your next topic and quick rounds at the top left.</span></span>
        <input type="checkbox" aria-label="Learn card" className="size-5" checked={learnCard} onChange={(e) => { setLearnCard(e.target.checked); writeLocal("world-learn-card", e.target.checked ? "on" : "off"); announceSettings({ learnCard: e.target.checked }); }} />
      </label>
      <a href="/dashboard/settings" className="pixel-button flex min-h-11 items-center justify-center gap-2 px-4"><Settings className="size-4" aria-hidden /> Account, subjects and privacy</a>
    </div>
  );
}

/** "Continue playing" on the Games page, shown once there's a saved spot. */
export function ContinuePlaying({ userId, className }: { userId: string; className?: string }) {
  const [spot, setSpot] = useState<ResumeSpot | null>(null);
  useEffect(() => setSpot(loadResume(userId)), [userId]);
  if (!spot) return null;
  return (
    <Link href={resumeHref(spot)} className={className}>
      <Play className="size-4 fill-current" aria-hidden /> Continue playing
      <span className="text-sm font-bold opacity-70">· {spot.name}</span>
    </Link>
  );
}
