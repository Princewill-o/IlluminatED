"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft, Castle, Crown, Flame, Gamepad2, Gem, Globe2, Landmark, Lock, Mountain, Music, Palmtree, Plane, Rocket,
  ShieldCheck, Sparkles, Trees, Users, type LucideIcon,
} from "lucide-react";

import { buildWorld, configureWorld, listPlayerWorlds, worldPlusStatus, type PlayerWorld, type WorldRules } from "@/app/games/world/actions";
import { REGIONS, SERVERS, type RegionId } from "@/game/core/world";
import { cn } from "@/lib/utils";

export const WORLD_ICONS: Record<string, LucideIcon> = {
  castle: Castle, rocket: Rocket, palmtree: Palmtree, trees: Trees, landmark: Landmark, sparkles: Sparkles,
  crown: Crown, flame: Flame, gem: Gem, mountain: Mountain, music: Music, gamepad: Gamepad2, plane: Plane,
};
const ICON_COLOURS: Record<string, string> = {
  castle: "#7a5ce6", rocket: "#2b5fd9", palmtree: "#15987f", trees: "#3f9b4f", landmark: "#b4234f", sparkles: "#e0a100",
  crown: "#d6a21b", flame: "#e2572b", gem: "#1aa3c4", mountain: "#5f7a8a", music: "#d1468f", gamepad: "#6f4fd1", plane: "#2f7fb3",
};
export const DEFAULT_RULES: WorldRules = { police: "normal", flight: "owner", time: "auto", weather: "auto", visitors: "everyone" };

const SPLASHES = [
  "Now with double-decker cafés!", "Revise on the bus!", "Mind the gap!", "100% homework-powered!",
  "Fountain Square is open!", "Ask Ava!", "Sign for your parcel!", "Clout well spent!",
];

/** A chunky menu button in the style of a game title screen. */
function MenuButton({ children, onClick, tone = "stone", disabled, wide = true }: { children: ReactNode; onClick?: () => void; tone?: "stone" | "gold" | "violet"; disabled?: boolean; wide?: boolean }) {
  const tones = {
    stone: "bg-[#2a3346] text-white border-[#141a26] hover:bg-[#344059] shadow-[inset_0_2px_0_rgba(255,255,255,.12)]",
    gold: "bg-[#f2d9a6] text-[#0d1726] border-[#a8864b] hover:bg-[#f7e2b8] shadow-[inset_0_2px_0_rgba(255,255,255,.5)]",
    violet: "bg-[#7a5ce6] text-white border-[#4a34a4] hover:bg-[#8a6ef0] shadow-[inset_0_2px_0_rgba(255,255,255,.25)]",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn("gloss-off flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-[5px] px-5 text-base font-black tracking-wide transition active:translate-y-[3px] active:border-b-2 disabled:opacity-40", wide && "w-full", tones[tone])}>
      {children}
    </button>
  );
}

