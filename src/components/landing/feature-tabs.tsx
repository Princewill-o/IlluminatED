"use client";

import { useState } from "react";

import Image from "next/image";

/** Apple-style segmented tabs: one pill track, a sliding white thumb, content swaps underneath. */
const TABS = [
  {
    id: "play",
    label: "Play",
    title: "A whole London to explore.",
    text: "Walk, cycle or catch the bus across a 3D city with woods, a lake park and villages. Every quiz you pass earns Clout to spend on your character and home.",
    media: { kind: "image", src: "/landing/game-london.webp", alt: "The IlluminatED 3D London game world" },
  },
  {
    id: "agent",
    label: "Agent",
    title: "Plans your week. Quizzes what was set.",
    text: "Ask in plain English. It builds a revision plan around your homework and exam date, tests you on your teacher's topics and asks before anything is shared.",
    media: { kind: "video", src: "/landing/illumed-film.mp4", poster: "/landing/illumed-film-poster.jpg", alt: "The study agent planning a revision week" },
  },
  {
    id: "careers",
    label: "Careers",
    title: "Use what you learn at work.",
    text: "Step into simulated workplaces and tackle practical numeracy, reading and problem-solving tasks. Records describe practice, not real employment.",
    media: { kind: "image", src: "/landing/game-city-life.webp", alt: "A simulated workplace in the game" },
  },
  {
    id: "schools",
    label: "Schools",
    title: "Homework that students actually open.",
    text: "Teachers set homework from the question bank and review their own classes' results. Seat pricing and pilot scope are agreed in writing before purchase.",
    media: { kind: "image", src: "/landing/game-study-october.jpg", alt: "The Study Quarter in the game" },
  },
] as const;

export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  return (
    <div>
      <div className="flex justify-center">
        <div role="tablist" aria-label="What IlluminatED does" className="relative grid grid-cols-4 rounded-full bg-[var(--sky-card)] p-1 ring-1 ring-[var(--sky-ring)] backdrop-blur">
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 rounded-full bg-[#5b56c8] shadow transition-transform duration-300 ease-out"
            style={{ width: `calc((100% - 0.5rem) / ${TABS.length})`, transform: `translateX(${active * 100}%)` }}
          />
          {TABS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(i)}
              className={`relative z-10 min-h-10 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors sm:px-6 ${i === active ? "text-white" : "text-[var(--sky-soft)] hover:text-[var(--sky-ink)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} key={tab.id} className="agent-rise mt-10 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tab.title}</h3>
          <p className="mt-4 max-w-md text-lg leading-8 text-[var(--sky-soft)]">{tab.text}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border-4 border-[#1d1a4a] shadow-[10px_10px_0_#1d1a4a] dark:border-white/85 dark:shadow-[10px_10px_0_rgba(179,175,255,0.45)]">
          {tab.media.kind === "video" ? (
            <video className="block aspect-[3/2] w-full object-cover" src={tab.media.src} poster={tab.media.poster} autoPlay muted loop playsInline aria-label={tab.media.alt} />
          ) : (
            <Image src={tab.media.src} alt={tab.media.alt} width={1440} height={960} className="block aspect-[3/2] w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}
