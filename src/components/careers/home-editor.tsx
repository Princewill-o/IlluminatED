"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { buyFurniture, buyHome, saveLayout } from "@/app/games/careers/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { ArtScenery } from "@/components/game/world/art";
import { FURNITURE, HOMES, type Placed, ROOM, STARTER_LAYOUT, furnitureById, validLayout } from "@/game/core/homes";
import { TILE, homeMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

/** Animal Crossing-style room editing: pick something, tap where it goes, save. */
export function HomeEditor({
  owned,
  current,
  layout: saved,
  bought,
  clout,
}: {
  owned: string[];
  current: string;
  layout: Placed[];
  bought: Record<string, number>;
  clout: number;
}) {
  const [layout, setLayout] = useState<Placed[]>(saved);
  const [sel, setSel] = useState<string | null>(null); // placed key, or "new:<item>"
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const home = HOMES.find((h) => h.id === current) ?? HOMES[0];
  const map = useMemo(() => homeMap(home.style, layout), [home.style, layout]);
  const dirty = JSON.stringify(layout) !== JSON.stringify(saved);

  // What you own but haven't put out.
  const counts: Record<string, number> = {};
  for (const p of STARTER_LAYOUT) counts[p.item] = (counts[p.item] ?? 0) + 1;
  for (const [k, n] of Object.entries(bought)) counts[k] = (counts[k] ?? 0) + n;
  const spare = Object.entries(counts)
    .map(([item, n]) => [item, n - layout.filter((p) => p.item === item).length] as const)
    .filter(([, n]) => n > 0);

  const place = (tx: number, ty: number) => {
    if (!sel) return;
    const item = sel.startsWith("new:") ? sel.slice(4) : layout.find((p) => p.key === sel)?.item;
    if (!item) return;
    const key = sel.startsWith("new:") ? `${item}-${Date.now().toString(36)}` : sel;
    const next = [...layout.filter((p) => p.key !== key), { key, item, x: tx, y: ty }];
    const problem = validLayout(next);
    if (problem) return setMsg(problem);
    setMsg(null);
    setLayout(next);
    setSel(key);
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (done ?? null) : (r.error ?? "That didn't work."));
      if (r.ok) {
        notifyPlayerChanged();
        router.refresh();
      }
    });

  const selItem = sel ? furnitureById(sel.startsWith("new:") ? sel.slice(4) : (layout.find((p) => p.key === sel)?.item ?? "")) : null;
  const scale = 0.9;

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div>
        <div className="overflow-x-auto rounded-3xl border border-border bg-[#2a2233] p-2">
          <div className="relative" style={{ width: map.width * scale, height: map.height * scale }}>
            <div className="absolute top-0 left-0 origin-top-left" style={{ width: map.width, height: map.height, transform: `scale(${scale})` }}>
              <ArtScenery map={map} />
              <div className="absolute inset-0" style={{ zIndex: 5000 }}>
                {Array.from({ length: ROOM.maxY - ROOM.minY }, (_, j) =>
                  Array.from({ length: ROOM.maxX - ROOM.minX }, (_, i) => {
                    const x = ROOM.minX + i;
                    const y = ROOM.minY + j;
                    const mine = layout.find((p) => {
                      const f = furnitureById(p.item)!;
                      return x >= p.x && x < p.x + f.w && y >= p.y && y < p.y + f.h;
                    });
                    return (
                      <button
                        key={`${x},${y}`}
                        type="button"
                        aria-label={mine ? `${furnitureById(mine.item)?.name} at ${x},${y}` : `Floor ${x},${y}`}
                        onClick={() => (sel ? place(x, y) : mine && setSel(mine.key))}
                        className={cn(
                          "absolute border border-white/0 hover:border-white/60",
                          mine && sel === mine.key && "bg-[#f2d9a6]/30",
                        )}
                        style={{ left: x * TILE, top: y * TILE, width: TILE, height: TILE }}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {msg ?? (selItem ? `Tap the floor to move the ${selItem.name.toLowerCase()} (its top-left corner goes there).` : "Tap something in your room, or pick from your storage, then tap where it goes.")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sel && !sel.startsWith("new:") && (
            <button type="button" onClick={() => (setLayout(layout.filter((p) => p.key !== sel)), setSel(null))} className="rounded-full bg-secondary px-4 py-2 font-bold">
              Put in storage
            </button>
          )}
          {sel && (
            <button type="button" onClick={() => setSel(null)} className="rounded-full bg-secondary px-4 py-2 font-bold">
              Done
            </button>
          )}
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={() => act(() => saveLayout(layout), "Saved. Your room looks like this in Worlds now.")}
            className="rounded-full bg-[#f2d9a6] px-5 py-2 font-black text-[#0d1726] disabled:opacity-40"
          >
            Save room
          </button>
          {dirty && (
            <button type="button" onClick={() => setLayout(saved)} className="rounded-full px-4 py-2 font-bold text-muted-foreground">
              Undo changes
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-black">Storage</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {spare.length === 0 && <p className="text-sm text-muted-foreground">Everything you own is out.</p>}
            {spare.map(([item, n]) => (
              <button
                key={item}
                type="button"
                onClick={() => setSel(`new:${item}`)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-bold", sel === `new:${item}` ? "border-primary bg-selected" : "border-border")}
              >
                {furnitureById(item)?.name} ×{n}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-black">Furniture shop</h2>
            <span className="text-sm font-black text-ink-sun">{clout} Clout</span>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {FURNITURE.filter((f) => !f.starter).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2">
                <div>
                  <p className="font-bold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.w}×{f.h} tiles{f.link ? " · usable" : ""}
                    {bought[f.id] ? ` · own ${bought[f.id]}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending || clout < f.price}
                  onClick={() => act(() => buyFurniture(f.id), `${f.name} bought. It's in your storage.`)}
                  className="rounded-full bg-brand px-3 py-1.5 text-sm font-black text-white disabled:opacity-40"
                >
                  {f.price}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black">Move house</h2>
          <ul className="mt-2 grid gap-2">
            {HOMES.map((h) => {
              const have = owned.includes(h.id);
              return (
                <li key={h.id} className={cn("flex items-center justify-between gap-3 rounded-2xl border px-4 py-3", h.id === current ? "border-primary bg-selected" : "border-border")}>
                  <div>
                    <p className="font-bold">
                      {h.name} · {h.area}
                    </p>
                    <p className="text-sm text-muted-foreground">{h.blurb}</p>
                  </div>
                  {h.id === current ? (
                    <span className="text-sm font-black text-ink-lilac">Home</span>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || (!have && clout < h.price)}
                      onClick={() => act(() => buyHome(h.id), have ? `Moved to ${h.area}.` : `Bought! Welcome to ${h.area}.`)}
                      className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                      {have ? "Move here" : `Buy ${h.price}`}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