/** Four signal bars, filled by how busy a world is (busier = livelier, not slower). */
function Bars({ n }: { n: number }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => <span key={i} className={cn("w-1 rounded-sm", i <= Math.min(3, 1 + Math.floor(n / 4)) ? "bg-[#4ade80]" : "bg-white/20")} style={{ height: 5 + i * 3 }} />)}
    </span>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="text-[11px] font-black tracking-widest text-white/60 uppercase">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1 rounded-xl bg-black/30 p-1">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className={cn("gloss-off flex-1 rounded-lg px-2 py-1.5 text-xs font-black whitespace-nowrap", value === v ? "bg-[#f2d9a6] text-[#0d1726]" : "text-white/80 hover:bg-white/10")}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/** The sandbox rules a world owner can switch. */
export function RulesEditor({ rules, onChange }: { rules: WorldRules; onChange: (r: WorldRules) => void }) {
  return (
    <div className="grid gap-3">
      <Segmented label="Police" value={rules.police} onChange={(police) => onChange({ ...rules, police })} options={[["off", "Off"], ["relaxed", "Relaxed"], ["normal", "Normal"], ["strict", "Strict"]]} />
      <Segmented label="Who can fly" value={rules.flight} onChange={(flight) => onChange({ ...rules, flight })} options={[["off", "Nobody"], ["owner", "Just me"], ["everyone", "Everyone"]]} />
      <Segmented label="Time of day" value={rules.time} onChange={(time) => onChange({ ...rules, time })} options={[["auto", "Live"], ["day", "Day"], ["dusk", "Dusk"], ["night", "Night"]]} />
      <Segmented label="Weather" value={rules.weather} onChange={(weather) => onChange({ ...rules, weather })} options={[["auto", "Live"], ["clear", "Clear"], ["rain", "Rain"], ["snow", "Snow"]]} />
      <Segmented label="Visitors" value={rules.visitors} onChange={(visitors) => onChange({ ...rules, visitors })} options={[["everyone", "Everyone"], ["friends", "Friends only"]]} />
    </div>
  );
}

/**
 * IllumED World: the title screen. The logo over a live city backdrop, then a
 * world list like a multiplayer server list: the Open World's regional worlds,
 * and worlds built by Plus members. A Plus member can build one world of their
 * own and set its sandbox rules.
 */
export function WorldMenu({ region, onRegion, countFor, onJoin, username }: {
  region: RegionId;
  onRegion: (r: RegionId) => void;
  countFor: (server: string) => number;
  onJoin: (server: string, world?: PlayerWorld) => void;
  username: string;
}) {
  const [screen, setScreen] = useState<"title" | "worlds" | "mine">("title");
  const [worlds, setWorlds] = useState<PlayerWorld[]>([]);
  const [status, setStatus] = useState<{ plus: boolean; signedIn: boolean; userId?: string }>({ plus: false, signedIn: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [splash] = useState(() => SPLASHES[Math.floor(Math.random() * SPLASHES.length)]);
  const [name, setName] = useState(`${username}'s World`.slice(0, 30));
  const [icon, setIcon] = useState("castle");
  const [rules, setRules] = useState<WorldRules>(DEFAULT_RULES);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = worlds.find((w) => w.owner === status.userId) ?? null;

  useEffect(() => {
    void listPlayerWorlds().then(setWorlds).catch(() => {});
    void worldPlusStatus().then(setStatus).catch(() => {});
  }, []);
  useEffect(() => { if (mine) { setRules({ ...DEFAULT_RULES, ...mine.settings }); setName(mine.name); setIcon(mine.icon); } }, [mine]);

  const regional = useMemo(() => SERVERS.filter((s) => s.region === region), [region]);
  const quickJoin = () => {
    const best = [...regional].sort((a, b) => countFor(b.id) - countFor(a.id))[0];
    if (best) onJoin(best.id);
  };
  const join = () => {
    if (!selected) return;
    const w = worlds.find((x) => x.code === selected);
    onJoin(selected, w);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b1220] text-white">
      {/* Backdrop: the real city, slowly drifting, dimmed. */}
      <video className="world-menu-drift absolute inset-0 h-full w-full object-cover opacity-55" src="/landing/gameplay-crowd.mp4" poster="/landing/gameplay-crowd-poster.jpg" autoPlay muted loop playsInline aria-hidden tabIndex={-1} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(11,18,32,.15),rgba(11,18,32,.85)_70%)]" />
      <div className="relative mx-auto flex h-full max-w-3xl flex-col items-center overflow-y-auto px-4 pt-[6vh] pb-8">
        {/* Logo. */}
        <div className="relative flex flex-col items-center">
          <div className="flex items-center gap-3">
            <Image src="/brand/lion-head.webp" alt="" width={84} height={84} className="size-16 drop-shadow-[0_6px_0_rgba(0,0,0,.35)] sm:size-20" priority />
            <h1 className="text-5xl leading-none font-black tracking-tight sm:text-7xl" style={{ textShadow: "0 4px 0 #13203a, 0 8px 0 rgba(0,0,0,.35)" }}>
              Illum<span className="text-[#f2d9a6]">ED</span>
            </h1>
          </div>
          <p className="-mt-1 text-2xl font-black tracking-[0.5em] text-[#9ec5ff] uppercase sm:text-3xl" style={{ textShadow: "0 3px 0 #13203a" }}>World</p>
          <p className="world-menu-splash absolute -right-6 bottom-2 rotate-[-14deg] text-sm font-black text-[#ffe066] sm:-right-16 sm:text-base" style={{ textShadow: "0 2px 0 #3d2e00" }}>{splash}</p>
        </div>

        {screen === "title" && (
          <div className="mt-[6vh] grid w-full max-w-sm gap-3">
            <MenuButton tone="gold" onClick={quickJoin}><Globe2 className="size-5" aria-hidden /> Play the Open World</MenuButton>
            <MenuButton onClick={() => setScreen("worlds")}><Users className="size-5" aria-hidden /> Worlds</MenuButton>
            <MenuButton tone="violet" onClick={() => setScreen("mine")}><Crown className="size-5" aria-hidden /> Your World {!status.plus && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">PLUS</span>}</MenuButton>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/games" className="gloss-off flex min-h-11 items-center justify-center rounded-xl border-b-[5px] border-[#141a26] bg-[#2a3346] text-sm font-black hover:bg-[#344059]">Back</Link>
              <label className="flex min-h-11 items-center gap-1 rounded-xl border-b-[5px] border-[#141a26] bg-[#2a3346] px-2 text-xs font-black">
                <span className="sr-only">Region</span>
                <select value={region} onChange={(e) => onRegion(e.target.value as RegionId)} className="w-full bg-transparent outline-none">
                  {REGIONS.map((r) => <option key={r.id} value={r.id} className="text-black">{r.name}</option>)}
                </select>
              </label>
            </div>
            <p className="text-center text-xs text-white/50">Signed in as @{username} · {regional.reduce((n, s) => n + countFor(s.id), 0)} playing in your region</p>
          </div>
        )}

        {screen === "worlds" && (
          <div className="mt-6 w-full">
            <div className="max-h-[52vh] overflow-y-auto rounded-2xl border-2 border-black/40 bg-black/45 p-2 backdrop-blur-sm">
              <p className="px-2 pt-1 pb-2 text-[11px] font-black tracking-widest text-[#9ec5ff] uppercase">Open World · {REGIONS.find((r) => r.id === region)?.name}</p>
              {regional.map((s) => (
                <WorldRow key={s.id} selected={selected === s.id} onSelect={() => setSelected(s.id)} onJoin={() => onJoin(s.id)}
                  icon={<Globe2 className="size-7" aria-hidden />} colour="#2b5fd9" title={s.name} line="Public world · the whole city, open to everyone" count={countFor(s.id)} />
              ))}
              <p className="px-2 pt-4 pb-2 text-[11px] font-black tracking-widest text-[#d9c2ff] uppercase">Player worlds</p>
              {!worlds.length && <p className="px-3 pb-3 text-sm text-white/60">No player worlds yet. Plus members can build one.</p>}
              {worlds.map((w) => {
                const Icon = WORLD_ICONS[w.icon] ?? Castle;
                const s = { ...DEFAULT_RULES, ...w.settings };
                return (
                  <WorldRow key={w.code} selected={selected === w.code} onSelect={() => setSelected(w.code)} onJoin={() => onJoin(w.code, w)}
                    icon={<Icon className="size-7" aria-hidden />} colour={ICON_COLOURS[w.icon] ?? "#7a5ce6"} title={w.name}
                    line={`by @${w.owner_name ?? "player"} · ${s.police === "off" ? "No police" : `Police: ${s.police}`}${s.flight === "everyone" ? " · Flying on" : ""}${s.visitors === "friends" ? " · Friends only" : ""}`}
                    count={countFor(w.code)} locked={s.visitors === "friends" && w.owner !== status.userId} />
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MenuButton onClick={() => setScreen("title")}><ArrowLeft className="size-5" aria-hidden /> Back</MenuButton>
              <MenuButton tone="gold" disabled={!selected} onClick={join}>Join world</MenuButton>
            </div>
          </div>
        )}

        {screen === "mine" && (
          <div className="mt-6 w-full max-w-lg rounded-2xl border-2 border-black/40 bg-black/50 p-5 backdrop-blur-sm">
            {!status.plus && !mine ? (
              <div className="text-center">
                <Crown className="mx-auto size-10 text-[#f2d9a6]" aria-hidden />
                <h2 className="mt-2 text-2xl font-black">Build your own world</h2>
                <p className="mt-2 text-sm text-white/75">With IlluminatED Plus you can build one world of your own, give it a name and an icon, and run it as a sandbox: switch the police off or make them strict, let everyone fly, set the time and the weather, and decide who can visit. Anyone can join it from the Worlds list.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MenuButton onClick={() => setScreen("title")}><ArrowLeft className="size-5" aria-hidden /> Back</MenuButton>
                  <Link href="/pricing" className="gloss-off flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-[5px] border-[#4a34a4] bg-[#7a5ce6] font-black">Get Plus</Link>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-black">{mine ? "Your world" : "Build your world"}</h2>
                <label className="mt-3 block text-[11px] font-black tracking-widest text-white/60 uppercase">Name
                  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2 text-base font-bold text-white outline-none focus:ring-2 focus:ring-[#f2d9a6]" />
                </label>
                <p className="mt-3 text-[11px] font-black tracking-widest text-white/60 uppercase">Icon</p>
                <div className="mt-1 grid grid-cols-7 gap-1.5">
                  {Object.entries(WORLD_ICONS).map(([k, Icon]) => (
                    <button key={k} type="button" aria-label={k} aria-pressed={icon === k} onClick={() => setIcon(k)}
                      className={cn("gloss-off grid aspect-square place-items-center rounded-xl text-white", icon === k ? "ring-3 ring-[#f2d9a6]" : "opacity-75 hover:opacity-100")} style={{ background: ICON_COLOURS[k] }}>
                      <Icon className="size-5" aria-hidden />
                    </button>
                  ))}
                </div>
                {mine && <div className="mt-4"><RulesEditor rules={rules} onChange={setRules} /></div>}
                {note && <p role="alert" className="mt-3 text-sm text-[#ffb4a8]">{note}</p>}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MenuButton onClick={() => setScreen("title")}><ArrowLeft className="size-5" aria-hidden /> Back</MenuButton>
                  {mine ? (
                    <MenuButton tone="gold" disabled={busy} onClick={async () => {
                      setBusy(true); setNote("");
                      const r = await configureWorld(name, icon, rules);
                      setBusy(false);
                      if (!r.ok) setNote(r.error); else onJoin(mine.code, { ...mine, name, icon, settings: rules });
                    }}><ShieldCheck className="size-5" aria-hidden /> Save and play</MenuButton>
                  ) : (
                    <MenuButton tone="gold" disabled={busy || name.trim().length < 3} onClick={async () => {
                      setBusy(true); setNote("");
                      const r = await buildWorld(name, icon);
                      setBusy(false);
                      if (!r.ok) { setNote(r.error); return; }
                      const fresh = await listPlayerWorlds();
                      setWorlds(fresh);
                    }}><Sparkles className="size-5" aria-hidden /> Build my world</MenuButton>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WorldRow({ icon, colour, title, line, count, selected, locked, onSelect, onJoin }: { icon: ReactNode; colour: string; title: string; line: string; count: number; selected: boolean; locked?: boolean; onSelect: () => void; onJoin: () => void }) {
  return (
    <button type="button" onClick={onSelect} onDoubleClick={onJoin} aria-pressed={selected}
      className={cn("gloss-off mb-1 flex w-full items-center gap-3 rounded-xl p-2 text-left", selected ? "bg-white/15 ring-2 ring-white/70" : "hover:bg-white/5")}>
      <span className="grid size-14 shrink-0 place-items-center rounded-lg text-white shadow-[inset_0_-4px_0_rgba(0,0,0,.25)]" style={{ background: colour }}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-black">{title}{locked && <Lock className="size-3.5 text-white/60" aria-label="Friends only" />}</span>
        <span className="block truncate text-xs text-white/60">{line}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-xs font-bold text-white/80">
        <Bars n={count} />
        {count} online
      </span>
    </button>
  );
}

/**
 * The owner's admin panel inside their own world: the sandbox switches, plus a
 * few quick commands (like a game's admin console, but as buttons).
 */
export function WorldAdmin({ name, rules, onClose, onSaved, commands }: {
  name: string;
  rules: WorldRules;
  onClose: () => void;
  onSaved: (r: WorldRules) => void;
  commands: { label: string; run: () => void }[];
}) {
  const [draft, setDraft] = useState(rules);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="absolute inset-0 z-[100012] grid place-items-center bg-[#07101f]/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="world-admin-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[90%] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/15 bg-[#13203a]/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,.5)]">
        <p className="text-xs font-black tracking-[0.2em] text-[#d9c2ff] uppercase">World admin</p>
        <h2 id="world-admin-title" className="mt-1 text-2xl font-black">{name}</h2>
        <p className="mt-1 text-sm text-white/70">Change how your world works. Everyone in it sees the change within a few seconds.</p>
        <div className="mt-4"><RulesEditor rules={draft} onChange={setDraft} /></div>
        <p className="mt-5 text-[11px] font-black tracking-widest text-white/60 uppercase">Commands</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {commands.map((c) => (
            <button key={c.label} type="button" onClick={c.run} className="gloss-off min-h-10 rounded-xl bg-white/10 px-3 text-left text-xs font-black hover:bg-white/20">{c.label}</button>
          ))}
        </div>
        {note && <p role="alert" className="mt-3 text-sm text-[#ffb4a8]">{note}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MenuButton onClick={onClose}>Close</MenuButton>
          <MenuButton tone="gold" disabled={busy} onClick={async () => {
            setBusy(true); setNote("");
            const r = await configureWorld(null, null, draft);
            setBusy(false);
            if (!r.ok) setNote(r.error); else { onSaved(draft); onClose(); }
          }}>Save rules</MenuButton>
        </div>
      </section>
    </div>
  );
}
