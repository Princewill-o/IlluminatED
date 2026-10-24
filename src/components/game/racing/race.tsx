"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, ArrowRight, Flag, Gauge, Timer, Zap } from "lucide-react";

import {
  LANES, MIN_THINK_MS, STEP_MS, WORLDS, type Kart, type RaceEvent, type RaceState, type Track, advance, applyEvent, obstacles, question, rivalEvents, rivals,
  startState,
} from "@/game/core/maths-racing";
import { createRng } from "@/game/core/rng";
import { cn } from "@/lib/utils";

/* ------------ Road geometry (pseudo-3D, OutRun style) ------------ */
const SEG = 5; // metres per road segment
const UNIT = 200; // world units per metre
const ROAD_W = 1900; // half road width in units
const CAM_H = 1000;
const DEPTH = 0.84;
const DRAW = 140;
const CAM_BACK = 4.2; // metres the camera sits behind the car

type Seg = { curve: number; y: number };
function buildRoad(track: Track, seed: number): Seg[] {
  const r = createRng((seed * 13 + track.world * 7 + track.index) >>> 0);
  const n = Math.ceil(track.length / SEG) + DRAW + 10;
  const segs: Seg[] = [];
  let curve = 0, target = 0, hill = 0, hillT = 0;
  for (let i = 0; i < n; i++) {
    if (i % 40 === 0) target = i < 12 ? 0 : (r() - 0.5) * 7;
    if (i % 55 === 0) hillT = i < 12 ? 0 : (r() - 0.5) * 60;
    curve += (target - curve) * 0.06;
    hill += (hillT - hill) * 0.05;
    segs.push({ curve, y: 0 });
    segs[i].y = (i ? segs[i - 1].y : 0) + hill;
  }
  return segs;
}

type Racer = { name: string; colour: string; state: RaceState; events: RaceEvent[]; i: number; ghost?: boolean };
const laneX = (lane: number) => (lane - (LANES - 1) / 2) * 0.64;

