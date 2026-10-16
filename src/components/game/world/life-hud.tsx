"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Check, ChevronDown, ChevronUp, Cloud, CloudDrizzle, CloudRain, Sun } from "lucide-react";

import { useNeeds } from "./use-needs";

import { AvatarFigure } from "@/components/game/avatar";
import type { Avatar } from "@/game/core/cosmetics";
import { ACTIVITIES, NEEDS, moodWord, nextHint, weatherAt } from "@/game/core/needs";
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

const card = "pointer-events-auto rounded-2xl border-2 border-white bg-[#f7f1e6]/95 text-[#13203a] shadow-[0_4px_0_rgba(19,32,58,0.18)] backdrop-blur";

/** The Sims-style overlay: today's tasks, the clock and weather, money, and your needs. */
export function LifeHud({ avatar, name, clout, quests }: { avatar: Avatar; name: string; clout: number; quests: Quest[] }) {
  const { needs, last } = useNeeds();
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(true);
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
      <div className={cn(card, "absolute top-[68px] left-3 z-[50] w-[min(300px,calc(100%-24px))] px-3 py-2.5")}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left text-sm font-black" aria-expanded={open}>
          Today's tasks
          <span className="rounded-full bg-[#dde8fd] px-2 py-0.5 text-[10px] text-[#1f4fbf]">{todo} to do</span>
          <span className="ml-auto">{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
        </button>
        {open && (
          <ul className="mt-1.5 space-y-1.5">
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
                    <Link href={q.href} className="flex items-start gap-2 hover:underline">
                      {body}
                    </Link>
                  ) : (
                    <span className="flex items-start gap-2">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Weather, time, money */}
      <div className="pointer-events-none absolute top-[60px] right-3 z-[50] hidden gap-2 md:flex">
        <div className={cn(card, "flex items-center gap-2 px-3 py-1.5")}>
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
      <div className={cn(card, "absolute bottom-16 left-3 z-[50] hidden items-center gap-3 py-2 pr-3 pl-2 md:flex")}>
        <div className="flex size-16 justify-center overflow-hidden rounded-full border-4 border-white bg-[#8fb4ff]">
          <div className="-mt-1 shrink-0">
            <AvatarFigure avatar={avatar} size={96} showPet={false} />
          </div>
        </div>
        <div>
          <p className="text-sm font-black">
            {name} <span className="text-xs font-bold text-[#5a6272]">· {moodWord(needs)}</span>
          </p>
          <div className="mt-1 grid grid-cols-[auto_110px] items-center gap-x-2 gap-y-1">
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
          className="pointer-events-none absolute inset-x-0 top-[124px] z-[50] mx-auto hidden w-fit rounded-full bg-[#13203a] px-4 py-1.5 text-xs font-bold text-white md:block"
          role="status"
        >
          {last ? ACTIVITIES[last].label : hint}
        </p>
      )}
    </>
  );
}
