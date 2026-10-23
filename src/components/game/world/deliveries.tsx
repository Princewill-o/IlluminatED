"use client";

import { useEffect, useRef, useState } from "react";

import { Package, PenLine, Truck } from "lucide-react";

import { COURIER } from "./art";
import { play, soundOn } from "../sound";

import { pendingDeliveries, signDelivery, type Delivery } from "@/app/games/world/actions";
import { carById } from "@/game/core/cars";
import { cosmeticById } from "@/game/core/cosmetics";
import { furnitureById } from "@/game/core/homes";

export const deliveryLabel = (d: Pick<Delivery, "kind" | "item">) =>
  d.kind === "car" ? `${carById(d.item)?.name ?? "Your new car"} (keys and paperwork)`
    : d.kind === "furniture" ? furnitureById(d.item)?.name ?? "Furniture"
      : cosmeticById(d.item)?.name ?? "Your order";

/**
 * Deliveries: whatever you buy is brought to your front door. At home the
 * doorbell rings and a courier walks in with the parcel; you sign for it and
 * open it. Anywhere else, a chip says it's on the way and offers to head home.
 */
export function Deliveries({ atHome, busy, onGoHome }: { atHome: boolean; busy: boolean; onGoHome: () => void }) {
  const [queue, setQueue] = useState<Delivery[]>([]);
  const [stage, setStage] = useState<"idle" | "door" | "sign" | "open">("idle");
  const [name, setName] = useState("");
  const current = queue[0];
  const timer = useRef<number | null>(null);

  // Check for parcels now and every 30 seconds.
  useEffect(() => {
    let alive = true;
    const check = () => void pendingDeliveries().then((list) => { if (alive) setQueue((old) => (stage === "idle" ? list : old)); }).catch(() => {});
    check();
    const id = window.setInterval(check, 30_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [stage]);

  // At home with a parcel due: ring the bell and send the courier in.
  useEffect(() => {
    if (!atHome || busy || !current || stage !== "idle") return;
    play("door", soundOn());
    Object.assign(COURIER, { active: true, phase: "arriving", since: performance.now() });
    setStage("door");
  }, [atHome, busy, current, stage]);
  // Once the courier reaches you, they hand over the delivery note.
  useEffect(() => {
    if (stage !== "door") return;
    timer.current = window.setTimeout(() => { COURIER.phase = "waiting"; COURIER.since = performance.now(); setStage("sign"); }, 2900);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [stage]);
  useEffect(() => () => { COURIER.active = false; }, []);
  useEffect(() => {
    // Local testing only: queue a pretend parcel.
    if (process.env.NODE_ENV === "development") (window as unknown as { __deliver?: unknown }).__deliver = (kind: Delivery["kind"] = "furniture", item = "lamp") => setQueue((q) => [...q, { id: `dev-${Date.now()}`, kind, item, created_at: new Date().toISOString() }]);
  }, []);

  if (!current) return null;
  if (!atHome)
    return (
      <div className="pointer-events-auto absolute bottom-40 left-1/2 z-[100006] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#13203a]/95 py-1.5 pr-1.5 pl-3 text-sm font-bold text-white shadow-lg">
        <Truck className="size-4 text-[#f2d9a6]" aria-hidden />
        {queue.length === 1 ? `${deliveryLabel(current)} is on the way to your house` : `${queue.length} deliveries on the way to your house`}
        <button type="button" onClick={onGoHome} className="gloss-off rounded-full bg-[#f2d9a6] px-3 py-1 text-xs font-black text-[#0d1726]">Go home</button>
      </div>
    );
  if (stage === "door")
    return <p role="status" className="absolute top-24 left-1/2 z-[100006] -translate-x-1/2 rounded-full bg-[#13203a]/95 px-4 py-2 text-sm font-black text-white shadow-lg">🔔 Ding dong! A delivery is here.</p>;
  if (stage === "sign")
    return (
      <div className="absolute inset-x-3 bottom-24 z-[100008] mx-auto max-w-sm rotate-[-0.5deg] rounded-sm bg-[#fdfbf5] p-5 text-[#1d1f24] shadow-2xl">
        <p className="text-[10px] font-black tracking-[0.25em] text-[#5a6272] uppercase">IlluminatED Couriers · Delivery note</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#b98a57] text-white"><Package className="size-6" aria-hidden /></span>
          <div className="min-w-0">
            <p className="font-black leading-tight">{deliveryLabel(current)}</p>
            <p className="text-xs text-[#5a6272]">Parcel 1 of {queue.length} · left at your front door</p>
          </div>
        </div>
        <label className="mt-3 flex items-end gap-2 border-b border-dotted border-[#1d1f24]/40 pb-1">
          <PenLine className="size-4 shrink-0 text-[#5a6272]" aria-hidden />
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder="Sign here" className="min-w-0 flex-1 bg-transparent font-serif text-xl italic outline-none placeholder:text-[#1d1f24]/30" />
        </label>
        <button type="button" disabled={name.trim().length < 2} onClick={async () => {
          await signDelivery(current.id);
          COURIER.phase = "leaving"; COURIER.since = performance.now();
          setStage("open");
        }} className="gloss-off mt-4 w-full rounded-sm bg-[#1d1f24] py-2.5 text-sm font-black tracking-wide text-[#fdfbf5] uppercase disabled:opacity-40">Sign for it</button>
      </div>
    );
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/45 p-4" onClick={() => { setQueue((q) => q.slice(1)); setStage("idle"); setName(""); }}>
      <div className="delivery-open w-full max-w-xs rounded-3xl bg-[#f7f1e6] p-6 text-center text-[#13203a] shadow-2xl">
        <div className="relative mx-auto h-24 w-28">
          <span className="delivery-lid absolute top-2 left-1 h-6 w-26 rounded-sm bg-[#a0744a]" />
          <span className="absolute bottom-0 left-2 h-16 w-24 rounded-sm bg-[#b98a57]" />
          <span className="delivery-sparkle absolute -top-2 left-1/2 -translate-x-1/2 text-3xl">✨</span>
        </div>
        <p className="mt-3 text-xs font-black tracking-widest text-[#15987f] uppercase">Delivered</p>
        <p className="mt-1 text-xl font-black">{deliveryLabel(current)}</p>
        <p className="mt-1 text-sm text-[#5a6272]">{current.kind === "car" ? "Your car is parked in your garage. Open Garage on your phone." : current.kind === "furniture" ? "It's ready to place: open Build & buy." : "It's in your Locker."}</p>
        <p className="mt-4 text-xs text-[#5a6272]">Tap to close</p>
      </div>
    </div>
  );
}
