"use client";

import { useState } from "react";

import { RewardsBanner } from "../season/rewards-banner";

const REWARDS = [
  ["XP", "Your player level", "Earn it through verified world and learning activities. XP raises your level and level title; it is not spent like money."],
  ["Clout", "Your in-game spending money", "Earn Clout from verified shifts, races and weekly rewards. Spend it on outfits, vehicles, furniture and homes. A Garden terrace costs 2,500 Clout; a Warehouse loft costs 8,000."],
  ["IllumED Coins", "Your event badge collection", "One coin per verified correct Championship answer. Spend 25 coins on a collection badge in Events. These coins are separate from Clout and have no cash value."],
  ["Season XP", "Season Pass rewards", "Progress through the season’s 30 tiers. Claim the free tier rewards; Plus unlocks the premium reward track. Season progress is separate from your player level."],
  ["Racing stars", "More tracks and karts", "Earn up to three stars on campaign tracks. Stars unlock later racing worlds and karts. Live friend races are unranked practice."],
  ["Marathon points", "The month-end voucher leaderboard", "Enter free and answer Championship questions during the 30-day event. Each verified correct answer scores 10 points. Clout, purchases and coins cannot buy points."],
];

export function RewardGuide() {
  const [goal, setGoal] = useState("Learn and level up");
  return <div className="space-y-6"><section className="rounded-3xl border bg-card p-6 text-card-foreground"><p className="text-sm font-black text-primary">Your next goal</p><h1 className="mt-2 text-3xl font-black">Choose what you’re playing towards</h1><p className="mt-2 text-muted-foreground">Set a goal for this session. Progress comes from learning and playing well; you decide when to take a break.</p><div className="mt-4 flex flex-wrap gap-2">{["Learn and level up", "Save for a new home", "Unlock a racing kart", "Compete for vouchers"].map(g => <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className={`rounded-full border px-4 py-3 font-bold ${g === goal ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{g}</button>)}</div><p role="status" className="mt-4 rounded-xl bg-secondary p-4 font-bold text-secondary-foreground">{goal === "Learn and level up" ? "Start with a short Study Room session. Read the feedback on any questions you miss." : goal === "Save for a new home" ? "Complete a verified work shift, check your Clout, then visit the home catalogue." : goal === "Unlock a racing kart" ? "Play a campaign track in Maths Racing. Accuracy earns better finishing places and stars." : "Enter the marathon in Championship, then complete your daily questions. The same question limit applies to everyone."}</p></section><section className="grid gap-4 md:grid-cols-2">{REWARDS.map(([name, use, detail]) => <article key={name} className="rounded-3xl border bg-card p-5 text-card-foreground"><p className="text-sm font-black text-primary">{name}</p><h2 className="mt-1 text-xl font-black">{use}</h2><p className="mt-2 leading-7 text-muted-foreground">{detail}</p></article>)}</section><RewardsBanner /></div>;
}
