"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { Bot, Building2, Crown, Dice5, Grid3x3, Hash, Swords, Trophy, Users, Wifi, X } from "lucide-react";

import { EventAdStrip, useTechEvents } from "../event-ads";
import { GamesHall } from "../world/games-hall";

import {
  C4_COLS,
  C4_ROWS,
  type C4State,
  type DMove,
  type DraughtsState,
  type TttState,
  c4Ai,
  c4Move,
  c4New,
  draughtsAi,
  draughtsMove,
  draughtsMoves,
  draughtsNew,
  tttAi,
  tttMove,
  tttNew,
} from "@/game/core/hub/simple";
import {
  BOARD,
  MAX_ROUNDS,
  SIDE,
  type TState,
  flatCost,
  ownsSet,
  spaceCell,
  tycoonBuild,
  tycoonBuy,
  tycoonCpuStep,
  tycoonNew,
  tycoonQuiz,
  tycoonRoll,
} from "@/game/core/hub/tycoon";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * The Games Hub: board and table games you can play against the computer, pass
 * the device round, or play online with friends using a room code. London
 * Tycoon (our own property game), Connect Four, draughts, noughts and crosses,
 * and the live Quiz Battle.
 */
type GameId = "tycoon" | "c4" | "draughts" | "ttt" | "quiz";
type Mode = "cpu" | "local" | "online";
interface Me {
  id: string;
  username: string;
}

const GAMES: { id: GameId; name: string; blurb: string; players: string; colour: string; Icon: typeof Dice5 }[] = [
  { id: "tycoon", name: "London Tycoon", blurb: "Buy London, build flats, charge rent. Pop Quiz cards pay out for right answers.", players: "2 to 4", colour: "#2b5fd9", Icon: Building2 },
  { id: "c4", name: "Connect Four", blurb: "Drop counters, get four in a row before they do.", players: "2", colour: "#c8322d", Icon: Grid3x3 },
  { id: "draughts", name: "Draughts", blurb: "Classic English draughts. Jumps are compulsory, reach the end to be crowned.", players: "2", colour: "#13203a", Icon: Crown },
  { id: "ttt", name: "Noughts & Crosses", blurb: "Quick and deadly. The computer never loses, can you draw?", players: "2", colour: "#15987f", Icon: Hash },
  { id: "quiz", name: "Quiz Battle", blurb: "Live revision quiz with everyone on your server.", players: "Everyone", colour: "#7a5ce6", Icon: Swords },
];

// ── Online rooms: the player whose turn it is makes the move and sends the whole state ──
function useRoom<T>(code: string | null, me: Me, make: (seats: { id: string; name: string }[]) => T) {
  const [seats, setSeats] = useState<{ id: string; name: string }[]>([]);
  const [state, setState] = useState<T | null>(null);
  const [status, setStatus] = useState<"off" | "joining" | "live" | "error">("off");
  const ch = useRef<RealtimeChannel | null>(null);
  const makeRef = useRef(make);
  makeRef.current = make;
  useEffect(() => {
    if (!code) return;
    const sb = browserSupabase();
    if (!sb) {
      setStatus("error");
      return;
    }
    setStatus("joining");
    const c = sb.channel(`world:hub:${code}`, { config: { private: true, presence: { key: me.id }, broadcast: { self: false } } });
    ch.current = c;
    c.on("presence", { event: "sync" }, () => {
      const st = c.presenceState<{ u: string; t: number }>();
      setSeats(
        Object.entries(st)
          .map(([id, m]) => ({ id, name: m[0]?.u ?? "player", t: m[0]?.t ?? 0 }))
          .sort((a, b) => a.t - b.t)
          .map(({ id, name }) => ({ id, name })),
      );
    });
    c.on("broadcast", { event: "s" }, ({ payload }) => setState(payload as T));
    c.on("broadcast", { event: "hello" }, () => {
      setState((s) => {
        if (s) void c.send({ type: "broadcast", event: "s", payload: s });
        return s;
      });
    });
    c.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        setStatus("live");
        await c.track({ u: me.username, t: Date.now() });
        void c.send({ type: "broadcast", event: "hello", payload: {} });
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
    });
    return () => {
      void sb.removeChannel(c);
      ch.current = null;
    };
  }, [code, me.id, me.username]);
  const push = useCallback((s: T) => {
    setState(s);
    void ch.current?.send({ type: "broadcast", event: "s", payload: s });
  }, []);
  const start = useCallback(() => push(makeRef.current(seats)), [push, seats]);
  return { seats, state, status, push, start, mySeat: seats.findIndex((s) => s.id === me.id) };
}

