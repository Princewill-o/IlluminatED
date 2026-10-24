"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { eventCoins, marathonBoard, marathonEnter, type CoinWallet, type MarathonBoard } from "@/app/games/events/actions";

export function MarathonPanel() {
  const [board, setBoard] = useState<MarathonBoard | null>(null);
  const [wallet, setWallet] = useState<CoinWallet | null>(null);
  const [eligible, setEligible] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    const [b, c] = await Promise.all([marathonBoard(), eventCoins()]);
    setBoard(b); setWallet(c.wallet);
  }, []);
  useEffect(() => { void load().catch(() => setNote("Could not load event rewards. Please try again.")); }, [load]);
  const enter = async () => {
    setBusy(true);
    try { const r = await marathonEnter(eligible, guardian); setNote(r.ok ? "You’re entered. Championship answers during the event now count." : r.error); if (r.ok) await load(); }
    catch { setNote("Could not enter. Please try again."); } finally { setBusy(false); }
  };
  const buy = async (id: string) => {
    setBusy(true);
    try { const r = await eventCoins(id); if (r.wallet) setWallet(r.wallet); setNote(r.error || "Badge unlocked!"); }
    catch { setNote("Could not unlock the badge. Please try again."); } finally { setBusy(false); }
  };
  return <section className="my-6 grid gap-5 rounded-3xl border bg-card p-5 text-card-foreground">
    <div><h2 className="text-2xl font-black">Marathon leaderboard</h2><p className="mt-1 text-sm text-muted-foreground">30 days of Championship practice. Scores start after entry and the event opening date. Free and paid accounts receive the same 15-question daily limit.</p></div>
    {!board ? <button type="button" onClick={() => void load()} className="rounded-full bg-secondary px-4 py-2 font-bold">Reload event status</button> : <>
      <p className="text-sm">Opens {new Date(board.startsAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })} · Ends {new Date(new Date(board.endsAt).getTime() - 1).toLocaleDateString("en-GB", { timeZone: "Europe/London" })} at 23:59 London time.</p>
      {!board.entered ? <div className="grid gap-3">
        <label className="flex items-start gap-2"><input type="checkbox" checked={eligible} onChange={e => setEligible(e.target.checked)} className="mt-1" /><span>I am aged 13+ and resident in the UK, and accept the <Link href="/events/marathon" target="_blank" className="font-bold underline">marathon rules</Link>.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={guardian} onChange={e => setGuardian(e.target.checked)} className="mt-1" /><span>I am 18+ or have my parent or guardian’s permission to enter and claim a prize.</span></label>
        <button type="button" disabled={busy || !eligible || !guardian} onClick={() => void enter()} className="rounded-full bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-50">Enter free</button>
      </div> : <p className="font-bold">Entered · Your rank: {board.mine?.rank ?? "–"} · {board.mine?.points ?? 0} points</p>}
      <ol className="grid gap-2">{board.top.map(row => <li key={row.rank} className={`flex justify-between rounded-xl p-3 ${row.me ? "bg-primary/15" : "bg-secondary"}`}><span>#{row.rank} @{row.name}{row.me ? " · You" : ""}</span><strong>{row.points} pts</strong></li>)}</ol>
      {!board.top.length && <p className="text-sm text-muted-foreground">No entries yet. Be the first to join.</p>}
      <button type="button" onClick={() => void load()} className="justify-self-start text-sm font-bold underline">Refresh standings</button>
    </>}
    <div className="border-t pt-4"><h3 className="text-xl font-black">IllumED Coins · {wallet?.balance ?? "–"}</h3><p className="mt-1 text-sm text-muted-foreground">One coin per verified correct Championship answer, separate from Clout. Spend 25 coins on a collection badge. Coins cannot be bought, transferred, or exchanged for money or vouchers.</p>
      <div className="mt-3 flex flex-wrap gap-2">{[["marathoner", "🏆 Marathoner"], ["race-fan", "🏎️ Race fan"], ["what-if-dreamer", "✨ What If dreamer"]].map(([id, title]) => <button key={id} type="button" disabled={busy || !wallet || wallet.owned.includes(id) || wallet.balance < 25} onClick={() => void buy(id)} className="rounded-2xl border bg-secondary px-4 py-3 font-bold disabled:opacity-60">{title} · {wallet?.owned.includes(id) ? "Collected ✓" : "25 coins"}</button>)}</div>
    </div>
    {note && <p role="status" className="rounded-xl bg-secondary p-3 text-sm">{note}</p>}
  </section>;
}
