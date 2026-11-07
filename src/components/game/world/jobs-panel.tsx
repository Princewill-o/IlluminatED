"use client";

import { useEffect, useMemo, useState } from "react";

import { Briefcase, Check, Coins, Lock, MapPin, Play, Wrench, X } from "lucide-react";

import { loadRoleCareers } from "@/app/games/world/actions";
import { ROLES, type PracticalRole, jobSteps, levelForXp, roleTiers, tierIndex, xpForLevel } from "@/game/core/roles";
import { cn } from "@/lib/utils";

export type RoleCareers = Record<string, { xp: number; jobs: number; earned: number }>;
const SECTORS = ["All", "Free", ...Array.from(new Set(ROLES.map((r) => r.sector)))];

/**
 * The Jobs panel: every practical role with its pay, kit, the steps of a job at your
 * level and its own six-tier career ladder. Start a shift where you are, or travel to
 * the workplace first.
 */
export function JobsPanel({ mapId, activeRole, onStart, onTravel, onClose, embedded = false }: {
  /** Shown as a page inside the in-game browser rather than a pop-up. */
  embedded?: boolean;
  mapId: string;
  activeRole: string | null;
  onStart: (role: PracticalRole, level: number) => void;
  onTravel: (role: PracticalRole) => void;
  onClose: () => void;
}) {
  const [careers, setCareers] = useState<RoleCareers>({});
  const [sector, setSector] = useState("All");
  const [pick, setPick] = useState<string>(activeRole ?? ROLES[0].id);
  useEffect(() => { void loadRoleCareers().then(setCareers).catch(() => {}); }, []);
  const list = useMemo(() => ROLES.filter((r) => sector === "All" || (sector === "Free" ? !r.plus : r.sector === sector)), [sector]);
  const role = ROLES.find((r) => r.id === pick) ?? ROLES[0];
  const mine = careers[role.id] ?? { xp: 0, jobs: 0, earned: 0 };
  const level = levelForXp(mine.xp);
  const tiers = roleTiers(role);
  const current = tierIndex(level);
  const nextXp = xpForLevel(level + 1), thisXp = xpForLevel(level);
  const steps = jobSteps(role, level);
  const here = !role.place.mapId || role.place.mapId === mapId;
  return (
    <div className={embedded ? "h-full" : "fixed inset-0 z-[100010] grid place-items-center bg-black/55 p-3"} role="dialog" aria-label="Jobs">
      <section className={embedded ? "flex h-full w-full flex-col overflow-hidden bg-[#f7f1e6] text-[#13203a] [color-scheme:light]" : "flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-b-8 border-black/30 bg-[#f7f1e6] text-[#13203a] shadow-2xl [color-scheme:light]"}>
        <header className="flex items-center gap-3 border-b border-black/10 bg-[#13203a] px-5 py-3 text-white">
          <Briefcase className="size-5 text-[#ffd166]" />
          <h2 className="text-lg font-black">Jobs</h2>
          <p className="hidden text-xs text-white/70 sm:block">Pick a role, do the work hands-on, earn Clout and climb its career ladder.</p>
          <button type="button" onClick={onClose} aria-label="Close jobs" className="ml-auto grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </header>
        <div className="grid min-h-0 flex-1 md:grid-cols-[280px_1fr]">
          <nav className="min-h-0 overflow-y-auto border-r border-black/10 p-3" aria-label="Roles">
            <div className="mb-2 flex flex-wrap gap-1">
              {SECTORS.map((s) => (
                <button key={s} type="button" onClick={() => setSector(s)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", sector === s ? "bg-[#13203a] text-white" : "bg-black/5 hover:bg-black/10")}>{s}</button>
              ))}
            </div>
            <ul className="grid gap-1.5">
              {list.map((r) => {
                const c = careers[r.id], lv = levelForXp(c?.xp ?? 0), t = roleTiers(r)[tierIndex(lv)];
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => setPick(r.id)} className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left", pick === r.id ? "bg-white shadow ring-2 ring-[#13203a]" : "hover:bg-white/70")}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ background: r.colour }}>{r.title.slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{r.title}{activeRole === r.id && <span className="ml-1 rounded bg-[#6cc04a] px-1 text-[9px] text-white">ON SHIFT</span>}</span>
                        <span className="block truncate text-[11px] text-black/60">Lv {lv} · {t.title}</span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] font-black text-[#a8742b]">{r.pay[0]}–{r.pay[1]}<span className={cn("mt-0.5 block rounded px-1 text-[9px] tracking-wide uppercase", r.plus ? "bg-[#7a5ce6] text-white" : "bg-[#6cc04a] text-white")}>{r.plus ? "Plus" : "Free"}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid size-14 place-items-center rounded-2xl text-2xl font-black text-white shadow" style={{ background: role.colour }}>{role.title.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <h3 className="flex flex-wrap items-center gap-2 text-2xl font-black">{role.title}<span className={cn("rounded-full px-2 py-0.5 text-[10px] tracking-wide text-white uppercase", role.plus ? "bg-[#7a5ce6]" : "bg-[#6cc04a]")}>{role.plus ? "Plus Experience" : "Free for everyone"}</span></h3>
                <p className="mt-0.5 text-sm text-black/70">{role.summary}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black/60"><MapPin className="size-3.5" /> {role.place.label}</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-right shadow-sm">
                <p className="flex items-center justify-end gap-1 text-xl font-black text-[#a8742b]"><Coins className="size-5" />{role.pay[0]}–{role.pay[1]}</p>
                <p className="text-[11px] text-black/60">Clout per job, by accuracy and job size</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-black">Level {level} · {tiers[current].title}</p>
                <p className="text-xs text-black/60">{mine.jobs} jobs · {mine.earned} Clout earned</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full" style={{ width: `${Math.min(100, ((mine.xp - thisXp) / Math.max(1, nextXp - thisXp)) * 100)}%`, background: role.colour }} /></div>
              <p className="mt-1 text-[11px] text-black/60">{mine.xp} XP · {nextXp - mine.xp} XP to level {level + 1}</p>
            </div>

            <h4 className="mt-5 text-xs font-black tracking-widest text-black/60 uppercase">Career tier list</h4>
            <ol className="mt-2 grid gap-1.5">
              {tiers.map((t, i) => {
                const reached = i <= current, now = i === current;
                const to = i < tiers.length - 1 ? tiers[i + 1].from - 1 : null;
                return (
                  <li key={t.tier} className={cn("flex items-center gap-3 rounded-xl p-2.5", now ? "bg-[#13203a] text-white" : reached ? "bg-white" : "bg-black/[.04] text-black/55")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black", now ? "bg-[#ffd166] text-[#13203a]" : reached ? "bg-[#6cc04a] text-white" : "bg-black/10")}>
                      {reached && !now ? <Check className="size-4" /> : !reached ? <Lock className="size-3.5" /> : i + 1}
                    </span>
                    <span className="w-24 shrink-0 text-[11px] font-black tracking-wide uppercase">{t.tier}<span className="block font-bold normal-case opacity-70">Lv {t.from}{to ? `–${to}` : "+"}</span></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">{t.title}</span>
                      <span className={cn("block text-xs", now ? "text-white/75" : "opacity-80")}>Unlocks: {t.unlock}{i > 0 && i <= role.advanced.length ? ` · new step: ${role.advanced[i - 1].label.toLowerCase()}` : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-black tracking-widest text-black/60 uppercase">One job at your level</h4>
                <ol className="mt-2 grid gap-1 text-sm">
                  {steps.map((st, i) => <li key={st.label} className="flex gap-2"><span className="w-5 shrink-0 font-black text-black/40">{i + 1}.</span>{st.label}</li>)}
                </ol>
              </div>
              <div>
                <h4 className="flex items-center gap-1 text-xs font-black tracking-widest text-black/60 uppercase"><Wrench className="size-3.5" /> Equipment</h4>
                <ul className="mt-2 flex flex-wrap gap-1.5">{role.equipment.map((e) => <li key={e} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">{e}</li>)}</ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => onStart(role, level)} className="jelly flex min-h-12 items-center gap-2 rounded-full border-b-4 border-black/30 px-5 font-black text-white" style={{ background: role.colour }}>
                <Play className="size-4" /> {activeRole === role.id ? "Back to shift" : here ? "Start shift here" : "Start shift where I am"}
              </button>
              {!here && role.place.mapId && (
                <button type="button" onClick={() => onTravel(role)} className="jelly flex min-h-12 items-center gap-2 rounded-full border-b-4 border-black/20 bg-white px-5 font-black">
                  <MapPin className="size-4" /> Go to {role.place.label}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
