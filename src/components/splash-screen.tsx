"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { DotLoader, SNAKE_FRAMES } from "@/components/ui/dot-loader";

/** How long the opening screen stays up, in milliseconds. */
export const SPLASH_MS = 5000;
/**
 * "session": once per visit (a new tab or window shows it again).
 * "every-load": on every full page load and refresh.
 */
export const SPLASH_MODE: "session" | "every-load" = "session";
export const SPLASH_KEY = "illuminated:splash-seen";

/** Runs in <head> before the page paints, so returning visitors never see a flash of the splash. */
export const splashBootScript =
  SPLASH_MODE === "session"
    ? `try{if(sessionStorage.getItem(${JSON.stringify(SPLASH_KEY)}))document.documentElement.classList.add("splash-done")}catch(e){}`
    : "";

/**
 * Full-screen opening screen: the lion logo in the middle with the dot loader under it.
 * It is part of the server HTML, so it shows straight away, even on a slow connection.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("splash-done")) {
      setPhase("gone");
      return;
    }
    setReduceMotion(matchMedia("(prefers-reduced-motion: reduce)").matches);
    root.classList.add("splash-active");
    const leave = setTimeout(() => setPhase("leaving"), SPLASH_MS);
    const done = setTimeout(() => {
      setPhase("gone");
      root.classList.remove("splash-active");
      root.classList.add("splash-done");
      if (SPLASH_MODE === "session") {
        try {
          sessionStorage.setItem(SPLASH_KEY, "1");
        } catch {
          /* private mode: show again next time, no harm */
        }
      }
    }, SPLASH_MS + 400);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
      root.classList.remove("splash-active");
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      id="splash"
      role="status"
      aria-live="polite"
      className={`splash bg-background fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 transition-opacity duration-400 ${phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <span className="sr-only">Loading IlluminatED</span>
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/brand/lion-head.webp"
          alt=""
          width={96}
          height={96}
          priority
          className="splash-logo size-24 rounded-full bg-[#173c78] shadow-[0_12px_40px_-12px_rgb(23_60_120/0.55)]"
        />
        <span className="relative block h-[22px] w-[146px]">
          <Image
            src="/brand/wordmark-navy.webp"
            alt=""
            fill
            sizes="146px"
            priority
            className="splash-wordmark-light object-contain dark:hidden"
          />
          <Image
            src="/brand/wordmark-white.webp"
            alt=""
            fill
            sizes="146px"
            priority
            className="splash-wordmark-dark hidden object-contain dark:block"
          />
        </span>
      </div>
      <DotLoader
        frames={SNAKE_FRAMES}
        isPlaying={!reduceMotion}
        duration={90}
        className="gap-[3px]"
        dotClassName="splash-dot bg-foreground/15 [&.active]:bg-primary size-2"
        aria-hidden
      />
    </div>
  );
}

/** Smaller loader for pages that take a moment to load after the first visit. */
export function PageLoader() {
  return (
    <div
      role="status"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-5"
    >
      <span className="sr-only">Loading</span>
      <Image
        src="/brand/lion-head.webp"
        alt=""
        width={56}
        height={56}
        className="size-14 rounded-full bg-[#173c78]"
      />
      <DotLoader
        frames={SNAKE_FRAMES}
        duration={90}
        className="gap-[3px]"
        dotClassName="bg-foreground/15 [&.active]:bg-primary size-1.5"
        aria-hidden
      />
    </div>
  );
}
