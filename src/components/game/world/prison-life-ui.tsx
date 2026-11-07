"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Brain, Dumbbell, Flame, Hammer, Package, Wallet, X, Zap } from "lucide-react";

import { HudSlot } from "./hud";

import {
  ITEMS, JOBS, PERIODS, RECIPES, ROOM_NAMES, TRADER, type ItemId, type Outcome, type PrisonState,
  buy, craft, drop, freshPrison, prisonClock, takeJob, applyItem,
} from "@/game/core/prison-life";
import { cn } from "@/lib/utils";

const KEY = (id: string) => `illuminated:prison:${id}`;
/** Your prison life, kept on this device for the length of your stay. */
export function usePrisonLife(playerId: string, jailed: boolean) {
  const [state, setState] = useState<PrisonState | null>(null);
  useEffect(() => {
    if (!jailed) { setState(null); try { localStorage.removeItem(KEY(playerId)); } catch { /* storage off */ } return; }
    let saved: PrisonState | null = null;
    try { saved = JSON.parse(localStorage.getItem(KEY(playerId)) ?? "null"); } catch { /* fresh */ }
    setState(saved && Array.isArray(saved.inventory) ? saved : freshPrison(Date.now()));
  }, [jailed, playerId]);
  useEffect(() => { if (state) try { localStorage.setItem(KEY(playerId), JSON.stringify(state)); } catch { /* storage off */ } }, [state, playerId]);
  const ref = useRef(state); ref.current = state;
  /** Apply an action; returns its outcome so the caller can react (messages, escapes). */
  const run = useCallback((fn: (s: PrisonState) => Outcome | PrisonState | null) => {
    const s = ref.current;
    if (!s) return null;
    const out = fn(s);
    if (!out) return null;
    const next = "state" in out ? out.state : out;
    ref.current = next;
    setState(next);
    return "state" in out ? out : null;
  }, []);
  return { prison: state, run };
}

function Bar({ value, colour }: { value: number; colour: string }) {
  return <span className="block h-2 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full transition-[width]" style={{ width: `${value}%`, background: colour }} /></span>;
}

/** The routine, where you should be, your heat, stats, cash and pockets. */
export function PrisonRoutineHud({ prison, now, here, onOpen }: { prison: PrisonState; now: number; here: string; onOpen: () => void }) {
  const { clock, period, leftMs, day } = prisonClock(now);
  const seen = prison.attended.includes(`${day}:${period.id}`);
  const where = period.rooms.includes("any") ? "Free time: go anywhere" : period.rooms.map((r) => r === "work" && !prison.job ? "anywhere (no job yet)" : ROOM_NAMES[r as Exclude<typeof r, "any">]).join(" or ");
  const solitary = prison.solitaryUntil > now;
  return (
    <HudSlot area="tl" order={4}>
      <section aria-label="Prison routine" className="w-[min(300px,100%)] rounded-2xl border-2 border-[#e98a1f] bg-[#1d1a24]/95 p-3 text-white shadow-xl">
        <p className="flex items-center gap-2 text-xs font-black tracking-wider text-[#ffb366] uppercase">HMP Thames · {clock}<span className="ml-auto text-white/60">{Math.ceil(leftMs / 1000)}s</span></p>
        {solitary ? <p className="mt-1 text-sm font-black text-[#ff8a7a]">Solitary confinement · {Math.ceil((prison.solitaryUntil - now) / 1000)}s</p> : (
          <>
            <p className="mt-1 text-sm font-black">{period.name}{period.strict && " · don't miss it"}</p>
            <p className={cn("text-xs", seen ? "text-[#7ee39b]" : "text-white/80")}>{seen ? "✓ Seen. You can leave early." : `Be in ${where}.`}</p>
          </>
        )}
        <p className="mt-0.5 text-[10px] text-white/50">You're in {here}.</p>
        <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-[11px]">
          <Flame className="size-3.5 text-[#ff7a4d]" /><Bar value={prison.heat} colour={prison.heat > 70 ? "#ff4d3a" : prison.heat > 40 ? "#ffb347" : "#7ee39b"} /><span className="w-8 text-right font-black">{prison.heat}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1" title="Strength"><Dumbbell className="size-3.5" />{prison.stats.strength}</span>
          <span className="flex items-center gap-1" title="Fitness"><Zap className="size-3.5" />{prison.stats.fitness}</span>
          <span className="flex items-center gap-1" title="Intellect"><Brain className="size-3.5" />{prison.stats.intellect}</span>
          <span className="ml-auto flex items-center gap-1" title="Prison cash"><Wallet className="size-3.5" />£{prison.cash}</span>
        </div>
        <button type="button" onClick={onOpen} className="mt-2 flex w-full items-center gap-1.5 rounded-xl bg-white/10 p-1.5 hover:bg-white/15" aria-label="Your pockets and crafting">
          <Package className="size-4 shrink-0" />
          {prison.inventory.map((x, i) => <span key={i} className="grid size-7 place-items-center rounded-md border border-white/20 text-[9px] font-black" style={{ background: x ? ITEMS[x.item].colour : "transparent", color: x ? "#141020" : undefined }} title={x ? ITEMS[x.item].name : "Empty"}>{x ? ITEMS[x.item].name.slice(0, 2) : ""}</span>)}
        </button>
        <ul className="mt-2 space-y-0.5 text-[10px] text-white/60">{prison.log.slice(0, 2).map((l, i) => <li key={i}>· {l}</li>)}</ul>
      </section>
    </HudSlot>
  );
}

