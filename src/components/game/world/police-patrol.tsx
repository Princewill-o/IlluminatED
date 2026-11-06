"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LAW_STATUS, ONLINE, PATROL, PLAYER } from "./art";
import type { Place } from "./city-map";

import { earnWorldXp } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { trackDaily } from "@/components/game/engagement";
import { TILE, type WorldMap, blocked } from "@/game/core/world";
import { cn } from "@/lib/utils";

/**
 * Special Constable patrol: respond to incidents, chase the suspect on foot, then make a proper
 * arrest: the right grounds and the right caution. Wanted players nearby can be arrested too.
 * Fictional and simplified; the caution is the real wording used in England and Wales.
 */
const INCIDENTS = [
  { title: "Shoplifting at a corner shop", grounds: "Theft: taking goods without paying", name: "Jordan" },
  { title: "Bike stolen from a rack", grounds: "Theft of a bicycle", name: "Casey" },
  { title: "Graffiti on a bus shelter", grounds: "Criminal damage", name: "Riley" },
  { title: "Pickpocket in the square", grounds: "Theft from a person", name: "Morgan" },
  { title: "Phone snatched outside the station", grounds: "Robbery: theft using force", name: "Alex" },
];
const CAUTION = "You do not have to say anything. But it may harm your defence if you do not mention when questioned something which you later rely on in court. Anything you do say may be given in evidence.";
const WRONG_CAUTIONS = [
  "You have the right to remain silent. Anything you say can and will be used against you in a court of law.",
  "You must answer all of my questions truthfully or you will be charged with a further offence.",
];
const PER_PATROL = 3;

