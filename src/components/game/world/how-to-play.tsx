"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ArrowLeft, ArrowRight, Bike, BookOpen, Briefcase, Bus, Check, Coins, Heart, Home, Map as MapIcon, MessageCircle, Shirt, Smartphone, Sparkles, Star, Trophy, X, type LucideIcon } from "lucide-react";

import { ControllerLegend } from "./controller-legend";

import { MenuBackdrop } from "@/components/game/menu-backdrop";

/**
 * How to play: a short, animated walkthrough of how the game works and what to do next.
 * One chapter at a time, each with its own small motion graphic. Arrow keys, swipes or the
 * buttons move between chapters; it can be reopened any time from How to play.
 */
type Chapter = { id: string; kicker: string; title: string; colour: string; art: () => ReactNode; points: ReactNode[] };

const Key = ({ k, wide = false }: { k: string; wide?: boolean }) => (
  <kbd className={`htp-key ${wide ? "px-3" : "w-8"} inline-grid h-8 place-items-center rounded-lg border-b-4 border-[#0d1726]/40 bg-white text-xs font-black text-[#13203a]`}>{k}</kbd>
);

function LoopArt() {
  const steps: [LucideIcon, string, string][] = [[BookOpen, "Revise", "#2b5fd9"], [Coins, "Earn Clout", "#e9a03b"], [Shirt, "Spend it", "#e84a7f"], [Trophy, "Level up", "#15987f"]];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <div className="htp-orbit absolute inset-[14%] rounded-full border-4 border-dashed border-white/30">
        <span className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full bg-[#f2d9a6] shadow-[0_0_20px_#f2d9a6]" />
      </div>
      {steps.map(([Icon, label, colour], i) => {
        const angle = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <div key={label} className="htp-pop absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5" style={{ left: `${50 + Math.cos(angle) * 38}%`, top: `${50 + Math.sin(angle) * 38}%`, animationDelay: `${0.15 + i * 0.18}s` }}>
            <span className="grid size-14 place-items-center rounded-2xl border-4 border-[#13203a] text-white shadow-[0_6px_0_#13203a]" style={{ background: colour }}><Icon className="size-7" /></span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-[#13203a]">{label}</span>
          </div>
        );
      })}
      <span className="htp-pop absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-center text-[11px] leading-tight font-black text-white" style={{ animationDelay: "0.9s" }}>The city<br />loop</span>
    </div>
  );
}

