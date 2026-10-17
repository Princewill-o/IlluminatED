"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";

import { Bike, Bus, CarFront, DoorOpen, Gamepad2, MessageCircle, Sparkles, TrainFront } from "lucide-react";

import { type Phase, createFx, drawFx, ukPhase } from "./fx";
import { drawMap } from "./tiles";
import { WorldFigure, poseWorldFigure } from "../character";
import { ArtScenery, NPC_SPOTS, PLAYER, PLAYER_VEHICLE, TRAFFIC_BOXES, fadeArtProps } from "./art";
import { BikeUnder, StationArt } from "./transport";
import { type Connection, type Me, type RemotePlayer, useWorld } from "./use-world";
const World3D = dynamic(() => import("./world3d").then((module) => module.World3D), { ssr: false });
import MOVERS from "../../../../public/world/movers.json";
import { AvatarFigure } from "../avatar";
import type { TechEvent } from "../event-ads";
import { play, soundOn } from "../sound";

import { doActivity } from "@/components/game/world/use-needs";
import { driveStep, nearestDrivingSpot, vehicleFits, type DrivingCollision, type VehicleObstacle } from "@/game/core/driving";
import type { Pursuit } from "@/game/core/pursuit";
import { acceptRoadViolation, checkRoadViolation, createRoadCooldown, type RoadViolation } from "@/game/core/traffic-rules";
import { CAR_LENGTH } from "@/game/core/vehicles";
import { EMOTES, PHRASES, TILE, chatText, type Portal, type WorldMap, portalAt, roomAt, safeSpot, serverById, step } from "@/game/core/world";
import { cn } from "@/lib/utils";

const SPRITE_H = 64;
const SPRITE_W = 64;

/** Static scenery: painted once per map into a canvas under the players. */
const Scenery = memo(function Scenery({ map, night }: { map: WorldMap; night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawMap(ctx, map, night);
  }, [map, night]);
  return <canvas ref={ref} width={map.width} height={map.height} className="absolute top-0 left-0 [image-rendering:pixelated]" aria-hidden />;
});

function PortalMarker({ portal, near }: { portal: Portal; near: boolean }) {
  const r = portal.rect;
  // Bus stops are obvious already: only light up when you're at one.
  if (portal.to.kind === "bus" && !near) return null;
  const k = portal.to.kind;
  const Icon =
    k === "bike"
      ? Bike
      : k === "dealer"
        ? CarFront
      : k === "games"
        ? Gamepad2
        : k === "tube" || (k === "map" && portal.to.mapId.startsWith("station-"))
          ? TrainFront
          : k === "map" || k === "bus"
            ? Bus
            : k === "desk"
              ? MessageCircle
              : k === "link"
                ? Sparkles
                : DoorOpen;
  return (
    <div
      className={cn(
        "absolute rounded-md border-2 transition-colors",
        near ? "border-[#f2d9a6] bg-[#f2d9a6]/35" : "border-dashed border-white/70 bg-white/15",
      )}
      style={{ left: r.x + 2, top: r.y + 2, width: r.w - 4, height: r.h - 4 }}
    >
      <span className="absolute -top-3 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-[#0d1726]/80 text-white">
        <Icon className="size-3" aria-hidden />
      </span>
    </div>
  );
}

function Sprite({
  avatar,
  badge,
  username,
  org,
  me = false,
  hidden = false,
  innerRef,
  bubbleRef,
  bike,
  car,
}: {
  bike?: string | null;
  car?: string | null;
  avatar: Me["avatar"];
  badge: string | null;
  username: string;
  org: string | null;
  me?: boolean;
  hidden?: boolean;
  innerRef: (el: HTMLDivElement | null) => void;
  bubbleRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={innerRef} className="absolute top-0 left-0 will-change-transform" style={{ width: SPRITE_W, height: SPRITE_H }}>
      <div
        ref={bubbleRef}
        className="absolute -top-[46px] left-1/2 z-10 hidden -translate-x-1/2 rounded-2xl bg-[#f3f6fb] px-3 py-1 text-xs font-bold whitespace-nowrap text-[#0d1726] shadow-[0_3px_0_0_rgba(0,0,0,0.45)]"
      />
      <div className="td-root absolute inset-x-0 bottom-2 h-0">
        <span aria-hidden className="absolute -bottom-1 left-1/2 h-3 w-10 -translate-x-1/2 rounded-[50%] bg-black/25" />
        {bike && !car && <BikeUnder colour={bike} />}
        {car && <span className="car-sprite absolute top-0 left-1/2 block" data-car={car} />}
        <WorldFigure avatar={avatar} badge={badge} ghost={hidden || Boolean(car)} />
      </div>
      <div className="absolute top-full left-1/2 -mt-1 flex -translate-x-1/2 flex-col items-center whitespace-nowrap">
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", me ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-black/70 text-white")}>
          {me ? "You" : `@${username}`}
        </span>
        {org && <span className="mt-0.5 rounded-full bg-[#6bc6ff] px-2 py-0.5 text-[10px] font-black text-[#0d1726]">✓ {org}</span>}
      </div>
    </div>
  );
}

