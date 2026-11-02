"use client";

import { useState } from "react";

import { BookOpen, Footprints, Heart, TrainFront, X } from "lucide-react";

import { ControllerLegend } from "./controller-legend";
import { CutsceneBrand, sceneBrandFor } from "./cutscene-brand";

/**
 * Motion-graphic scene change: two blue panels sweep in, the hexagon badge spins
 * in with the place name, then the panels sweep away to reveal the new scene.
 */
export function SceneWipe({ show, label }: { show: boolean; label: string }) {
  const words = label.split(/\s+/).filter(Boolean);
  return (
    <div
      aria-hidden={!show}
      className="pointer-events-none absolute inset-0 z-[100001] overflow-hidden"
    >
      <div
        className={`scene-panel scene-panel-gold ${show ? "scene-in" : ""}`}
      />
      <div className={`scene-panel scene-panel-a ${show ? "scene-in" : ""}`} />
      <div className={`scene-panel scene-panel-b ${show ? "scene-in" : ""}`} />
      <div
        className={`scene-title absolute inset-0 grid place-items-center ${show ? "scene-title-in" : ""}`}
      >
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="scene-badge">
            <CutsceneBrand kind={sceneBrandFor(label)} compact />
          </span>
          <span className="scene-eyebrow text-[11px] font-black tracking-[0.35em] text-[#f2d9a6] uppercase">
            Now entering
          </span>
          <span className="max-w-3xl text-4xl leading-[1.05] font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,.35)] sm:text-6xl">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="scene-word"
                style={{ animationDelay: `${0.22 + i * 0.06}s` }}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
          <span className="scene-underline h-1.5 w-40 rounded-full bg-[#f2d9a6]" />
        </div>
      </div>
    </div>
  );
}

const GUIDE = [
  {
    label: "Explore",
    icon: Footprints,
    title: "Choose your next step",
    steps: [
      "Walk to a building's entrance. Doors open as you approach; E or the highlighted button also works.",
      "Open the map, choose a place and follow its marker. Return to the city leaves you outside the same doorway.",
      "Meet residents, visit a community social or make a clip in Creator studio on your phone.",
    ],
  },
  {
    label: "Learn & work",
    icon: BookOpen,
    title: "Build your next chapter",
    steps: [
      "Open Study on your phone for your subjects and homework. Practise a little, read the feedback and try again.",
      "Visit a workplace reception to apply. Inside, approach a desk or counter to start your simulated shift.",
      "Follow the university marker in each city to explore courses and check official open-day information.",
    ],
  },
  {
    label: "Travel",
    icon: TrainFront,
    title: "Enjoy the journey",
    steps: [
      "At a station, choose a destination and board through an open train door. Each ride lasts two minutes.",
      "Walk between carriages, change your view or study while the train travels.",
      "Choose an owned car in Garage. Keep left on the motorway and follow your city's signs onto its slip road.",
    ],
  },
  {
    label: "Wellbeing",
    icon: Heart,
    title: "Your choices matter",
    steps: [
      "Eat, rest, study and spend time with others to keep your needs healthy. At very low health, paramedics take you to hospital.",
      "Give an agitated resident space. Shoving and collisions have game consequences; officers can follow you indoors.",
      "In a fictional hearing, compare testimony with the recorded incident. Incorrect learning answers add review rounds; evidence determines the case.",
    ],
  },
];
export const TUTORIAL_KEY = "world-tutorial-v2";
/** A skimmable, on-demand guide rather than a mandatory instruction slideshow. */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(0);
  const section = GUIDE[selected];
  const Icon = section.icon;
  return (
    <div className="absolute inset-0 z-[100004] grid place-items-center bg-[#101d35]/65 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="City guide"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f5f4ef] p-5 text-[#13203a] shadow-2xl"
      >
        <header className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#2b5fd9] text-white">
            <Icon aria-hidden className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-widest text-[#527090] uppercase">
              Your city companion
            </p>
            <h2 className="text-xl font-black">What would you like to do?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city guide"
            className="grid size-11 place-items-center rounded-full bg-white"
          >
            <X className="size-5" />
          </button>
        </header>
        <nav aria-label="Guide topics" className="my-5 flex flex-wrap gap-2">
          {GUIDE.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={
                selected === index
                  ? "min-h-11 rounded-xl bg-[#2b5fd9] px-3 text-sm font-bold text-white"
                  : "min-h-11 rounded-xl bg-white px-3 text-sm font-bold"
              }
            >
              {item.label}
            </button>
          ))}
        </nav>
        <h3 className="font-black">{section.title}</h3>
        <ol className="mt-3 space-y-3">
          {section.steps.map((text, index) => (
            <li
              key={text}
              className="flex gap-3 rounded-2xl bg-white p-3 text-sm leading-relaxed"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 font-bold text-blue-700">
                {index + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <details className="mt-4 rounded-2xl bg-[#13203a] p-4 text-white">
          <summary className="cursor-pointer text-sm font-bold">
            Movement & controls
          </summary>
          <p className="mt-3 text-xs leading-relaxed">
            Walk: WASD / arrow keys. Interact: E. Jump: Space. Driving: ↑
            accelerate, ↓ brake / reverse, ← → steer, Space brake. On phones,
            use the joystick and labelled action buttons. Camera controls change
            your view.
          </p>
          <div className="mt-3 text-xs">
            <ControllerLegend />
          </div>
        </details>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-12 w-full rounded-2xl bg-[#2b5fd9] font-bold text-white"
        >
          Back to my city
        </button>
      </section>
    </div>
  );
}
