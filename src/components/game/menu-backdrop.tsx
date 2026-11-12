"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Real screenshots of the current game, captured from the 3D city at different times of day.
 * Keep this list in step with public/menu-backdrop/ (tests check every file exists).
 */
export const MENU_SLIDES = [
  { src: "/menu-backdrop/westminster-day.webp", caption: "Westminster" },
  { src: "/menu-backdrop/city-centre-day.webp", caption: "City centre" },
  { src: "/menu-backdrop/south-bank-day.webp", caption: "South Bank" },
  { src: "/menu-backdrop/downtown-dusk.webp", caption: "Downtown at dusk" },
  { src: "/menu-backdrop/oxford-circus.webp", caption: "Oxford Circus station" },
  { src: "/menu-backdrop/westminster-night.webp", caption: "Westminster at night" },
  { src: "/menu-backdrop/london-eye-night.webp", caption: "The Eye at night" },
] as const;

const HOLD_MS = 7000;

/**
 * The title-screen backdrop: a slow slideshow of real gameplay. Each picture drifts and
 * zooms a little (Ken Burns) and cross-fades into the next. With reduced motion it shows
 * one still picture.
 */
export function MenuBackdrop({ className, dim = 0.5, caption = false }: { className?: string; dim?: number; caption?: boolean }) {
  const [index, setIndex] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(reduce.matches);
    const change = () => setStill(reduce.matches);
    reduce.addEventListener("change", change);
    return () => reduce.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (still) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % MENU_SLIDES.length);
    }, HOLD_MS);
    return () => window.clearInterval(timer);
  }, [still]);

  // Warm the next picture so the cross-fade never shows a blank frame.
  useEffect(() => {
    const next = new window.Image();
    next.src = MENU_SLIDES[(index + 1) % MENU_SLIDES.length].src;
  }, [index]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-[#0b1220]", className)} aria-hidden>
      {MENU_SLIDES.map((slide, i) => {
        const shown = i === index;
        // The picture fading out keeps drifting so nothing jumps mid-fade.
        const moving = !still && (shown || i === (index + MENU_SLIDES.length - 1) % MENU_SLIDES.length);
        return (
          // eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative slides, already sized WebP
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-in-out",
              shown ? "opacity-100" : "opacity-0",
              moving && (i % 2 ? "menu-kenburns-b" : "menu-kenburns-a"),
            )}
          />
        );
      })}
      <div className="absolute inset-0 bg-[#0b1220]" style={{ opacity: dim }} />
      {caption && (
        <p className="absolute right-4 bottom-3 rounded-full bg-black/40 px-3 py-1 text-[11px] font-black tracking-widest text-white/75 uppercase">
          {MENU_SLIDES[index].caption}
        </p>
      )}
    </div>
  );
}