function MoveArt() {
  return (
    <div className="mx-auto grid w-full max-w-[320px] gap-5">
      <div className="relative h-36 overflow-hidden rounded-3xl bg-[#1d3157]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#ffffff22 1px,transparent 1px),linear-gradient(90deg,#ffffff22 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <span className="htp-walker absolute grid size-9 place-items-center rounded-full border-4 border-[#13203a] bg-[#f2d9a6] text-[10px] font-black text-[#13203a]">YOU</span>
      </div>
      <div className="flex items-end justify-center gap-6">
        <div className="grid grid-cols-3 gap-1.5">
          <span />
          <span className="htp-press" style={{ animationDelay: "0s" }}><Key k="W" /></span>
          <span />
          <span className="htp-press" style={{ animationDelay: "1.5s" }}><Key k="A" /></span>
          <span className="htp-press" style={{ animationDelay: "1s" }}><Key k="S" /></span>
          <span className="htp-press" style={{ animationDelay: "0.5s" }}><Key k="D" /></span>
        </div>
        <div className="grid gap-1.5 text-xs font-bold text-white/80">
          <span className="flex items-center gap-2"><span className="htp-press" style={{ animationDelay: "2s" }}><Key k="Space" wide /></span> jump</span>
          <span className="flex items-center gap-2"><Key k="E" /> go in, talk, use</span>
          <span className="flex items-center gap-2"><Key k="V" /> change camera</span>
        </div>
      </div>
    </div>
  );
}

function FirstStepsArt() {
  const steps: [LucideIcon, string][] = [[Star, "Check Today's tasks (top left)"], [Smartphone, "Open your phone, then Study"], [Briefcase, "Walk into a workplace and apply"], [Bus, "Hop on a bus or train"], [Shirt, "Spend Clout in the Locker"]];
  return (
    <ol className="mx-auto grid w-full max-w-[320px] gap-2.5">
      {steps.map(([Icon, text], i) => (
        <li key={text} className="htp-slide flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm font-bold text-[#13203a] shadow-[0_5px_0_#0d1726]" style={{ animationDelay: `${0.1 + i * 0.16}s` }}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8eefc] text-[#2b5fd9]"><Icon className="size-5" /></span>
          <span className="flex-1">{text}</span>
          <span className="htp-tick grid size-6 place-items-center rounded-full bg-[#15987f] text-white" style={{ animationDelay: `${0.9 + i * 0.35}s` }}><Check className="size-4" /></span>
        </li>
      ))}
    </ol>
  );
}

function EarnArt() {
  const items: [LucideIcon, string, string][] = [[Shirt, "Clothes", "#e84a7f"], [Home, "Homes", "#7a5ce6"], [Bike, "Bikes & cars", "#2b5fd9"], [Sparkles, "Season Pass", "#e9a03b"]];
  return (
    <div className="relative mx-auto grid w-full max-w-[320px] place-items-center gap-6">
      <div className="relative grid size-28 place-items-center rounded-full border-4 border-[#13203a] bg-[#f2c14e] shadow-[0_8px_0_#13203a]">
        <Coins className="size-12 text-[#13203a]" />
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className="htp-coin absolute size-5 rounded-full border-2 border-[#13203a] bg-[#ffd76a]" style={{ left: `${20 + i * 15}%`, animationDelay: `${i * 0.35}s` }} />)}
      </div>
      <div className="grid w-full grid-cols-4 gap-2">
        {items.map(([Icon, label, colour], i) => (
          <div key={label} className="htp-pop flex flex-col items-center gap-1 text-center text-[11px] font-black text-white" style={{ animationDelay: `${0.4 + i * 0.15}s` }}>
            <span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: colour }}><Icon className="size-5" /></span>{label}
          </div>
        ))}
      </div>
    </div>
  );
}

