"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Collision-free HUD layout for the 3D world.
 *
 * Every on-screen widget is placed in one of five rails instead of being pinned to
 * its own pixel position. A rail stacks its widgets with a fixed gap, so widgets in
 * the same corner can never overlap; side rails are capped at half the screen width
 * on small screens so the left and right corners never meet either.
 *
 *   tl ─ server, tasks, train times            tr ─ developer tools, clock, camera,
 *                                                    music, live event, minimap
 *                    tc ─ level, wanted stars, statuses and hints
 *   bl ─ adverts, your needs, chat, settings,  br ─ news, actions (jump, Games,
 *        controls hint                              phone, emotes, how to play)
 *                    bc ─ interact prompt, get off / park
 *
 * Use <HudSlot area="tr" order={30}> around a widget. Lower `order` sits closer to the
 * screen edge (top for top rails, bottom for bottom rails). Outside a HudLayout the
 * widget simply renders in place, so components still work on other pages.
 */
export type HudArea = "tl" | "tr" | "tc" | "bl" | "br" | "bc" | "tr-tools" | "br-nav" | "br-act" | "bl-row";

/** Rows that live inside a rail: small buttons sit side by side instead of stacking. */
const ROWS: Record<string, { rail: HudArea; order: number; className: string }> = {
  "tr-tools": { rail: "tr", order: 25, className: "flex flex-row-reverse flex-wrap items-center justify-start gap-2" },
  "br-nav": { rail: "br", order: 10, className: "flex flex-row-reverse flex-wrap items-center justify-start gap-2" },
  "br-act": { rail: "br", order: 20, className: "flex flex-row-reverse flex-wrap items-center justify-start gap-2" },
  "bl-row": { rail: "bl", order: 30, className: "flex flex-row flex-wrap items-end gap-2" },
};

type Rails = Partial<Record<HudArea, HTMLElement | null>>;
const HudContext = createContext<Rails | null>(null);

const RAIL: Record<"tl" | "tr" | "tc" | "bl" | "br" | "bc", string> = {
  // Top rails grow downwards from the top edge; bottom rails grow upwards.
  tl: "top-3 left-3 flex-col items-start max-w-[calc(50%-1.125rem)] lg:max-w-[300px]",
  tr: "top-3 right-3 flex-col items-end max-w-[calc(50%-1.125rem)] lg:max-w-[300px] xl:max-w-[460px]",
  // Top centre (large screens; on narrow screens its items join the top-left rail).
  tc: "top-3 left-1/2 -translate-x-1/2 flex-col items-center w-max lg:max-w-[calc(100%-40rem)] xl:max-w-[calc(100%-50rem)]",
  bl: "bottom-3 left-3 flex-col-reverse items-start max-w-[calc(50%-1.125rem)] lg:max-w-[340px] pb-[env(safe-area-inset-bottom)]",
  br: "bottom-3 right-3 flex-col-reverse items-end max-w-[calc(50%-1.125rem)] lg:max-w-[360px] pb-[env(safe-area-inset-bottom)]",
  // Centre rail (large screens; on narrow screens its items join the bottom-right rail).
  bc: "left-1/2 -translate-x-1/2 bottom-3 flex-col-reverse items-center w-max lg:max-w-[calc(100%-46rem)]",
};

export function HudLayout({ children }: { children: ReactNode }) {
  const [rails, setRails] = useState<Rails>({});
  // Stable ref callbacks: one per rail, created once.
  const [refs] = useState(() =>
    Object.fromEntries(
      ([...Object.keys(RAIL), ...Object.keys(ROWS)] as HudArea[]).map((area) => [
        area,
        (el: HTMLElement | null) => setRails((prev) => (prev[area] === el ? prev : { ...prev, [area]: el })),
      ]),
    ) as Record<HudArea, (el: HTMLElement | null) => void>,
  );
  return (
    <HudContext.Provider value={rails}>
      {children}
      {(Object.keys(RAIL) as (keyof typeof RAIL)[]).map((area) => (
        <div
          key={area}
          ref={refs[area]}
          data-hud-rail={area}
          className={cn("hud-rail pointer-events-none absolute z-[100001] flex gap-2", RAIL[area])}
        >
          {Object.entries(ROWS)
            .filter(([, row]) => row.rail === area)
            .map(([id, row]) => (
              <div key={id} ref={refs[id as HudArea]} data-hud-rail={id} className={cn("hud-row max-w-full empty:hidden", row.className)} style={{ order: row.order }} />
            ))}
        </div>
      ))}
    </HudContext.Provider>
  );
}

/** Below this width the two side columns already fill the screen, so centre items join them. */
const NARROW = "(max-width: 1023px)";
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

/** Places a widget in a HUD rail. `order`: lower = nearer the screen edge. */
export function HudSlot({ area, order = 50, narrowArea, className, children }: { area: HudArea; order?: number; /** Rail to use below 1024px instead. */ narrowArea?: HudArea; className?: string; children: ReactNode }) {
  const rails = useContext(HudContext);
  const narrow = useNarrow();
  if (!rails) return <>{children}</>;
  if (narrow && narrowArea) area = narrowArea;
  // On narrow screens: top-centre statuses go under the top-left items, and
  // bottom-centre prompts sit above the bottom-right buttons.
  if (narrow && area === "tc") [area, order] = ["tl", 100 + order];
  if (narrow && area === "bc") [area, order] = ["br", 100 + order];
  const el = rails[area];
  if (!el) return null;
  return createPortal(
    <div className={cn("hud-item pointer-events-auto relative max-w-full", className)} style={{ order }}>
      {children}
    </div>,
    el,
  );
}

/** True when rendered inside a HudLayout (widgets drop their own absolute positioning). */
export function useInHud() {
  return useContext(HudContext) !== null;
}
