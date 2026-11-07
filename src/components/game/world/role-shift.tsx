"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Coins, Sparkles } from "lucide-react";

import { CREW, JOB_CLIENTS, JOB_STATIONS, type JobClient, PLAYER, PLAYER_WORK } from "./art";
import type { Place } from "./city-map";
import { CrewBar } from "./crew";

import { creditCrew, finishRoleJob, startRoleJob } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { ROLE_COUNTER, ROLE_MAP_H, cityClientSpot, clientJob, roleStationSpots, serviceAccuracy } from "@/game/core/client-jobs";
import { createRng } from "@/game/core/rng";
import { type PracticalRole, levelForXp, payFor, roleTiers, tierIndex } from "@/game/core/roles";
import { TILE, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

type Phase = "travel" | "client" | "collect" | "deliver" | "pickup" | "drop" | "handover" | "paying" | "done";
type Reward = { pay: number; xp: number; level: number; levelUp: boolean; tierUp: string | null; practice: boolean; accuracy: number; note?: string };
const MINE = "mine";

/**
 * A shift in a practical role, with real NPC clients. A client arrives with a request; you walk
 * onto the stations that provide what it needs (your character does the work), then hand it
 * over. Delivery roles take the order to a client waiting in the city; taxi and bus drivers pick
 * a passenger up at the kerb and drop them at their destination. The server pays the job.
 */
export function RoleShift({ role, level: startLevel, map, onTarget, onBusy, onPaid, onEnd, onTravel }: {
  role: PracticalRole;
  level: number;
  map: WorldMap;
  onTarget: (p: Place | null) => void;
  onBusy: (busy: boolean) => void;
  onPaid: (clout: number) => void;
  onEnd: () => void;
  onTravel: (mapId: string, label: string) => void;
}) {
  const def = clientJob(role.id)!;
  const workplace = `role-${role.id}`;
  const [level, setLevel] = useState(startLevel);
  const [job, setJob] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const rng = useMemo(() => createRng(seed + job * 7919), [seed, job]);
  const order = useMemo(() => def.order(rng, tierIndex(level)), [def, rng, level]);
  const clientSeed = useMemo(() => (seed + job * 31) % 997, [seed, job]);
  const [claim, setClaim] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>(map.id === workplace ? "client" : "travel");
  const [collected, setCollected] = useState<string[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [shiftPay, setShiftPay] = useState(0);
  const [cityTargets, setCityTargets] = useState<{ a: { x: number; y: number; label: string }; b: { x: number; y: number; label: string } } | null>(null);
  const stations = useMemo(() => roleStationSpots(def).map((st) => ({ ...st, px: (st.x + 0.5) * TILE, py: (st.y + 0.5) * TILE })), [def]);
  const atWork = map.id === workplace;
  const counterSpot = { x: (ROLE_COUNTER.x + 0.5) * TILE, y: (ROLE_COUNTER.y + 2.6) * TILE };
  const nextNeed = order.ordered ? order.needs.find((n) => !collected.includes(n)) : null;
  const allCollected = order.needs.every((n) => collected.includes(n));

  // Clock in for each job.
  useEffect(() => {
    let alive = true;
    setClaim(null);
    void startRoleJob(role.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setPractice(true); setError(r.error); return; }
      if (r.claim) setClaim(r.claim); else setPractice(true);
    }).catch(() => { if (alive) setPractice(true); });
    return () => { alive = false; };
  }, [role.id, job]);

  // Arriving at work starts the first client; leaving mid-job keeps your place.
  useEffect(() => { if (phase === "travel" && atWork) setPhase("client"); }, [phase, atWork]);
  useEffect(() => { if (phase === "client") { const t = window.setTimeout(() => setPhase("collect"), 1400); return () => clearTimeout(t); } }, [phase]);

  // The client: at the counter while you work, out in the city for deliveries and rides.
  const clientAt = useMemo(() => {
    if (phase === "client" || phase === "collect" || (phase === "handover" && def.mode === "counter") || (phase === "done" && def.mode === "counter")) return atWork ? counterSpot : null;
    if (map.id !== "city" || !cityTargets) return null;
    if (phase === "deliver" || phase === "pickup") return cityTargets.a;
    if (phase === "drop" || ((phase === "handover" || phase === "done") && def.mode !== "counter")) return def.mode === "ride" ? cityTargets.b : cityTargets.a;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, atWork, map.id, cityTargets, def.mode]);
  const mood: JobClient["mood"] = reward ? (reward.accuracy >= 0.6 ? "happy" : "unhappy") : phase === "drop" ? "riding" : "waiting";
  const bubble = reward ? (reward.accuracy >= 0.6 ? def.thanks[0] : def.thanks[1]) : phase === "deliver" || phase === "pickup" ? (def.mode === "ride" ? "Taxi! Over here!" : "Is that my delivery?") : order.line;
  useEffect(() => {
    if (!clientAt) { JOB_CLIENTS.delete(MINE); return; }
    JOB_CLIENTS.set(MINE, { id: MINE, x: clientAt.x, y: clientAt.y, seed: clientSeed, bubble, mood, colour: role.colour });
  }, [clientAt, clientSeed, bubble, mood, role.colour]);
  useEffect(() => () => { JOB_CLIENTS.delete(MINE); JOB_STATIONS.length = 0; PLAYER_WORK.activity = null; onTarget(null); }, [onTarget]);

  // City targets for deliveries and rides, picked when you step outside with the order.
  useEffect(() => {
    if (map.id !== "city" || cityTargets || !(phase === "deliver" || phase === "pickup")) return;
    const r = createRng(seed + job * 13);
    const a = cityClientSpot(map, r, { x: PLAYER.x, y: PLAYER.y });
    const b = cityClientSpot(map, r, a);
    setCityTargets({ a, b });
  }, [map, phase, cityTargets, seed, job]);

  // Stations: shown in your workplace while you're collecting.
  useEffect(() => {
    JOB_STATIONS.length = 0;
    if (!atWork || phase !== "collect") return;
    for (const st of stations) JOB_STATIONS.push({ id: st.id, x: st.px, y: st.py, label: st.label, colour: role.colour, needed: order.ordered ? st.id === nextNeed : order.needs.includes(st.id) && !collected.includes(st.id), done: collected.includes(st.id) });
  }, [atWork, phase, stations, order, nextNeed, collected, role.colour]);

  // Where to go next on the map.
  useEffect(() => {
    if (phase === "travel") { onTarget(null); return; }
    if (phase === "collect" && atWork) {
      const st = stations.find((x) => x.id === (nextNeed ?? order.needs.find((n) => !collected.includes(n))));
      if (st && !allCollected) onTarget({ id: `role-${st.id}`, name: st.label, kind: "job", x: st.px, y: st.py });
      else onTarget({ id: "role-client", name: def.mode === "counter" ? `Hand over to ${order.client}` : "Head out to the city", kind: "job", x: def.mode === "counter" ? counterSpot.x : 12.5 * TILE, y: def.mode === "counter" ? counterSpot.y - TILE : (ROLE_MAP_H - 1.5) * TILE });
      return;
    }
    if (clientAt && (phase === "deliver" || phase === "pickup" || phase === "drop")) onTarget({ id: "role-client", name: phase === "drop" ? `Drop ${order.client} at ${cityTargets?.b.label}` : `${order.client} at ${clientAt === cityTargets?.a ? cityTargets.a.label : "the kerb"}`, kind: "job", x: clientAt.x, y: clientAt.y });
    else onTarget(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, atWork, nextNeed, collected, allCollected, clientAt, onTarget]);

  // Walking onto a station uses it; reaching the client hands over. No buttons needed.
  const lastStation = useRef<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      if (working) return;
      if (phase === "collect" && atWork) {
        const st = stations.find((x) => Math.hypot(PLAYER.x - x.px, PLAYER.y - x.py) < TILE * 0.95);
        if (!st) { lastStation.current = null; }
        else if (lastStation.current !== st.id && !collected.includes(st.id)) {
          lastStation.current = st.id;
          setWorking(st.label);
          PLAYER_WORK.activity = st.action;
          window.setTimeout(() => { PLAYER_WORK.activity = null; setWorking(null); setCollected((c) => (c.includes(st.id) ? c : [...c, st.id])); }, 1300);
        }
        // Counter jobs: hand over at the counter once you've got something.
        if (def.mode === "counter" && collected.length && Math.hypot(PLAYER.x - counterSpot.x, PLAYER.y - (counterSpot.y - TILE)) < TILE * 1.6 && allCollected) setPhase("handover");
        // Delivery and ride jobs: out of the door with the order.
        if (def.mode !== "counter" && allCollected) setPhase(def.mode === "ride" ? "pickup" : "deliver");
        return;
      }
      if (!clientAt || map.id !== "city") return;
      const near = Math.hypot(PLAYER.x - clientAt.x, PLAYER.y - clientAt.y) < TILE * 2.2;
      if (!near) return;
      if (phase === "deliver") setPhase("handover");
      else if (phase === "pickup") { setPhase("drop"); window.dispatchEvent(new CustomEvent("illumed:say", { detail: `${order.client} gets in. Take them to ${cityTargets?.b.label}.` })); }
      else if (phase === "drop") setPhase("handover");
    }, 150);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, atWork, stations, collected, working, clientAt, map.id, allCollected, def.mode]);

  useEffect(() => { onBusy(Boolean(working)); return () => onBusy(false); }, [working, onBusy]);

  const finishJob = useCallback(async () => {
    setPhase("paying");
    const accuracy = serviceAccuracy(order, collected);
    const steps = Math.max(3, Math.min(14, order.needs.length + (def.mode === "counter" ? 1 : 3)));
    if (practice || !claim) {
      setReward({ pay: payFor(role, steps, accuracy), xp: 0, level, levelUp: false, tierUp: null, practice: true, accuracy });
      setPhase("done");
      return;
    }
    let r = await finishRoleJob(claim, steps, accuracy).catch(() => null);
    for (let tries = 0; r && !r.ok && /too quick|too fast/i.test(r.error) && tries < 3; tries++) {
      await new Promise((ok) => setTimeout(ok, 4000));
      r = await finishRoleJob(claim, steps, accuracy).catch(() => null);
    }
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't save the job."); setReward({ pay: 0, xp: 0, level, levelUp: false, tierUp: null, practice: true, accuracy, note: r?.error }); setPhase("done"); return; }
    const newLevel = levelForXp(r.total_xp);
    const tierUp = tierIndex(newLevel) > tierIndex(level) ? roleTiers(role)[tierIndex(newLevel)].title : null;
    setReward({ pay: r.pay, xp: r.xp, level: newLevel, levelUp: newLevel > level, tierUp, practice: false, accuracy, note: r.capped ? "Daily Clout cap reached: XP still counts." : undefined });
    setShiftPay((n) => n + r.pay);
    if (r.pay) onPaid(r.pay);
    if (CREW.id && CREW.role === role.id) {
      const c = await creditCrew(CREW.id, claim).catch(() => null);
      if (c?.ok) {
        window.dispatchEvent(new CustomEvent("illumed:crew", { detail: c.status }));
        if (c.status.paid && c.status.bonus) { onPaid(c.status.bonus); window.dispatchEvent(new CustomEvent("illumed:reward", { detail: { clout: c.status.bonus, label: "Team bonus", xp: 15, role: role.title } })); }
      }
    }
    notifyPlayerChanged();
    window.dispatchEvent(new CustomEvent("illumed:reward", { detail: { clout: r.pay, label: role.done, xp: r.xp, role: role.title } }));
    setLevel(newLevel);
    setPhase("done");
  }, [practice, claim, role, order, collected, def.mode, level, onPaid]);
  useEffect(() => { if (phase === "handover") { PLAYER_WORK.activity = "serve"; const t = window.setTimeout(() => { PLAYER_WORK.activity = null; void finishJob(); }, 1200); return () => clearTimeout(t); } }, [phase, finishJob]);

  const nextJob = () => { setCollected([]); setReward(null); setError(""); setCityTargets(null); lastStation.current = null; setJob((j) => j + 1); setPhase(def.mode === "counter" ? "client" : atWork ? "client" : "travel"); };
  const quality = (v: number) => v >= 0.9 ? "Perfect" : v >= 0.7 ? "Good" : v >= 0.4 ? "OK" : "Not quite";
  const tier = tierIndex(level);
  const nameOf = (id: string) => stations.find((x) => x.id === id)?.label ?? id;

  return (
    <aside className="absolute top-28 left-1/2 z-[70] w-[min(390px,calc(100%-24px))] -translate-x-1/2 overflow-hidden md:top-[216px] md:left-4 md:w-[340px] md:translate-x-0 rounded-2xl border-b-4 border-black/40 bg-[#13203a]/95 text-white shadow-xl" aria-live="polite">
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: role.colour }}>
        <p className="text-xs font-black tracking-widest uppercase">{role.title} · {roleTiers(role)[tier].title}</p>
        <p className="ml-auto flex items-center gap-1 text-xs font-black"><Coins className="size-3.5" />{shiftPay} this shift</p>
      </div>
      <div className="p-4">
        {practice && error && job === 0 && phase !== "done" && <p className="mb-2 rounded-xl bg-white/10 p-2 text-xs">{error} Practice jobs don&apos;t pay.{role.plus && <> <a href="/pricing" className="font-black text-[#ffd166] underline">See Plus</a></>}</p>}
        {phase === "travel" && (
          <>
            <p className="text-sm">Your shift is at <b>{def.building}</b>. Clients come to you there.</p>
            <button type="button" onClick={() => onTravel(workplace, def.building)} className="mt-3 min-h-11 w-full rounded-full bg-[#ffd166] px-4 font-black text-[#13203a]">Go to work</button>
          </>
        )}
        {(phase === "client" || phase === "collect") && (
          <>
            <p className="text-[11px] font-bold text-white/60">Client {job + 1} · {order.client} ({def.clientKind})</p>
            <p className="mt-1 text-base leading-snug font-black">&ldquo;{order.line}&rdquo;</p>
            {phase === "client" ? <p className="mt-2 text-sm text-white/70">{order.client} is coming to the counter…</p> : !atWork ? (
              <button type="button" onClick={() => onTravel(workplace, def.building)} className="mt-3 min-h-11 w-full rounded-full bg-[#ffd166] px-4 font-black text-[#13203a]">Back to {def.building}</button>
            ) : (
              <>
                <p className="mt-2 text-[11px] font-bold tracking-wider text-white/60 uppercase">What it needs{order.ordered ? ", in order" : ""}</p>
                <ul className="mt-1 grid gap-1 text-sm">
                  {order.needs.map((n) => <li key={n} className={cn("flex items-center gap-2", collected.includes(n) ? "text-[#7ee39b]" : n === nextNeed ? "font-black text-[#ffd166]" : "")}>{collected.includes(n) ? "✓" : "○"} {nameOf(n)}</li>)}
                </ul>
                {collected.some((c) => !order.needs.includes(c)) && <p className="mt-1 text-xs text-[#ff9f8a]">Not needed: {collected.filter((c) => !order.needs.includes(c)).map(nameOf).join(", ")}</p>}
                <p className="mt-2 text-xs text-white/70">{working ? `Working: ${working}…` : allCollected ? (def.mode === "counter" ? `All done. Hand it to ${order.client} at the counter.` : def.mode === "ride" ? "Ready. Head out and pick up your passenger." : "Order ready. Head out and deliver it.") : "Walk onto the glowing stations to use them."}</p>
                {!allCollected && collected.length > 0 && def.mode === "counter" && <button type="button" onClick={() => setPhase("handover")} className="mt-2 text-xs text-white/60 underline">Hand it over as it is</button>}
              </>
            )}
          </>
        )}
        {(phase === "deliver" || phase === "pickup" || phase === "drop") && (
          <>
            <p className="text-[11px] font-bold text-white/60">{def.mode === "ride" ? "Passenger" : "Delivery"} · {order.client}</p>
            <p className="mt-1 text-base font-black">{phase === "drop" ? `Take ${order.client} to ${cityTargets?.b.label ?? "their stop"}` : map.id !== "city" ? "Head out to the city" : `Go to ${order.client} at ${cityTargets?.a.label ?? "the address"}`}</p>
            <p className="mt-1 text-xs text-white/70">Follow the pin. Drive or walk: {order.dropLabel ?? "hand it over"} when you reach them.</p>
          </>
        )}
        {(phase === "handover" || phase === "paying") && <p className="text-sm font-bold">{order.dropLabel ?? "Handing it over"}…</p>}
        {phase === "done" && reward && (
          <div>
            <p className="text-lg font-black">{quality(reward.accuracy)} · {role.done}!</p>
            {reward.practice ? <p className="mt-1 text-sm text-white/80">{reward.note ?? (error || "Practice job")} (would pay about {reward.pay} Clout).</p>
              : <p className="mt-1 text-2xl font-black text-[#ffd166]">+{reward.pay} Clout <span className="text-base text-white/80">· +{reward.xp} XP</span></p>}
            {reward.levelUp && <p className="mt-1 flex items-center gap-1 text-sm font-black text-[#7ee08a]"><Sparkles className="size-4" /> Level {reward.level}!{reward.tierUp ? ` Promoted to ${reward.tierUp}.` : ""}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={nextJob} className="min-h-11 flex-1 rounded-full bg-[#ffd166] px-4 font-black text-[#13203a]">Next client</button>
              <button type="button" onClick={onEnd} className="min-h-11 rounded-full bg-white/10 px-4 font-bold">End shift</button>
            </div>
          </div>
        )}
        {phase !== "done" && <button type="button" onClick={onEnd} className="mt-2 text-xs text-white/60 underline">End shift</button>}
        {!practice && <CrewBar role={role.id} colour={role.colour} />}
      </div>
    </aside>
  );
}

