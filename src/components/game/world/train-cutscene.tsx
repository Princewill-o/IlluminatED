"use client";

import { useEffect, useRef, useState } from "react";

import {TrainFront} from "lucide-react";
import * as THREE from "three";

import { buildCharacter, npcLook, type Character3D } from "../char3d";
import { CutsceneBrand } from "./cutscene-brand";

import type { Avatar } from "@/game/core/cosmetics";

/**
 * Riding the Underground, close up: inside a carriage swaying through the tunnel,
 * other passengers sitting, reading and standing, and you holding the rail, until
 * the display says the next station and the train pulls in.
 */
const RIDE_MS = 2400;

function mat(c: string, emissive = false) {
  return new THREE.MeshLambertMaterial({ color: c, emissive: emissive ? c : "#000000", emissiveIntensity: emissive ? 0.9 : 0 });
}
function box(g: THREE.Object3D, c: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, emissive = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat(c, emissive));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.receiveShadow = true;
  m.castShadow = true;
  g.add(m);
  return m;
}
function textPanel(text: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0b0b10";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffb020";
  ctx.font = `bold ${Math.round(c.height * 0.55)}px monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

export function TrainCutscene({ to, line, avatar, onArrive }: { to: string; line: string; avatar: Avatar; onArrive: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallback,setFallback]=useState(false);
  const done = useRef(onArrive);
  done.current = onArrive;

  useEffect(() => {
    const a = setTimeout(() => setStage(1), RIDE_MS * 0.55);
    const b = setTimeout(() => done.current(), RIDE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setFallback(true);setReady(true);
      return;
    }
    const mobile=window.matchMedia("(pointer:coarse)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile?1.25:2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !mobile;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c0b10");
    const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
    scene.add(new THREE.HemisphereLight("#fffaf0", "#3a3f55", 1.6));
    const lamp = new THREE.DirectionalLight("#fff6e6", 0.9);
    lamp.position.set(0, 3, 1);
    lamp.castShadow = true;
    scene.add(lamp);

    // ── The carriage: long box, x along the train, z across, y up ──
    const car = new THREE.Group();
    scene.add(car);
    const L = 9;
    box(car, "#c9ced8", -L, -0.05, -1.3, L, 0, 1.3); // floor
    box(car, "#eef0f4", -L, 2.3, -1.3, L, 2.4, 1.3); // ceiling
    for (const side of [-1, 1]) {
      const z = side * 1.3;
      box(car, "#eef0f4", -L, 0, z - 0.05 * side, L, 1.1, z);
      box(car, "#eef0f4", -L, 2.02, z - 0.05 * side, L, 2.35, z);
      for(let x=-L;x<L;x+=2.2)box(car,"#eef0f4",x,1.1,z-0.05*side,x+0.65,2.02,z);
      // Bench seats with blue moquette, and the windows above them.
      box(car, "#2b4fb8", -L, 0.42, z - side * 0.55, L, 0.55, z - side * 0.05);
      box(car, "#2b4fb8", -L, 0.55, z - side * 0.12, L, 1.05, z - side * 0.04);
      for (let x = -L + 0.7; x < L-1; x += 2.2) {
        const glass=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.82,0.015),new THREE.MeshBasicMaterial({color:"#7597c0",transparent:true,opacity:0.16,depthWrite:false}));
        glass.position.set(x+0.75,1.56,z);car.add(glass);
      }
      // Red doors.
      for (const x of [-5.5, 0, 5.5]) box(car, "#d72a22", x - 0.6, 0, z - side * 0.07, x + 0.6, 2.2, z - side * 0.04);
    }
    // Yellow poles and overhead rails.
    for (const x of [-4.4, -1.4, 1.4, 4.4]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 10), mat("#ffd166"));
      pole.position.set(x, 1.15, 0);
      car.add(pole);
    }
    for (const z of [-0.55, 0.55]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2 * L, 8), mat("#ffd166"));
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 2.0, z);
      car.add(rail);
    }
    for (let x = -L + 1; x < L; x += 2) box(car, "#fffbe8", x, 2.28, -0.25, x + 1.2, 2.3, 0.25, true);
    // Display above the doors.
    const led = textPanel(`${line} line to ${to}`, 2.4, 0.22);
    led.position.set(0, 2.15, -1.22);
    car.add(led);
    const led2 = textPanel(`Next station: ${to}`, 2.4, 0.22);
    led2.position.set(0, 2.15, -1.22);
    led2.visible = false;
    car.add(led2);

    // Tunnel lights streaking past the windows (outside the carriage).
    const streaks: THREE.Mesh[] = [];
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), mat("#ffcf7a", true));
      s.position.set(-L + ((i * 1.3) % (2 * L)), 1.3 + (i % 3) * 0.25, (i % 2 ? 1 : -1) * 1.8);
      scene.add(s);
      streaks.push(s);
    }

    const platform = new THREE.Group();scene.add(platform);
    box(platform,"#c7cbd2",-L,0.03,-4,L,0.1,-1.5);
    box(platform,"#f0c84e",-L,0.1,-1.8,L,0.13,-1.55);
    for(const x of [-7,-2,3,8])box(platform,"#d8dce3",x,0,-3.4,x+0.2,2.5,-3.2);
    const arrivalSign=textPanel(to,3.2,0.35);arrivalSign.position.set(2,1.7,-3.8);platform.add(arrivalSign);
    // ── Passengers ──
    const passengers: Promise<void>[] = [];
    const mixers: THREE.AnimationMixer[] = [];
    const characters: Character3D[] = [];
    let alive = true;
    const seat = (i: number, x: number, side: number, clip: string, standing = false) =>
      passengers.push(buildCharacter(npcLook(i + 3), 1.05).then((c) => {
        if (!alive) { c.dispose(); return; }
        c.object.position.set(x, standing ? 0 : 0.28, standing ? side * 0.35 : side * 0.95);
        c.object.rotation.y = standing ? (side > 0 ? Math.PI : 0) + 0.4 : side > 0 ? Math.PI : 0;
        car.add(c.object);
        c.play(clip);
        mixers.push(c.mixer); characters.push(c);
      }).catch(() => {}));
    seat(0, -3.2, -1, "sit");
    seat(1, -2.4, -1, "sit");
    seat(2, 1.0, -1, "sit");
    seat(3, 2.8, -1, "sit");
    seat(4, -3.0, 1, "sit");
    seat(5, -1.0, 1, "sit");
    seat(6, 2.2, 1, "sit");
    seat(7, 3.4, 1, "sit");
    seat(8, -4.6, 1, "idle", true);
    seat(9, 4.2, -1, "emote-yes", true);
    // You, standing by the pole holding on.
    passengers.push(buildCharacter(avatar, 1.1).then((c) => {
      if (!alive) { c.dispose(); return; }
      c.object.position.set(1.15, 0, 0.05);
      c.object.rotation.y = -0.5;
      car.add(c.object);
      c.play("holding-right");
      mixers.push(c.mixer); characters.push(c);
    }).catch(() => {}));
    let departAt: number | null = null;
    const begin = () => { if (alive && departAt === null) { departAt = performance.now(); setReady(true); } };
    void Promise.all(passengers).then(begin);
    const loadFallback = setTimeout(begin, 10000);

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = departAt === null ? 0 : Math.min(1, (now - departAt) / RIDE_MS);
      // Slow push-in on you, with the carriage gently swaying.
      const sway = Math.sin(now / 420) * 0.012 + Math.sin(now / 170) * 0.004;
      car.rotation.x = departAt === null ? 0 : sway * (1 - Math.max(0, (t - 0.7) / 0.3));
      camera.position.set(5.1 - t * 0.3, 1.8 + Math.sin(now / 600) * 0.02, 0.35);
      camera.lookAt(0.6, 0.9, 0);
      // The tunnel rushes past, then slows as you pull in.
      const speed = departAt === null ? 0 : t < 0.18 ? 26 * (t / 0.18) : t < 0.7 ? 26 : Math.max(0, 26 * (1 - (t - 0.7) / 0.3));
      for (const s of streaks) {
        s.position.x -= speed * dt;
        if (s.position.x < -L) s.position.x += 2 * L;
      }
      platform.visible=t>0.82;
      platform.position.x=(1-t)*20;
      led.visible = t < 0.55;
      led2.visible = !led.visible;
      for (const m of mixers) m.update(dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false; characters.forEach(c=>c.dispose());
      clearTimeout(loadFallback);
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
    };
    // Built once per trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-[100005] bg-[#0c0b10]" role="status" aria-live="polite">
      <div ref={host} className="absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute left-4 top-12 z-10 rounded-2xl bg-[#f6f2e8] px-4 py-3 text-[#13203a] shadow-xl"><CutsceneBrand kind="underground"/></div>
      <button type="button" className="absolute right-3 bottom-14 z-20 min-h-11 rounded-full border border-white/40 bg-black/60 px-4 py-2 text-xs font-bold text-white" onClick={()=>done.current()}>Skip journey</button>
      {fallback&&<div className="absolute inset-0 grid place-items-center bg-[#13203a] text-white"><div className="text-center"><CutsceneBrand kind="underground"/><TrainFront className="mx-auto mt-8 size-20 text-[#a8c6ff]"/><p className="mt-5 text-xl font-bold">Travelling to {to}</p><p className="mt-2 text-sm">Your journey continues in 2D mode.</p></div></div>}
      <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center px-3">
        <p className="rounded-lg bg-black/80 px-4 py-2 font-mono text-sm font-black tracking-wide text-[#ffb020]">
          {!ready ? "Getting the carriage ready…" : stage === 0 ? `This train is for ${to}` : `Next station: ${to}. Please mind the gap.`}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-black" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-black" />
    </div>
  );
}
