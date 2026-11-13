"use client";

import { CutsceneBrand, sceneBrandFor } from "./cutscene-brand";

/**
 * Motion-graphic scene change: two blue panels sweep in, the hexagon badge spins
 * in with the place name, then the panels sweep away to reveal the new scene.
 */
export function SceneWipe({ show, label }: { show: boolean; label: string }) {
  const words = label.split(/\s+/).filter(Boolean);
  return (
    <div
      aria-hidden={!show}
      className="pointer-events-none absolute inset-0 z-[100001] overflow-hidden"
    >
      <div
        className={`scene-panel scene-panel-gold ${show ? "scene-in" : ""}`}
      />
      <div className={`scene-panel scene-panel-a ${show ? "scene-in" : ""}`} />
      <div className={`scene-panel scene-panel-b ${show ? "scene-in" : ""}`} />
      <div
        className={`scene-title absolute inset-0 grid place-items-center ${show ? "scene-title-in" : ""}`}
      >
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="scene-badge">
            <CutsceneBrand kind={sceneBrandFor(label)} compact />
          </span>
          <span className="scene-eyebrow text-[11px] font-black tracking-[0.35em] text-[#f2d9a6] uppercase">
            Now entering
          </span>
          <span className="max-w-3xl text-4xl leading-[1.05] font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,.35)] sm:text-6xl">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="scene-word"
                style={{ animationDelay: `${0.22 + i * 0.06}s` }}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
          <span className="scene-underline h-1.5 w-40 rounded-full bg-[#f2d9a6]" />
        </div>
      </div>
    </div>
  );
}

export const TUTORIAL_KEY = "world-tutorial-v2";
