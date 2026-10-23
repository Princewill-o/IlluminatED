"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CarFront, Crown, Flag, Ghost as GhostIcon, Link2, Lock, Medal, Play, RotateCcw, Star, Timer, Trophy } from "lucide-react";

import { Race, type RaceResult } from "./race";

import { type Board, type Ghost, racingBoard, racingFinish, racingGhost, racingProgress, racingStart } from "@/app/games/racing/actions";
import { KARTS, TRACKS_PER_WORLD, WORLDS, WORLD_STARS, accuracy, starsFor, trackById, trackOf, type Kart, type Track } from "@/game/core/maths-racing";
import { cn } from "@/lib/utils";

type Mode = "campaign" | "trial";
type Live = { track: Track; seed: number; id: number | null; mode: Mode | "ghost"; ghost: Ghost | null };
type Done = RaceResult & { track: Track; saved: { stars: number | null; clout: number; best: number | null } | null; error?: string; runId: number | null; mode: Live["mode"]; ghostName?: string };
const KART_KEY = "illuminated:racing-kart";
const secs = (ms: number | null | undefined) => (ms ? `${(ms / 1000).toFixed(2)}s` : "–");

function Stars({ n, size = "size-4" }: { n: number; size?: string }) {
  return <span className="flex gap-0.5" aria-label={`${n} of 3 stars`}>{[0, 1, 2].map((i) => <Star key={i} className={cn(size, i < n ? "fill-[#ffc83d] text-[#e0a100]" : "text-black/20")} aria-hidden />)}</span>;
}

/**
 * Maths Racing: eight worlds of tracks against computer racers, time trials
 * with leaderboards, and ghost races against friends via a challenge link.
 */
