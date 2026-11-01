"use client";

import { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import Image from "next/image";
import { blockyThumbnail } from "@/game/core/adventurers";

import { buildCharacter, type Character3D } from "./char3d";

import type { Avatar } from "@/game/core/cosmetics";

export type CharacterAnimation = "idle" | "walk" | "run" | "jump" | "fall" | "wave" | "punch" | "death" | "cheer" | "dance";

/**
 * The Locker stage: your exact 3D character (same model as in the world),
 * on a turntable. Drag to spin; walk and wave play the real animations.
 */
export function Character3DPreview({
  avatar,
  clip,
  facing,
  className,
  workplaceLogo = null,
}: {
  avatar: Avatar;
  clip: CharacterAnimation;
  facing: "S" | "N" | "E" | "W";
  className?: string;
  workplaceLogo?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const state = useRef<{
    char: Character3D | null;
    spin: number;
    drag: number | null;
    clip: string;
  }>({ char: null, spin: 0, drag: null, clip });
  state.current.clip = clip;
  const key = JSON.stringify(avatar);

  useEffect(() => {
    state.current.spin = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[
      facing
    ];
  }, [facing]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setReady(false); setFailed(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.25, 4.4);
    camera.lookAt(0, 0.62, 0);
    scene.add(new THREE.HemisphereLight("#ffffff", "#b7c3dd", 1.8));
    const lamp = new THREE.DirectionalLight("#fff4e4", 1.6);
    lamp.position.set(2, 4, 3);
    lamp.castShadow = true;
    scene.add(lamp);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 40),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const turntable = new THREE.Group();
    scene.add(turntable);
    let alive = true;
    const previewState = state.current;
    previewState.char = null;
    let loadedCharacter: Character3D | null = null;
    void buildCharacter(JSON.parse(key) as Avatar, 1.25, workplaceLogo).then(
      (c) => {
        if (!alive) { c.dispose(); return; }
        turntable.add(c.object);
        loadedCharacter = c;
        state.current.char = c;
        setReady(true);
      },
      () => { if (alive) setFailed(true); },
    );
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
    const down = (e: PointerEvent) => {
      state.current.drag = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (state.current.drag === null) return;
      state.current.spin += (e.clientX - state.current.drag) * 0.012;
      state.current.drag = e.clientX;
    };
    const up = () => (state.current.drag = null);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    let raf = 0;
    let last = performance.now();
    let played = "";
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = state.current;
      if (st.char) {
        const want = st.clip;
        if (want !== played) {
          st.char.play(want);
          played = want;
        }
        st.char.update(dt, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }
      turntable.rotation.y +=
        (st.spin - turntable.rotation.y) * Math.min(1, dt * 8);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      loadedCharacter?.dispose();
      if (previewState.char === loadedCharacter) previewState.char = null;
      floor.geometry.dispose(); floor.material.dispose();
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      renderer.dispose();
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
    };
  }, [key, workplaceLogo, retry]);

  return (
    <div
      ref={host}
      className={`relative ${className ?? ""}`}
      style={{ touchAction: "pan-y", cursor: "grab" }}
      aria-label="Your character in 3D. Drag to turn."
      role="img"
    >
      {!ready && <Image src={blockyThumbnail(avatar.head)} alt="" fill sizes="340px" className="pointer-events-none object-contain p-5" priority />}
      {!ready && <div className="absolute inset-x-3 top-2 z-10 text-center text-xs font-bold text-[#13203a]" role="status">{failed ? <>3D preview unavailable. <button type="button" onClick={()=>setRetry(n=>n+1)} className="underline">Try again</button></> : 'Loading your character…'}</div>}
    </div>
  );
}