function LifeArt() {
  const bars: [string, string, number][] = [["Energy", "#2b5fd9", 0], ["Hunger", "#e9a03b", 0.4], ["Social", "#e84a7f", 0.8], ["Mood", "#15987f", 1.2]];
  return (
    <div className="mx-auto grid w-full max-w-[320px] gap-5">
      <div className="grid gap-2 rounded-3xl bg-white p-4">
        {bars.map(([label, colour, delay]) => (
          <div key={label} className="grid grid-cols-[64px_1fr] items-center gap-2 text-xs font-black text-[#13203a]">
            {label}
            <span className="h-3 overflow-hidden rounded-full bg-[#e5e8ef]"><span className="htp-need block h-full rounded-full" style={{ background: colour, animationDelay: `${delay}s` }} /></span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black text-white">
        {[["Shoves back", "#c8322d"], ["Walks off", "#527090"], ["Calls police", "#2b5fd9"]].map(([label, colour], i) => (
          <span key={label} className="htp-pop rounded-xl px-2 py-2" style={{ background: colour, animationDelay: `${0.3 + i * 0.2}s` }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function PhoneArt() {
  const apps: [LucideIcon, string, string][] = [[BookOpen, "Study", "#2b5fd9"], [MapIcon, "Map", "#15987f"], [Briefcase, "Jobs", "#e9a03b"], [MessageCircle, "Friends", "#e84a7f"], [Heart, "Health", "#c8322d"], [Star, "Season", "#7a5ce6"]];
  return (
    <div className="htp-phone mx-auto w-[190px] rounded-[2rem] border-[6px] border-[#13203a] bg-[#f6f2e8] p-3 shadow-[0_10px_0_#0d1726]">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#13203a]/30" />
      <div className="grid grid-cols-3 gap-3">
        {apps.map(([Icon, label, colour], i) => (
          <span key={label} className="htp-pop flex flex-col items-center gap-1 text-[10px] font-black text-[#13203a]" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
            <span className="grid size-11 place-items-center rounded-2xl text-white" style={{ background: colour }}><Icon className="size-5" /></span>{label}
          </span>
        ))}
      </div>
    </div>
  );
}

const CHAPTERS: Chapter[] = [
  {
    id: "loop", kicker: "How it works", title: "Revise, earn, explore", colour: "#2b5fd9", art: LoopArt,
    points: [
      <>Answer revision questions for your own subjects and exam board. <b>Right answers earn Clout</b> (the city&apos;s money) and XP.</>,
      <>Spend Clout on clothes, a home, bikes and cars. XP raises your level and unlocks more of the city.</>,
      <>Everything in the city links back to revision: quests, jobs and even the hearing room use real questions.</>,
    ],
  },
  {
    id: "move", kicker: "Controls", title: "Getting around", colour: "#15987f", art: MoveArt,
    points: [
      <><Key k="W" /> <Key k="A" /> <Key k="S" /> <Key k="D" /> or the arrow keys to walk. On a phone, drag the joystick.</>,
      <>Walk up to a door and it opens; press <Key k="E" /> (or the glowing button) to go in, talk or use things.</>,
      <>Press <Key k="V" /> or the camera button for Follow, Behind, Wide or Overhead views. The map on your phone shows where everything is.</>,
    ],
  },
  {
    id: "next", kicker: "What to do next", title: "Your first ten minutes", colour: "#e9a03b", art: FirstStepsArt,
    points: [
      <><b>Today&apos;s tasks</b> (top left) always shows your next goal. Tap one to get a marker to follow.</>,
      <>Do a quick <b>Study</b> session from your phone: a few right answers earn your first Clout.</>,
      <>Then pick a <b>job</b>, meet people, or ride a bus across London. There&apos;s no wrong order.</>,
    ],
  },
  {
    id: "earn", kicker: "Money & rewards", title: "Earn it, spend it", colour: "#e84a7f", art: EarnArt,
    points: [
      <>Clout comes from right answers, homework quests, job shifts and the daily tasks.</>,
      <>Open the <b>Locker</b> to change your look, the <b>shops</b> for clothes, and <b>Garage</b> for bikes and cars.</>,
      <>The <b>Season Pass</b> gives extra rewards as you level up during each season.</>,
    ],
  },
  {
    id: "life", kicker: "Your life in the city", title: "Stay well, choose well", colour: "#c8322d", art: LifeArt,
    points: [
      <>Keep your needs up: eat, sleep at home, see friends. If energy runs out, the paramedics take you to hospital.</>,
      <>You can shove people (<Key k="F" />). They might shove back, walk off or call the police, and a police visit means wanted stars and a hearing.</>,
      <>Drive on the left, stop at red lights and give way at crossings, or the traffic police will notice.</>,
    ],
  },
  {
    id: "phone", kicker: "Your phone", title: "Everything in your pocket", colour: "#7a5ce6", art: PhoneArt,
    points: [
      <>Your phone has <b>Study</b>, the <b>map</b>, <b>jobs</b>, friends, your health and the Season Pass.</>,
      <>Use the <b>Browser</b> and <b>Games</b> buttons for revision games and the rest of IllumED.</>,
      <>Open How to play again any time from the <b>?</b> button.</>,
    ],
  },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const chapter = CHAPTERS[index], last = index === CHAPTERS.length - 1;
  const go = useCallback((to: number) => setIndex(Math.max(0, Math.min(CHAPTERS.length - 1, to))), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); go(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); go(index - 1); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [index, go, onClose]);
  const Art = chapter.art;
  return (
    <div className="htp-root absolute inset-0 z-[100004] overflow-hidden text-white">
      <MenuBackdrop dim={0.72} />
      <div className="htp-sweep absolute inset-y-0 -left-1/4 w-[60%] -skew-x-12" style={{ background: chapter.colour }} key={`sweep-${chapter.id}`} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="How to play"
        className="relative z-10 mx-auto flex h-full max-w-5xl flex-col p-4 sm:p-8"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => { if (touchX === null) return; const d = e.changedTouches[0].clientX - touchX; if (Math.abs(d) > 50) go(index + (d < 0 ? 1 : -1)); setTouchX(null); }}
      >
        <header className="flex items-center gap-3">
          <p className="text-xs font-black tracking-[0.3em] text-[#f2d9a6] uppercase">How to play</p>
          <div className="flex flex-1 justify-center gap-1.5" role="tablist" aria-label="Chapters">
            {CHAPTERS.map((c, i) => (
              <button key={c.id} type="button" role="tab" aria-selected={i === index} aria-label={c.title} onClick={() => go(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? "w-10" : "w-2.5 bg-white/35 hover:bg-white/60"}`} style={i === index ? { background: chapter.colour } : undefined} />
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Close how to play" className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X className="size-5" /></button>
        </header>

        <div key={chapter.id} className="grid flex-1 content-center items-center gap-8 overflow-y-auto py-6 md:grid-cols-[1fr_1.1fr]">
          <div className="htp-art order-2 md:order-1"><Art /></div>
          <div className="order-1 md:order-2">
            <p className="htp-rise text-xs font-black tracking-[0.3em] text-[#f2d9a6] uppercase">{index + 1} / {CHAPTERS.length} · {chapter.kicker}</p>
            <h2 className="htp-rise mt-2 font-[Lilita_One,system-ui] text-4xl leading-none sm:text-6xl" style={{ animationDelay: "0.06s", textShadow: `0 5px 0 ${chapter.colour}` }}>{chapter.title}</h2>
            <ul className="mt-6 grid gap-3">
              {chapter.points.map((point, i) => (
                <li key={i} className="htp-rise flex gap-3 rounded-2xl bg-white/95 p-3.5 text-sm leading-relaxed text-[#13203a] shadow-[0_5px_0_rgba(13,23,38,.5)] sm:text-[15px]" style={{ animationDelay: `${0.14 + i * 0.09}s` }}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: chapter.colour }}>{i + 1}</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {chapter.id === "move" && <details className="htp-rise mt-3 rounded-2xl bg-[#0d1726]/80 p-3 text-xs" style={{ animationDelay: "0.45s" }}><summary className="cursor-pointer font-bold">Driving and controller buttons</summary><p className="mt-2 leading-relaxed">Driving: ↑ accelerate, ↓ brake or reverse, ← → steer, Space handbrake.</p><div className="mt-2"><ControllerLegend /></div></details>}
          </div>
        </div>

        <footer className="flex items-center gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="flex min-h-12 items-center gap-2 rounded-full bg-white/15 px-5 font-bold disabled:opacity-0"><ArrowLeft className="size-4" />Back</button>
          <span className="flex-1 text-center text-xs text-white/60">Use ← → or swipe</span>
          {last
            ? <button type="button" onClick={onClose} className="htp-glow flex min-h-12 items-center gap-2 rounded-full bg-[#f2d9a6] px-6 font-black text-[#13203a]">Start playing <ArrowRight className="size-4" /></button>
            : <button type="button" onClick={() => go(index + 1)} className="flex min-h-12 items-center gap-2 rounded-full px-6 font-black text-white shadow-[0_5px_0_rgba(13,23,38,.6)]" style={{ background: chapter.colour }}>Next <ArrowRight className="size-4" /></button>}
        </footer>
      </section>
    </div>
  );
}