/** "+40 Clout — Pizza order completed" toasts, with the career XP shown separately. */
export function RewardToasts() {
  const [items, setItems] = useState<{ id: number; clout: number; label: string; xp: number; role: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ clout: number; label: string; xp: number; role: string }>).detail;
      if (!d) return;
      const id = Date.now() + Math.random();
      setItems((list) => [...list.slice(-2), { id, ...d }]);
      window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 4200);
    };
    window.addEventListener("illumed:reward", on);
    return () => window.removeEventListener("illumed:reward", on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed top-20 right-4 z-[100009] grid gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="rounded-2xl border-b-4 border-black/30 bg-[#13203a] px-4 py-2.5 text-white shadow-xl" style={{ animation: "reward-in .35s cubic-bezier(.2,1.4,.4,1)" }}>
          <p className="flex items-center gap-1.5 text-sm font-black"><Coins className="size-4 text-[#ffd166]" /><span className="text-[#ffd166]">+{t.clout} Clout</span> · {t.label}</p>
          {t.xp > 0 && <p className="text-[11px] font-bold text-white/70">+{t.xp} career XP · {t.role}</p>}
        </div>
      ))}
      <style>{"@keyframes reward-in{from{transform:translateX(40px) scale(.9);opacity:0}to{transform:none;opacity:1}}"}</style>
    </div>
  );
}
