"use client";

import { useEffect, useMemo, useState } from "react";

import { PLAYER, RESCUES } from "./art";
import { HudSlot } from "./hud";
import { PoliceTransportCutscene } from "./police-transport-cutscene";

import { roadRoute } from "@/game/core/driving";
import { LIVE_RESCUE_MS, rescuePlan } from "@/game/core/live-rescue";
import type { WorldMap } from "@/game/core/world";

/**
 * An arrest played live on the road, like the ambulance: a police car drives in along the
 * real roads, two officers walk over, you're cuffed and walked to the car, and it drives off
 * towards the station or court with the camera riding along. Everyone in the room sees it.
 * With no road nearby it falls back to the transport cutscene.
 */
export function LivePolicePickup({ map, destination, people = "You", onArrive }: { map: WorldMap; destination: "police-station" | "court"; people?: string; onArrive: () => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (map.kind === "city" || map.art === "london" ? rescuePlan(map, PLAYER.x, PLAYER.y, (a, b) => roadRoute(map, a, b), destination) : null), []);
  const [status, setStatus] = useState("You're under arrest. Stay where you are.");
  useEffect(() => {
    if (!plan) return;
    const live = { ...plan, wreck: null, vehicle: "police" as const };
    RESCUES.set("me", { startedAt: performance.now(), ...live });
    window.dispatchEvent(new CustomEvent("illumed:rescue-start", { detail: { ...live, elapsed: 0 } }));
    const where = destination === "court" ? "the Crown Court" : "the police station";
    const steps: [number, string][] = [[2500, "Blue lights: a police car is coming for you."], [10000, "The officers cuff you and walk you to the car."], [14000, `In the back of the police car, on the way to ${where}.`]];
    const timers = steps.map(([at, text]) => window.setTimeout(() => setStatus(text), at));
    const done = window.setTimeout(() => { RESCUES.delete("me"); onArrive(); }, LIVE_RESCUE_MS + 200);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); RESCUES.delete("me"); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);
  if (!plan) return <PoliceTransportCutscene destination={destination === "court" ? "court" : "station"} people={people} onArrive={onArrive} />;
  return <HudSlot area="bc" order={0}><p role="status" className="rounded-full bg-[#22408a] px-5 py-2.5 text-sm font-black text-white shadow-lg">{status}</p></HudSlot>;
}
