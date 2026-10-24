"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Race, type RaceResult } from "./race";

import { friendRace, type FriendRoom } from "@/app/games/racing/live-actions";
import { KARTS, WORLDS, startState, trackOf, trackById, type RaceEvent } from "@/game/core/maths-racing";

export function FriendRaces() {
  const [room, setRoom] = useState<FriendRoom | null>(null);
  const [code, setCode] = useState("");
  const [trackId, setTrackId] = useState("w1-t1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const sending = useRef(false);
  const latest = useRef<{ t: number; events: RaceEvent[] } | null>(null);
  const codeRef = useRef<string | null>(null);
  codeRef.current = room?.code ?? null;
  const track = useMemo(() => trackById(room?.track ?? trackId)!, [room?.track, trackId]);
  const change = async (action: "create" | "join" | "start" | "leave") => {
    setBusy(true); setNote("");
    try { const r = await friendRace({ action, code: room?.code ?? (action === "join" ? code : undefined), track: trackId }); if (r.error) setNote(r.error); else { setRoom(r.room); setDone(false); latest.current = null; } }
    catch { setNote("Connection lost. Try again."); } finally { setBusy(false); }
  };
  const progress = useCallback((t: number, events: RaceEvent[]) => { latest.current = { t, events }; }, []);
  const finish = useCallback((r: RaceResult) => { latest.current = { t: r.time, events: r.events }; setDone(true); }, []);
  useEffect(() => {
    if (!room?.code) return;
    let active = true;
    const sync = async () => {
      if (sending.current) return;
      sending.current = true;
      try {
        const packet = latest.current;
        const r = await friendRace({ action: packet ? "sync" : "poll", code: room.code, ...(packet ?? {}) });
        if (active) { if (r.error) setNote(r.error); else { setRoom(r.room); setNote(""); } }
      } catch { if (active) setNote("Reconnecting to the race…"); } finally { sending.current = false; }
    };
    const timer = setInterval(() => void sync(), 1500);
    void sync();
    return () => { active = false; clearInterval(timer); };
  }, [room?.code]);
  useEffect(() => () => { const current = codeRef.current; if (current) void friendRace({ action: "leave", code: current }); }, []);
  if (room?.startsAt && !done) return <div className="fixed inset-0 z-[100030] bg-[#0b0f17] p-2 sm:p-4"><Race track={track} seed={room.seed} kart={KARTS[0]} startsAt={Date.parse(room.startsAt)} livePlayers={room.players.filter(p => !p.me).map(p => ({ name: p.name, state: p.state ?? startState() }))} onProgress={progress} onDone={finish} onQuit={() => void change("leave")} />{note && <p role="status" className="absolute top-12 left-4 rounded-xl bg-black/70 p-2 text-sm text-white">{note}</p>}</div>;
  return <section className="rounded-3xl border bg-card p-5 text-card-foreground"><h2 className="text-2xl font-black">Live friend races · 2–6 players</h2><p className="mt-2 text-sm text-muted-foreground">Share a private room code, race the same track and questions, and see your friends on the road. Live positions update about every 1.5 seconds. These unranked races award no Clout, coins or voucher points.</p>
    {!room ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="text-sm font-bold">Track<select value={trackId} onChange={e => setTrackId(e.target.value)} className="my-2 block w-full rounded-xl border bg-background p-3">{WORLDS.flatMap(w => [0, 1, 2, 3].map(i => { const t = trackOf(w.id, i); return <option key={t.id} value={t.id}>{t.name}</option>; }))}</select></label><button type="button" disabled={busy} onClick={() => void change("create")} className="rounded-full bg-primary px-4 py-2 font-black text-primary-foreground">Create race</button></div><div><label className="text-sm font-bold">Room code<input maxLength={8} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))} className="my-2 block w-full rounded-xl border bg-background p-3 font-mono" /></label><button type="button" disabled={busy || code.length !== 8} onClick={() => void change("join")} className="rounded-full bg-secondary px-4 py-2 font-black disabled:opacity-50">Join friends</button></div></div> : <div className="mt-4 space-y-3"><p className="font-black">Room <span className="select-all font-mono text-xl">{room.code}</span> · {room.players.length}/6 · {track.name}</p><ol className="grid gap-2">{[...room.players].sort((a, b) => (a.state?.finishedAt ?? Infinity) - (b.state?.finishedAt ?? Infinity)).map(p => <li key={p.id} className="flex justify-between rounded-xl bg-secondary p-3"><span>@{p.name}{p.me ? " · You" : ""}</span><span>{p.state?.finishedAt ? `${(p.state.finishedAt / 1000).toFixed(2)}s` : p.connected ? (room.startsAt ? "Racing…" : "Ready") : "Disconnected"}</span></li>)}</ol>{room.host && !room.startsAt && <button type="button" disabled={busy || room.players.filter(p => p.connected).length < 2} onClick={() => void change("start")} className="rounded-full bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-50">Start race</button>}<button type="button" disabled={busy} onClick={() => void change("leave")} className="ml-2 rounded-full border px-5 py-3 font-bold">Leave room</button>{done && <p className="text-sm">Your time is saved for this room. Remaining racers can finish; standings update automatically.</p>}</div>}
    {note && <p role="status" className="mt-3 text-sm">{note}</p>}
  </section>;
}
