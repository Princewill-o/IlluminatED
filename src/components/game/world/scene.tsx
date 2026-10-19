"use client";

import { useEffect, useState } from "react";

import { Bike, BookOpen, Briefcase, Bus, CarFront, Footprints, Gamepad2, Heart, Smartphone, Siren, TrainFront, X } from "lucide-react";

import { CutsceneBrand, sceneBrandFor } from "./cutscene-brand";

/**
 * Motion-graphic scene change: two blue panels sweep in, the hexagon badge spins
 * in with the place name, then the panels sweep away to reveal the new scene.
 */
export function SceneWipe({ show, label }: { show: boolean; label: string }) {
  return (
    <div aria-hidden={!show} className="pointer-events-none absolute inset-0 z-[100001] overflow-hidden">
      <div className={`scene-panel scene-panel-a ${show ? "scene-in" : ""}`} />
      <div className={`scene-panel scene-panel-b ${show ? "scene-in" : ""}`} />
      <div className={`scene-title absolute inset-0 grid place-items-center ${show ? "scene-title-in" : ""}`}>
        <div className="flex items-center gap-3 rounded-2xl bg-[#f6f2e8] px-5 py-3 shadow-xl">
          <span className="scene-badge"><CutsceneBrand kind={sceneBrandFor(label)} compact /></span>
          <span className="text-xl font-black text-[#13203a]">{label}</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: Footprints,
    title: "You're one student in a big city",
    body: "Walk with WASD or the arrow keys, drag the joystick on a phone, or tap where you want to go. Walking is slow on purpose: London is big, so plan how you travel.",
    hint: "Press E (or tap the glowing marker) to go through a door.",
  },
  {
    icon: Bus,
    title: "Catch a bus and revise on the way",
    body: "Stand at a bus stop to see live departures: the BL1 and the Superloop. Tick \"Revise on the way\" and you answer 3 questions while you ride. If your teacher has set homework, the bus quizzes you on those exact topics.",
    hint: "Revising on the bus fills your Focus bar.",
  },
  {
    icon: TrainFront,
    title: "Take the Underground for long trips",
    body: "Walk into any station, through the barriers and onto the platform. Choose a stop on the map, ride the carriage, and step off at the other end. Way out takes you back up to the street.",
    hint: "Mind the gap.",
  },
  {
    icon: Bike,
    title: "Hire a bike when you're in a hurry",
    body: "There's a dock beside every station. Santa Cycles, Humm and Lyme cost Clout and make you up to 2.7 times faster for five minutes. Bikes stay outside when you go indoors.",
    hint: "Watch the road: cars and buses will bump you back onto the pavement.",
  },
  {
    icon: CarFront,
    title: "Drive safely through London",
    body: "Take an owned car from Garage. W / ↑ accelerates, S / ↓ brakes then reverses, A D / ← → steer and Space brakes. On a phone, push the driving joystick up, down or sideways for the same controls.",
    hint: "Keep left. Brake before the stop line on amber and wait on red. Give way at zebra crossings. Collisions and road violations earn wanted stars.",
  },
  {
    icon: Heart,
    title: "Look after your needs",
    body: "Energy, Focus, Mood, Hunger and Social drop through the day. Sleep and eat at home, study to raise Focus, and hang out with friends for Social. Low bars make everything harder.",
    hint: "Your needs appear beside your portrait on larger screens.",
  },
  {
    icon: BookOpen,
    title: "Homework is part of the game",
    body: "Join your class with your teacher's code in Homework. Every set piece shows up in your task list here, and handing it in boosts your Mood and earns Clout. Practise it on the bus first.",
    hint: "Tasks are top left: tap one to open it.",
  },
  {
    icon: Briefcase,
    title: "Practise work skills, earn Clout",
    body: "Visit company HQs and shops for simulated interviews and workplace tasks. Clout buys bikes, arcade games, furniture and new homes.",
    hint: "Look for the door markers on company buildings.",
  },
  {
    icon: Smartphone,
    title: "Your city is on your phone",
    body: "Open the phone to call fictional companies, find jobs and open home services. Visit the Study Quarter for the makerspace, reading garden and shared lobby.",
    hint: "Use the phone button on the right. CPU residents are scenery, separate from connected players.",
  },
  {
    icon: Siren,
    title: "Actions have game consequences",
    body: "Road violations, collisions and scuffles earn wanted stars. Police can stop you with a taser; serious offences may bring a direct trip to prison. Lower wanted levels get a knowledge challenge.",
    hint: "In prison, cells are open: study, use completed homework, talk to inmates or find the service-maze exit. Guards add time if they catch you.",
  },
  {
    icon: Gamepad2,
    title: "Play live with others",
    body: "We put you on the server nearest to you automatically. Head to the Games Hall at Battersea Power Station for a live Quiz Battle with everyone on your server.",
    hint: "Fastest right answers score the most.",
  },
];

export const TUTORIAL_KEY = "world-tutorial-v1";

/** First-visit walkthrough of how London works (reopen any time with "How to play"). */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const Icon = s.icon;
  useEffect(() => {
    try {
      localStorage.setItem(TUTORIAL_KEY, "seen");
    } catch {
      // Shown again next time; fine.
    }
  }, []);
  return (
    <div className="absolute inset-0 z-[100000] grid place-items-center bg-black/55 p-2 sm:p-3">
      <div role="dialog" aria-modal="true" aria-label="How to play" className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#f7f1e6] text-[#13203a]">
        <div className="relative h-20 shrink-0 overflow-hidden bg-[#2b5fd9] sm:h-24 [@media(max-height:450px)]:h-14">
          <div className="tutorial-rings absolute inset-0" />
          <span key={i} className="tutorial-pop absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-2xl bg-[#f6f2e8] shadow-lg">
            <Icon className="size-6 text-[#2b5fd9]" aria-hidden />
          </span>
          <button type="button" onClick={onClose} aria-label="Skip the tutorial" className="absolute top-2 right-2 grid size-11 place-items-center rounded-full bg-white/90">
            <X className="size-4" />
          </button>
        </div>
        <div key={`t${i}`} className="tutorial-text min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <p className="text-xs font-black tracking-[0.25em] text-[#2b5fd9] uppercase">
            How to play · {i + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 text-xl font-black">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed">{s.body}</p>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold">{s.hint}</p>
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((_, k) => (
              <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-[#2b5fd9]" : "bg-[#13203a]/15"}`} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-[#13203a]/10 p-3 pt-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="min-h-11 flex-1 rounded-full bg-white px-3 py-2 text-sm font-black">
              Back
            </button>
          )}
          <button type="button" onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : onClose())} className="min-h-11 flex-1 rounded-full bg-[#2b5fd9] px-3 py-2 text-sm font-black text-white">
            {i < STEPS.length - 1 ? "Next" : "Start playing"}
          </button>
        </div>
      </div>
    </div>
  );
}