function drawKart(g: CanvasRenderingContext2D, x: number, y: number, w: number, body: string, trim: string, opts: { tilt?: number; boost?: boolean; ghost?: boolean; shake?: number } = {}) {
  const h = w * 0.55;
  g.save();
  g.translate(x + (opts.shake ? Math.sin(performance.now() / 30) * opts.shake : 0), y);
  g.rotate(opts.tilt ?? 0);
  if (opts.ghost) g.globalAlpha = 0.45;
  // Shadow.
  g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(0, 0, w * 0.55, h * 0.16, 0, 0, Math.PI * 2); g.fill();
  if (opts.boost) {
    for (const s of [-1, 1]) {
      const fl = g.createLinearGradient(0, -h * 0.15, 0, h * 0.5);
      fl.addColorStop(0, "#fff7b0"); fl.addColorStop(0.5, "#ff9a3d"); fl.addColorStop(1, "rgba(255,80,40,0)");
      g.fillStyle = fl; g.beginPath(); g.moveTo(s * w * 0.18 - w * 0.07, -h * 0.12); g.lineTo(s * w * 0.18 + w * 0.07, -h * 0.12); g.lineTo(s * w * 0.18, h * (0.35 + Math.random() * 0.25)); g.fill();
    }
  }
  // Wheels.
  g.fillStyle = "#15161c";
  for (const s of [-1, 1]) { g.beginPath(); g.roundRect(s * w * 0.42 - w * 0.09, -h * 0.42, w * 0.18, h * 0.38, w * 0.04); g.fill(); }
  // Body.
  g.fillStyle = body; g.beginPath(); g.roundRect(-w * 0.38, -h * 0.62, w * 0.76, h * 0.5, w * 0.12); g.fill();
  g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.roundRect(-w * 0.32, -h * 0.6, w * 0.64, h * 0.12, w * 0.06); g.fill();
  // Spoiler and trim.
  g.fillStyle = trim; g.fillRect(-w * 0.44, -h * 0.74, w * 0.88, h * 0.1);
  g.fillStyle = "#15161c"; g.fillRect(-w * 0.3, -h * 0.66, w * 0.05, h * 0.1); g.fillRect(w * 0.25, -h * 0.66, w * 0.05, h * 0.1);
  // Driver helmet.
  g.fillStyle = trim; g.beginPath(); g.arc(0, -h * 0.82, w * 0.13, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#13203a"; g.beginPath(); g.ellipse(0, -h * 0.84, w * 0.09, w * 0.045, 0, 0, Math.PI * 2); g.fill();
  // Tail lights.
  g.fillStyle = "#ff4d4d"; g.fillRect(-w * 0.33, -h * 0.3, w * 0.12, h * 0.07); g.fillRect(w * 0.21, -h * 0.3, w * 0.12, h * 0.07);
  g.restore();
}

function drawCone(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x, y, w * 0.6, w * 0.15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff7a1a"; g.beginPath(); g.moveTo(x - w * 0.45, y); g.lineTo(x + w * 0.45, y); g.lineTo(x + w * 0.1, y - w * 1.2); g.lineTo(x - w * 0.1, y - w * 1.2); g.fill();
  g.fillStyle = "#fff"; g.fillRect(x - w * 0.28, y - w * 0.62, w * 0.56, w * 0.18);
}

function drawTree(g: CanvasRenderingContext2D, x: number, y: number, w: number, world: number) {
  if (world >= 7) { // neon pylons at night
    g.fillStyle = world === 8 ? "#a58cff" : "#5ad1ff"; g.fillRect(x - w * 0.06, y - w * 2.2, w * 0.12, w * 2.2);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y - w * 2.25, w * 0.16, 0, Math.PI * 2); g.fill();
    return;
  }
  g.fillStyle = "#6b4a2b"; g.fillRect(x - w * 0.08, y - w * 0.9, w * 0.16, w * 0.9);
  const leaf = world === 3 ? "#f4f8fb" : world === 4 ? "#d9822b" : world === 5 ? "#2bb39a" : world === 2 ? "#f2a33a" : "#2f9e44";
  g.fillStyle = leaf;
  if (world === 5) { for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.ellipse(x + Math.sin(a) * w * 0.4, y - w * 1.0, w * 0.45, w * 0.12, a, 0, Math.PI * 2); g.fill(); } return; }
  g.beginPath(); g.moveTo(x - w * 0.6, y - w * 0.7); g.lineTo(x + w * 0.6, y - w * 0.7); g.lineTo(x, y - w * 2.1); g.fill();
}

export interface RaceResult { events: RaceEvent[]; time: number; right: number; wrong: number; place: number; order: { name: string; time: number | null; me?: boolean }[] }

/**
 * One race. Answer questions (keys 1–4 or tap) to boost; dodge cones with ←/→.
 * The simulation steps in fixed 50 ms ticks, exactly like the server replay.
 */
