"use client";

import { useEffect, useState } from "react";

import { GameIcon, type GameIconName } from "./game-icons";

import { earnWorldXp, learningFocus } from "@/app/games/world/actions";
import { cn } from "@/lib/utils";

// ── Daily goals ──────────────────────────────────────────────────────────────
/** Local day key, so goals reset at midnight where the player is. */
const today = () => new Date().toLocaleDateString("en-CA");
const KEY = "illuminated:daily-goals";
type Daily = { day: string; answered: number; quests: number; places: string[]; claimed: boolean };
const blank = (): Daily => ({ day: today(), answered: 0, quests: 0, places: [], claimed: false });

export function readDaily(): Daily {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Daily | null;
    return raw && raw.day === today() ? { ...blank(), ...raw } : blank();
  } catch { return blank(); }
}
function writeDaily(d: Daily) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* Optional. */ }
  window.dispatchEvent(new CustomEvent("illumed:daily-changed"));
}

/** Count progress from anywhere in the game (answers, finished quests, places visited). */
export function trackDaily(event: { answered?: number; quest?: boolean; place?: string }) {
  const d = readDaily();
  if (event.answered) d.answered += event.answered;
  if (event.quest) d.quests += 1;
  if (event.place && !d.places.includes(event.place)) d.places = [...d.places, event.place].slice(-20);
  writeDaily(d);
}

export const DAILY_GOALS: { id: "answered" | "quests" | "places"; label: string; target: number; icon: GameIconName }[] = [
  { id: "answered", label: "Answer 10 questions", target: 10, icon: "brain" },
  { id: "quests", label: "Finish a quest from someone in the world", target: 1, icon: "scroll" },
  { id: "places", label: "Visit 3 places", target: 3, icon: "pin" },
];

/** Three goals a day; finish all three to open the daily chest. */
export function DailyGoals({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [d, setD] = useState<Daily | null>(null);
  const [serverAnswered, setServerAnswered] = useState(0);
  const [reward, setReward] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setD(readDaily());
    sync();
    void learningFocus().then((f) => setServerAnswered(f?.answered ?? 0)).catch(() => {});
    window.addEventListener("illumed:daily-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("illumed:daily-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  if (!d) return null;
  const value = { answered: Math.max(d.answered, serverAnswered), quests: d.quests, places: d.places.length };
  const done = DAILY_GOALS.filter((g) => value[g.id] >= g.target).length;
  const all = done === DAILY_GOALS.length;
  const dark = tone === "dark";
  return (
    <div>
      <ul className="grid gap-2">
        {DAILY_GOALS.map((g) => {
          const v = Math.min(g.target, value[g.id]), complete = v >= g.target;
          return (
            <li key={g.id} className={cn("flex items-center gap-3 rounded-xl p-2.5", dark ? "bg-white/5" : "bg-white ring-1 ring-black/10")}>
              <GameIcon name={complete ? "check" : g.icon} size={30} />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-black", complete && "line-through opacity-60")}>{g.label}</span>
                <span className={cn("mt-1 block h-1.5 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-black/10")}><span className="block h-full rounded-full bg-[#6cc04a]" style={{ width: `${(v / g.target) * 100}%` }} /></span>
              </span>
              <span className="shrink-0 text-xs font-black">{v}/{g.target}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" disabled={!all || d.claimed}
        onClick={async () => {
          const r = await earnWorldXp("study").catch(() => null);
          writeDaily({ ...readDaily(), claimed: true });
          setD(readDaily());
          setReward(r?.xp ? `+${r.xp} XP from the daily chest!` : "Chest opened! Come back tomorrow for a new one.");
        }}
        className={cn("mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-b-4 font-black transition active:translate-y-0.5",
          all && !d.claimed ? "border-[#a8864b] bg-[#f2d9a6] text-[#0d1726] hover:brightness-105" : dark ? "border-black/30 bg-white/10 text-white/60" : "border-black/10 bg-black/5 text-black/50")}>
        <GameIcon name={d.claimed ? "check" : all ? "chest" : "lock"} size={26} />
        {d.claimed ? "Daily chest opened" : all ? "Open the daily chest" : `Daily chest: ${done}/3 goals`}
      </button>
      {reward && <p role="status" className="mt-2 text-center text-sm font-black text-[#ffd166]">{reward}</p>}
    </div>
  );
}

// ── Achievements ─────────────────────────────────────────────────────────────
export type AchievementStats = { answered: number; secure: number; streak: number; level: number; subjects: number; subjectsStarted: number };
const ACHIEVEMENTS: { id: string; name: string; icon: GameIconName; goal: (s: AchievementStats) => [number, number] }[] = [
  { id: "first", name: "First answer", icon: "play", goal: (s) => [s.answered, 1] },
  { id: "fifty", name: "50 answers", icon: "star", goal: (s) => [s.answered, 50] },
  { id: "five-hundred", name: "500 answers", icon: "rocket", goal: (s) => [s.answered, 500] },
  { id: "secure", name: "First secure topic", icon: "check", goal: (s) => [s.secure, 1] },
  { id: "ten-secure", name: "10 secure topics", icon: "medal", goal: (s) => [s.secure, 10] },
  { id: "streak3", name: "3-day streak", icon: "flame", goal: (s) => [s.streak, 3] },
  { id: "streak7", name: "7-day streak", icon: "calendar", goal: (s) => [s.streak, 7] },
  { id: "level5", name: "Level 5", icon: "bolt", goal: (s) => [s.level, 5] },
  { id: "level10", name: "Level 10", icon: "crown", goal: (s) => [s.level, 10] },
  { id: "all-subjects", name: "Every subject started", icon: "book", goal: (s) => [s.subjectsStarted, Math.max(1, s.subjects)] },
];

/** Badges with progress: what you've earned and what's next. */
export function Achievements({ stats }: { stats: AchievementStats }) {
  const list = ACHIEVEMENTS.map((a) => { const [v, t] = a.goal(stats); return { ...a, v: Math.min(v, t), t, done: v >= t }; });
  const earned = list.filter((a) => a.done).length;
  return (
    <div>
      <p className="text-xs font-bold text-white/60">{earned} of {list.length} earned</p>
      <ul className="mt-2 grid grid-cols-5 gap-2">
        {list.map((a) => (
          <li key={a.id} title={`${a.name}: ${a.v}/${a.t}`} className={cn("grid place-items-center gap-1 rounded-xl p-1.5 text-center", a.done ? "bg-white/10" : "bg-white/[.03]")}>
            <span className={cn(!a.done && "opacity-35 grayscale")}><GameIcon name={a.done ? a.icon : "lock"} size={30} /></span>
            <span className="text-[9px] leading-tight font-bold text-white/75">{a.name}</span>
            {!a.done && <span className="block h-1 w-full overflow-hidden rounded-full bg-white/15"><span className="block h-full bg-[#ffd166]" style={{ width: `${(a.v / a.t) * 100}%` }} /></span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The last seven days as flames: lit for each day of your current streak. */
export function StreakWeek({ streak }: { streak: number }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  return (
    <div className="flex items-end justify-between gap-1" aria-label={`${streak}-day streak`}>
      {days.map((d, i) => {
        const lit = 6 - i < streak;
        return (
          <span key={i} className="grid place-items-center gap-0.5 text-[10px] font-black text-white/60">
            <span className={cn(!lit && "opacity-25 grayscale")}><GameIcon name="flame" size={i === 6 ? 30 : 22} /></span>
            {d.toLocaleDateString("en-GB", { weekday: "narrow" })}
          </span>
        );
      })}
    </div>
  );
}
