"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Check, ChevronDown, ChevronUp, Cloud, CloudDrizzle, CloudRain, MapPin, Sun } from "lucide-react";

import { useNeeds } from "./use-needs";

import { AvatarFigure } from "@/components/game/avatar";
import type { Avatar } from "@/game/core/cosmetics";
import { ACTIVITIES, NEEDS, moodWord, nextHint, weatherAt } from "@/game/core/needs";
import { levelProgress, levelTitle } from "@/game/core/progression";
import { cn } from "@/lib/utils";

export interface Quest {
  id: string;
  title: string;
  /** "Homework", "Job", "Daily". */
  tag: string;
  due?: string;
  href?: string;
  done?: boolean;
}

const card = "pointer-events-auto rounded-2xl border border-[#d4c7ad] bg-[#faf6ed]/[0.98] text-[#203b38] shadow-[0_8px_24px_rgba(12,30,28,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]";

/** The Sims-style overlay: today's tasks, the clock and weather, money, and your needs. */
export function LifeHud({ avatar, name, clout, quests, onLocate }: { avatar: Avatar; name: string; clout: number; quests: Quest[]; onLocate?: (q: Quest) => boolean }) {
  const { needs, last } = useNeeds();
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const roomy = window.matchMedia("(min-width: 1280px) and (min-height: 720px)");
    const resize = () => setOpen(roomy.matches);
    resize();
    roomy.addEventListener("change", resize);
    return () => roomy.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);
  if (!now || !needs) return null;
  const w = weatherAt(now);
  const WIcon = w.kind === "Light rain" ? CloudRain : w.kind === "Drizzle" ? CloudDrizzle : w.kind === "Cloudy" ? Cloud : Sun;
  const hint = nextHint(needs);
  const todo = quests.filter((q) => !q.done).length;

  return (
    <>
      {/* Today's tasks */}
      <div className={cn(card, "absolute top-[68px] left-3 z-[50] w-[min(200px,calc(100%-120px))] px-2.5 py-1 sm:w-[248px] xl:w-[264px]")}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-h-11 w-full items-center gap-2 text-left text-xs font-black sm:text-sm" aria-expanded={open} aria-controls="city-quests">
          Today's tasks
          <span className="rounded-full bg-[#dde8fd] px-2 py-0.5 text-[10px] text-[#1f4fbf]">{todo} to do</span>
          <span className="ml-auto">{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
        </button>
        {open && (
          <ul id="city-quests" className="mt-1 max-h-[min(36dvh,260px)] space-y-2 overflow-y-auto overscroll-contain pb-2 [scrollbar-color:#b9b59e_transparent] [scrollbar-width:thin]">
            {quests.length === 0 && <li className="text-xs text-[#5a6272]">Nothing set. Join your class in Homework to see what your teacher sets.</li>}
            {quests.slice(0, 5).map((q) => {
              const body = (
                <>
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border-2 border-[#1f4fbf]", q.done && "bg-[#1f4fbf] text-white")}>
                    {q.done && <Check className="size-3" strokeWidth={4} />}
                  </span>
                  <span className={cn("min-w-0 flex-1 leading-4", q.done && "text-[#5a6272] line-through")}>{q.title}</span>
                  <span className="shrink-0 rounded-full bg-[#dde8fd] px-1.5 py-0.5 text-[9px] font-black text-[#1f4fbf] uppercase">{q.due ?? q.tag}</span>
                </>
              );
              return (
                <li key={q.id} className="text-xs font-bold">
                  {q.href ? (
                    <Link href={q.href} className="flex min-h-11 items-center gap-2 hover:underline">
                      {body}
                    </Link>
                  ) : (
                    <span className="flex items-start gap-2">{body}</span>
                  )}
                  {onLocate && !q.done && (
                    <button type="button" onClick={() => onLocate(q)} className="ml-5 flex min-h-11 items-center gap-1 text-xs font-black text-[#2b5fd9]">
                      <MapPin className="size-3" aria-hidden /> Show me where
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Weather, time, money */}
      <div className="pointer-events-none absolute top-[68px] right-[140px] z-[50] hidden gap-1.5 xl:flex [@media(max-height:719px)]:!hidden">
        <div className={cn(card, "flex items-center gap-1.5 px-2.5 py-1.5")}>
          <WIcon className="size-5 text-[#e98a1f]" aria-hidden />
          <div>
            <p className="text-sm leading-4 font-black">{w.temp}°C</p>
            <p className="text-[10px] font-bold text-[#5a6272]">{w.kind}</p>
          </div>
        </div>
        <div className={cn(card, "px-3 py-1.5")}>
          <p className="text-sm leading-4 font-black">{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</p>
          <p className="text-[10px] font-bold text-[#5a6272]">{now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" })}</p>
        </div>
        <div className={cn(card, "px-3 py-1.5")}>
          <p className="text-sm leading-4 font-black">{clout.toLocaleString("en-GB")}</p>
          <p className="text-[10px] font-bold text-[#5a6272]">Clout</p>
        </div>
      </div>

      {/* You and your needs */}
      <div className={cn(card, "absolute bottom-16 left-3 z-[50] hidden max-w-[240px] items-center gap-2 py-1.5 pr-2.5 pl-1.5 lg:flex xl:max-w-[280px] [@media(max-height:650px)]:!hidden")}>
        <div className="flex size-12 shrink-0 justify-center overflow-hidden rounded-full border-4 border-white bg-[#8fb4ff]">
          <div className="-mt-1 shrink-0">
            <AvatarFigure avatar={avatar} size={76} showPet={false} />
          </div>
        </div>
        <div>
          <p className="text-sm font-black">
            {name} <span className="text-xs font-bold text-[#5a6272]">· {moodWord(needs)}</span>
          </p>
          <div className="mt-1 grid grid-cols-[auto_76px] xl:grid-cols-[auto_92px] items-center gap-x-2 gap-y-1">
            {NEEDS.map((d) => (
              <div key={d.id} className="contents">
                <span className="text-[10px] font-black">{d.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[#e6dccb]" role="meter" aria-label={d.label} aria-valuenow={Math.round(needs[d.id])} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${needs[d.id]}%`, background: d.colour }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(last || hint) && (
        <p
          className="pointer-events-none absolute inset-x-0 top-[130px] z-[50] mx-auto hidden w-fit max-w-[32%] text-center rounded-full bg-[#13203a] px-4 py-1.5 text-xs font-bold text-white xl:block [@media(max-height:719px)]:!hidden"
          role="status"
        >
          {last ? ACTIVITIES[last].label : hint}
        </p>
      )}
    </>
  );
}

/** Your level and XP, top centre, filling as you live your life in the world. */
export function LevelBadge({ xp }: { xp: number }) {
  const lp = levelProgress(xp);
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-[60] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-[#d4c7ad] bg-[#faf6ed]/[0.98] py-1.5 pr-3 pl-1.5 text-[#203b38] shadow-[0_8px_24px_rgba(12,30,28,0.16)] lg:flex">
      <span className="grid size-7 place-items-center rounded-full bg-[#254e46] text-sm font-black text-[#f7e3b6] ring-1 ring-[#c8b182]">{lp.level}</span>
      <span className="text-xs leading-tight font-black">
        {levelTitle(lp.level)}
        <span className="mt-0.5 block h-1.5 w-20 xl:w-28 overflow-hidden rounded-full bg-[#13203a]/10">
          <span className="block h-full bg-[#477a65] transition-[width] duration-700" style={{ width: `${Math.round(lp.fraction * 100)}%` }} />
        </span>
      </span>
      <span className="text-[10px] font-bold text-[#13203a]/60 tabular-nums">
        {lp.into}/{lp.needed} XP
      </span>
    </div>
  );
}