function Joystick({ onMove, driving = false }: { onMove: (dx: number, dy: number) => void; driving?: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / max, dy / max);
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      ref={base}
      role="application"
      aria-label={driving ? "Drive: up to accelerate, down to brake or reverse, left or right to steer" : "Move joystick"}
      className="pointer-events-auto relative size-24 touch-none rounded-full border-2 border-white/20 bg-black/40 sm:size-28"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        className="absolute top-1/2 left-1/2 size-11 rounded-full bg-[#8fb4ff] shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

const STATUS: Record<Connection, { text: string; dot: string }> = {
  connecting: { text: "Connecting…", dot: "#ffd166" },
  live: { text: "Connected", dot: "#5fd3a5" },
  reconnecting: { text: "Reconnecting…", dot: "#ffd166" },
  offline: { text: "Offline: check your Wi-Fi", dot: "#ff7a6b" },
  full: { text: "Server full", dot: "#ff7a6b" },
  error: { text: "Can't connect", dot: "#ff7a6b" },
  solo: { text: "Just you", dot: "#8fb4ff" },
};

export function WorldView({
  map,
  serverId,
  me,
  arriveAt,
  onPortal,
  onRoom,
  onChangeServer,
  onDrivingOffence,
  speed = 1,
  bike = null,
  car = null,
  ads = [],
  paused = false,
  police = null,
}: {
  paused?: boolean;
  police?: Pursuit | null;
  /** Real tech events shown on billboards around the world. */
  ads?: TechEvent[];
  /** The car you're driving, if any (sprite id from the dealership). */
  car?: string | null;
  /** Movement multiplier (hire bikes). */
  speed?: number;
  /** Colour of the bike you're riding, if any. */
  bike?: string | null;
  map: WorldMap;
  serverId: string;
  me: Me;
  arriveAt?: { x: number; y: number; heading?: number };
  onPortal: (portal: Portal) => void;
  onRoom?: (room: string | null) => void;
  onChangeServer: () => void;
  onDrivingOffence?: (offence: RoadViolation) => void;
}) {
  const policeRef = useRef(police);
  policeRef.current = police;
  const getPolice = useCallback(() => policeRef.current, []);
  const start = useRef(safeSpot(map, arriveAt?.x ?? map.spawn.x, arriveAt?.y ?? map.spawn.y));
  const world = useWorld({ mapId: map.id, serverId, me, start: start.current });
  const viewport = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const meEl = useRef<HTMLDivElement | null>(null);
  const meBubble = useRef<HTMLDivElement | null>(null);
  const els = useRef(new Map<string, HTMLDivElement>());
  const bubbles = useRef(new Map<string, HTMLDivElement>());
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const keys = useRef(new Set<string>());
  const stick = useRef({ x: 0, y: 0 });
  const target = useRef<{ x: number; y: number } | null>(null);
  /** Camera position in world px, shared with the click handler. */
  const camRef = useRef({ x: 0, y: 0 });
  /** Pre-rendered 3D maps are viewed closer up, so people are small next to buildings and cars. */
  const zoom = map.art === "london" || map.art === "highlands" ? 1.7 : map.art ? 1.35 : 1;
  const activeZoom = useRef(zoom);
  /** London and the Highlands are live 3D (Animal Crossing-style camera); rooms stay 2D. */
  const [webgl,setWebgl] = useState(false);
  const is3d = webgl;
  // Paint the lighter 2D city first so slow devices have a usable scene while
  // the separately bundled Three.js engine is fetched and prepared.
  useEffect(() => {
    const timer = window.setTimeout(() => setWebgl(true), 180);
    return () => window.clearTimeout(timer);
  }, [map.id]);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const carRef = useRef(car);
  carRef.current = car;
  const offenceCallback = useRef(onDrivingOffence);
  offenceCallback.current = onDrivingOffence;
  const roadCooldown = useRef(createRoadCooldown());
  const pos = useRef({ ...start.current, d: 1 as 1 | -1, walking: false, heading: arriveAt?.heading ?? 0, speed: 0 });
  const myChat = useRef<{ text: string; until: number } | null>(null);
  const [near, setNear] = useState<Portal | null>(null);
  const [sheet, setSheet] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<RemotePlayer | null>(null);
  const nearRef = useRef<Portal | null>(null);
  const roomRef = useRef<string | null>(null);
  const { players, reportMove, stopped, say } = world;
  const fxCanvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("day");
  const phaseRef = useRef<Phase>("day");

  // Collecting a car/parking is an explicit move. Reset momentum before resuming.
  useEffect(() => {
    const requested = arriveAt ?? pos.current;
    const candidate = { ...requested, heading: arriveAt?.heading ?? pos.current.heading, speed: 0 };
    const destination = car ? (vehicleFits(map, candidate) ? candidate : nearestDrivingSpot(map, requested)) : safeSpot(map, requested.x, requested.y);
    if (destination) Object.assign(pos.current, destination, { speed: 0, walking: false });
    keys.current.clear();
    stick.current = { x: 0, y: 0 };
    target.current = null;
  }, [map, car, arriveAt]);

  // Live UK time of day (checked every minute).
  useEffect(() => {
    const update = () => {
      phaseRef.current = ukPhase();
      setPhase(phaseRef.current);
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Keep the effects canvas the size of the viewport.
  useEffect(() => {
    const vp = viewport.current;
    const c = fxCanvas.current;
    if (!vp || !c) return;
    const fit = () => {
      c.width = vp.clientWidth;
      c.height = vp.clientHeight;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const changed = () => setTouch(query.matches || navigator.maxTouchPoints > 0);
    changed(); query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);

  const unavailable3d=useCallback(()=>setWebgl(false),[]);
  const getMe3d = useCallback(() => pos.current, []);
  const getOthers3d = useCallback(
    () => [...players.current.values()].filter((rp) => !hidden.has(rp.id)).map((rp) => ({ id: rp.id, x: rp.tx, y: rp.ty, walking: rp.walking, avatar: rp.avatar })),
    [players, hidden],
  );
  const nearPortal3d = useCallback(() => nearRef.current, []);
  const walkTo3d = useCallback((x: number, y: number) => {
    if (carRef.current) return;
    target.current = { x, y };
  }, []);
  const enter = useCallback(() => {
    if (pausedRef.current) return;
    if (nearRef.current) onPortal(nearRef.current);
  }, [onPortal]);

  // Keyboard: WASD / arrows to walk, E or Enter to go through a door.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (pausedRef.current || e.target instanceof HTMLElement && e.target.closest("button, a, [role=dialog], [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) || k === " " && carRef.current) {
        e.preventDefault();
        keys.current.add(k);
        target.current = null;
      } else if (k === "e" || k === "enter") {
        enter();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [enter]);

  // The game loop: move, collide, follow with the camera, smooth other players.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const fx = createFx(map);
    const cam = { x: NaN, y: NaN };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastStep = 0;
    let lastFade = 0;
    const anim = new Map<string, { ang: number; phase: number; walk: number }>();
    let nextChirp = performance.now() + 3000;
    let bumpUntil = 0;
    const frame = (now: number) => {
      if (document.hidden) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current) {
        keys.current.clear();
        stick.current = { x: 0, y: 0 };
        target.current = null;
        pos.current.speed = 0;
      }
      const k = keys.current;
      let dx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      let dy = (k.has("s") || k.has("arrowdown") ? 1 : 0) - (k.has("w") || k.has("arrowup") ? 1 : 0);
      if (!dx && !dy && (stick.current.x || stick.current.y)) {
        dx = stick.current.x;
        dy = stick.current.y;
      }
      if (!carRef.current && !dx && !dy && target.current) {
        dx = target.current.x - pos.current.x;
        dy = target.current.y - pos.current.y;
        if (Math.hypot(dx, dy) < 8) {
          target.current = null;
          dx = dy = 0;
        }
      }
      const p = pos.current;
      const driving = Boolean(carRef.current);
      const before = { x: p.x, y: p.y, heading: p.heading, speed: p.speed };
      let collision: DrivingCollision | undefined;
      const obstacles: VehicleObstacle[] = map.art === "london" ? [
        ...TRAFFIC_BOXES.filter((t): t is NonNullable<typeof t> => Boolean(t)),
        ...NPC_SPOTS.map((person, i) => ({ ...person, hw: 5, hh: 5, kind: "pedestrian" as const, id: `resident-${i}` })),
      ] : [];
      const driven = driving ? driveStep(map, p, { throttle: pausedRef.current ? 0 : -dy, steer: pausedRef.current ? 0 : dx, brake: pausedRef.current || k.has(" "), maxSpeed: 96 * speedRef.current }, dt,
        obstacles, (impact) => { collision = impact; }) : null;
      if (driven && map.art === "london" && !pausedRef.current) {
        const violation = checkRoadViolation(before, driven, Date.now(), { collision, pedestrians: NPC_SPOTS.map(person => ({ x: person.x / TILE, y: person.y / TILE })) });
        if (violation && acceptRoadViolation(roadCooldown.current, violation, Date.now())) {
          play("door", soundOn());
          offenceCallback.current?.(violation);
        }
      }
      const next = driven ?? step(map, p, dx, dy, dt, speedRef.current);
      const moved = next.x !== p.x || next.y !== p.y;
      if ((dx || dy) && !moved) target.current = null;
      if (dx) p.d = dx > 0 ? 1 : -1;
      if (p.walking && !moved) stopped();
      p.x = next.x;
      p.y = next.y;
      if (driven) {
        p.heading = driven.heading;
        p.speed = driven.speed;
      }
      // Traffic: step into a car or bus and you get bumped back onto the pavement.
      PLAYER.x = p.x;
      PLAYER.y = p.y;
      Object.assign(PLAYER_VEHICLE, { active: driving && map.art === "london", x: p.x, y: p.y, heading: p.heading, speed: p.speed });
      if (map.art === "london" && !driving) {
        for (const b of TRAFFIC_BOXES) {
          if (!b) continue;
          const ox = b.hw + 10 - Math.abs(p.x - b.x);
          const oy = b.hh + 6 - Math.abs(p.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          // Push out the short way, plus a shove in the direction the vehicle is going.
          const push = ox < oy ? { x: Math.sign(p.x - b.x || 1) * ox, y: 0 } : { x: 0, y: Math.sign(p.y - b.y || 1) * oy };
          const tryX = p.x + push.x + b.dx * 18;
          const tryY = p.y + push.y + b.dy * 18;
          const spot = safeSpot(map, tryX, tryY);
          p.x = spot.x;
          p.y = spot.y;
          target.current = null;
          if (now > bumpUntil) {
            bumpUntil = now + 1500;
            myChat.current = { text: "Oof! Watch the road.", until: Date.now() + 1800 };
            meEl.current?.animate([{ translate: "0 0" }, { translate: "0 -14px" }, { translate: "0 0" }, { translate: "0 -5px" }, { translate: "0 0" }], { duration: 450, easing: "ease-out", composite: "add" });
            play("door", soundOn());
          }
        }
      }
      p.walking = moved;
      // Driving: turn the car sprite to face where you're going.
      const cs = is3d ? null : meEl.current?.querySelector<HTMLElement>(".car-sprite");
      if (cs?.dataset.car) {
        const facingX = Math.cos(p.heading), facingY = Math.sin(p.heading);
        cs.dataset.dir = Math.abs(facingX) > Math.abs(facingY) ? (facingX > 0 ? "E" : "W") : facingY > 0 ? "S" : "N";
        const key = `${cs.dataset.car}-${cs.dataset.dir ?? "E"}`;
        const m = (MOVERS as Record<string, { w: number; h: number; ax: number; ay: number }>)[key];
        if (m && cs.dataset.key !== key) {
          cs.dataset.key = key;
          cs.style.backgroundImage = `url(/world/movers/${key}.webp)`;
          const scale = CAR_LENGTH / 1.8;
          cs.style.width = `${m.w}px`;
          cs.style.height = `${m.h}px`;
          cs.style.transform = `translate(${-m.ax}px, ${-m.ay}px) scale(${scale})`;
          cs.style.transformOrigin = `${m.ax}px ${m.ay}px`;
        }
      }
      reportMove(p.x, p.y, p.d, moved);

      const vp = viewport.current;
      if (!is3d && vp && layer.current) {
        const scale = Math.max(zoom, vp.clientWidth / map.width, vp.clientHeight / map.height);
        activeZoom.current = scale;
        const vw = vp.clientWidth / scale;
        const vh = vp.clientHeight / scale;
        const tx = map.width < vw ? (map.width - vw) / 2 : Math.max(0, Math.min(map.width - vw, p.x - vw / 2));
        const ty = map.height < vh ? (map.height - vh) / 2 : Math.max(0, Math.min(map.height - vh, p.y - vh / 2));
        // Smooth camera follow (snaps on the first frame).
        const k = Number.isNaN(cam.x) || reduced ? 1 : 1 - Math.exp(-dt * 7);
        cam.x = Number.isNaN(cam.x) ? tx : cam.x + (tx - cam.x) * k;
        cam.y = Number.isNaN(cam.y) ? ty : cam.y + (ty - cam.y) * k;
        layer.current.style.transform = `translate3d(${-Math.round(cam.x * scale)}px, ${-Math.round(cam.y * scale)}px, 0) scale(${scale})`;
        camRef.current = { x: cam.x, y: cam.y };
        const fctx = fxCanvas.current?.getContext("2d");
        if (fctx) fctx.setTransform(zoom, 0, 0, zoom, 0, 0);
        if (fctx && !is3d) drawFx(fctx, fx, { x: Math.round(cam.x), y: Math.round(cam.y) }, vw, vh, now, dt, { x: p.x, y: p.y, walking: moved }, phaseRef.current, reduced);
      }
      // Ambient sound: footsteps, and birdsong outdoors.
      const sound = soundOn();
      if (moved && !driving && now - lastStep > 330) {
        lastStep = now;
        play("step", sound);
      }
      if (map.kind !== "office" && phaseRef.current !== "night" && now > nextChirp) {
        nextChirp = now + 4000 + Math.random() * 7000;
        play("chirp", sound);
      }
      // Each figure turns smoothly towards where it's heading, and its walk cycle
      // advances with the distance covered, so fists swing in time with the feet.
      const place = (el: HTMLDivElement | null | undefined, key: string, x: number, y: number, vx: number, vy: number, walking: boolean) => {
        if (is3d || !el) return;
        el.style.transform = `translate3d(${x - SPRITE_W / 2}px, ${y - SPRITE_H / 2 - 4}px, 0)`;
        el.style.zIndex = String(Math.round(y));
        const a = anim.get(key) ?? { ang: Math.PI, phase: 0, walk: 0 };
        const speed = Math.hypot(vx, vy);
        if (speed > 0.05) {
          const want = Math.atan2(vx, -vy);
          let diff = want - a.ang;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          a.ang += reduced ? diff : diff * (1 - Math.exp(-dt * 14));
        }
        a.walk += ((walking ? 1 : 0) - a.walk) * (1 - Math.exp(-dt * 10));
        if (walking) a.phase += dt * 11;
        anim.set(key, a);
        poseWorldFigure(el, a.ang, reduced ? 0 : a.phase, reduced ? 0 : a.walk, reduced ? 0 : now);
      };
      place(meEl.current, "me", p.x, p.y, moved ? dx : 0, moved ? dy : 0, moved);
      if (!is3d && map.art && layer.current && now - lastFade > 120) {
        lastFade = now;
        fadeArtProps(layer.current, p.x, p.y);
      }
      const t = Date.now();
      if (meBubble.current) meBubble.current.classList.toggle("hidden", !myChat.current || myChat.current.until < t);

      const ease = 1 - Math.exp(-dt * 12);
      for (const rp of players.current.values()) {
        const ox = rp.x;
        const oy = rp.y;
        rp.x += (rp.tx - rp.x) * ease;
        rp.y += (rp.ty - rp.y) * ease;
        const walking = Math.hypot(rp.x - ox, rp.y - oy) > 0.3;
        place(els.current.get(rp.id), rp.id, rp.x, rp.y, rp.x - ox, rp.y - oy, walking);
        const b = bubbles.current.get(rp.id);
        if (b) {
          const show = rp.chat && rp.chat.until > t;
          b.classList.toggle("hidden", !show);
          if (show && b.textContent !== rp.chat!.text) b.textContent = rp.chat!.text;
        }
      }

      const portal = portalAt(map, p.x, p.y);
      if (portal?.id !== nearRef.current?.id) {
        nearRef.current = portal;
        setNear(portal);
      }
      const room = roomAt(map, p.x, p.y);
      if (room !== roomRef.current) {
        roomRef.current = room;
        onRoom?.(room);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); PLAYER_VEHICLE.active = false; };
  }, [map, players, reportMove, stopped, onRoom, zoom, is3d]);

  const sayIt = (id: string) => {
    const text = chatText(id);
    if (!text) return;
    doActivity("wave");
    myChat.current = { text, until: Date.now() + 4500 };
    if (meBubble.current) meBubble.current.textContent = text;
    say(id);
    setSheet(false);
  };

  const status = STATUS[world.status];
  const others = [...players.current.values()];

  return (
    <div
      ref={viewport}
      className="relative h-full w-full touch-none overflow-hidden bg-[#0d1726] select-none"
      onPointerDown={(e) => {
        if (carRef.current) return;
        if (e.target !== e.currentTarget && !(e.target as HTMLElement).closest("[data-world]")) return;
        const r = viewport.current!.getBoundingClientRect();
        target.current = { x: (e.clientX - r.left) / activeZoom.current + camRef.current.x, y: (e.clientY - r.top) / activeZoom.current + camRef.current.y };
      }}
    >
      <div
        ref={layer}
        data-world
        className={`absolute top-0 left-0 origin-top-left will-change-transform ${is3d ? "pointer-events-none hidden" : ""}`}
        style={{ width: map.width, height: map.height }}
      >
        {!is3d && (map.art ? <ArtScenery map={map} night={phase === "night"} /> : <Scenery map={map} night={phase === "night" && map.kind !== "office" && map.kind !== "station"} />)}
        {!is3d && map.kind === "station" && <StationArt map={map} />}
        {map.portals.map((p) => (
          <PortalMarker key={p.id} portal={p} near={near?.id === p.id} />
        ))}
        {others.map((rp) => (
          <button
            key={rp.id}
            type="button"
            className="contents"
            onClick={(e) => {
              e.stopPropagation();
              setPicked(rp);
            }}
            aria-label={`@${rp.username}`}
          >
            <Sprite
              avatar={rp.avatar}
              badge={rp.badge}
              username={rp.username}
              org={rp.org}
              hidden={hidden.has(rp.id)}
              innerRef={(el) => {
                if (el) els.current.set(rp.id, el);
                else els.current.delete(rp.id);
              }}
              bubbleRef={(el) => {
                if (el && !hidden.has(rp.id)) bubbles.current.set(rp.id, el);
                else bubbles.current.delete(rp.id);
              }}
            />
          </button>
        ))}
        <Sprite
          me
          bike={bike}
          car={car}
          avatar={me.avatar}
          badge={me.badge}
          username={me.username}
          org={me.org}
          innerRef={(el) => {
            meEl.current = el;
          }}
          bubbleRef={(el) => {
            meBubble.current = el;
          }}
        />
      </div>

      {is3d && (
        <World3D
          map={map}
          avatar={me.avatar}
          car={car}
          bike={bike}
          ads={ads}
          onUnavailable={unavailable3d}
          getMe={getMe3d}
          getOthers={getOthers3d}
          getPolice={getPolice}
          nearPortal={nearPortal3d}
          onGround={walkTo3d}
        />
      )}
      {/* The 3D renderer supplies its own lighting. Hide the retained 2D night
          tint when switching renderers so its last frame cannot cover the world. */}
      <canvas ref={fxCanvas} className={cn("pointer-events-none absolute inset-0", is3d && "hidden")} aria-hidden />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <button type="button" onClick={onChangeServer} className="pointer-events-auto min-h-11 max-w-[calc(100%-4rem)] rounded-2xl bg-black/70 px-3 py-2 text-left text-xs text-white backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8fb4ff]" aria-label={`Change server · ${map.name}`}>
          <span className="block truncate font-black">{map.name}</span>
          {map.kind !== "home" && <span className="mt-0.5 hidden text-[10px] text-white/70 sm:block">Ambient residents · computer controlled</span>}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#d8d4e0] sm:text-xs">
            <span className="size-2 rounded-full" style={{ background: status.dot }} aria-hidden />
            {status.text}
            {world.status === "live" && world.ping !== null && <span className="text-[#8d85a0]">· {world.ping} ms</span>}
            {!map.id.startsWith("office-") && <span className="text-[#8d85a0]">· {serverById(serverId)?.name}</span>}
          </span>
        </button>
        <div className="rounded-2xl bg-black/70 px-3 py-2 text-xs font-black text-white backdrop-blur" aria-live="polite">
          {others.length + 1} here
        </div>
      </div>

      {(world.status === "offline" || world.status === "reconnecting") && (
        <div className="pointer-events-none absolute inset-x-0 top-20 mx-auto w-fit rounded-full bg-[#ffd166] px-4 py-2 text-sm font-black text-[#0d1726]" role="status">
          {world.status === "offline" ? "You're offline. Keep walking, we'll sync when you're back." : "Reconnecting…"}
        </div>
      )}
      {world.status === "full" && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
          <div>
            <p className="text-xl font-black">This server is full</p>
            <button type="button" onClick={onChangeServer} className="mt-4 rounded-full bg-[#f2d9a6] px-6 py-3 font-black text-[#0d1726]">
              Pick another server
            </button>
          </div>
        </div>
      )}

      {near && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center md:bottom-8">
          <button
            type="button"
            onClick={enter}
            className="arcade-btn pointer-events-auto min-h-11 max-w-[calc(100%-7rem)] rounded-2xl bg-[#f2d9a6] px-4 py-2.5 text-center text-xs leading-snug font-black whitespace-normal text-[#0d1726] sm:max-w-md sm:rounded-full sm:px-6 sm:text-sm"
          >
            {near.label} {touch ? "" : "(E)"}
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {touch ? <div className="flex items-end gap-2"><Joystick driving={Boolean(car)} onMove={(x, y) => {
          stick.current = { x, y };
          if (x || y) target.current = null;
        }} />{car && <span className="max-w-28 rounded-lg bg-black/65 p-2 text-[10px] leading-relaxed text-white">↑ Accelerate<br />↓ Brake / reverse<br />← → Steer</span>}</div> : (
          <p className="max-w-[min(78%,30rem)] rounded-xl bg-black/60 px-3 py-2 text-[10px] text-[#d8d4e0] sm:text-xs">{car ? "W / ↑ accelerate · S / ↓ brake & reverse · A D / ← → steer · Space brake" : "WASD or arrows to walk · click to walk there · E to enter"}</p>
        )}
        <div className="pointer-events-auto relative">
          {sheet && (
            <div className="absolute right-0 bottom-16 w-64 rounded-3xl border border-white/10 bg-[#14223a] p-3 shadow-2xl">
              <div className="grid grid-cols-3 gap-1">
                {EMOTES.map((e) => (
                  <button key={e.id} type="button" onClick={() => sayIt(e.id)} className="rounded-xl bg-[#1b2c48] py-2 text-xs font-black hover:bg-[#2a2040]">
                    {e.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PHRASES.map((p) => (
                  <button key={p.id} type="button" onClick={() => sayIt(p.id)} className="rounded-full bg-[#1b2c48] px-3 py-1.5 text-xs font-bold hover:bg-[#2a2040]">
                    {p.text}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[#8d85a0]">Safe chat: set reactions and phrases only.</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSheet((s) => !s)}
            aria-expanded={sheet}
            aria-label="Emotes and phrases"
            className="grid size-11 place-items-center rounded-full bg-[#2b5fd9] text-xl shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:scale-95 sm:size-12"
          >
            <MessageCircle className="size-6 text-white" aria-hidden />
          </button>
        </div>
      </div>

      {picked && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 p-6" onClick={() => setPicked(null)}>
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#14223a] p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <AvatarFigure avatar={picked.avatar} size={140} showPet={false} className="mx-auto" />
            <p className="mt-2 text-lg font-black">@{picked.username}</p>
            {picked.org && <p className="text-sm font-bold text-[#6bc6ff]">✓ Verified · {picked.org}</p>}
            <div className="mt-4 grid gap-2">
              {picked.org && (
                <a href={`/messages/new?to=${encodeURIComponent(picked.id)}`} className="rounded-full bg-[#f2d9a6] py-2.5 font-black text-[#0d1726]">
                  Ask for advice
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(picked.id)) n.delete(picked.id);
                    else n.add(picked.id);
                    return n;
                  });
                  setPicked(null);
                }}
                className="rounded-full bg-[#1b2c48] py-2.5 font-bold"
              >
                {hidden.has(picked.id) ? "Show this player" : "Hide this player"}
              </button>
              <a href={`/contact?topic=safeguarding&about=${encodeURIComponent(picked.username)}`} className="rounded-full py-2 text-sm font-bold text-[#ff7a6b]">
                Report
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