export function GamesHub({ me, serverId, onClose }: { me: Me; serverId?: string | null; onClose?: () => void }) {
  const [game, setGame] = useState<GameId | null>(null);
  const [mode, setMode] = useState<Mode>("cpu");
  const [room, setRoom] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const info = GAMES.find((g) => g.id === game);
  const events = useTechEvents();

  const body = (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.25em] text-[#2b5fd9] uppercase">Games Hub</p>
          <h2 className="mt-1 text-3xl font-black">{info ? info.name : "Pick a game"}</h2>
          <p className="text-sm text-[#13203a]/70">{info ? info.blurb : "Play the computer, pass the device round, or start an online room for friends."}</p>
        </div>
        <div className="flex gap-2">
          {game && (
            <button
              type="button"
              onClick={() => {
                setGame(null);
                setRoom(null);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-black"
            >
              All games
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!game && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => setGame(g.id)} className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border-2 border-white bg-white text-left shadow-[0_4px_0_rgba(19,32,58,0.08)] transition hover:-translate-y-1">
                <span className="relative grid h-28 place-items-center overflow-hidden" style={{ background: g.colour }}>
                  <span className="absolute -right-6 -bottom-8 size-28 rounded-full bg-white/15 transition group-hover:scale-125" />
                  <g.Icon className="size-12 text-white" aria-hidden />
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <span className="font-black">{g.name}</span>
                  <span className="mt-1 text-xs text-[#13203a]/70">{g.blurb}</span>
                  <span className="mt-auto pt-3 text-[11px] font-black text-[#2b5fd9]">
                    <Users className="mr-1 inline size-3.5" aria-hidden />
                    {g.players === "Everyone" ? "Everyone on your server" : `${g.players} players`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!game && <EventAdStrip events={events} />}

      {game && game !== "quiz" && !room && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["cpu", "vs computer", Bot],
              ["local", "Pass and play", Users],
              ["online", "Online room", Wifi],
            ] as const
          ).map(([m, label, Icon]) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black", mode === m ? "bg-[#13203a] text-white" : "bg-white")}>
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
          {mode === "online" && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setRoom(Math.random().toString(36).slice(2, 7).toUpperCase())} className="rounded-full bg-[#2b5fd9] px-4 py-2 text-sm font-black text-white">
                New room
              </button>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))} placeholder="Room code" className="w-28 rounded-full border-2 border-white bg-white px-3 py-2 text-sm font-black tracking-widest uppercase" />
              <button type="button" disabled={joinCode.length !== 5} onClick={() => setRoom(joinCode)} className="rounded-full bg-white px-4 py-2 text-sm font-black disabled:opacity-40">
                Join
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {game && game !== "quiz" && mode === "online" && !room && <p className="rounded-2xl bg-white p-4 text-sm font-bold">Create a room or enter a friend’s room code to play online.</p>}
        {game === "quiz" && serverId && <GamesHall serverId={serverId} me={me} onClose={() => setGame(null)} />}
        {game === "quiz" && !serverId && <p className="rounded-2xl bg-white p-4 text-sm font-bold">Quiz Battle runs inside the world: head to the Games Hall at Battersea.</p>}
        {game === "tycoon" && (mode !== "online" || room) && <TycoonGame key={`${mode}${room}`} me={me} mode={mode} room={room} />}
        {game === "c4" && (mode !== "online" || room) && <TwoPlayer key={`c4${mode}${room}`} me={me} mode={mode} room={room} kind="c4" />}
        {game === "draughts" && (mode !== "online" || room) && <TwoPlayer key={`d${mode}${room}`} me={me} mode={mode} room={room} kind="draughts" />}
        {game === "ttt" && (mode !== "online" || room) && <TwoPlayer key={`t${mode}${room}`} me={me} mode={mode} room={room} kind="ttt" />}
      </div>
    </div>
  );

  if (!onClose) return <div className="rounded-3xl bg-[#f7f1e6] p-5 text-[#13203a] [color-scheme:light]">{body}</div>;
  return (
    <div className="absolute inset-0 z-[100004] overflow-y-auto bg-black/60 p-3 md:p-6" onClick={onClose}>
      <div role="dialog" aria-label="Games Hub" onClick={(e) => e.stopPropagation()} className="mx-auto max-w-5xl rounded-3xl bg-[#f7f1e6] p-5 text-[#13203a]">
        {body}
      </div>
    </div>
  );
}

function RoomBar({ code, seats, status, need, canStart, onStart }: { code: string; seats: { id: string; name: string }[]; status: string; need: string; canStart: boolean; onStart: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm">
      <span className="rounded-full bg-[#13203a] px-3 py-1 font-mono font-black tracking-widest text-white">{code}</span>
      <span className="font-bold">{status === "live" ? `${seats.length} in the room: ${seats.map((s) => s.name).join(", ")}` : status === "error" ? "Couldn't connect to the room server." : "Joining..."}</span>
      <span className="text-[#13203a]/60">Share the code. {need}</span>
      {canStart && (
        <button type="button" onClick={onStart} className="ml-auto rounded-full bg-[#2b5fd9] px-4 py-1.5 font-black text-white">
          Start
        </button>
      )}
    </div>
  );
}

// ── Two-player games (Connect Four, draughts, noughts and crosses) ──
type TwoState = { kind: "c4"; s: C4State; names: string[] } | { kind: "draughts"; s: DraughtsState; names: string[] } | { kind: "ttt"; s: TttState; names: string[] };
const freshTwo = (kind: TwoState["kind"], names: string[]): TwoState =>
  kind === "c4" ? { kind, s: c4New(), names } : kind === "draughts" ? { kind, s: draughtsNew(), names } : { kind, s: tttNew(), names };

function TwoPlayer({ me, mode, room, kind }: { me: Me; mode: Mode; room: string | null; kind: TwoState["kind"] }) {
  const online = mode === "online" && room;
  const r = useRoom<TwoState>(online ? room : null, me, (seats) => freshTwo(kind, seats.slice(0, 2).map((s) => s.name)));
  const [local, setLocal] = useState<TwoState>(() => freshTwo(kind, mode === "cpu" ? ["You", "Computer"] : ["Player 1", "Player 2"]));
  const st = online ? r.state : local;
  const set = online ? r.push : setLocal;
  const turn = st ? st.s.turn : 0;
  const myTurn = online ? r.mySeat === turn : mode === "local" || turn === 0;

  // Computer moves.
  useEffect(() => {
    if (mode !== "cpu" || !st || st.s.turn !== 1) return;
    const done = st.kind === "draughts" ? st.s.winner !== null : st.s.winner !== null || (st.s as TttState | C4State).draw;
    if (done) return;
    const t = setTimeout(() => {
      if (st.kind === "ttt") setLocal({ ...st, s: tttMove(st.s, tttAi(st.s)) });
      else if (st.kind === "c4") setLocal({ ...st, s: c4Move(st.s, c4Ai(st.s)) });
      else {
        const m = draughtsAi(st.s);
        if (m) setLocal({ ...st, s: draughtsMove(st.s, m) });
      }
    }, 550);
    return () => clearTimeout(t);
  }, [st, mode]);

  if (online && !st)
    return <RoomBar code={room!} seats={r.seats} status={r.status} need="Two players needed." canStart={r.mySeat === 0 && r.seats.length >= 2} onStart={r.start} />;
  if (!st) return null;
  const winner = st.s.winner;
  const draw = st.kind !== "draughts" && (st.s as TttState | C4State).draw;
  const names = st.names.length === 2 ? st.names : ["Player 1", "Player 2"];
  const who = (i: number) => (names[i] === "You" ? "You" : names[i]);
  const banner = winner !== null ? (names[winner] === "You" ? "You win!" : `${who(winner)} wins!`) : draw ? "It's a draw." : names[turn] === "You" ? "Your turn" : `${names[turn]}'s turn`;
  return (
    <div>
      {online && <RoomBar code={room!} seats={r.seats} status={r.status} need="" canStart={false} onStart={() => {}} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("rounded-full px-4 py-2 text-sm font-black", winner !== null ? "bg-[#f2d9a6]" : "bg-white")}>
          {winner !== null && <Trophy className="mr-1 inline size-4" aria-hidden />}
          {banner}
        </p>
        <button type="button" onClick={() => set(freshTwo(kind, names))} className="rounded-full bg-white px-4 py-2 text-sm font-black">
          New game
        </button>
      </div>
      <div className="mt-4 grid place-items-center">
        {st.kind === "ttt" && (
          <div className="grid grid-cols-3 gap-2 rounded-3xl bg-[#13203a] p-2">
            {st.s.board.map((c, i) => (
              <button key={i} type="button" disabled={!myTurn || !!c || winner !== null} onClick={() => set({ ...st, s: tttMove(st.s, i) })} className="grid size-24 place-items-center rounded-2xl bg-[#f7f1e6] text-5xl font-black md:size-28" aria-label={`Square ${i + 1}`}>
                <span className={cn("hub-pop", c === 1 ? "text-[#2b5fd9]" : "text-[#c8322d]")}>{c === 1 ? "X" : c === 2 ? "O" : ""}</span>
              </button>
            ))}
          </div>
        )}
        {st.kind === "c4" && (
          <div className="rounded-3xl bg-[#2b5fd9] p-3 shadow-[0_8px_0_#1f3fa8]">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${C4_COLS}, minmax(0, 1fr))` }}>
              {Array.from({ length: C4_ROWS * C4_COLS }, (_, i) => {
                const v = st.s.board[i];
                const col = i % C4_COLS;
                const hot = st.s.line.includes(i);
                return (
                  <button key={i} type="button" disabled={!myTurn || winner !== null} onClick={() => set({ ...st, s: c4Move(st.s, col) })} className="size-10 rounded-full bg-[#13203a]/40 md:size-14" aria-label={`Column ${col + 1}`}>
                    {v > 0 && <span key={`${i}${v}`} className={cn("c4-drop block size-full rounded-full border-4", v === 1 ? "border-[#e0a100] bg-[#ffd166]" : "border-[#a3201c] bg-[#e04a3f]", hot && "ring-4 ring-white")} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {st.kind === "draughts" && <DraughtsBoard st={st.s} canMove={myTurn && winner === null} onMove={(m) => set({ ...st, s: draughtsMove(st.s, m) })} flip={online ? r.mySeat === 1 : false} />}
      </div>
    </div>
  );
}

function DraughtsBoard({ st, canMove, onMove, flip }: { st: DraughtsState; canMove: boolean; onMove: (m: DMove) => void; flip: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const moves = useMemo(() => draughtsMoves(st), [st]);
  const from = st.chain ?? sel;
  const targets = moves.filter((m) => m.from === from);
  const order = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));
  return (
    <div className="grid grid-cols-8 overflow-hidden rounded-2xl border-8 border-[#7a4f32] shadow-[0_8px_0_#5a3a28]">
      {order.map((i) => {
        const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
        const v = st.board[i];
        const target = targets.find((m) => m.to === i);
        const movable = canMove && moves.some((m) => m.from === i);
        return (
          <button
            key={i}
            type="button"
            disabled={!canMove || (!target && !movable)}
            onClick={() => {
              if (target) {
                onMove(target);
                setSel(null);
              } else setSel(i);
            }}
            className={cn("relative grid size-10 place-items-center md:size-14", dark ? "bg-[#a46a45]" : "bg-[#f2d9a6]", from === i && "ring-4 ring-inset ring-[#ffd166]")}
            aria-label={`Square ${i}`}
          >
            {target && <span className="absolute size-4 rounded-full bg-[#ffd166]/80" />}
            {v > 0 && (
              <span className={cn("grid size-8 place-items-center rounded-full border-4 shadow-[0_3px_0_rgba(0,0,0,0.35)] md:size-11", v === 1 || v === 3 ? "border-[#f3f6fb] bg-[#e04a3f]" : "border-[#8d93a0] bg-[#1b1622]", movable && "hub-pulse")}>
                {v > 2 && <Crown className="size-5 text-[#ffd166]" aria-hidden />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── London Tycoon ──
type Quiz = { q: string; options: string[]; answer: number; topicTitle: string };

function TycoonGame({ me, mode, room }: { me: Me; mode: Mode; room: string | null }) {
  const online = mode === "online" && room;
  const r = useRoom<TState>(online ? room : null, me, (seats) => tycoonNew(seats.slice(0, 4).map((s) => ({ id: s.id, name: s.name, cpu: false }))));
  const [count, setCount] = useState(3);
  const [local, setLocal] = useState<TState | null>(null);
  const st = online ? r.state : local;
  const set = online ? r.push : setLocal;
  const [bank, setBank] = useState<Quiz[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    void import("@/lib/data/topics").then((m) => setBank(m.QUESTION_BANK.filter((q) => q.options.length >= 2).map((q) => ({ q: q.q, options: q.options, answer: q.answer, topicTitle: q.topicTitle }))));
  }, []);
  const turnPlayer = st?.players[st.turn];
  const myTurn = !!st && (online ? st.players[st.turn]?.id === me.id : !turnPlayer?.cpu);

  // Computer players take their turns.
  useEffect(() => {
    if (!st || st.phase === "over" || !turnPlayer?.cpu) return;
    const t = setTimeout(() => set(tycoonCpuStep(st)), 900);
    return () => clearTimeout(t);
  }, [st, turnPlayer, set]);
  useEffect(() => setPicked(null), [st?.quiz]);

  if (online && !st) return <RoomBar code={room!} seats={r.seats} status={r.status} need="2 to 4 players." canStart={r.mySeat === 0 && r.seats.length >= 2} onStart={r.start} />;
  if (!st)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4">
        <span className="text-sm font-black">Players</span>
        {[2, 3, 4].map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)} className={cn("size-10 rounded-full font-black", count === n ? "bg-[#13203a] text-white" : "bg-[#f7f1e6]")}>
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setLocal(
              tycoonNew(
                Array.from({ length: count }, (_, i) =>
                  mode === "cpu" ? { id: i ? `cpu${i}` : me.id, name: i ? ["Ada Bot", "Tiggy Bot", "Big Ben Bot"][i - 1] : me.username, cpu: i > 0 } : { id: `p${i}`, name: `Player ${i + 1}`, cpu: false },
                ),
              ),
            )
          }
          className="ml-auto rounded-full bg-[#2b5fd9] px-6 py-2.5 font-black text-white"
        >
          Start game
        </button>
      </div>
    );

  const quiz = st.quiz !== null && bank?.length ? bank[st.quiz % bank.length] : null;
  const here = BOARD[turnPlayer!.pos];
  return (
    <div>
      {online && <RoomBar code={room!} seats={r.seats} status={r.status} need="" canStart={false} onStart={() => {}} />}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-[#13203a] bg-[#dff0e2]">
          <div className="grid size-full" style={{ gridTemplateColumns: `1.3fr repeat(${SIDE - 1}, 1fr) 1.3fr`, gridTemplateRows: `1.3fr repeat(${SIDE - 1}, 1fr) 1.3fr` }}>
            {BOARD.map((sp, i) => {
              const { row, col } = spaceCell(i);
              const o = st.owner[i];
              const tokens = st.players.filter((p) => !p.out && p.pos === i);
              const corner = i % SIDE === 0;
              return (
                <div key={i} className={cn("relative flex flex-col border border-[#13203a]/25 bg-[#f7f1e6] p-0.5 text-center", corner && "bg-[#f2d9a6]")} style={{ gridRow: row + 1, gridColumn: col + 1 }} title={sp.name}>
                  {sp.colour && sp.kind === "place" && <span className="h-[18%] w-full rounded-sm" style={{ background: sp.colour }} />}
                  <span className="line-clamp-2 text-[7px] leading-tight font-black md:text-[9px]">{sp.name}</span>
                  {sp.price && sp.kind !== "tax" && <span className="text-[7px] font-bold text-[#13203a]/60 md:text-[8px]">£{sp.price}</span>}
                  {(st.flats[i] ?? 0) > 0 && <span className="text-[8px] font-black text-[#15987f]">{"▲".repeat(st.flats[i])}</span>}
                  {o !== undefined && <span className="absolute right-0.5 bottom-0.5 size-2 rounded-full border border-white" style={{ background: st.players[o].colour }} />}
                  <span className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                    {tokens.map((p) => (
                      <span key={p.id} className="hub-token size-3 rounded-full border-2 border-white shadow md:size-4" style={{ background: p.colour }} />
                    ))}
                  </span>
                </div>
              );
            })}
            {/* Centre of the board */}
            <div className="flex flex-col items-center justify-center gap-2 p-3" style={{ gridRow: `2 / ${SIDE + 1}`, gridColumn: `2 / ${SIDE + 1}` }}>
              <p className="text-xl font-black tracking-tight text-[#13203a] md:text-3xl">London Tycoon</p>
              <p className="text-[10px] font-bold text-[#13203a]/60 md:text-xs">
                Round {Math.min(st.round, MAX_ROUNDS)} of {MAX_ROUNDS}
              </p>
              <div className="flex gap-2">
                {st.dice.map((d, i) => (
                  <span key={`${i}${d}${st.log.length}`} className="hub-dice grid size-10 place-items-center rounded-xl border-2 border-[#13203a] bg-white text-xl font-black shadow-[0_3px_0_#13203a] md:size-12">
                    {d}
                  </span>
                ))}
              </div>
              {st.phase === "over" ? (
                <p className="rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black">
                  <Trophy className="mr-1 inline size-4" aria-hidden />
                  {st.players[st.winner ?? 0].name} wins!
                </p>
              ) : (
                <p className="text-center text-xs font-black md:text-sm" style={{ color: turnPlayer!.colour }}>
                  {turnPlayer!.name}
                  {turnPlayer!.cpu ? " is thinking..." : myTurn ? ", your turn" : "'s turn"}
                </p>
              )}
              {myTurn && st.phase === "roll" && (
                <button type="button" onClick={() => set(tycoonRoll(st))} className="rounded-full bg-[#2b5fd9] px-6 py-2.5 font-black text-white shadow-[0_4px_0_#1f3fa8] active:translate-y-0.5">
                  <Dice5 className="mr-1 inline size-5" aria-hidden /> Roll
                </button>
              )}
              {myTurn && st.phase === "buy" && (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow">
                  <p className="text-sm font-black">
                    Buy {here.name} for £{here.price}?
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set(tycoonBuy(st, true))} className="rounded-full bg-[#15987f] px-4 py-2 text-sm font-black text-white">
                      Buy it
                    </button>
                    <button type="button" onClick={() => set(tycoonBuy(st, false))} className="rounded-full bg-[#f7f1e6] px-4 py-2 text-sm font-black">
                      No thanks
                    </button>
                  </div>
                </div>
              )}
              {myTurn && st.phase === "quiz" && quiz && (
                <div className="w-full max-w-sm rounded-2xl bg-white p-3 shadow">
                  <p className="text-[10px] font-black tracking-widest text-[#7a5ce6] uppercase">Pop Quiz · {quiz.topicTitle}</p>
                  <p className="mt-1 text-sm font-black">{quiz.q}</p>
                  <div className="mt-2 grid gap-1.5">
                    {quiz.options.map((o, k) => (
                      <button
                        key={k}
                        type="button"
                        disabled={picked !== null}
                        onClick={() => {
                          setPicked(k);
                          setTimeout(() => set(tycoonQuiz(st, k === quiz.answer)), 1100);
                        }}
                        className={cn("rounded-xl border-2 px-2 py-1.5 text-left text-xs font-bold", picked !== null && k === quiz.answer ? "border-[#15987f] bg-[#e3f5ec]" : picked === k ? "border-[#c8322d] bg-[#fdeceb]" : "border-[#13203a]/10")}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <ul className="space-y-2">
            {st.players.map((p, i) => (
              <li key={p.id} className={cn("flex items-center gap-2 rounded-2xl bg-white p-3", i === st.turn && st.phase !== "over" && "ring-2 ring-[#13203a]", p.out && "opacity-40")}>
                <span className="size-4 rounded-full" style={{ background: p.colour }} />
                <span className="min-w-0 flex-1 truncate text-sm font-black">
                  {p.name} {p.cpu && <Bot className="inline size-3.5" aria-hidden />}
                  {p.detention > 0 && <span className="ml-1 text-[10px] text-[#c8322d]">in Detention</span>}
                </span>
                <span className="text-sm font-black tabular-nums">£{p.cash.toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ul>
          {myTurn && st.phase === "roll" && (
            <BuildPanel st={st} onBuild={(i) => set(tycoonBuild(st, i))} />
          )}
          <div className="max-h-56 overflow-y-auto rounded-2xl bg-white p-3 text-xs">
            {st.log.map((l, i) => (
              <p key={i} className={cn("py-0.5", i === 0 && "font-black")}>
                {l}
              </p>
            ))}
          </div>
          {!online && (
            <button type="button" onClick={() => setLocal(null)} className="w-full rounded-full bg-white py-2 text-sm font-black">
              New game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildPanel({ st, onBuild }: { st: TState; onBuild: (i: number) => void }) {
  const mine = BOARD.map((sp, i) => ({ sp, i })).filter(({ sp, i }) => sp.kind === "place" && st.owner[i] === st.turn && ownsSet(st, st.turn, sp.group!) && (st.flats[i] ?? 0) < 3);
  if (!mine.length) return null;
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-black tracking-widest uppercase">Build flats</p>
      <div className="mt-2 grid gap-1.5">
        {mine.map(({ sp, i }) => (
          <button key={i} type="button" disabled={st.players[st.turn].cash < flatCost(i)} onClick={() => onBuild(i)} className="flex items-center gap-2 rounded-xl bg-[#f7f1e6] px-2 py-1.5 text-left text-xs font-bold disabled:opacity-40">
            <span className="size-3 rounded-sm" style={{ background: sp.colour }} />
            <span className="flex-1">{sp.name}</span>£{flatCost(i)}
          </button>
        ))}
      </div>
    </div>
  );
}
