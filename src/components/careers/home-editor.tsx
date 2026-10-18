"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FurnitureThumbnail } from "./furniture-thumbnail";

import { buyFurniture, buyHome, saveLayout } from "@/app/games/careers/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { HomeFloorPlan } from "@/components/game/world/home-floor-plan";
import type { Avatar } from "@/game/core/cosmetics";
import { FURNITURE, HOMES, type Placed, ROOM, STARTER_LAYOUT, furnitureById, furnitureCollection, validLayout } from "@/game/core/homes";
import { TILE, homeMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

const World3D = dynamic(() => import("@/components/game/world/world3d").then(module => module.World3D), { ssr: false });
const emptyOthers = () => [];
const noPortal = () => null;
const editorPlayer = () => ({ x: 10 * TILE, y: 8 * TILE, walking: false });

/** Animal Crossing-style room editing: pick something, tap where it goes, save. */
export function HomeEditor({
  claimed,
  avatar,
  owned,
  current,
  layout: saved,
  bought,
  clout,
  embedded = false,
  onClose,
}: {
  embedded?: boolean;
  onClose?: () => void;
  claimed: boolean;
  avatar: Avatar;
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
  const [fallback, setFallback] = useState(false);
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState<"shop" | "storage" | "houses">("shop");
  const [exitPrompt, setExitPrompt] = useState(false);
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
    if (pending) return;
    if (!sel) return;
    const item = sel.startsWith("new:") ? sel.slice(4) : layout.find((p) => p.key === sel)?.item;
    if (!item) return;
    if (sel.startsWith("new:") && !spare.some(([id, n]) => id === item && n > 0)) return setMsg("That item is already in your room.");
    const key = sel.startsWith("new:") ? `${item}-${Date.now().toString(36)}` : sel;
    const next = [...layout.filter((p) => p.key !== key), { key, item, x: tx, y: ty }];
    const problem = validLayout(next);
    if (problem) return setMsg(problem);
    setMsg(null);
    setLayout(next);
    setSel(key);
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (done ?? null) : (r.error ?? "That didn't work."));
      if (r.ok) {
        notifyPlayerChanged();
        router.refresh();
        after?.();
      }
    });

  const selItem = sel ? furnitureById(sel.startsWith("new:") ? sel.slice(4) : (layout.find((p) => p.key === sel)?.item ?? "")) : null;
  const unavailable = useCallback(() => setFallback(true), []);
  const selectFloor = (px: number, py: number) => {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (sel) place(x, y);
    else {
      const item = [...layout].reverse().find(p => {
        const f = furnitureById(p.item)!;
        return x >= p.x && x < p.x + f.w && y >= p.y && y < p.y + f.h;
      });
      if (item) setSel(item.key);
    }
  };
  const floorClick = useRef(selectFloor);
  floorClick.current = selectFloor;
  const onGround = useCallback((x: number, y: number) => floorClick.current(x, y), []);
  const focusControl = useCallback((element: HTMLButtonElement | null) => { element?.focus(); }, []);
  const scale = 0.9;

  const close = () => { if (pending) return; if (dirty) { setMsg(null); setExitPrompt(true); } else onClose?.(); };
  if (embedded) return (
    <div role="dialog" aria-modal="true" aria-label="Build and buy" style={{ color: "#203b38", backgroundColor: "#e7dfd0", colorScheme: "light" }} className="arcade absolute inset-0 z-[100020] overflow-hidden bg-[#e7dfd0] text-[#203b38]" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (exitPrompt) setExitPrompt(false); else close(); }
      if (event.key === "Tab") {
        const scope = exitPrompt ? event.currentTarget.querySelector('[aria-label="Unsaved room changes"]') ?? event.currentTarget : event.currentTarget;
        const controls = Array.from(scope.querySelectorAll<HTMLElement>("button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]")).filter(control => control.offsetParent !== null);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="absolute inset-x-0 top-0 bottom-[240px] sm:bottom-[220px]">
        {!fallback ? <World3D overview map={map} avatar={avatar} car={null} getMe={editorPlayer} getOthers={emptyOthers} nearPortal={noPortal} onGround={onGround} onUnavailable={unavailable} />
          : <div className="absolute inset-0 overflow-auto"><div className="relative" style={{width:map.width,height:map.height}}><HomeFloorPlan map={map}/><div className="absolute inset-0">{Array.from({length:18*11},(_,i)=>{const x=1+i%18,y=2+Math.floor(i/18);return <button key={i} type="button" aria-label={`Place or select at ${x},${y}`} onClick={()=>selectFloor(x*TILE,y*TILE)} className="absolute border border-white/10 hover:bg-white/20" style={{left:x*TILE,top:y*TILE,width:TILE,height:TILE}}/>;})}</div></div></div>}
      </div>
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="rounded-2xl border border-[#c8b182] bg-[#faf6ed]/95 px-4 py-2 shadow-lg"><p className="text-[10px] font-bold tracking-[.2em] uppercase">Build & buy</p><h2 className="text-sm font-bold">{home.name}</h2><p className="text-xs">{clout.toLocaleString("en-GB")} Clout</p></div>
        <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-2xl border border-[#c8b182] bg-[#faf6ed]/95 p-2 shadow-lg">
          <button ref={focusControl} type="button" disabled={pending} onClick={close} className="min-h-11 rounded-full bg-[#254e46] px-4 text-xs font-bold text-white">Live mode</button>
          <button type="button" disabled={!dirty||pending} onClick={()=>act(()=>saveLayout(layout),"Room saved. Ready to live in.")} className="min-h-11 rounded-full bg-[#ead9b6] px-4 text-xs font-bold disabled:opacity-40">{pending?"Saving…":"Save room"}</button>
          {dirty&&<button type="button" disabled={pending} onClick={()=>{setLayout(saved);setSel(null);}} className="min-h-11 rounded-full px-3 text-xs font-bold">Undo</button>}
        </div>
      </header>
      <div className="pointer-events-none absolute inset-x-3 bottom-[252px] flex flex-wrap items-end justify-between gap-2 sm:bottom-[232px]">
        <p role="status" className="max-w-md rounded-xl bg-[#183b35]/95 px-3 py-2 text-xs text-white">{msg??(selItem?`Place ${selItem.name}: click the floor. Escape to finish.`:"Click furniture to select it, or choose an item below.")}</p>
        <div className="pointer-events-auto flex flex-wrap gap-1 rounded-xl bg-[#faf6ed]/95 p-1.5">
          <select aria-label="Select furniture" value={sel?.startsWith("new:")?"":sel??""} onChange={e=>setSel(e.target.value||null)} className="min-h-10 max-w-44 rounded-lg bg-transparent px-2 text-xs"><option value="">Select furniture…</option>{layout.map(p=><option key={p.key} value={p.key}>{furnitureById(p.item)?.name}</option>)}</select>
          {sel&&!sel.startsWith("new:")&&<button type="button" disabled={pending} onClick={()=>{setLayout(layout.filter(p=>p.key!==sel));setSel(null);}} className="min-h-10 rounded-full bg-[#ead9b6] px-3 text-xs font-bold">Store item</button>}
          {sel&&<button type="button" onClick={()=>setSel(null)} className="min-h-10 rounded-full px-3 text-xs font-bold">Deselect</button>}
        </div>
      </div>
      <section aria-label="Build catalogue" className="absolute inset-x-0 bottom-0 h-[240px] border-t border-[#c8b182] bg-[#faf6ed] shadow-[0_-6px_30px_#183b3520] sm:h-[220px]">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#d4c7ad] px-3 py-2">
          {([['shop','Furniture'],['storage','Storage'],['houses','Houses']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>setTab(value)} className={cn("min-h-10 shrink-0 rounded-full px-4 text-xs font-bold",tab===value?"bg-[#254e46] text-white":"bg-[#eee7d9]")}>{label}</button>)}
          {tab==="shop"&&<><span className="mx-1 h-6 w-px shrink-0 bg-[#d4c7ad]"/>{["All","Living","Bedroom","Kitchen","Bathroom","Decor","Study"].map(group=><button type="button" key={group} aria-pressed={category===group} onClick={()=>setCategory(group)} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-xs",category===group?"border-[#254e46] bg-[#e1e8dc]":"border-transparent")}>{group}</button>)}</>}
        </div>
        <div className="flex h-[175px] items-stretch gap-2 overflow-x-auto px-3 py-2 sm:h-[155px]">
          {tab==="shop"&&FURNITURE.filter(f=>!f.starter&&(category==="All"||furnitureCollection(f)===category)).map(f=><button type="button" key={f.id} disabled={pending||clout<f.price} onClick={()=>act(()=>buyFurniture(f.id),`${f.name} bought. Select it in Storage to place it.`,()=>setTab("storage"))} className="flex w-36 shrink-0 flex-col rounded-xl border border-[#d4c7ad] bg-white p-2 text-left disabled:opacity-45"><div className="h-16 overflow-hidden [&>svg]:h-16"><FurnitureThumbnail item={f.id}/></div><span className="mt-1 text-xs font-bold">{f.name}</span><span className="mt-auto text-xs text-[#47745c]">{f.price.toLocaleString("en-GB")} Clout</span></button>)}
          {tab==="storage"&&spare.length===0&&<p className="self-center px-4 text-sm">Everything you own is placed. Select a furnishing in your room to move or store it.</p>}
          {tab==="storage"&&spare.map(([item,n])=><button key={item} type="button" disabled={pending} onClick={()=>{setSel(`new:${item}`);setMsg(null);}} className={cn("flex w-36 shrink-0 flex-col rounded-xl border bg-white p-2 text-left",sel===`new:${item}`?"border-[#254e46] ring-2 ring-[#254e46]":"border-[#d4c7ad]")}><div className="h-16 overflow-hidden [&>svg]:h-16"><FurnitureThumbnail item={item}/></div><span className="mt-1 text-xs font-bold">{furnitureById(item)?.name}</span><span className="mt-auto text-xs">Owned ×{n} · place</span></button>)}
          {tab==="houses"&&HOMES.map(h=><button key={h.id} type="button" disabled={pending||(!owned.includes(h.id)&&clout<h.price)} onClick={()=>act(()=>buyHome(h.id),`${h.name} is now your home.`)} className={cn("flex w-52 shrink-0 flex-col rounded-xl border p-3 text-left disabled:opacity-45",current===h.id?"border-[#254e46] bg-[#e1e8dc]":"border-[#d4c7ad] bg-white")}><span className="text-sm font-bold">{h.name}</span><span className="mt-1 text-xs">{h.area} · {h.blurb}</span><span className="mt-auto text-xs font-bold">{h.id==="studio"&&!claimed?"Claim free starter house":h.id===current?"Current home":owned.includes(h.id)?"Move here":`Buy · ${h.price.toLocaleString("en-GB")} Clout`}</span></button>)}
        </div>
      </section>
      {exitPrompt&&<div className="absolute inset-0 z-10 grid place-items-center bg-[#183b35]/50 p-4"><section aria-label="Unsaved room changes" className="max-w-sm rounded-3xl bg-[#faf6ed] p-6 shadow-xl"><h3 className="font-bold">Save your room before returning?</h3><p className="mt-2 text-sm">Your furniture moves haven’t been saved yet.</p>{msg && <p role="alert" className="mt-2 text-sm text-red-700">{msg}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} ref={focusControl} onClick={()=>act(()=>saveLayout(layout),undefined,onClose)} className="min-h-11 rounded-full bg-[#254e46] px-4 text-sm text-white">Save & return</button><button type="button" disabled={pending} onClick={onClose} className="min-h-11 rounded-full bg-[#ead9b6] px-4 text-sm">Discard moves</button><button type="button" onClick={()=>setExitPrompt(false)} className="min-h-11 px-3 text-sm">Keep editing</button></div></section></div>}
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4c7ad] bg-[#faf6ed] px-4 py-3 text-[#203b38]">
          <div><p className="text-xs tracking-widest uppercase">Build & buy</p><p className="font-bold">{home.name} · {home.area}</p></div>
          <Link href="/games/world?map=home" className="rounded-full bg-[#254e46] px-4 py-2 text-sm font-bold text-white">Live in your home</Link>
        </div>
        <div className="relative h-[min(65dvh,560px)] min-h-80 overflow-hidden rounded-3xl border border-[#d4c7ad] bg-[#e4dccb]">
          {!fallback && <World3D overview map={map} avatar={avatar} car={null} getMe={editorPlayer} getOthers={emptyOthers} nearPortal={noPortal} onGround={onGround} onUnavailable={unavailable} />}
          {fallback && <div className="relative" style={{ width: map.width * scale, height: map.height * scale }}>
            <div className="absolute top-0 left-0 origin-top-left" style={{ width: map.width, height: map.height, transform: `scale(${scale})` }}>
              <HomeFloorPlan map={map} />
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
          </div>}
          <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-[#183b35]/90 px-3 py-2 text-xs text-white">{selItem ? `Placing ${selItem.name}` : "Select furniture to move it"}</span>
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
          {layout.length > 0 && <select aria-label="Select placed furniture" value={sel?.startsWith("new:") ? "" : sel ?? ""} onChange={e => setSel(e.target.value || null)} className="min-h-11 max-w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="">Select a placed item…</option>{layout.map(p => <option key={p.key} value={p.key}>{furnitureById(p.item)?.name} · {p.x},{p.y}</option>)}</select>}
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
            <button type="button" onClick={() => { setLayout(saved); setSel(null); }} className="rounded-full px-4 py-2 font-bold text-muted-foreground">
              Undo changes
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-black">Storage</h2>
          {!claimed && <button type="button" disabled={pending} onClick={() => act(() => buyHome("studio"), "Starter house claimed. Welcome home!")} className="mt-3 min-h-11 w-full rounded-2xl bg-[#254e46] px-4 py-3 font-bold text-white">Claim your free starter house</button>}
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
          <div className="mt-3 flex flex-wrap gap-1.5">{["All", "Living", "Bedroom", "Kitchen", "Bathroom", "Decor", "Study"].map(group => <button key={group} type="button" onClick={() => setCategory(group)} aria-pressed={category === group} className={cn("min-h-10 rounded-full border px-3 text-xs font-bold", category === group ? "bg-[#254e46] text-white" : "border-border")}>{group}</button>)}</div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {FURNITURE.filter((f) => !f.starter && (category === "All" || furnitureCollection(f) === category)).map((f) => (
              <li key={f.id} className="flex flex-col justify-between gap-2 rounded-2xl border border-[#d4c7ad] bg-[#faf6ed] p-3 text-[#203b38]">
                <FurnitureThumbnail item={f.id} />
                <div>
                  <p className="font-bold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.w}×{f.h} tiles · interactive
                    {bought[f.id] ? ` · own ${bought[f.id]}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending || clout < f.price}
                  onClick={() => act(() => buyFurniture(f.id), `${f.name} bought. It's in your storage.`)}
                  className="rounded-full bg-brand px-3 py-1.5 text-sm font-black text-white disabled:opacity-40"
                >
                  {f.price.toLocaleString("en-GB")} Clout
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
                      {have ? "Move here" : `Buy ${h.price.toLocaleString("en-GB")} Clout`}
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