export function Race({ track, seed, kart, ghost, onDone, onQuit, livePlayers, startsAt, onProgress }: {
  track: Track; seed: number; kart: Kart;
  ghost?: { name: string; events: RaceEvent[] } | null;
  onDone: (r: RaceResult) => void; onQuit: () => void;
  livePlayers?: { name: string; state: RaceState }[];
  startsAt?: number;
  onProgress?: (t: number, events: RaceEvent[]) => void;
}) {
  const world = WORLDS[track.world - 1];
  const canvas = useRef<HTMLCanvasElement>(null);
  const me = useRef<RaceState>(startState());
  const events = useRef<RaceEvent[]>([]);
  const road = useMemo(() => buildRoad(track, seed), [track, seed]);
  const cones = useMemo(() => obstacles(track, seed), [track, seed]);
  const others = useRef<Racer[]>([]);
  const [count, setCount] = useState(3);
  const [hud, setHud] = useState({ q: 0, place: 1, speed: 0, t: 0, lock: 0, streak: 0, boost: false });
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const done = useRef(false);
  const visualLane = useRef(1);
  const network = useRef({ livePlayers, onProgress });
  network.current = { livePlayers, onProgress };

  useEffect(() => {
    if (!startsAt) return;
    const update = () => setCount(Math.max(0, Math.ceil((startsAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [startsAt]);

  useEffect(() => {
    if (network.current.livePlayers) { others.current = []; return; }
    others.current = ghost
      ? [{ name: ghost.name, colour: "#9ec5ff", state: startState(), events: [...ghost.events].sort((a, b) => a.t - b.t), i: 0, ghost: true }]
      : rivals(track, seed).map((rv, i) => ({ name: rv.name, colour: rv.colour, state: startState(), events: rivalEvents(track, seed, rv, i), i: 0 }));
  }, [track, seed, ghost]);

  // Countdown.
  useEffect(() => {
    if (count <= 0 || startsAt) return;
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [count, startsAt]);

  const input = useCallback((e: RaceEvent) => {
    if (count > 0 || done.current) return;
    const s = me.current;
    const stamped = { ...e, t: s.t } as RaceEvent;
    if (stamped.kind === "answer" && s.t - s.lastAnswerAt < MIN_THINK_MS) return;
    events.current.push(stamped);
    const q = stamped.kind === "answer" ? question(world, seed, s.q, track.difficulty) : null;
    const ok = applyEvent(s, stamped, track, seed);
    if (q && ok !== null) setFlash({ ok, text: ok ? (s.streak >= 3 ? `Streak ×${s.streak}! Turbo boost!` : "Correct! Boost!") : `Not quite: ${q.explain}` });
  }, [count, seed, track, world]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(ev.key)) input({ t: 0, kind: "answer", choice: Number(ev.key) - 1 });
      if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") { ev.preventDefault(); input({ t: 0, kind: "lane", dir: -1 }); }
      if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") { ev.preventDefault(); input({ t: 0, kind: "lane", dir: 1 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), flash.ok ? 900 : 2200); return () => clearTimeout(t); }, [flash]);

  // Main loop: fixed-step simulation + render.
  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    let raf = 0, last = performance.now(), acc = 0, hudAt = 0, sentAt = 0;
    const resize = () => { const r = c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = r.width * dpr; c.height = r.height * dpr; };
    resize();
    window.addEventListener("resize", resize);
    const stepOthers = (t: number) => {
      if (network.current.livePlayers) {
        others.current = network.current.livePlayers.map((p, i) => ({ name: p.name, colour: ["#9ec5ff", "#ffd23f", "#ff7a6b", "#5fd3a5", "#c7a5ff"][i % 5], state: p.state, events: [], i: 0 }));
        return;
      }
      for (const o of others.current) {
        while (o.i < o.events.length && o.events[o.i].t <= o.state.t) applyEvent(o.state, o.events[o.i++], track, seed);
        if (o.state.t < t) advance(o.state, STEP_MS, track, cones);
      }
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, now - last); last = now;
      const s = me.current;
      if (count <= 0 && !done.current) {
        acc += dt;
        while (acc >= STEP_MS && s.finishedAt === null) { acc -= STEP_MS; advance(s, STEP_MS, track, cones); stepOthers(s.t); }
        if (s.finishedAt !== null && !done.current) {
          done.current = true;
          // Let the others finish (simulated instantly) to rank everyone.
          if (!network.current.livePlayers) for (const o of others.current) { let guard = 0; while (o.state.finishedAt === null && guard++ < 20000) { while (o.i < o.events.length && o.events[o.i].t <= o.state.t) applyEvent(o.state, o.events[o.i++], track, seed); advance(o.state, STEP_MS, track, cones); } }
          network.current.onProgress?.(s.t, [...events.current]);
          const order = [{ name: "You", time: s.finishedAt, me: true }, ...others.current.map((o) => ({ name: o.name, time: o.state.finishedAt }))].sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9));
          const place = order.findIndex((o) => "me" in o && o.me) + 1;
          setTimeout(() => onDone({ events: events.current, time: s.finishedAt!, right: s.right, wrong: s.wrong, place, order }), 900);
        }
      }
      visualLane.current += (s.lane - visualLane.current) * Math.min(1, dt / 90);
      if (count <= 0 && !done.current && now - sentAt > 1000) { sentAt = now; network.current.onProgress?.(s.t, [...events.current]); }
      render(g, c.width, c.height, s, now);
      if (now - hudAt > 120) {
        hudAt = now;
        const place = 1 + others.current.filter((o) => o.state.distance > s.distance).length;
        setHud({ q: s.q, place, speed: Math.round(s.speed * 3.6 * 2), t: s.t, lock: Math.max(0, MIN_THINK_MS - (s.t - s.lastAnswerAt)), streak: s.streak, boost: s.t < s.boostUntil });
      }
    };
    const render = (g: CanvasRenderingContext2D, W: number, H: number, s: RaceState, now: number) => {
      const horizon = H * 0.42;
      // Sky and far hills.
      const sky = g.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, world.sky[0]); sky.addColorStop(1, world.sky[1]);
      g.fillStyle = sky; g.fillRect(0, 0, W, horizon + 2);
      if (track.world >= 7) { g.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 40; i++) { const x = ((i * 977) % W), y = ((i * 431) % (horizon * 0.8)); g.fillRect(x, y, 2, 2); } }
      const base = Math.floor(s.distance / SEG);
      const curveSum = road.slice(0, base).reduce((a, sg) => a + sg.curve, 0);
      const par = (curveSum * 0.9) % W;
      for (const [k, col, amp] of [[0.25, "rgba(255,255,255,.35)", 0.16], [0.5, world.ground, 0.1]] as const) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, horizon);
        for (let x = 0; x <= W; x += W / 24) g.lineTo(x, horizon - (Math.sin((x + par * k) / (W * 0.12)) * 0.5 + 0.6) * H * amp);
        g.lineTo(W, horizon); g.fill();
      }
      g.fillStyle = world.ground; g.fillRect(0, horizon, W, H - horizon);

      // Project segments.
      const camZ = s.distance - CAM_BACK;
      const baseSeg = Math.max(0, Math.floor(camZ / SEG));
      const camX = laneX(visualLane.current) * ROAD_W * 0.8;
      const camY = (road[baseSeg]?.y ?? 0) + CAM_H;
      let x = 0, dx = -(road[baseSeg]?.curve ?? 0) * ((camZ % SEG) / SEG);
      let maxY = H;
      const proj: { X: number; Y: number; Wd: number; s: number; clip: number; i: number }[] = [];
      const project = (z: number, wx: number, wy: number) => { const sc = DEPTH / Math.max(0.01, z); return { X: W / 2 + sc * (wx - camX) * W / 2, Y: horizon - sc * (wy - camY) * H / 2, Wd: sc * ROAD_W * W / 2, s: sc }; };
      let prev = project(Math.max(UNIT, (baseSeg * SEG - camZ) * UNIT), 0, road[baseSeg]?.y ?? 0);
      for (let n = 1; n < DRAW; n++) {
        const i = baseSeg + n;
        const sg = road[i]; if (!sg) break;
        x += dx; dx += sg.curve;
        const z = (i * SEG - camZ) * UNIT;
        const p = project(z, x, sg.y);
        proj.push({ ...p, clip: maxY, i });
        if (p.Y < maxY) {
          const stripe = Math.floor(i / 3) % 2 === 0;
          const fog = Math.min(1, n / DRAW);
          g.globalAlpha = 1;
          g.fillStyle = stripe ? world.ground : shade(world.ground, -0.08);
          g.fillRect(0, p.Y, W, prev.Y - p.Y + 1);
          quad(g, prev.X, prev.Y, prev.Wd * 1.12, p.X, p.Y, p.Wd * 1.12, stripe ? "#ffffff" : "#e5484d");
          quad(g, prev.X, prev.Y, prev.Wd, p.X, p.Y, p.Wd, stripe ? world.road : shade(world.road, 0.05));
          if (stripe) for (const l of [-1 / 3, 1 / 3]) quad(g, prev.X + prev.Wd * l * 2 * 0.98, prev.Y, prev.Wd * 0.02, p.X + p.Wd * l * 2 * 0.98, p.Y, p.Wd * 0.02, "rgba(255,255,255,.75)");
          if (i * SEG >= track.length && i * SEG < track.length + SEG * 2) {
            const cells = 10;
            for (let k = 0; k < cells; k++) quad(g, prev.X - prev.Wd + (prev.Wd * 2 * (k + 0.5)) / cells, prev.Y, prev.Wd / cells, p.X - p.Wd + (p.Wd * 2 * (k + 0.5)) / cells, p.Y, p.Wd / cells, (k + Math.floor(i)) % 2 ? "#111" : "#fff");
          }
          if (fog > 0.55) { g.fillStyle = world.sky[1]; g.globalAlpha = (fog - 0.55) * 1.4; g.fillRect(0, p.Y, W, prev.Y - p.Y + 1); g.globalAlpha = 1; }
          maxY = p.Y;
        }
        prev = p;
      }
      // Sprites, far to near.
      const sprites: { d: number; draw: () => void }[] = [];
      for (const pr of proj) {
        if (pr.i % 6 === 0) for (const side of [-1, 1]) {
          const sx = pr.X + side * pr.Wd * (1.45 + ((pr.i * 7) % 5) * 0.12);
          sprites.push({ d: pr.i, draw: () => { if (pr.Y < pr.clip + 2) drawTree(g, sx, pr.Y, pr.Wd * 0.32, track.world); } });
        }
      }
      for (const cone of cones) {
        const i = Math.floor(cone.d / SEG);
        const pr = proj.find((q) => q.i === i);
        if (!pr) continue;
        sprites.push({ d: i, draw: () => { if (pr.Y < pr.clip + 2) drawCone(g, pr.X + laneX(cone.lane) * pr.Wd, pr.Y, pr.Wd * 0.13); } });
      }
      for (const o of others.current) {
        const i = Math.floor(o.state.distance / SEG);
        const pr = proj.find((q) => q.i === i);
        if (!pr || o.state.distance < camZ + 2) continue;
        sprites.push({ d: i, draw: () => { if (pr.Y < pr.clip + 2) drawKart(g, pr.X + laneX(o.state.lane) * pr.Wd, pr.Y, pr.Wd * 0.4, o.colour, "#ffffff", { ghost: o.ghost, boost: o.state.t < o.state.boostUntil }); } });
      }
      sprites.sort((a, b) => b.d - a.d).forEach((sp) => sp.draw());
      // The player's kart.
      const near = proj.find((q) => q.i === Math.floor(s.distance / SEG) + 0) ?? proj[0];
      const kw = W * 0.2;
      const ky = H * 0.93;
      const kx = near ? near.X + laneX(visualLane.current) * near.Wd : W / 2;
      drawKart(g, Math.max(kw / 2, Math.min(W - kw / 2, kx)), ky, kw, kart.body, kart.trim, { tilt: (s.lane - visualLane.current) * 0.25, boost: s.t < s.boostUntil, shake: s.t < s.hitUntil ? W * 0.004 : 0 });
      // Speed lines when boosting.
      if (s.t < s.boostUntil) {
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2;
        for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + now / 300; const r0 = W * 0.35, r1 = W * 0.6; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, H * 0.55 + Math.sin(a) * r0 * 0.5); g.lineTo(W / 2 + Math.cos(a) * r1, H * 0.55 + Math.sin(a) * r1 * 0.5); g.stroke(); }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [count, cones, kart, onDone, road, seed, track, world]);

  const q = question(world, seed, hud.q, track.difficulty);
  const placeText = ["1st", "2nd", "3rd", "4th", "5th", "6th"][hud.place - 1];
  const total = others.current.length + 1;
  const progress = Math.min(1, me.current.distance / track.length);

  return (
    <div className="race-root relative flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] bg-[#0b0f17] select-none">
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label={`${track.name}: a race`} />
        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 text-white">
          <div className="rounded-2xl bg-black/45 px-3 py-2 backdrop-blur">
            <p className="text-3xl leading-none font-black italic">{placeText}<span className="text-base text-white/70"> / {total}</span></p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-white/80"><Timer className="size-3.5" aria-hidden />{(hud.t / 1000).toFixed(1)}s</p>
          </div>
          <div className="mx-2 mt-2 hidden h-3 flex-1 rounded-full bg-black/35 sm:block" aria-hidden>
            <div className="relative h-full rounded-full bg-white/80" style={{ width: `${progress * 100}%` }} />
            {others.current.map((o) => <span key={o.name} className="absolute -mt-3 size-3 rounded-full border-2 border-white" style={{ marginLeft: `calc(${Math.min(1, o.state.distance / track.length) * 100}% - 6px)`, background: o.colour }} />)}
            <span className="absolute -mt-3.5 grid size-4 place-items-center rounded-full border-2 border-white" style={{ marginLeft: `calc(${progress * 100}% - 8px)`, background: kart.body }} />
            <Flag className="absolute -mt-4 size-4 text-white" style={{ right: 0 }} />
          </div>
          <div className="rounded-2xl bg-black/45 px-3 py-2 text-right backdrop-blur">
            <p className="flex items-center justify-end gap-1 text-2xl leading-none font-black italic"><Gauge className="size-5" aria-hidden />{hud.speed}<span className="text-xs">km/h</span></p>
            {hud.streak >= 2 && <p className="mt-1 flex items-center justify-end gap-1 text-xs font-black text-[#ffe066]"><Zap className="size-3.5" aria-hidden /> Streak ×{hud.streak}</p>}
          </div>
        </div>
        {count > 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><p key={count} className="race-count text-[22vmin] font-black text-white italic drop-shadow-[0_8px_0_rgba(0,0,0,.35)]">{count}</p></div>}
        {count === 0 && hud.t < 700 && <div className="pointer-events-none absolute inset-0 grid place-items-center"><p className="race-count text-[18vmin] font-black text-[#ffe066] italic drop-shadow-[0_8px_0_rgba(0,0,0,.35)]">GO!</p></div>}
        {flash && <p role="status" className={cn("pointer-events-none absolute top-20 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-black text-white shadow-lg", flash.ok ? "bg-[#15987f]" : "bg-[#e5484d]")}>{flash.text}</p>}
        {/* Lane buttons for touch */}
        <button type="button" aria-label="Move left" onClick={() => input({ t: 0, kind: "lane", dir: -1 })} className="absolute bottom-3 left-3 grid size-12 place-items-center rounded-full bg-black/40 text-white backdrop-blur active:scale-95"><ArrowLeft className="size-6" aria-hidden /></button>
        <button type="button" aria-label="Move right" onClick={() => input({ t: 0, kind: "lane", dir: 1 })} className="absolute right-3 bottom-3 grid size-12 place-items-center rounded-full bg-black/40 text-white backdrop-blur active:scale-95"><ArrowRight className="size-6" aria-hidden /></button>
        <button type="button" onClick={onQuit} className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white sm:top-auto sm:bottom-3">Quit race</button>
      </div>
      {/* Question */}
      <div className="bg-[#13203a] p-3 text-white sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black tracking-widest text-[#9ec5ff] uppercase">{world.topic} · Q{hud.q + 1}</p>
          <p className="hidden text-xs text-white/50 sm:block">Keys 1–4 to answer · ←/→ to dodge cones</p>
        </div>
        <p className="mt-1 text-xl font-black sm:text-2xl">{q.prompt}</p>
        <div className="relative mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {q.options.map((o, i) => (
            <button key={`${hud.q}-${i}`} type="button" disabled={count > 0 || hud.lock > 0} onClick={() => input({ t: 0, kind: "answer", choice: i })}
              className="race-answer rounded-2xl border-b-4 border-black/30 bg-white px-3 py-3 text-left text-base font-black text-[#13203a] transition active:translate-y-0.5 disabled:opacity-60">
              <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-[#13203a] text-xs text-white">{i + 1}</span>{o}
            </button>
          ))}
          {hud.lock > 0 && count === 0 && <span className="absolute -top-1 left-0 h-1 rounded-full bg-[#ffe066]" style={{ width: `${(hud.lock / MIN_THINK_MS) * 100}%` }} aria-hidden />}
        </div>
      </div>
    </div>
  );
}

function quad(g: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, colour: string) {
  g.fillStyle = colour;
  g.beginPath(); g.moveTo(x1 - w1, y1 + 1); g.lineTo(x1 + w1, y1 + 1); g.lineTo(x2 + w2, y2); g.lineTo(x2 - w2, y2); g.closePath(); g.fill();
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
