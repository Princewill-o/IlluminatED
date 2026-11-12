"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";

import { buildCharacter, npcLook, type Character3D } from "@/components/game/char3d";
import { ADVENTURERS } from "@/game/core/adventurers";
import { BLOCKY_OUTFITS } from "@/game/core/blocky-outfits";
import { CHARACTER_STYLES } from "@/game/core/character-styles";
import { look, type Avatar } from "@/game/core/cosmetics";
import { characterPreset } from "@/game/core/creative-looks";
import { HEROES } from "@/game/core/heroes";

/** ?set=residents | players, &clip=walk, &bg=white for transparent-style renders. */
const PLAYERS: Partial<Avatar>[] = [
  {},
  { body: "body-2", skin: "skin-6", hair: "hair-long", hairColor: "haircol-black", top: "top-dress", topColor: "topcol-pink" },
  { body: "body-2", skin: "skin-1", hair: "hair-ponytail", hairColor: "haircol-blonde", top: "top-blocky-student-lavender", bottom: "bottom-skirt", bottomColor: "botcol-navy", face: "face-round" },
  { body: "body-2", skin: "skin-4", hair: "hair-bob", hairColor: "haircol-brown", top: "top-hoodie", topColor: "topcol-teal", bottom: "bottom-joggers", held: "held-coffee" },
  { body: "body-2", skin: "skin-8", hair: "hair-braids", hairColor: "haircol-black", top: "top-blocky-business-navy", bottom: "bottom-blocky-business-navy", shoes: "shoes-blocky-business-navy" },
  { body: "body-2", skin: "skin-2", hair: "hair-buns", hairColor: "haircol-ginger", top: "top-hero-photon" },
  { body: "body-2", skin: "skin-5", hair: "hair-long", hairColor: "haircol-auburn", top: "top-stripes", bottom: "bottom-shorts", hat: "hat-cap" },
  { skin: "skin-3", hair: "hair-spiky", hairColor: "haircol-blue", top: "top-blocky-sport-coral", bottom: "bottom-blocky-sport-navy", shoes: "shoes-blocky-sport-sand", mouth: "mouth-grin" },
];

export function CharacterLineup() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const params = new URLSearchParams(location.search);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(params.get("bg") ?? "#cfe6ff");
    Object.assign(window, { __scene: scene });
    const camera = new THREE.PerspectiveCamera(28, el.clientWidth / el.clientHeight, 0.1, 100);
    const zoom = Number(params.get("zoom") ?? 1);
    camera.position.set(0, 1.0, 9.5 / zoom);
    camera.lookAt(0, 0.62, 0);
    scene.add(new THREE.HemisphereLight("#ffffff", "#8a7f70", 1.6));
    const sun = new THREE.DirectionalLight("#fff4e0", 2.4);
    sun.position.set(3, 6, 5); sun.castShadow = true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: "#e9e1d3" }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const looks = params.get("set") === "residents" ? Array.from({ length: 8 }, (_, i) => npcLook(i + Number(params.get("seed") ?? 0))) : PLAYERS.map((p) => look(p as Avatar));
    const only = params.get("only");
    const list = only ? [looks[Number(only)]] : looks;
    const chars: Character3D[] = [];
    let stop = false;
    const clip = params.get("clip") ?? "idle";
    const turn = Number(params.get("turn") ?? 0);
    void Promise.all(list.map((a, i) => buildCharacter(a, 1.22).then((c) => {
      if (stop) { c.dispose(); return; }
      c.object.position.x = (i - (list.length - 1) / 2) * 0.95;
      c.object.rotation.y = turn;
      scene.add(c.object); c.play(clip); chars.push(c);
    }))).then(() => { (window as unknown as { __ready: boolean }).__ready = true; });
    let last = performance.now();
    const loop = () => {
      if (stop) return;
      const now = performance.now();
      chars.forEach((c) => c.update((now - last) / 1000));
      last = now;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    loop();
    return () => { stop = true; chars.forEach((c) => c.dispose()); renderer.dispose(); el.innerHTML = ""; };
  }, []);
  return <div ref={ref} className="h-[100svh] w-full" />;
}

/**
 * ?mode=thumbs: exposes window.__thumb(avatar, frame, clip) → PNG data URL on a transparent
 * background, used to pre-render Locker pictures and hero portraits.
 */
export function ThumbRenderer() {
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#b8bfd1", 1.9));
    const key = new THREE.DirectionalLight("#fff4e4", 2.3); key.position.set(2.5, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight("#cfe0ff", 1.1); rim.position.set(-3, 2, -3); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    Object.assign(window, {
      __thumb: async (avatar: Avatar, frame: "full" | "head" | "top" = "full", size = 384, clip = "idle", turn = 0.35, seconds = 1.2) => {
        renderer.setSize(size, frame === "full" ? Math.round(size * 1.25) : size);
        camera.aspect = frame === "full" ? 0.8 : 1; camera.updateProjectionMatrix();
        const c = await buildCharacter(look(avatar), 1.22);
        scene.add(c.object); c.object.rotation.y = turn; c.play(clip);
        for (let t = 0; t < seconds; t += 1 / 30) c.update(1 / 30);
        if (frame === "head") { camera.position.set(0, 1.0, 2.0); camera.lookAt(0, 0.98, 0); }
        else if (frame === "top") { camera.position.set(0, 0.85, 3.3); camera.lookAt(0, 0.72, 0); }
        else { camera.position.set(0, 0.72, 3.7); camera.lookAt(0, 0.62, 0); }
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/png");
        c.dispose();
        return url;
      },
      /** Every picture the Locker and heroes page need: [file name, avatar, frame, clip]. */
      __jobs: () => [
        ...ADVENTURERS.map((m) => [m.id, { head: m.id, ...characterPreset(m.id) }, "full", "idle"]),
        ...CHARACTER_STYLES.map((st, i) => [`look-${st.id}`, { ...st.wear, body: i % 2 ? "body-2" : "body-1", hair: i % 2 ? "hair-long" : "hair-short", skin: ["skin-2", "skin-4", "skin-6", "skin-3"][i % 4], hairColor: i % 3 ? "haircol-brown" : "haircol-black" }, "full", "idle"]),
        ...BLOCKY_OUTFITS.map((o) => [o.id, { top: o.id, bottom: o.id.replace(/^top-/, "bottom-"), shoes: o.id.replace(/^top-/, "shoes-") }, "full", "idle"]),
        ...HEROES.map((h, i) => [`hero-${h.id}`, { top: `top-hero-${h.id}`, skin: ["skin-3", "skin-1", "skin-6", "skin-2", "skin-5", "skin-8"][i], hair: ["hair-short", "hair-ponytail", "hair-curly", "hair-bob", "hair-spiky", "hair-buns"][i], hairColor: ["haircol-black", "haircol-ginger", "haircol-black", "haircol-brown", "haircol-blonde", "haircol-auburn"][i], mouth: "mouth-grin" }, "full", "stretch"]),
      ],
      __ready: true,
    });
  }, []);
  return <p>Thumb renderer ready</p>;
}
