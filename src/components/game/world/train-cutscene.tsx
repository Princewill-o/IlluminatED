"use client";

import { useEffect, useRef, useState } from "react";

import {TrainFront} from "lucide-react";
import * as THREE from "three";

import { buildCharacter, npcLook, type Character3D } from "../char3d";
import { CutsceneBrand } from "./cutscene-brand";
import { registerSceneCapture } from "./scene-continuity";

import type { Avatar } from "@/game/core/cosmetics";
import { TRAIN_JOURNEY_MS } from "@/game/core/living-world";

/**
 * Riding the Underground, close up: inside a carriage swaying through the tunnel,
 * other passengers sitting, reading and standing, and you holding the rail, until
 * the display says the next station and the train pulls in.
 */
const RIDE_MS = TRAIN_JOURNEY_MS;

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

export function TrainCutscene({ to, line, avatar, onArrive, onStudy }: { to: string; line: string; avatar: Avatar; onArrive: () => void; onStudy?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [remaining, setRemaining] = useState(RIDE_MS);
  const [view, setView] = useState<"follow"|"first"|"wide">("follow");
  const viewRef = useRef(view); viewRef.current = view;
  const [ready, setReady] = useState(false);
  const [fallback,setFallback]=useState(false);
  const controls = useRef(new Set<string>());
  const done = useRef(onArrive);
  done.current = onArrive;

  useEffect(() => {
    if (!ready) return;
    const started = Date.now();
    const clock = setInterval(()=>setRemaining(Math.max(0,RIDE_MS-(Date.now()-started))),250);
    const a = setTimeout(() => setStage(1), RIDE_MS * 0.55);
    const b = setTimeout(() => done.current(), RIDE_MS);
    return () => {
      clearInterval(clock);
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [ready]);

  useEffect(() => {
    const activeControls=controls.current;
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
    const releaseCapture=registerSceneCapture(()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL("image/jpeg",.85);});
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
    // Connected gangways lead into two further playable carriages.
    const carriages=[car];
    for(const shift of [-18,18]) { const extra=car.clone(); extra.position.x=shift; scene.add(extra);carriages.push(extra); }
    for(const x of [-9,9]){box(car,"#485264",x-.7,-.08,-.65,x+.7,0,.65);box(car,"#657084",x-.7,0,-.71,x+.7,2.1,-.66);box(car,"#657084",x-.7,0,.66,x+.7,2.1,.71);}
    // ── Passengers ──
    const passengers: Promise<void>[] = [];

    const characters: Character3D[] = [];
    let alive = true;
    const seat = (i: number, x: number, side: number, clip: string, standing = false) =>
      passengers.push(buildCharacter({...npcLook(i + 3),held:i%3===0?"held-phone":i%3===1?"held-book":"held-none"}, 1.05).then((c) => {
        if (!alive) { c.dispose(); return; }
        c.object.position.set(x, standing ? 0 : 0.28, standing ? side * 0.35 : side * 0.95);
        c.object.rotation.y = standing ? (side > 0 ? Math.PI : 0) + 0.4 : side > 0 ? Math.PI : 0;
        car.add(c.object);
        c.play(!standing&&(clip==="phone"||clip==="read")?`sit-${clip}`:clip);
        characters.push(c);
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
    seat(9, 4.2, -1, "phone", true);
    for(let i=10;i<28;i++){const shift=i<19?-18:18;seat(i,shift-6+(i%9)*1.4,i%2?1:-1,i%3===0?"phone":i%3===1?"read":"sit");}
    let player: Character3D | null = null;
    const position = { x: 1.15, z: 0.05 };
    const key = (event: KeyboardEvent, down: boolean) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) return;
      if ((event.target as HTMLElement)?.closest?.("input,textarea,[contenteditable],[role=dialog]")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (down) controls.current.add(event.code); else controls.current.delete(event.code);
    };
    const keyDown = (event: KeyboardEvent) => key(event, true);
    const keyUp = (event: KeyboardEvent) => key(event, false);
    const blur = () => controls.current.clear();
    window.addEventListener("keydown", keyDown, true);
    window.addEventListener("keyup", keyUp, true);
    window.addEventListener("blur", blur);
    // Walk along the aisle; benches, walls and carriage ends bound movement.
    passengers.push(buildCharacter(avatar, 1.1).then((c) => {
      if (!alive) { c.dispose(); return; }
      player = c;
      c.object.position.set(position.x, 0, position.z);
      c.object.rotation.y = -0.5;
      car.add(c.object);
      c.play("idle");
      characters.push(c);
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
      const keys = controls.current;
      if(document.querySelector('[role="dialog"]'))keys.clear();
      const pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected);
      const horizontal = Math.max(-1, Math.min(1, Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA")) + (Math.abs(pad?.axes[0] ?? 0) > .2 ? pad!.axes[0] : 0)));
      const vertical = Math.max(-1, Math.min(1, Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW")) + (Math.abs(pad?.axes[1] ?? 0) > .2 ? pad!.axes[1] : 0)));
      const length = Math.max(1, Math.hypot(horizontal, vertical));
      const x = THREE.MathUtils.clamp(position.x + vertical / length * dt * 2, -25.4, 25.4);
      const z = THREE.MathUtils.clamp(position.z - horizontal / length * dt * 2, -.48, .48);
      const blocked = [-18,0,18].some(shift=>[-4.4, -1.4, 1.4, 4.4].some(pole => Math.hypot(x - shift - pole, z) < .24)) || [[-4.6,.35],[4.2,-.35]].some(([px,pz])=>Math.hypot(x-px,z-pz)<.3);
      const walking = departAt !== null && !blocked && (Math.abs(x-position.x)+Math.abs(z-position.z) > .001);
      if (walking) { position.x = x; position.z = z; }
      if (player) { player.object.position.set(position.x, 0, position.z); player.play(walking ? "walk" : "idle"); if (walking) player.object.rotation.y = Math.atan2(vertical, -horizontal); }
      // Follow the player from inside the aisle, with a gentle carriage sway.
      const sway = Math.sin(now / 420) * 0.012 + Math.sin(now / 170) * 0.004;
      for(const carriage of carriages)carriage.rotation.x = departAt === null ? 0 : sway * (1 - Math.max(0, (t - 0.7) / 0.3));
      if(viewRef.current === "first") { camera.position.set(position.x+.2,1.55,position.z); camera.lookAt(position.x-3,1.4,position.z); if(player)player.object.visible=false; }
      else { if(player)player.object.visible=true; const wide=viewRef.current === "wide"; camera.position.set(Math.min(26,position.x+(wide?6:3.2)),wide?2.18:1.8+Math.sin(now/600)*.02,wide?.9:.48); camera.lookAt(position.x,.85,position.z); }
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
      for (const character of characters) character.update(dt,window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      renderer.render(scene, camera);releaseCapture.frame(renderer.domElement);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false; activeControls.clear();releaseCapture();
      window.removeEventListener("keydown", keyDown, true);
      window.removeEventListener("keyup", keyUp, true);
      window.removeEventListener("blur", blur);
      characters.forEach(c=>c.dispose());
      clearTimeout(loadFallback);
      cancelAnimationFrame(raf);
      ro.disconnect();
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
      scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:mesh.material?[mesh.material]:[]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
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
      <div className="pointer-events-none absolute left-4 top-12 z-10 rounded-2xl bg-[#f6f2e8] px-4 py-3 text-[#13203a] shadow-xl"><CutsceneBrand kind={line==="National Rail"?"rail":"underground"} compact/></div>
      <div className="pointer-events-none absolute inset-x-3 bottom-12 z-20 grid grid-cols-2 items-end gap-2 sm:flex sm:justify-between">
        <div className="pointer-events-auto rounded-2xl bg-black/75 p-3 text-xs text-white">
          <p className="mb-2 hidden sm:block">Walk · WASD / arrow keys / left stick</p>
          <div className="grid grid-cols-2 gap-1 sm:flex">{([['ArrowUp','Forward','↑'],['ArrowDown','Back','↓'],['ArrowLeft','Left','←'],['ArrowRight','Right','→']] as const).map(([key,label,arrow])=><button key={key} type="button" aria-label={label} className="min-h-11 min-w-11 touch-none rounded-lg bg-white/15 px-3 text-lg" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);controls.current.add(key);}} onPointerUp={()=>controls.current.delete(key)} onPointerCancel={()=>controls.current.delete(key)} onLostPointerCapture={()=>controls.current.delete(key)}>{arrow}</button>)}</div>
        </div>
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-black/75 p-3 text-xs text-white sm:text-sm">
          <p className="text-center font-mono">{Math.floor(Math.ceil(remaining/1000)/60)}:{String(Math.ceil(remaining/1000)%60).padStart(2,"0")} remaining</p>
          {onStudy&&<button type="button" onClick={onStudy} className="min-h-11 rounded-xl bg-[#2767df] px-3 font-bold">Study & homework</button>}
          <button type="button" onClick={()=>setView(v=>v==="follow"?"first":v==="first"?"wide":"follow")} className="min-h-11 rounded-xl border border-white/40 px-3">View · {view}</button>
        </div>
      </div>
      {fallback&&<div className="absolute inset-0 grid place-items-center bg-[#13203a] text-white"><div className="text-center"><CutsceneBrand kind={line==="National Rail"?"rail":"underground"} compact/><TrainFront className="mx-auto mt-8 size-20 text-[#a8c6ff]"/><p className="mt-5 text-xl font-bold">Travelling to {to}</p><p className="mt-2 text-sm">Your journey continues in 2D mode.</p></div></div>}
      <div className="pointer-events-none absolute inset-x-0 top-28 z-10 flex justify-center lg:top-12 px-3">
        <p className="rounded-lg bg-black/80 px-4 py-2 font-mono text-sm font-black tracking-wide text-[#ffb020]">
          {!ready ? "Getting the carriage ready…" : stage === 0 ? `This train is for ${to}` : `Next station: ${to}. Please mind the gap.`}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-black" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-black" />
    </div>
  );
}
