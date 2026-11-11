"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Check, ChevronDown, ChevronUp, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudRainWind, CloudSnow, MapPin, Snowflake, Sun, Wind } from "lucide-react";

import { WEATHER_NOW } from "./art";
import { HudSlot } from "./hud";
import { useNeeds } from "./use-needs";

import { AvatarFigure } from "@/components/game/avatar";
import type { Avatar } from "@/game/core/cosmetics";
import { gameDateAt } from "@/game/core/game-clock";
import { ACTIVITIES, NEEDS, moodWord, nextHint, weatherAt, weatherForecast } from "@/game/core/needs";
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

const card = "pixel-panel pointer-events-auto";

/** The Sims-style overlay: today's tasks, the clock and weather, money, and your needs. */
export function LifeHud({ avatar, name, clout, quests, onLocate }: { avatar: Avatar; name: string; clout: number; quests: Quest[]; onLocate?: (q: Quest) => boolean }) {
  const { needs, last } = useNeeds();
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [weatherTick, setWeatherTick] = useState(0);
  const [dressed, setDressed] = useState(true);
  useEffect(() => { try { setDressed(localStorage.getItem("weather-clothes") !== "off"); } catch { /* private mode */ } }, []);
  useEffect(() => {
    const on = () => setWeatherTick((n) => n + 1);
    window.addEventListener("illumed:weather", on);
    return () => window.removeEventListener("illumed:weather", on);
  }, []);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now || !needs) return null;
  // What the world is actually showing (a world owner can pick the weather), else the live forecast.
  void weatherTick;
  const w = WEATHER_NOW.kind ? { kind: WEATHER_NOW.kind, temp: WEATHER_NOW.temp } : weatherAt(now);
  const WIcon = { "Light rain": CloudRain, Drizzle: CloudDrizzle, "Heavy rain": CloudRainWind, Thunderstorm: CloudLightning, Snow: CloudSnow, "Heavy snow": Snowflake, Fog: CloudFog, Windy: Wind, Cloudy: Cloud }[w.kind] ?? Sun;
  const hint = nextHint(needs);
  const todo = quests.filter((q) => !q.done).length;

  return (
    <>
      {/* Today's tasks */}
      <HudSlot area="tl" order={10} className="[@media(max-height:500px)_and_(orientation:landscape)]:hidden"><div className={cn(card, "w-[min(248px,100%)] px-2.5 py-1 xl:w-[264px]")}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="pixel-task-title flex min-h-11 w-full items-center gap-2 text-left text-xs font-black sm:text-sm" aria-expanded={open} aria-controls="city-quests">
          Today's tasks
          <span className="pixel-badge px-2 py-0.5 text-[10px]">{todo} to do</span>
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
                    <Link href={q.href} onClick={event => { if (q.tag === "Study" && onLocate?.(q)) event.preventDefault(); }} className="flex min-h-11 items-center gap-2 hover:underline">
                      {body}
                    </Link>
                  ) : (
                    <span className="flex items-start gap-2">{body}</span>
                  )}
                  {onLocate && !q.done && (
                    <button type="button" onClick={() => onLocate(q)} className="ml-5 flex min-h-11 items-center gap-1 text-xs font-black text-[#2b5fd9]">
                      <MapPin className="size-3" aria-hidden /> {q.tag === "Study" ? "Choose quest" : "Show me where"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div></HudSlot>

      {/* Weather, time, money */}
      <HudSlot area="tr" order={20} className="hidden xl:block [@media(max-height:719px)]:!hidden"><div className="flex gap-1.5">
        <details className={cn(card, "relative px-2.5 py-1.5")}>
          <summary className="flex cursor-pointer list-none items-center gap-1.5" aria-label="Open game weather forecast">
          <WIcon className="size-5 text-[#e98a1f]" aria-hidden />
          <div>
            <p className="text-sm leading-4 font-black">{w.temp}°C</p>
            <p className="text-[10px] font-bold text-[#5a6272]">{w.kind}</p>
          </div></summary>
          <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-[#d4c7ad] bg-[#faf6ed] p-3 shadow-xl">
            <p className="mb-2 text-xs font-black">Game forecast</p>
            {weatherForecast(now).map(item => <p key={item.at} className="flex justify-between py-1 text-[11px]"><span>{item.label}</span><span>{item.kind} · {item.temp}°C</span></p>)}
            <p className="mt-2 text-[10px] text-[#5a6272]">Shared simulated weather · changes every 3 minutes</p>
            <label className="mt-2 flex items-center gap-2 border-t border-[#d4c7ad] pt-2 text-[11px] font-bold">
              <input type="checkbox" checked={dressed} onChange={(e) => { try { localStorage.setItem("weather-clothes", e.target.checked ? "on" : "off"); } catch { /* private mode */ } setDressed(e.target.checked); window.dispatchEvent(new Event("illumed:weather")); }} className="size-4 accent-[#2b5fd9]" />
              Dress for the weather (coat in rain, snow and cold)
            </label>
          </div>
        </details>
        <div className={cn(card, "px-3 py-1.5")}>
          <p className="text-sm leading-4 font-black">{gameDateAt(now.getTime()).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</p>
          <p className="text-[10px] font-bold text-[#5a6272]">{gameDateAt(now.getTime()).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</p>
        </div>
        <div className={cn(card, "px-3 py-1.5")}>
          <p className="text-sm leading-4 font-black">{clout.toLocaleString("en-GB")}</p>
          <p className="text-[10px] font-bold text-[#5a6272]">Clout</p>
        </div>
      </div></HudSlot>

      <HudSlot area="tl" order={25}><div className={cn(card,"pixel-energy w-44 px-3 py-2")}>
        <div className="flex justify-between text-xs font-black"><span>Energy</span><span>{Math.round(needs.energy)} / 100</span></div>
        <div className="pixel-meter mt-1 h-3 overflow-hidden" role="meter" aria-label="Player energy" aria-valuenow={Math.round(needs.energy)} aria-valuemin={0} aria-valuemax={100}><div className="h-full transition-[width]" style={{width:`${needs.energy}%`,backgroundColor:needs.energy<20?"#e7844d":"#8dce49"}}/></div>
        {needs.energy<20&&<p className="mt-1 text-[10px] font-bold">Low energy · rest or get help</p>}
      </div></HudSlot>
      {/* You and your needs */}
      <HudSlot area="bl" order={20} className="hidden lg:block [@media(max-height:650px)]:!hidden"><div className={cn(card, "pixel-needs flex max-w-[240px] items-center gap-2 py-1.5 pr-2.5 pl-1.5 xl:max-w-[280px]")}>
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
                <span className="pixel-meter h-2.5 overflow-hidden" role="meter" aria-label={d.label} aria-valuenow={Math.round(needs[d.id])} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full transition-[width] duration-500" style={{ width: `${needs[d.id]}%`, background: d.colour }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div></HudSlot>

      {(last || hint) && (
        <HudSlot area="tc" order={50} className="pointer-events-none hidden xl:block [@media(max-height:719px)]:!hidden"><p
          className="rounded-full bg-[#13203a] px-4 py-1.5 text-center text-xs font-bold text-white"
          role="status"
        >
          {last ? ACTIVITIES[last].label : hint}
        </p></HudSlot>
      )}
    </>
  );
}

/** Your level and XP, top centre, filling as you live your life in the world. */
export function LevelBadge({ xp }: { xp: number }) {
  const lp = levelProgress(xp);
  return (
    <HudSlot area="tc" order={0} className="pointer-events-none hidden lg:block"><div className="pixel-panel pixel-level flex items-center gap-2 py-1.5 pr-3 pl-1.5">
      <span className="pixel-level-number grid size-7 place-items-center text-sm font-black">{lp.level}</span>
      <span className="text-xs leading-tight font-black">
        {levelTitle(lp.level)}
        <span className="pixel-meter mt-0.5 block h-2 w-20 xl:w-28 overflow-hidden">
          <span className="block h-full bg-[#477a65] transition-[width] duration-700" style={{ width: `${Math.round(lp.fraction * 100)}%` }} />
        </span>
      </span>
      <span className="text-[10px] font-bold text-[#13203a]/60 tabular-nums">
        {lp.into}/{lp.needed} XP
      </span>
    </div></HudSlot>
  );
}
