"use client";

import { useEffect, useRef, useState } from "react";

import { Bus, FastForward, MessageCircle } from "lucide-react";
import * as THREE from "three";

import { WEATHER_NOW } from "./art";
import { coachModel } from "./coach3d";
import { NpcTalk } from "./npc-talk";
import { coachInterior, ownMaterials, seatRows, seatedPerson, seeThrough } from "./vehicle-xray";
import { createWeatherFx, isSnow, surfaceWeatherShader, weatherLook } from "./weather-fx";

import { COACH_LENGTH, COACH_WIDTH, type CoachId } from "@/game/core/coaches";
import { crowdName } from "@/game/core/npc-talk";

/**
 * The journey itself, shown rather than skipped: a see-through coach or bus
 * with you and other passengers aboard, driving past the scenery (motorway
 * fields, hills and wind turbines, or London streets), with road signs counting
 * down to the destination. You can chat to the person next to you, or skip.
 */
export function VehicleJourney({ kind, from, to, miles, seconds, coach = "national-express", route = "24", onArrive }: {
  kind: "coach" | "bus";
  from: string;
  to: string;
  miles: number;
  seconds: number;
  coach?: CoachId;
  route?: string;
  onArrive: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [talking, setTalking] = useState(false);
  const done = useRef(false);
  const finish = useRef(onArrive);
  finish.current = onArrive;
  const motorway = kind === "coach" && miles > 15;

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
    catch { const t = setTimeout(() => finish.current(), 1500); return () => clearTimeout(t); }
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // Same weather as where you set off: rain, snow, storms or fog on the road too.
    const kind = WEATHER_NOW.kind, look = weatherLook(kind);
    const sky = isSnow(kind) ? "#dfe6ee" : look.storm ? "#6f7786" : look.rain ? "#a3adba" : kind === "Fog" ? "#cfd5da" : motorway ? "#a8d4f0" : "#c9dbe8";
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, kind === "Fog" ? 12 : look.rain || look.snow ? 22 : 30, kind === "Fog" ? 45 : look.rain || look.snow ? 65 : 85);
    scene.add(new THREE.HemisphereLight("#ffffff", "#7a9a5a", 1.6));
    const sun = new THREE.DirectionalLight("#fff3dc", look.storm ? .9 : look.rain ? 1.3 : 2.2); sun.position.set(8, 14, 10); scene.add(sun);
    const fx = createWeatherFx(scene, { tier: "balanced", focus: { value: new THREE.Vector3() }, bend: { value: new THREE.Vector2(0, 0) } });
    const hemiLight = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const mat = (c: string) => { let m = mats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }); m.onBeforeCompile = (sh) => surfaceWeatherShader(sh); mats.set(c, m); } return m; };
    const ink = new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide });
    const geos: THREE.BufferGeometry[] = [];
    // Low-poly pieces with the game's black outline (an inked back-face shell).
    const piece = (geo: THREE.BufferGeometry, colour: string, outline = true) => {
      geos.push(geo);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat(colour)));
      if (outline) { const o = new THREE.Mesh(geo, ink); o.scale.setScalar(1.05); g.add(o); }
      return g;
    };
    const boxG = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

    // Ground and road.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), mat(motorway ? "#7fbf5a" : "#b9b2a4"));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, motorway ? 9 : 6), mat("#4a4f5a"));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 0.6); scene.add(road);
    if (!motorway) for (const z of [-2.9, 4.1]) { const kerb = new THREE.Mesh(boxG(400, 0.14, 1.6), mat("#d9d3c6")); kerb.position.set(0, 0.07, z); scene.add(kerb); }
    const dashes: THREE.Object3D[] = [];
    for (let i = 0; i < 30; i++) {
      for (const z of motorway ? [-1.8, 2.6] : [0.6]) {
        const d = new THREE.Mesh(boxG(1.6, 0.02, 0.14), mat("#f4f1e8")); d.position.set(-60 + i * 4, 0.01, z); scene.add(d); dashes.push(d);
      }
    }

    // The vehicle, see-through, with you aboard.
    const vehicle = new THREE.Group();
    const mySeat = kind === "coach" ? { x: 0.4, y: 1.68, z: 0.5 } : { x: 1.35, y: 2.08, z: 0.45 };
    if (kind === "coach") {
      const c = coachModel(coach);
      c.add(coachInterior(COACH_LENGTH, COACH_WIDTH, 21, { x: mySeat.x, z: mySeat.z }));
      seeThrough(c, 0.4, 0.08);
      vehicle.add(c);
    } else {
      // A London double-decker built here (the city's models bend with the city camera).
      const bus = new THREE.Group();
      const part = (c: string, x: number, y: number, z: number, w: number, h: number, d: number, name = "body") => { const m = new THREE.Mesh(boxG(w, h, d), mat(c)); m.name = name; m.position.set(x, y, z); bus.add(m); return m; };
      part("#c8102e", 0, 0.75, 0, 5.8, 0.7, 1.8);
      part("#c8102e", 0, 2.55, 0, 5.8, 0.5, 1.8);
      part("#d7dbe2", 0, 2.86, 0, 5.7, 0.12, 1.7, "roof");
      part("#9fd0e8", 0, 1.5, 0, 5.8, 0.8, 1.82, "glass");
      part("#9fd0e8", 0.1, 2.05, 0, 5.6, 0.5, 1.82, "glass upper");
      part("#ffd166", 2.91, 2.55, 0, 0.04, 0.25, 1.2, "logo blind");
      for (const x of [-1.9, 1.9]) for (const z of [-0.9, 0.9]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 12), mat("#1b1622")); w.name = "wheel"; w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); bus.add(w); }
      seeThrough(bus, 0.4, 0.1);
      bus.add(seatRows({ x0: -2.3, x1: 1.4, y: 0.42, sides: [-0.45, 0.45], seatColour: "#2b4fa8", seed: 5, fill: 0.5 }));
      bus.add(seatRows({ x0: -2.4, x1: 2.1, y: 1.6, sides: [-0.45, 0.45], seatColour: "#2b4fa8", seed: 11, fill: 0.5, skip: (x, z) => z > 0 && Math.abs(x - mySeat.x) < 0.1 })); // you get the front seat upstairs
      const floors = [0.42, 1.6].map((y) => { const f = new THREE.Mesh(boxG(5.5, 0.06, 1.6), mat("#5b6270")); f.position.set(0, y, 0); return f; });
      bus.add(...floors);
      const driver = seatedPerson(3, "#1f3fa8"); driver.position.set(2.25, 0.9, 0.42); bus.add(driver);
      vehicle.add(bus);
    }
    const me = seatedPerson(4, "#ffd166"); me.position.set(mySeat.x, mySeat.y, mySeat.z); vehicle.add(me);
    // "You" marker over your seat.
    const tag = (() => {
      const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64;
      const ctx = cv.getContext("2d")!; ctx.fillStyle = "#2b5fd9"; ctx.beginPath(); ctx.roundRect(4, 8, 120, 44, 22); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("You", 64, 31);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); s.scale.set(0.9, 0.45, 1); s.renderOrder = 10; return s;
    })();
    tag.position.set(mySeat.x, mySeat.y + 1.1, mySeat.z); vehicle.add(tag);
    ownMaterials(vehicle);
    vehicle.position.set(0, 0, 2.2);
    scene.add(vehicle);

    // Scenery that streams past and wraps round.
    const scenery: { o: THREE.Object3D; span: number; spin?: THREE.Object3D }[] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tree = () => { const g = new THREE.Group(); const t = piece(boxG(0.3, 1.2, 0.3), "#6b4a2b"); t.position.y = 0.6; const top = piece(new THREE.ConeGeometry(1.1, 2.4, 6), "#3f8f4a"); top.position.y = 2.2; g.add(t, top); return g; };
    const add = (o: THREE.Object3D, x: number, z: number, span = 1, spin?: THREE.Object3D) => { o.position.x = x; o.position.z = z; scene.add(o); scenery.push({ o, span, spin }); };
    if (motorway) {
      for (let i = 0; i < 26; i++) add(tree(), -70 + rnd() * 140, -8 - rnd() * 18);
      for (let i = 0; i < 6; i++) {
        const hill = piece(new THREE.IcosahedronGeometry(9 + rnd() * 6, 1), ["#6aa84f", "#7cb85c", "#5c9a45"][i % 3], false);
        hill.scale.y = 0.45; add(hill, -80 + i * 30, -40 - rnd() * 10);
      }
      for (let i = 0; i < 4; i++) {
        const t = new THREE.Group();
        const mast = piece(new THREE.CylinderGeometry(0.15, 0.3, 9, 6), "#f2f2f2"); mast.position.y = 4.5; t.add(mast);
        const hub = new THREE.Group(); hub.position.set(0, 9, 0.35);
        for (let k = 0; k < 3; k++) { const blade = piece(boxG(0.35, 4.2, 0.08), "#f8f8f8"); blade.position.y = 2.1; const arm = new THREE.Group(); arm.rotation.z = (k * Math.PI * 2) / 3; arm.add(blade); hub.add(arm); }
        t.add(hub); add(t, -60 + i * 35, -26 - rnd() * 6, 1, hub);
      }
      for (let i = 0; i < 18; i++) for (const z of [-5.6, 6.4]) { const hedge = piece(boxG(5 + rnd() * 4, 0.9, 0.7), "#4f8a3c"); hedge.position.y = 0.45; add(hedge, -70 + i * 8, z); }
      // A bridge over the motorway now and then.
      const bridge = new THREE.Group();
      const deck = piece(boxG(3, 0.6, 26), "#c9c3b5"); deck.position.y = 5.2; bridge.add(deck);
      for (const z of [-6, 8]) { const pier = piece(boxG(1.2, 5, 1.2), "#b5ae9f"); pier.position.set(0, 2.5, z); bridge.add(pier); }
      add(bridge, 30, 0.6);
    } else {
      const fronts = ["#c96b4b", "#e8d8b8", "#8fa7c2", "#d9a84e", "#b04e4e", "#efe7d6", "#6f8f72"];
      for (let i = 0; i < 16; i++) {
        const h = 4 + rnd() * 5, w = 4 + rnd() * 2;
        const b = new THREE.Group();
        const body = piece(boxG(w, h, 4), fronts[i % fronts.length]); body.position.y = h / 2; b.add(body);
        for (let r = 0; r < Math.floor(h / 1.6); r++) for (let c = 0; c < 3; c++) { const win = new THREE.Mesh(boxG(0.7, 0.8, 0.05), mat("#2a3346")); win.position.set(-w / 2 + 0.9 + c * (w - 1.8) / 2, 1.4 + r * 1.6, 2.03); b.add(win); }
        add(b, -64 + i * 8, -6.5);
      }
      for (let i = 0; i < 12; i++) { const lamp = new THREE.Group(); const pole = piece(boxG(0.14, 3.2, 0.14), "#2b2b2e"); pole.position.y = 1.6; const head = piece(boxG(0.5, 0.2, 0.3), "#2b2b2e"); head.position.y = 3.2; lamp.add(pole, head); add(lamp, -60 + i * 10, -3.4); }
      for (let i = 0; i < 3; i++) { const box = piece(boxG(0.9, 2.4, 0.9), "#c8102e"); box.position.y = 1.2; add(box, -40 + i * 38, -4.2); }
    }

    // Road signs: blue on the motorway, white-on-black for city streets.
    const signCanvas = document.createElement("canvas"); signCanvas.width = 512; signCanvas.height = 256;
    const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
    const drawSign = (left: number) => {
      const ctx = signCanvas.getContext("2d")!;
      ctx.fillStyle = motorway ? "#1d4fa6" : "#ffffff"; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = motorway ? "#ffffff" : "#111111"; ctx.lineWidth = 10; ctx.strokeRect(12, 12, 488, 232);
      ctx.fillStyle = motorway ? "#ffffff" : "#111111"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const place = to.replace(/^The /, "").replace(/^University of /, "Uni of ");
      let size = 46; do { ctx.font = `bold ${size}px sans-serif`; size -= 2; } while (ctx.measureText(place).width > 440 && size > 24);
      ctx.fillText(place, 36, 90, 440);
      ctx.font = "bold 56px sans-serif"; ctx.fillText(`${Math.max(1, Math.round(left))} ${motorway ? "miles" : "stops"}`.replace(/^1 stops/, "Next stop").replace(/^1 miles/, "1 mile"), 36, 170);
      signTex.needsUpdate = true;
    };
    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: signTex }));
    const sign = new THREE.Group(); signBoard.position.set(0, 4.6, 0); sign.add(signBoard);
    for (const x of [-1.8, 1.8]) { const post = piece(boxG(0.18, 4.6, 0.18), "#8d93a0"); post.position.set(x, 2.3, -0.05); sign.add(post); }
    sign.position.set(26, 0, -4.4); scene.add(sign); scenery.push({ o: sign, span: 1 });
    const stops = Math.max(2, Math.round(miles));
    drawSign(motorway ? miles : stops);

    // Other traffic in the next lane.
    const others: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      const b = piece(boxG(2.4, 0.8, 1.2), ["#2b5fd9", "#e0a100", "#f4efe6"][i]); b.position.y = 0.6; car.add(b);
      const cab = piece(boxG(1.3, 0.6, 1.1), "#9fc4dc"); cab.position.set(-0.1, 1.25, 0); car.add(cab);
      car.position.set(-30 + i * 25, 0, motorway ? -1 : -1.2); scene.add(car); others.push(car);
    }

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(host);
    const speed = motorway ? 22 : 9;
    // Keep streaming scenery inside [-half, half) whichever way it drifts.
    const wrap = (x: number, half: number) => ((((x + half) % (2 * half)) + 2 * half) % (2 * half)) - half;
    const start = performance.now();
    let last = start, raf = 0, signAt = -1;
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
      const t = Math.min(1, (now - start) / (seconds * 1000));
      setProgress(t);
      const move = reduce ? 0 : speed * dt;
      for (const s of scenery) { s.o.position.x = wrap(s.o.position.x - move, 75); if (s.spin) s.spin.rotation.z += dt * 1.6; }
      for (const d of dashes) d.position.x = wrap(d.position.x - move, 60);
      for (const c of others) c.position.x = wrap(c.position.x - move * 0.35, 70);
      // Repaint the sign while it's out of view, so each one you pass shows what's left.
      const left = Math.max(1, Math.round((motorway ? miles : stops) * (1 - t)));
      if (left !== signAt && Math.abs(sign.position.x) > 16) { drawSign(left); signAt = left; }
      // A gentle chase camera alongside, so you can see in through the glass.
      const sway = reduce ? 0 : Math.sin(now / 2400) * 0.6;
      camera.position.set(-2.5 + sway, kind === "coach" ? 4.6 : 4.2, 12.5);
      camera.lookAt(0.6, kind === "coach" ? 1.6 : 1.3, 1.6);
      vehicle.position.y = reduce ? 0 : Math.abs(Math.sin(now / 160)) * 0.02;
      // Rain and snow stream past at road speed (the vehicle stays put; the world moves).
      fx.update({ kind, camera, x: 0, z: 2, dt, secs: (now - start) / 1000, night: 0, reduced: reduce, pixelRatio: renderer.getPixelRatio() * host.clientHeight / 720, indoors: false, travel: reduce ? 0 : speed });
      if (hemiLight) hemiLight.intensity = 1.6 + fx.flash * 2;
      renderer.render(scene, camera);
      if (t >= 1 && !done.current) { done.current = true; finish.current(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh || (o as THREE.Sprite).isSprite) { const mm = m.material; (Array.isArray(mm) ? mm : [mm]).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); }); } });
      fx.dispose(); geos.forEach((g) => g.dispose()); signTex.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [kind, coach, route, from, to, miles, seconds, motorway]);

  const left = Math.max(0, Math.ceil(seconds * (1 - progress)));
  const neighbour = { id: `${kind === "coach" ? "coach" : "bus"}:resident:seat-${(from + to).length % 9}`, name: crowdName((from + to).length * 3), heading: to.replace(/[^A-Za-z .'&-]/g, "").slice(0, 40) || undefined };
  return (
    <div className="absolute inset-0 z-[100015] bg-[#0b1220]" role="dialog" aria-label={`Travelling to ${to}`}>
      <div ref={mount} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
        <div className="pointer-events-auto w-full max-w-xl rounded-3xl border-b-4 border-black/30 bg-[#13203a]/90 p-4 text-white shadow-xl backdrop-blur">
          <p className="flex items-center gap-2 text-xs font-black tracking-widest text-[#9ec5ff] uppercase"><Bus className="size-4" aria-hidden /> {kind === "coach" ? "On the coach" : `Bus ${route}`} · arriving in {left}s</p>
          <div className="mt-2 flex items-center gap-3 text-sm font-black">
            <span className="shrink-0">{from}</span>
            <div className="relative h-2 flex-1 rounded-full bg-white/15">
              <div className="absolute inset-y-0 left-0 rounded-full bg-[#ffd166]" style={{ width: `${progress * 100}%` }} />
              <span className="absolute -top-1.5 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#2b5fd9]" style={{ left: `${progress * 100}%` }} aria-hidden />
            </div>
            <span className="shrink-0">{to}</span>
          </div>
          <p className="mt-1 text-xs text-white/70">{motorway ? `${Math.max(1, Math.round(miles * (1 - progress)))} miles to go · motorway` : "Through the city streets"}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-4">
        <button type="button" onClick={() => setTalking(true)} className="jelly flex min-h-11 items-center gap-2 rounded-full border-b-4 border-black/25 bg-white px-4 font-black text-[#13203a] shadow-lg"><MessageCircle className="size-4" /> Talk to the person next to you</button>
        <button type="button" onClick={() => { if (!done.current) { done.current = true; onArrive(); } }} className="jelly flex min-h-11 items-center gap-2 rounded-full border-b-4 border-black/25 bg-[#2b5fd9] px-4 font-black text-white shadow-lg"><FastForward className="size-4" /> Skip journey</button>
      </div>
      {talking && <NpcTalk person={neighbour} onClose={() => setTalking(false)} />}
    </div>
  );
}