export function RacingHub() {
  const [progress, setProgress] = useState<Record<string, { stars: number; best: number | null }>>({});
  const [world, setWorld] = useState(1);
  const [mode, setMode] = useState<Mode>("campaign");
  const [kartId, setKartId] = useState("starter");
  const [live, setLive] = useState<Live | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [board, setBoard] = useState<{ track: string; data: Board } | null>(null);
  const [note, setNote] = useState("");
  const [challenge, setChallenge] = useState<Ghost | null>(null);

  const totalStars = Object.values(progress).reduce((n, p) => n + (p.stars ?? 0), 0);
  const kart = KARTS.find((k) => k.id === kartId && totalStars >= k.stars) ?? KARTS[0];
  const refresh = useCallback(() => { void racingProgress().then(setProgress).catch(() => {}); }, []);

  useEffect(() => {
    refresh();
    try { const k = localStorage.getItem(KART_KEY); if (k) setKartId(k); } catch { /* default kart */ }
    const g = Number(new URLSearchParams(window.location.search).get("ghost"));
    if (g) void racingGhost(g).then((x) => { if (x) { setChallenge(x); setWorld(Number(x.track.slice(1, 2))); } });
  }, [refresh]);

  const start = async (track: Track, m: Live["mode"], ghost: Ghost | null = null) => {
    setNote(""); setDone(null);
    const r = await racingStart(track.id, m, ghost?.id);
    if (r.ok) setLive({ track, seed: r.seed, id: r.id, mode: m, ghost });
    else {
      // Practice offline: same race, just not saved.
      setNote(`${r.error} Racing in practice mode.`);
      setLive({ track, seed: ghost?.seed ?? Math.floor(Math.random() * 2e9) + 1, id: null, mode: m, ghost });
    }
  };

  const finish = async (res: RaceResult) => {
    const l = live!;
    setLive(null);
    let saved: Done["saved"] = null, error: string | undefined;
    if (l.id !== null) {
      const r = await racingFinish(l.id, l.track.id, l.seed, res.events, l.ghost?.time ?? null);
      if (r.ok) { saved = { stars: r.stars, clout: r.clout, best: r.best }; refresh(); } else error = r.error;
    }
    setDone({ ...res, track: l.track, saved, error, runId: l.id, mode: l.mode, ghostName: l.ghost?.name });
  };

  const openBoard = async (t: Track) => setBoard({ track: t.id, data: await racingBoard(t.id) });

  if (live) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0f17] p-2 sm:p-4">
        <Race track={live.track} seed={live.seed} kart={kart} ghost={live.ghost ? { name: `@${live.ghost.name}`, events: live.ghost.events } : null}
          onDone={(r) => void finish(r)} onQuit={() => setLive(null)} />
      </div>
    );
  }

  const w = WORLDS[world - 1];
  const tracks = Array.from({ length: TRACKS_PER_WORLD }, (_, i) => trackOf(world, i));

  return (
    <div className="grid gap-6">
      {challenge && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-[#13203a] p-4 text-white">
          <GhostIcon className="size-6 text-[#9ec5ff]" aria-hidden />
          <p className="flex-1 font-bold">@{challenge.name} challenged you on {trackById(challenge.track)?.name}: {secs(challenge.time)}. Can you beat their ghost?</p>
          <button type="button" onClick={() => void start(trackById(challenge.track)!, "ghost", challenge)} className="arcade-btn rounded-full bg-[#f2d9a6] px-5 py-2.5 font-black text-[#0d1726]">Race the ghost</button>
        </div>
      )}
      {note && <p role="status" className="rounded-2xl bg-[#fff3cf] p-3 text-sm font-bold">{note}</p>}

      {/* Worlds */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-black">Worlds</h2>
          <p className="flex items-center gap-1.5 text-sm font-black"><Star className="size-4 fill-[#ffc83d] text-[#e0a100]" aria-hidden /> {totalStars} stars</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WORLDS.map((x) => {
            const locked = totalStars < WORLD_STARS[x.id - 1];
            const got = Array.from({ length: TRACKS_PER_WORLD }, (_, i) => progress[trackOf(x.id, i).id]?.stars ?? 0).reduce((a, b) => a + b, 0);
            return (
              <button key={x.id} type="button" disabled={locked} onClick={() => setWorld(x.id)} aria-pressed={world === x.id}
                className={cn("gloss-off relative overflow-hidden rounded-3xl p-4 text-left text-white transition disabled:cursor-not-allowed", world === x.id ? "ring-4 ring-[#ffc83d]" : "hover:-translate-y-0.5")}
                style={{ background: `linear-gradient(160deg, ${x.sky[0]}, ${x.ground})` }}>
                <span className="absolute -right-4 -bottom-6 text-7xl font-black opacity-20">{x.id}</span>
                <span className="block text-[10px] font-black tracking-widest uppercase opacity-80">World {x.id} · {x.level}</span>
                <span className="mt-1 block text-lg leading-tight font-black drop-shadow">{x.name}</span>
                <span className="mt-0.5 block text-xs opacity-90">{x.topic}</span>
                <span className="mt-2 flex items-center gap-1 text-xs font-black">{locked ? <><Lock className="size-3.5" aria-hidden /> {WORLD_STARS[x.id - 1]} stars to unlock</> : <><Star className="size-3.5 fill-current" aria-hidden /> {got}/{TRACKS_PER_WORLD * 3}</>}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tracks */}
      <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">World {w.id}</p>
            <h2 className="text-2xl font-black">{w.name}</h2>
          </div>
          <div className="flex rounded-full bg-[#f1ede4] p-1" role="tablist" aria-label="Race mode">
            {([["campaign", "Race rivals", Flag], ["trial", "Time trial", Timer]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                className={cn("gloss-off flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black", mode === id ? "bg-[#13203a] text-white" : "text-[#13203a]")}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {tracks.map((t, i) => {
            const p = progress[t.id];
            const prevDone = i === 0 || (progress[tracks[i - 1].id]?.stars ?? 0) > 0;
            return (
              <li key={t.id} className={cn("flex items-center gap-3 rounded-2xl p-3", t.boss ? "bg-[#13203a] text-white" : "bg-[#f7f1e6]")}>
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black", t.boss ? "bg-[#e5484d]" : "bg-white text-[#13203a]")}>{t.boss ? <Crown className="size-6" aria-hidden /> : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{t.name}</span>
                  <span className={cn("flex items-center gap-2 text-xs", t.boss ? "text-white/70" : "text-muted-foreground")}>{t.length} m · {mode === "trial" ? `Best ${secs(p?.best)}` : <Stars n={p?.stars ?? 0} size="size-3.5" />}</span>
                </span>
                <button type="button" onClick={() => void openBoard(t)} aria-label={`Leaderboard for ${t.name}`} className={cn("grid size-10 place-items-center rounded-full", t.boss ? "bg-white/10" : "bg-white")}><Trophy className="size-4" aria-hidden /></button>
                <button type="button" disabled={!prevDone && mode === "campaign"} onClick={() => void start(t, mode)}
                  className="jelly flex items-center gap-1.5 rounded-full bg-[#2b5fd9] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                  {!prevDone && mode === "campaign" ? <Lock className="size-4" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />} Race
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">3 stars: win with 80% or more correct. Every new star earns 5 Clout. Answers count more than speed: a wrong answer slows you down.</p>
      </section>

      {/* Garage */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-black"><CarFront className="size-5" aria-hidden /> Garage</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {KARTS.map((k) => {
            const open = totalStars >= k.stars;
            return (
              <button key={k.id} type="button" disabled={!open} aria-pressed={kart.id === k.id}
                onClick={() => { setKartId(k.id); try { localStorage.setItem(KART_KEY, k.id); } catch { /* not saved */ } }}
                className={cn("gloss-off w-36 shrink-0 rounded-3xl border-2 bg-white p-3 text-left disabled:opacity-50", kart.id === k.id ? "border-[#2b5fd9]" : "border-transparent")}>
                <KartBadge kart={k} />
                <span className="mt-2 block text-sm font-black">{k.name}</span>
                <span className="text-xs text-muted-foreground">{open ? (kart.id === k.id ? "Driving" : "Ready") : <span className="flex items-center gap-1"><Lock className="size-3" aria-hidden />{k.stars} stars</span>}</span>
              </button>
            );
          })}
        </div>
      </section>

      {board && <Leaderboard board={board} onClose={() => setBoard(null)} onGhost={async (run) => { const g = await racingGhost(run); setBoard(null); if (g) void start(trackById(g.track)!, "ghost", g); }} />}
      {done && <Results done={done} onClose={() => setDone(null)} onRetry={() => void start(done.track, done.mode === "trial" ? "trial" : "campaign")}
        onNext={done.track.index < TRACKS_PER_WORLD - 1 ? () => void start(trackOf(done.track.world, done.track.index + 1), "campaign") : undefined} />}
    </div>
  );
}

function KartBadge({ kart }: { kart: Kart }) {
  return (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden>
      <ellipse cx="60" cy="62" rx="50" ry="6" fill="rgba(0,0,0,.15)" />
      <rect x="12" y="40" width="18" height="20" rx="4" fill="#15161c" /><rect x="90" y="40" width="18" height="20" rx="4" fill="#15161c" />
      <rect x="20" y="26" width="80" height="28" rx="12" fill={kart.body} />
      <rect x="14" y="20" width="92" height="7" rx="3" fill={kart.trim} />
      <circle cx="60" cy="18" r="11" fill={kart.trim} /><ellipse cx="60" cy="17" rx="7" ry="4" fill="#13203a" />
    </svg>
  );
}

function Leaderboard({ board, onClose, onGhost }: { board: { track: string; data: Board }; onClose: () => void; onGhost: (run: number) => void }) {
  const t = trackById(board.track)!;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#07101f]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${t.name} leaderboard`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[2rem] bg-[#f7f1e6] p-6 text-[#13203a]">
        <p className="text-xs font-black tracking-widest text-[#7a5ce6] uppercase">Fastest times</p>
        <h3 className="text-2xl font-black">{t.name}</h3>
        {!board.data.top.length ? <p className="mt-4 text-sm text-muted-foreground">No times yet. Set the first one!</p> : (
          <ol className="mt-4 grid gap-2">
            {board.data.top.map((r, i) => (
              <li key={r.run} className={cn("flex items-center gap-3 rounded-2xl bg-white p-2.5", r.me && "ring-2 ring-[#2b5fd9]")}>
                <span className="grid size-8 place-items-center rounded-full bg-[#13203a] text-sm font-black text-white">{i + 1}</span>
                <span className="flex-1 font-black">@{r.name}<span className="ml-2 text-xs font-bold text-muted-foreground">{r.acc}% correct</span></span>
                <span className="font-black tabular-nums">{secs(r.time)}</span>
                {!r.me && <button type="button" onClick={() => onGhost(r.run)} aria-label={`Race @${r.name}'s ghost`} className="grid size-8 place-items-center rounded-full bg-[#efeafd] text-[#7a5ce6]"><GhostIcon className="size-4" aria-hidden /></button>}
              </li>
            ))}
          </ol>
        )}
        {board.data.mine && <p className="mt-3 text-sm font-bold">Your best: {secs(board.data.mine.time)}</p>}
        <button type="button" onClick={onClose} className="jelly mt-5 w-full rounded-full bg-[#13203a] py-3 font-black text-white">Close</button>
      </section>
    </div>
  );
}

function Results({ done, onClose, onRetry, onNext }: { done: Done; onClose: () => void; onRetry: () => void; onNext?: () => void }) {
  const [copied, setCopied] = useState(false);
  const stars = done.mode === "campaign" ? (done.saved?.stars ?? starsFor(done.place, done.right, done.wrong)) : 0;
  const share = useMemo(() => (done.runId ? `${typeof window !== "undefined" ? window.location.origin : ""}/games/racing?ghost=${done.runId}` : null), [done.runId]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#07101f]/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-label="Race results" className="race-results w-full max-w-md rounded-[2rem] bg-[#f7f1e6] p-6 text-[#13203a]">
        <p className="text-xs font-black tracking-widest text-[#7a5ce6] uppercase">{done.track.name}</p>
        <h3 className="mt-1 flex items-center gap-2 text-4xl font-black italic">{done.place === 1 ? <Medal className="size-9 text-[#e0a100]" aria-hidden /> : null}{["1st", "2nd", "3rd", "4th", "5th", "6th"][done.place - 1]} place</h3>
        {done.mode === "campaign" && <div className="mt-2"><Stars n={stars} size="size-7" /></div>}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white p-2"><dt className="text-[10px] font-black uppercase text-muted-foreground">Time</dt><dd className="font-black tabular-nums">{secs(done.time)}</dd></div>
          <div className="rounded-2xl bg-white p-2"><dt className="text-[10px] font-black uppercase text-muted-foreground">Correct</dt><dd className="font-black">{accuracy(done.right, done.wrong)}%</dd></div>
          <div className="rounded-2xl bg-white p-2"><dt className="text-[10px] font-black uppercase text-muted-foreground">Clout</dt><dd className="font-black">+{done.saved?.clout ?? 0}</dd></div>
        </dl>
        <ol className="mt-4 grid gap-1 text-sm">
          {done.order.map((o, i) => <li key={o.name} className={cn("flex justify-between rounded-xl px-3 py-1.5", o.me ? "bg-[#2b5fd9] font-black text-white" : "bg-white")}><span>{i + 1}. {o.name}{done.ghostName && !o.me ? " (ghost)" : ""}</span><span className="tabular-nums">{secs(o.time)}</span></li>)}
        </ol>
        {done.error && <p role="alert" className="mt-3 text-sm font-bold text-[#c23a22]">{done.error}</p>}
        {!done.runId && !done.error && <p className="mt-3 text-xs text-muted-foreground">Practice race: sign in to save stars and times.</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onRetry} className="jelly flex items-center justify-center gap-1.5 rounded-full bg-[#13203a] py-3 font-black text-white"><RotateCcw className="size-4" aria-hidden /> Race again</button>
          {onNext && done.place <= 3 ? <button type="button" onClick={onNext} className="arcade-btn rounded-full bg-[#6cc04a] py-3 font-black text-[#0d1726]">Next track</button>
            : <button type="button" onClick={onClose} className="jelly rounded-full bg-white py-3 font-black text-[#13203a]">Back</button>}
        </div>
        {share && done.saved && (
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(share).then(() => setCopied(true)); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#efeafd] py-2.5 text-sm font-black text-[#7a5ce6]">
            <Link2 className="size-4" aria-hidden /> {copied ? "Link copied: send it to a friend!" : "Challenge a friend to beat your ghost"}
          </button>
        )}
      </section>
    </div>
  );
}
