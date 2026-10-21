"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { Trophy, Users, X } from "lucide-react";

import { joinGameChannel } from "@/lib/realtime";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * The Games Hall: live Quiz Battle with everyone in the hall on your server.
 * Realtime private channel world:games:<server>. Presence lists who's in; the
 * player with the lowest id hosts and broadcasts each question; everyone
 * scores their own answers and broadcasts their score for the leaderboard.
 */
type Q = { q: string; options: string[]; answer: number; topicTitle: string };
interface Round {
  n: number;
  idx: number;
  endsAt: number;
}

const ROUNDS = 8;
const ROUND_MS = 12_000;
const REVEAL_MS = 3_000;

export function GamesHall({ serverId, me, onClose }: { serverId: string; me: { id: string; username: string }; onClose: () => void }) {
  const [bank, setBank] = useState<Q[] | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [players, setPlayers] = useState<{ id: string; u: string }[]>([]);
  const [scores, setScores] = useState<Record<string, { u: string; s: number }>>({});
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const ch = useRef<RealtimeChannel | null>(null);
  const myScore = useRef(0);
  const hostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void import("@/lib/data/topics").then((m) =>
      setBank(m.QUESTION_BANK.filter((q) => q.options.length >= 2).map((q) => ({ q: q.q, options: q.options, answer: q.answer, topicTitle: q.topicTitle }))),
    );
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) {
      setStatus("error");
      return;
    }
    let disposed = false;
    const channel = sb.channel(`world:games:${serverId}`, { config: { private: true, presence: { key: me.id }, broadcast: { self: true } } });
    ch.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const st = channel.presenceState<{ u: string }>();
      setPlayers(Object.entries(st).map(([id, metas]) => ({ id, u: metas[0]?.u ?? "player" })).sort((a, b) => a.id.localeCompare(b.id)));
    });
    channel.on("broadcast", { event: "q" }, ({ payload }) => {
      const r = payload as Round;
      if (r.n === 1) {
        myScore.current = 0;
        setScores({});
        setDone(false);
      }
      setRound(r);
      setPicked(null);
    });
    channel.on("broadcast", { event: "s" }, ({ payload }) => {
      const p = payload as { i: string; u: string; s: number };
      setScores((x) => ({ ...x, [p.i]: { u: p.u, s: p.s } }));
    });
    channel.on("broadcast", { event: "end" }, () => {
      setDone(true);
      setRound(null);
    });
    void joinGameChannel(sb, channel, me.id, async (s) => {
      if (disposed) return;
      if (s === "SUBSCRIBED") {
        const tracked = await channel.track({ u: me.username });
        if (!disposed) setStatus(tracked === "ok" ? "live" : "error");
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "AUTH_ERROR") setStatus("error");
    }, () => disposed);
    return () => {
      disposed = true;
      if (hostTimer.current) clearTimeout(hostTimer.current);
      void sb.removeChannel(channel);
    };
  }, [serverId, me.id, me.username]);

  const host = players[0]?.id === me.id;

  // The host runs the clock: one question every ROUND_MS + REVEAL_MS.
  const start = () => {
    if (!bank?.length || !ch.current) return;
    const order = [...bank.keys()].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    const send = (n: number) => {
      if (n > ROUNDS) {
        void ch.current?.send({ type: "broadcast", event: "end", payload: {} });
        return;
      }
      void ch.current?.send({ type: "broadcast", event: "q", payload: { n, idx: order[n - 1], endsAt: Date.now() + ROUND_MS } satisfies Round });
      hostTimer.current = setTimeout(() => send(n + 1), ROUND_MS + REVEAL_MS);
    };
    send(1);
  };

  const q = round && bank ? bank[round.idx] : null;
  const left = round ? Math.max(0, round.endsAt - now) : 0;
  const reveal = round !== null && left === 0;

  const answer = (k: number) => {
    if (!q || picked !== null || reveal || !round) return;
    setPicked(k);
    if (k === q.answer) {
      // Faster right answers score more (100 to 200).
      myScore.current += 100 + Math.round((left / ROUND_MS) * 100);
    }
    void ch.current?.send({ type: "broadcast", event: "s", payload: { i: me.id, u: me.username, s: myScore.current } });
  };

  const board = useMemo(
    () =>
      players
        .map((p) => ({ id: p.id, u: scores[p.id]?.u ?? p.u, s: scores[p.id]?.s ?? 0 }))
        .sort((a, b) => b.s - a.s),
    [players, scores],
  );

  return (
    <div className="absolute inset-0 z-[100000] grid place-items-end bg-black/60 md:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Games Hall"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92%] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#f7f1e6] p-5 text-[#13203a] md:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-[#2b5fd9] uppercase">Games Hall</p>
            <h2 className="mt-1 text-2xl font-black">Quiz Battle</h2>
            <p className="text-sm text-[#13203a]/70">Live with everyone in the hall. Quickest right answers win.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Leave the Games Hall" className="jelly grid size-9 place-items-center rounded-full bg-white">
            <X className="size-4" />
          </button>
        </div>

        {status === "error" && (
          <p className="mt-4 rounded-2xl bg-[#fdeceb] p-3 text-sm font-bold text-[#8c1f1a]">
            Couldn&apos;t connect to the Games Hall server. Check your connection and try again in a moment.
          </p>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="min-h-64 rounded-2xl bg-white p-4">
            {!round && !done && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="text-lg font-black">{status === "live" ? `${players.length} in the hall` : "Joining the hall..."}</p>
                  <p className="mt-1 text-sm text-[#13203a]/70">{ROUNDS} questions from GCSE to A level, {ROUND_MS / 1000} seconds each.</p>
                  {host ? (
                    <button
                      type="button"
                      disabled={status !== "live" || !bank}
                      onClick={start}
                      className="jelly mt-4 rounded-full bg-[#2b5fd9] px-6 py-3 font-black text-white disabled:opacity-40"
                    >
                      Start the battle
                    </button>
                  ) : (
                    status === "live" && <p className="mt-4 text-sm font-bold">Waiting for @{players[0]?.u} to start.</p>
                  )}
                </div>
              </div>
            )}
            {done && !round && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Trophy className="mx-auto size-10 text-[#e0a100]" aria-hidden />
                  <p className="mt-2 text-xl font-black">@{board[0]?.u} wins with {board[0]?.s ?? 0}</p>
                  <p className="text-sm">You scored {myScore.current}.</p>
                  {host && (
                    <button type="button" onClick={start} className="jelly mt-4 rounded-full bg-[#2b5fd9] px-6 py-3 font-black text-white">
                      Play again
                    </button>
                  )}
                </div>
              </div>
            )}
            {q && round && (
              <div>
                <div className="flex items-center justify-between text-xs font-black text-[#13203a]/60">
                  <span>
                    Question {round.n} of {ROUNDS} · {q.topicTitle}
                  </span>
                  <span className="tabular-nums">{reveal ? "Time!" : `${Math.ceil(left / 1000)}s`}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#13203a]/10">
                  <div className="h-full bg-[#2b5fd9] transition-[width] duration-200" style={{ width: `${(left / ROUND_MS) * 100}%` }} />
                </div>
                <p className="mt-4 text-lg font-black">{q.q}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => answer(k)}
                      disabled={picked !== null || reveal}
                      className={cn(
                        "rounded-2xl border-2 px-3 py-3 text-left text-sm font-bold",
                        reveal && k === q.answer
                          ? "border-[#15987f] bg-[#e3f5ec]"
                          : picked === k
                            ? reveal
                              ? "border-[#c8322d] bg-[#fdeceb]"
                              : "border-[#2b5fd9] bg-[#eaf0ff]"
                            : "border-[#13203a]/10 bg-[#f7f1e6]",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <Users className="size-4" aria-hidden /> Leaderboard
            </p>
            <ol className="mt-2 space-y-1.5">
              {board.map((p, i) => (
                <li key={p.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm", p.id === me.id ? "bg-[#f2d9a6]" : "bg-[#f7f1e6]")}>
                  <span className="w-4 font-black">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{p.id === me.id ? "You" : `@${p.u}`}</span>
                  <span className="font-black tabular-nums">{p.s}</span>
                </li>
              ))}
              {board.length === 0 && <li className="text-sm text-[#13203a]/60">Nobody here yet.</li>}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
