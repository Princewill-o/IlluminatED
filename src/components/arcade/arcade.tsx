"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Lock, Play, Trophy, X } from "lucide-react";

import { buyArcadeGame, finishArcadeRound } from "@/app/games/arcade/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { doActivity } from "@/components/game/world/use-needs";
import { ARCADE, type ArcadeGame, ROUND_MS, buildRound, scoreOf } from "@/game/core/arcade";
import { newSeed } from "@/game/core/rng";
import { cn } from "@/lib/utils";

export function Arcade({ owned, clout }: { owned: Record<string, { best: number; plays: number }>; clout: number }) {
  const [playing, setPlaying] = useState<ArcadeGame | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ARCADE.map((g) => {
          const have = g.price === 0 || owned[g.id];
          return (
            <article key={g.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
              <div className="grid h-28 place-items-center text-3xl font-black text-white" style={{ background: g.colour }}>
                {g.name}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">{g.subject}</p>
                <p className="mt-1 flex-1 text-sm leading-6">{g.blurb}</p>
                {owned[g.id]?.best ? (
                  <p className="mt-2 flex items-center gap-1 text-sm font-bold">
                    <Trophy className="size-4 text-ink-sun" aria-hidden /> Best {owned[g.id].best}
                  </p>
                ) : null}
                {have ? (
                  <button type="button" onClick={() => setPlaying(g)} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand py-2.5 font-black text-white">
                    <Play className="size-4" aria-hidden /> Play 60 seconds
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending || clout < g.price}
                    onClick={() =>
                      start(async () => {
                        const r = await buyArcadeGame(g.id);
                        setMsg(r.ok ? `${g.name} unlocked. Have fun!` : r.error);
                        if (r.ok) {
                          notifyPlayerChanged();
                          router.refresh();
                        }
                      })
                    }
                    className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#f2d9a6] py-2.5 font-black text-[#0d1726] disabled:opacity-50"
                  >
                    <Lock className="size-4" aria-hidden /> Unlock for {g.price} Clout
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {msg && (
        <p role="status" className="mt-4 text-sm font-bold">
          {msg}
        </p>
      )}
      {playing && <Round game={playing} onClose={() => setPlaying(null)} />}
    </>
  );
}

function Round({ game, onClose }: { game: ArcadeGame; onClose: () => void }) {
  const seed = useRef(newSeed());
  const qs = useMemo(() => buildRound(game, seed.current), [game]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [result, setResult] = useState<{ reward: number; best: number; error?: string } | null>(null);
  const router = useRouter();
  const sent = useRef(false);

  const left = startedAt ? Math.max(0, ROUND_MS - (now - startedAt)) : ROUND_MS;
  const over = startedAt !== null && left === 0;

  useEffect(() => {
    if (!startedAt || over) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [startedAt, over]);

  useEffect(() => {
    if (!over || sent.current || !startedAt) return;
    sent.current = true;
    void finishArcadeRound(game.id, scoreOf(right), Date.now() - startedAt).then((r) => {
      setResult(r.ok ? { reward: r.reward, best: r.best } : { reward: 0, best: 0, error: r.error });
      if (r.ok) {
        notifyPlayerChanged();
        doActivity("arcade");
        router.refresh();
      }
    });
  }, [over, game.id, right, startedAt, router]);

  const q = qs[i % qs.length];
  const answer = (k: number) => {
    if (over) return;
    const ok = k === q.answer;
    if (ok) setRight((r) => r + 1);
    setFlash(ok ? "ok" : "no");
    setTimeout(() => setFlash(null), 180);
    setI((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 z-[100002] grid place-items-center bg-black/70 p-4">
      <div role="dialog" aria-label={game.name} className="w-full max-w-lg rounded-3xl bg-background p-5 text-foreground md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{game.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        {startedAt === null ? (
          <div className="mt-4 text-center">
            <p className="text-muted-foreground">Answer as many as you can in 60 seconds. Every right answer is a point; half your score comes back as Clout.</p>
            <button
              type="button"
              onClick={() => {
                const t = Date.now();
                setStartedAt(t);
                setNow(t);
              }}
              className="mt-5 w-full rounded-full bg-brand py-3 font-black text-white"
            >
              Go!
            </button>
          </div>
        ) : !over ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm font-black">
              <span>Score {right}</span>
              <span className={cn(left < 10_000 && "text-ink-coral")}>{Math.ceil(left / 1000)}s</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${(left / ROUND_MS) * 100}%` }} />
            </div>
            <p
              className={cn(
                "mt-6 rounded-2xl py-8 text-center text-2xl font-black transition-colors md:text-3xl",
                flash === "ok" ? "bg-[#5fd3a5]/30" : flash === "no" ? "bg-[#ff7a6b]/25" : "bg-secondary",
              )}
            >
              {q.prompt}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {q.options.map((o, k) => (
                <button key={`${i}-${k}`} type="button" onClick={() => answer(k)} className="rounded-2xl border border-border px-3 py-4 text-[15px] leading-5 font-bold hover:bg-hover">
                  {o}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Time!</p>
            <p className="mt-1 text-5xl font-black">{right}</p>
            {!result ? (
              <p className="mt-3 text-muted-foreground">Saving…</p>
            ) : result.error ? (
              <p className="mt-3 text-ink-coral">{result.error}</p>
            ) : (
              <>
                <p className="mt-3 text-xl font-black text-ink-sun">+{result.reward} Clout</p>
                <p className="text-sm text-muted-foreground">Best: {result.best}{result.reward === 0 && right > 1 ? " · daily arcade Clout limit reached" : ""}</p>
              </>
            )}
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={onClose} className="rounded-full bg-brand py-3 font-black text-white">
                Done
              </button>
              <Link href="/creators" className="text-sm font-bold text-ink-lilac underline">
                Film your best score for TikTok and get paid as a creator
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