/** Your desk: pockets, using things, crafting, and what your escape plans need. */
export function PrisonWorkbench({ prison, onRun, onClose }: { prison: PrisonState; onRun: (fn: (s: PrisonState) => Outcome | PrisonState) => void; onClose: () => void }) {
  return (
    <Shell title="Your desk" subtitle="Pockets, crafting and your escape plans" onClose={onClose}>
      <h3 className="text-sm font-black">Pockets</h3>
      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {prison.inventory.map((x, i) => (
          <li key={i} className="flex flex-col rounded-xl border-2 border-black/10 bg-white p-2 text-center">
            {x ? (
              <>
                <span className="mx-auto size-8 rounded-lg border-2 border-[#141020]" style={{ background: ITEMS[x.item].colour }} />
                <span className="mt-1 text-[11px] leading-tight font-black">{ITEMS[x.item].name}</span>
                {ITEMS[x.item].uses && <span className="text-[10px] text-black/50">{x.uses} uses left</span>}
                {ITEMS[x.item].contraband && <span className="text-[9px] font-black text-[#c8322d] uppercase">Contraband</span>}
                <span className="mt-auto flex gap-1 pt-1">
                  {["bed-dummy", "sheet", "snack"].includes(x.item) && <button type="button" onClick={() => onRun((s) => applyItem(s, x.item))} className="flex-1 rounded-md bg-[#13203a] py-1 text-[10px] font-black text-white">Use</button>}
                  <button type="button" onClick={() => onRun((s) => drop(s, i))} className="flex-1 rounded-md bg-black/5 py-1 text-[10px] font-bold">Drop</button>
                </span>
              </>
            ) : <span className="my-auto text-[11px] text-black/30">Empty</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-black/60">{prison.dummyInBed ? "✓ Bed dummy in your bed. " : ""}{prison.sheetHung ? "✓ Sheet hung over your bars. " : ""}Tunnel {prison.tunnel}/5 · Vent {prison.ventOpen ? "open" : "shut"} · Fence {prison.fence}/3{prison.holeCovered ? " · work hidden by a poster" : ""}</p>
      <h3 className="mt-4 text-sm font-black">Crafting</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {RECIPES.map((r) => {
          const ok = prison.stats.intellect >= r.intellect && [...new Set(r.needs)].every((n) => prison.inventory.filter((x) => x?.item === n).length >= r.needs.filter((m) => m === n).length);
          return (
            <li key={r.make} className={cn("flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-black/10", !ok && "opacity-70")}>
              <span className="size-9 shrink-0 rounded-lg border-2 border-[#141020]" style={{ background: ITEMS[r.make].colour }} />
              <span className="min-w-0 flex-1 text-xs"><span className="block font-black">{ITEMS[r.make].name}</span>{r.needs.map((n) => ITEMS[n].name).join(" + ")} · {r.intellect} intellect</span>
              <button type="button" onClick={() => onRun((s) => craft(s, r.make))} className="min-h-9 rounded-full bg-[#e98a1f] px-3 text-xs font-black text-white"><Hammer className="inline size-3.5" /> Craft</button>
            </li>
          );
        })}
      </ul>
      <h3 className="mt-4 text-sm font-black">Ways out</h3>
      <ul className="mt-1 grid gap-1 text-xs text-black/70">
        <li>· <b>Tunnel:</b> dig under your bed five times with a shovel (fitness 25). Cover it with a poster between digs.</li>
        <li>· <b>Vents:</b> open your cell vent with a screwdriver, then at lights out crawl to the roof (fitness 40) and climb down a sheet rope. Leave a bed dummy.</li>
        <li>· <b>Yard fence:</b> at lights out, cut three sections with cutters. Leave a bed dummy and watch for the searchlight.</li>
        <li>· <b>Front gate:</b> a guard uniform (laundry job) and a staff key copy (soap mould from the guards&apos; desk, then craft).</li>
      </ul>
      <h3 className="mt-4 text-sm font-black">Today&apos;s routine</h3>
      <ol className="mt-1 grid grid-cols-2 gap-x-4 text-[11px] text-black/70 sm:grid-cols-3">{PERIODS.map((p) => <li key={p.id}>{p.name}{p.strict ? " (strict)" : ""}</li>)}</ol>
    </Shell>
  );
}

export function PrisonTrader({ prison, onRun, onClose }: { prison: PrisonState; onRun: (fn: (s: PrisonState) => Outcome) => void; onClose: () => void }) {
  return (
    <Shell title="Riley's stash" subtitle={`You have £${prison.cash} prison cash. Earn more with a prison job.`} onClose={onClose}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {TRADER.map((t) => (
          <li key={t.item} className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-black/10">
            <span className="size-9 shrink-0 rounded-lg border-2 border-[#141020]" style={{ background: ITEMS[t.item].colour }} />
            <span className="min-w-0 flex-1 text-xs"><span className="block font-black">{ITEMS[t.item].name}{ITEMS[t.item].contraband ? " · contraband" : ""}</span>{ITEMS[t.item].blurb}</span>
            <button type="button" disabled={prison.cash < t.price} onClick={() => onRun((s) => buy(s, t.item as ItemId))} className="min-h-9 rounded-full bg-[#13203a] px-3 text-xs font-black text-white disabled:opacity-40">£{t.price}</button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function PrisonJobBoard({ prison, onRun, onClose }: { prison: PrisonState; onRun: (fn: (s: PrisonState) => Outcome) => void; onClose: () => void }) {
  return (
    <Shell title="Job board" subtitle="Work during the work period to earn prison cash. Each job has a perk." onClose={onClose}>
      <ul className="grid gap-2">
        {(Object.keys(JOBS) as (keyof typeof JOBS)[]).map((j) => (
          <li key={j} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/10">
            <span className="min-w-0 flex-1 text-xs"><span className="block text-sm font-black">{JOBS[j].name} · £{JOBS[j].pay} a stint</span>{JOBS[j].perk} Needs {Object.entries(JOBS[j].need).map(([k, v]) => `${v} ${k}`).join(", ")}.</span>
            {prison.job === j ? <span className="rounded-full bg-[#dff5e3] px-3 py-1 text-xs font-black text-[#1d6b34]">Your job</span>
              : <button type="button" onClick={() => onRun((s) => takeJob(s, j))} className="min-h-9 rounded-full bg-[#e98a1f] px-3 text-xs font-black text-white">Apply</button>}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Shell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100010] grid place-items-center bg-black/55 p-3" role="dialog" aria-label={title}>
      <section className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-[3px] border-[#141020] bg-[#f4efe6] text-[#13203a] shadow-[0_8px_0_#141020] [color-scheme:light]">
        <header className="flex items-center gap-3 bg-[#e98a1f] px-5 py-3 text-white">
          <div><h2 className="text-lg font-black">{title}</h2><p className="text-xs text-white/85">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto grid size-10 place-items-center rounded-full bg-black/15"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
