"use client";

import { useState, useTransition } from "react";

import { BookOpenCheck, Gavel, Pill, ShoppingBasket, Siren, Star, X } from "lucide-react";

import { CutsceneBrand } from "./cutscene-brand";

import { buyWorldItem } from "@/app/games/world/actions";
import { SHOP, type ShopItem, acquittalChance, sentenceMs } from "@/game/core/law";
import { cn } from "@/lib/utils";

/** Tesco Express and Bootz Pharmacy: spend Clout to top up your needs. */
export function ShopDialog({ shop, clout, onBought, onClose, onSteal }: { shop: "tescow" | "bootz"; clout: number; onBought: (item: ShopItem, clout: number | null) => void; onClose: () => void; onSteal?: () => void }) {
  const items: ShopItem[] = shop === "bootz" ? ["medicine"] : ["drink", "meal", "coffee"];
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="absolute inset-0 z-[100004] grid place-items-end bg-black/60 md:place-items-center" onClick={onClose}>
      <div role="dialog" aria-label={shop === "bootz" ? "Bootz Pharmacy" : "Tesco Express"} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-[#f7f1e6] p-5 text-[#13203a] md:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: shop === "bootz" ? "#2b5fd9" : "#c8322d" }}>
              {shop === "bootz" ? "Bootz Pharmacy" : "Tesco Express"}
            </p>
            <h2 className="mt-1 text-2xl font-black">{shop === "bootz" ? "Feeling rough?" : "Grab something"}</h2>
            <p className="text-sm text-[#13203a]/70">You have {clout} Clout.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="jelly grid size-9 place-items-center rounded-full bg-white">
            <X className="size-4" />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {items.map((id) => {
            const it = SHOP[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={pending || clout < it.price}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const r = await buyWorldItem(id);
                      if (r.ok) onBought(id, r.clout);
                      else setError(r.error);
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left disabled:opacity-50"
                >
                  <span className={cn("grid size-11 place-items-center rounded-xl text-white", id === "medicine" ? "bg-[#2b5fd9]" : "bg-[#c8322d]")}>
                    {id === "medicine" ? <Pill className="size-6" aria-hidden /> : <ShoppingBasket className="size-6" aria-hidden />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-black">{it.name}</span>
                    <span className="block text-xs text-[#13203a]/70">{it.blurb}</span>
                  </span>
                  <span className="rounded-full bg-[#f2d9a6] px-3 py-1 text-sm font-black">{it.price}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-3 text-sm font-bold text-[#c8322d]">{error}</p>}
        {onSteal && (
          <button type="button" onClick={onSteal} className="mt-3 w-full rounded-2xl border border-[#c8322d]/40 px-4 py-2 text-sm font-bold text-[#c8322d]">
            Walk out without paying (shoplifting: +2 wanted stars)
          </button>
        )}
      </div>
    </div>
  );
}

/** GTA-style wanted stars, top centre under your level. */
export function WantedStars({ stars }: { stars: number }) {
  if (!stars) return null;
  return (
    <div className="pointer-events-none absolute top-[60px] left-1/2 z-[60] flex -translate-x-1/2 gap-1 rounded-full bg-[#13203a]/85 px-3 py-1.5" role="status" aria-label={`Wanted level ${stars} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-5", i < stars ? "wanted-on fill-[#ffd166] text-[#ffd166]" : "text-white/30")} aria-hidden />
      ))}
    </div>
  );
}

/** Blue lights: the police have caught up with you. */
export function ArrestOverlay() {
  return (
    <div className="arrest-flash pointer-events-none absolute inset-0 z-[100006] grid place-items-center bg-[#142235]/20" role="alert">
      <div className="rounded-3xl border border-white/30 bg-[#13203a] px-7 py-6 text-center text-white shadow-2xl">
        <div className="flex justify-center"><CutsceneBrand kind="police"/></div>
        <div className="relative mx-auto mt-5 grid size-16 place-items-center rounded-full bg-[#154d91] text-white"><Siren className="size-9" aria-hidden/><span className="absolute -inset-1 animate-ping rounded-full border-2 border-[#6bc6ff]/70"/></div>
        <p className="mt-4 text-2xl font-black">Taser stop. You&apos;re under arrest.</p>
        <p className="mt-2 text-sm text-white/75">You are stunned briefly while officers secure the scene.</p>
      </div>
    </div>
  );
}

/** The hearing: plead guilty or not guilty, or use a homework card to have the case dismissed. */
export function HearingDialog({
  charge,
  stars,
  cards,
  onVerdict,
}: {
  charge: string;
  stars: number;
  cards: number;
  onVerdict: (v: "dismissed" | "acquitted" | "guilty") => void;
}) {
  const [stage, setStage] = useState<"plea" | "deciding" | "done">("plea");
  const [result, setResult] = useState<"acquitted" | "guilty" | null>(null);
  const decide = (plea: "guilty" | "not") => {
    setStage("deciding");
    setTimeout(() => {
      const r = plea === "guilty" ? "guilty" : Math.random() < acquittalChance(stars) ? "acquitted" : "guilty";
      setResult(r);
      setStage("done");
    }, 2200);
  };
  return (
    <div className="absolute inset-0 z-[100004] grid place-items-end bg-black/50 md:place-items-center">
      <div role="dialog" aria-label="Court hearing" className="w-full max-w-md rounded-t-3xl bg-[#f7f1e6] p-5 text-[#13203a] md:rounded-3xl">
        <p className="text-xs font-black tracking-[0.25em] text-[#7a4f32] uppercase">Crown Court · Hearing</p>
        <h2 className="mt-1 text-2xl font-black">{charge}</h2>
        <p className="mt-1 text-sm text-[#13203a]/70">
          Wanted level {stars}. If found guilty: {Math.round(sentenceMs(stars) / 1000)} seconds in HMP Thames.
        </p>
        {stage === "plea" && (
          <div className="mt-4 grid gap-2">
            <button type="button" disabled={!cards} onClick={() => onVerdict("dismissed")} className="flex items-center gap-2 rounded-2xl bg-[#15987f] px-4 py-3 text-left font-black text-white disabled:opacity-40">
              <BookOpenCheck className="size-5" aria-hidden />
              <span className="flex-1">Show finished homework (get out of jail free)</span>
              <span className="rounded-full bg-white/20 px-2 text-xs">{cards} left</span>
            </button>
            <button type="button" onClick={() => decide("not")} className="rounded-2xl bg-white px-4 py-3 text-left font-black">
              Plead not guilty <span className="text-xs font-bold text-[#13203a]/60">({Math.round(acquittalChance(stars) * 100)}% chance)</span>
            </button>
            <button type="button" onClick={() => decide("guilty")} className="rounded-2xl bg-white px-4 py-3 text-left font-black">
              Plead guilty
            </button>
            {!cards && <p className="text-xs text-[#13203a]/60">Finish homework from your teacher to earn get out of jail free cards.</p>}
          </div>
        )}
        {stage === "deciding" && (
          <p className="mt-6 flex items-center gap-2 font-black">
            <Gavel className="gavel size-6" aria-hidden /> The judge is deciding...
          </p>
        )}
        {stage === "done" && result && (
          <div className="mt-4">
            <p className={cn("rounded-2xl p-3 text-lg font-black", result === "acquitted" ? "bg-[#e3f5ec] text-[#15987f]" : "bg-[#fdeceb] text-[#c8322d]")}>{result === "acquitted" ? "Not guilty. You're free to go." : "Guilty. Take them down."}</p>
            <button type="button" onClick={() => onVerdict(result)} className="jelly mt-3 w-full rounded-full bg-[#13203a] py-3 font-black text-white">
              {result === "acquitted" ? "Leave the court" : "Go to prison"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Inside HMP Thames: time left, and the homework card. */
export function PrisonHud({ leftMs, cards, progress, onStudy, onCard }: { leftMs: number; cards: number; progress: number; onStudy: () => void; onCard: () => void }) {
  const seconds = Math.max(0, Math.ceil(leftMs / 1000));
  return <div className="absolute top-24 left-1/2 z-[65] w-[min(360px,calc(100%-24px))] -translate-x-1/2 rounded-3xl bg-[#f2d9a6] p-4 text-[#13203a] shadow-xl">
    <p className="text-xs font-black tracking-widest uppercase">HMP Thames · fictional game</p>
    <p className="mt-1 text-lg font-black">Time left {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")} · Study {progress}/3</p>
    <p className="mt-1 text-xs">Serve your time or complete three study tasks to be released with no stars. Cell doors are open: talk, study or explore. Guards add 45 seconds if they catch an escape attempt.</p>
    <button type="button" onClick={onStudy} className="jelly mt-3 w-full rounded-full bg-[#2b5fd9] px-4 py-2 text-sm font-black text-white">Open study desk</button>
    <button type="button" disabled={!cards} onClick={onCard} className="jelly mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#13203a] px-4 py-2 text-sm font-black text-white disabled:opacity-40"><BookOpenCheck className="size-4"/>Use homework card ({cards})</button>
    <a href="/homework" className="mt-2 block text-center text-xs font-bold underline">Complete assigned homework</a>
  </div>;
}
