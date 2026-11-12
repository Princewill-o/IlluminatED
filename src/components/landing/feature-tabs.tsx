"use client";

import { useState } from "react";

import Image from "next/image";

/** Apple-style segmented tabs: one pill track, a sliding white thumb, content swaps underneath. */
const TABS = [
  {
    id: "play",
    label: "Play",
    title: "IllumED World: a city to live in.",
    text: "Start in Fountain Square, walk into every café and shop, race on maths, enter the weekly Championship and play with friends in the Open World. Every question you answer earns Clout.",
    media: { kind: "video", src: "/landing/illumed-world-explainer.mp4", poster: "/landing/illumed-world-explainer-poster.jpg", alt: "IllumED World explainer: Fountain Square, venue interiors, networking events, deliveries, worlds, Maths Racing and What If" },
  },
  {
    id: "tiggy",
    label: "Ask Tiggy",
    title: "Stuck? Ask Tiggy.",
    text: "An AI study helper for your subjects. Free accounts get 15 messages to try it; Plus gives up to 200 a day with full worked solutions. It never asks for personal details.",
    media: { kind: "image", src: "/landing/world-study.webp", alt: "The study hall in the game" },
  },
  {
    id: "careers",
    label: "Careers",
    title: "Use what you learn at work.",
    text: "Step into simulated workplaces and tackle practical numeracy, reading and problem-solving tasks. Records describe practice, not real employment.",
    media: { kind: "image", src: "/landing/world-street.webp", alt: "Shops and workplaces on a London high street in the game" },
  },
  {
    id: "schools",
    label: "Schools",
    title: "Homework that students actually open.",
    text: "Teachers set homework from the question bank and review their own classes' results. Schools start with a one-term paid pilot and a data and safeguarding pack.",
    media: { kind: "image", src: "/landing/world-study.webp", alt: "The study hall in the game" },
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