function incidentSpot(map: WorldMap) {
  for (let tries = 0; tries < 80; tries++) {
    const a = Math.random() * Math.PI * 2, r = (14 + Math.random() * 18) * TILE;
    const x = PLAYER.x + Math.cos(a) * r, y = PLAYER.y + Math.sin(a) * r;
    if (x < TILE * 4 || y < TILE * 4 || x > map.width - TILE * 4 || y > map.height - TILE * 4) continue;
    const ch = map.tiles[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
    if (!blocked(map, x, y) && (ch === "-" || ch === "_")) return { x, y };
  }
  return { x: PLAYER.x + TILE * 10, y: PLAYER.y };
}
const shuffled = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

export function PolicePatrol({ map, onTarget, onEnd, say }: { map: WorldMap; onTarget: (p: Place | null) => void; onEnd: () => void; say: (text: string, important?: boolean) => void }) {
  const [done, setDone] = useState(0);
  const [incident, setIncident] = useState(() => INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)]);
  const [stage, setStage] = useState<"respond" | "chase" | "grounds" | "caution" | "cuffed" | "finished">("respond");
  const [distance, setDistance] = useState(Infinity);
  const [wantedNear, setWantedNear] = useState<{ id: string; username: string; stars: number } | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [wrong, setWrong] = useState("");
  const spot = useRef(incidentSpot(map));
  const nextId = useRef(1);

  const dispatch = useCallback(() => {
    spot.current = incidentSpot(map);
    const pick = INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
    setIncident(pick);
    PATROL.suspect = { id: nextId.current++, x: spot.current.x, y: spot.current.y, name: pick.name, fleeing: false, cuffed: false, gone: false };
    setStage("respond");
  }, [map]);

  useEffect(() => {
    PATROL.active = true;
    dispatch();
    return () => { PATROL.active = false; PATROL.suspect = null; onTarget(null); };
  }, [dispatch, onTarget]);

  // Follow the suspect: map pin, distance, and the moment they spot you and run.
  useEffect(() => {
    const t = setInterval(() => {
      const s = PATROL.suspect;
      if (s && !s.gone) {
        const d = Math.hypot(PLAYER.x - s.x, PLAYER.y - s.y);
        setDistance(d);
        if (stage === "respond" && d < TILE * 7) { s.fleeing = true; setStage("chase"); say(`${s.name} has seen you and is running!`); }
        if (stage === "chase" && d < TILE * 1.15) { s.fleeing = false; setStage("grounds"); setOptions(shuffled([incident.grounds, ...shuffled(INCIDENTS.filter((i) => i.grounds !== incident.grounds)).slice(0, 2).map((i) => i.grounds)])); setWrong(""); }
      }
      onTarget(s && !s.gone && stage !== "finished" ? { id: `patrol-${s.id}`, name: `${incident.title} · ${s.name}`, kind: "job", x: s.x, y: s.y } : null);
      // Wanted players in the room, close enough to arrest.
      const near = ONLINE.map((p) => ({ ...p, stars: LAW_STATUS.get(p.id)?.stars ?? 0 }))
        .filter((p) => p.stars >= 3 && p.x !== undefined && p.y !== undefined && Math.hypot(p.x - PLAYER.x, p.y - PLAYER.y) < TILE * 1.6)[0];
      setWantedNear(near ? { id: near.id, username: near.username, stars: near.stars } : null);
    }, 150);
    return () => clearInterval(t);
  }, [stage, incident, onTarget, say]);

  const pickGrounds = (g: string) => {
    if (g !== incident.grounds) { setWrong("Those aren't the grounds for this arrest. Tell them why they're actually being arrested."); return; }
    setWrong(""); setOptions(shuffled([CAUTION, ...WRONG_CAUTIONS])); setStage("caution");
  };
  const pickCaution = (c: string) => {
    if (c !== CAUTION) { setWrong(c.startsWith("You have the right") ? "That's the American caution from TV. In England and Wales the caution is different." : "Nobody has to answer police questions. Try again."); return; }
    setWrong("");
    if (PATROL.suspect) PATROL.suspect.cuffed = true;
    setStage("cuffed");
    trackDaily({ quest: true });
    void earnWorldXp("study").then((r) => { if (r?.xp) say(`Arrest made. +${r.xp} XP`, true); notifyPlayerChanged(); }).catch(() => {});
    window.setTimeout(() => {
      if (PATROL.suspect) PATROL.suspect.gone = true;
      const count = done + 1;
      setDone(count);
      if (count >= PER_PATROL) { setStage("finished"); onTarget(null); } else dispatch();
    }, 4200);
  };
  const arrestPlayer = () => {
    if (!wantedNear) return;
    window.dispatchEvent(new CustomEvent("illumed:arrest-player", { detail: { target: wantedNear.id } }));
    say(`You arrested @${wantedNear.username}. They're being taken to custody.`, true);
    void earnWorldXp("study").catch(() => {});
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === "e" || e.key === "E") && wantedNear && !(e.target instanceof HTMLElement && e.target.closest("input, textarea"))) arrestPlayer(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <aside className="absolute top-28 left-1/2 z-[70] w-[min(380px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border-b-4 border-black/40 bg-[#1f3f8a]/95 p-4 text-white shadow-2xl">
      <p className="text-xs font-black tracking-widest uppercase">Police patrol · Special Constable · {Math.min(done + 1, PER_PATROL)}/{PER_PATROL}</p>
      {stage === "respond" && <><p className="mt-2 font-black">Control: &quot;{incident.title}. Please attend.&quot;</p><p className="mt-1 text-sm">{Math.ceil(distance / TILE)} tiles away · follow the map pin</p></>}
      {stage === "chase" && <><p className="mt-2 text-lg font-black">Foot chase! Catch {PATROL.suspect?.name}.</p><p className="mt-1 text-sm">{Math.ceil(distance / TILE)} tiles ahead · they tire after a while</p></>}
      {(stage === "grounds" || stage === "caution") && (
        <div className="mt-2">
          <p className="font-black">{stage === "grounds" ? `You've caught ${PATROL.suspect?.name}. Tell them why they're under arrest:` : "Now read them the caution:"}</p>
          <div className="mt-2 grid gap-1.5">
            {options.map((o) => <button key={o} type="button" onClick={() => (stage === "grounds" ? pickGrounds(o) : pickCaution(o))} className="rounded-xl bg-white/10 px-3 py-2 text-left text-sm font-bold hover:bg-white/20">{o}</button>)}
          </div>
          {wrong && <p role="alert" className="mt-2 rounded-xl bg-[#c8322d] px-3 py-2 text-xs font-bold">{wrong}</p>}
        </div>
      )}
      {stage === "cuffed" && <p className="mt-2 font-black">Handcuffs on. A van is taking {PATROL.suspect?.name} to custody.</p>}
      {stage === "finished" && <p className="mt-2 font-black">Patrol complete: {PER_PATROL} arrests, all by the book. Thank you, officer.</p>}
      {wantedNear && <button type="button" onClick={arrestPlayer} className="mt-3 w-full rounded-xl bg-[#c8322d] py-2.5 text-sm font-black">Arrest wanted player @{wantedNear.username} {"★".repeat(wantedNear.stars)} (E)</button>}
      <button type="button" onClick={onEnd} className={cn("mt-3 text-xs underline", stage === "finished" && "rounded-full bg-white px-4 py-2 font-black text-[#1f3f8a] no-underline")}>{stage === "finished" ? "Sign off" : "End patrol"}</button>
    </aside>
  );
}
