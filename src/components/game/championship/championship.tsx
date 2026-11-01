"use client";

import { useCallback, useEffect, useState } from "react";

import { Award, CalendarClock, Check, Crown, Gift, Medal, Share2, Target, Timer, Trophy, Users, X } from "lucide-react";

import {
  type ChampAnswer, type ChampBoard, type ChampQuestion, type ChampStatus, type Division, champAnswer, champBoard, champClaim, champEnter, champNext, champStatus,
} from "@/app/games/championship/actions";
import { MarathonPanel } from "@/components/game/season/marathon-panel";
import { cn } from "@/lib/utils";

const DIVISIONS: { id: Division; name: string; blurb: string; colour: string }[] = [
  { id: "gcse-foundation", name: "GCSE Foundation", blurb: "Core GCSE questions, all subjects", colour: "#15987f" },
  { id: "gcse-higher", name: "GCSE Higher", blurb: "Harder GCSE questions and stretch", colour: "#2b5fd9" },
  { id: "a-level", name: "A level", blurb: "A level questions, all subjects", colour: "#7a5ce6" },
  { id: "vocational", name: "BTEC and T Level", blurb: "Vocational and applied questions", colour: "#d6452a" },
];
const divisionName = (d: Division) => DIVISIONS.find((x) => x.id === d)?.name ?? d;
const BADGE: Record<string, { name: string; colour: string }> = {
  gold: { name: "Gold · top 10%", colour: "#e0a100" }, silver: { name: "Silver · top 25%", colour: "#8a94a6" },
  bronze: { name: "Bronze · top 50%", colour: "#b26b3a" }, finisher: { name: "Finisher", colour: "#2b5fd9" },
};
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((to - now) / 1000));
  const parts = [[Math.floor(s / 86400), "d"], [Math.floor((s % 86400) / 3600), "h"], [Math.floor((s % 3600) / 60), "m"], [s % 60, "s"]] as const;
  return (
    <span className="flex gap-1.5" aria-label="Time left this week">
      {parts.map(([v, u]) => <span key={u} className="min-w-12 rounded-xl bg-white/12 px-2 py-1.5 text-center"><b className="block text-2xl leading-none tabular-nums">{String(v).padStart(2, "0")}</b><span className="text-[10px] font-bold uppercase opacity-70">{u}</span></span>)}
    </span>
  );
}

/**
 * The IllumED Championship: a free weekly competition per division. Points
 * reward accuracy and harder questions; 15 questions a day keeps it fair.
 */
export function Championship() {
  const [status, setStatus] = useState<ChampStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"play" | "board" | "history">("play");
  const [pick, setPick] = useState<Division>("gcse-higher");
  const [note, setNote] = useState("");
  const [q, setQ] = useState<ChampQuestion | null>(null);
  const [res, setRes] = useState<ChampAnswer | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<{ division: Division; data: ChampBoard } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => { const s = await champStatus().catch(() => null); setStatus(s); setLoading(false); if (s?.entry) setPick(s.entry.division); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!q || res) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [q, res]);
  useEffect(() => { if (tab === "board") void champBoard(status?.entry?.division ?? pick).then((data) => setBoard({ division: status?.entry?.division ?? pick, data })); }, [tab, status, pick]);

  const next = async () => {
    setBusy(true); setNote(""); setRes(null); setChosen(null);
    const r = await champNext();
    setBusy(false);
    if (r.ok) { setQ(r.q); setNow(Date.now()); } else { setQ(null); setNote(r.error); void load(); }
  };
  const answer = async (i: number) => {
    if (!q || res || busy) return;
    setBusy(true); setChosen(i);
    const r = await champAnswer(q.id, i);
    setBusy(false);
    if (r.ok) { setRes(r.a); void load(); } else { setChosen(null); setNote(r.error); }
  };
  const share = async () => {
    const e = status?.entry;
    if (!e) return;
    const text = `I'm ${ordinal(e.rank)} of ${e.players} in the ${divisionName(e.division)} IllumED Championship this week with ${e.points} points. Think you can beat me?`;
    const url = `${window.location.origin}/games/championship`;
    try {
      if (navigator.share) await navigator.share({ title: "IllumED Championship", text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setNote("Copied! Paste it to a friend."); }
    } catch { /* Share cancelled. */ }
  };

  if (loading) return <div className="h-72 animate-pulse rounded-[2rem] bg-[#13203a]/5" />;
  if (!status) return <p className="rounded-3xl bg-white p-6 font-bold">Sign in to enter the free weekly Championship.</p>;
  const e = status.entry;
  const week = new Date(status.week).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const left = q ? Math.max(0, q.deadline - now) : 0;

  return (
    <div className="grid gap-6">
      <MarathonPanel />
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#13203a] p-6 text-white md:p-8">
        <div className="absolute -top-16 -right-10 size-64 rounded-full bg-[#ffc83d]/20 blur-2xl" aria-hidden />
        <Trophy className="absolute right-6 bottom-6 size-32 text-white/8" aria-hidden />
        <p className="relative text-xs font-black tracking-[0.3em] text-[#ffc83d] uppercase">Week of {week} · free to enter</p>
        <h2 className="relative mt-2 text-3xl font-black md:text-4xl">IllumED Championship</h2>
        <p className="relative mt-2 max-w-xl text-white/80">Answer up to 15 questions a day from the question bank. Harder questions are worth more, and only correct answers score.</p>
        <div className="relative mt-5 flex flex-wrap items-center gap-4">
          <Countdown to={status.endsAt} />
          {e && <button type="button" onClick={() => void share()} className="jelly flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-black"><Share2 className="size-4" aria-hidden /> Invite friends</button>}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {([["play", "Compete", Target], ["board", "League table", Users], ["history", "History", Award]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("gloss-off flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black", tab === id ? "bg-[#13203a] text-white" : "bg-[#f1ede4] text-[#13203a]")}>
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {note && <p role="status" className="rounded-2xl bg-[#fff3cf] p-3 text-sm font-bold">{note}</p>}

      {tab === "play" && !e && (
        <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-6">
          <h3 className="text-xl font-black">Choose your division</h3>
          <p className="text-sm text-muted-foreground">You compete against students at your level. You can change it until you answer your first question this week.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DIVISIONS.map((d) => (
              <button key={d.id} type="button" aria-pressed={pick === d.id} onClick={() => setPick(d.id)}
                className={cn("gloss-off rounded-2xl border-2 p-4 text-left transition", pick === d.id ? "border-transparent text-white" : "border-[#13203a]/10 bg-[#f7f1e6]")} style={pick === d.id ? { background: d.colour } : undefined}>
                <span className="block text-lg font-black">{d.name}</span><span className="text-sm opacity-80">{d.blurb}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={async () => { const r = await champEnter(pick); if (r.ok) { await load(); void next(); } else setNote(r.error); }} className="arcade-btn mt-5 w-full rounded-full bg-[#ffc83d] py-4 text-lg font-black text-[#0d1726]">Enter for free</button>
        </section>
      )}

      {tab === "play" && e && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Rank", `${ordinal(e.rank)}`, `of ${e.players} in ${divisionName(e.division)}`, Crown],
              ["Points", `${e.points}`, "this week", Trophy],
              ["Accuracy", `${e.answered ? Math.round((100 * e.right) / e.answered) : 0}%`, `${e.right} of ${e.answered} correct`, Target],
              ["Today", `${e.today}/15`, "questions answered", CalendarClock],
            ].map(([label, value, sub, Icon]) => {
              const I = Icon as typeof Crown;
              return (
                <div key={label as string} className="rounded-3xl border-2 border-[#13203a]/10 bg-white p-4">
                  <p className="flex items-center gap-1.5 text-xs font-black tracking-widest text-muted-foreground uppercase"><I className="size-3.5" aria-hidden />{label as string}</p>
                  <p className="mt-1 text-3xl font-black">{value as string}</p>
                  <p className="text-xs text-muted-foreground">{sub as string}</p>
                </div>
              );
            })}
          </section>

          {!q ? (
            <section className="grid place-items-center rounded-[2rem] border-2 border-dashed border-[#13203a]/15 bg-white p-8 text-center">
              {e.today >= 15 ? (
                <><Check className="size-10 text-[#15987f]" aria-hidden /><p className="mt-2 text-xl font-black">Done for today!</p><p className="text-sm text-muted-foreground">Come back tomorrow for 15 more. Missing a day never costs you points.</p></>
              ) : (
                <><p className="text-xl font-black">{e.today ? `${15 - e.today} questions left today` : "Ready when you are"}</p><p className="mt-1 text-sm text-muted-foreground">Each question has 75 seconds. Answers in under 2 seconds don&apos;t count.</p>
                  <button type="button" disabled={busy} onClick={() => void next()} className="arcade-btn mt-4 rounded-full bg-[#ffc83d] px-8 py-4 text-lg font-black text-[#0d1726]">{e.today ? "Keep going" : "Start today's questions"}</button></>
              )}
            </section>
          ) : (
            <section className="champ-q rounded-[2rem] bg-[#13203a] p-5 text-white md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black tracking-widest uppercase">
                <span className="text-[#9ec5ff]">{q.subject} · {q.topic}</span>
                <span className="flex items-center gap-2"><span className="rounded-full bg-[#ffc83d] px-2 py-0.5 text-[#0d1726]">{q.worth} pts</span><Timer className="size-4" aria-hidden />{Math.ceil(left / 1000)}s</span>
              </div>
              {!res && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffc83d] transition-[width] duration-300" style={{ width: `${(left / 75000) * 100}%` }} /></div>}
              <p className="mt-4 text-xl leading-snug font-black md:text-2xl">{q.prompt}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, i) => (
                  <button key={i} type="button" disabled={busy || Boolean(res)} onClick={() => void answer(i)}
                    className={cn("gloss-off rounded-2xl border-b-4 p-4 text-left font-bold transition",
                      !res ? "border-black/30 bg-white text-[#13203a] hover:-translate-y-0.5" :
                        i === res.answer ? "border-[#0d5c48] bg-[#2fd39a] text-[#08251c]" : i === chosen ? "border-[#8f1d20] bg-[#ff8a8d] text-[#3d0a0b]" : "border-transparent bg-white/10 text-white/60")}>
                    <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-[#13203a] text-xs text-white">{String.fromCharCode(65 + i)}</span>{o}
                  </button>
                ))}
              </div>
              {res && (
                <div role="status" className="mt-4 rounded-2xl bg-white/10 p-4">
                  <p className="flex items-center gap-2 text-lg font-black">{res.correct ? <><Check className="size-5 text-[#2fd39a]" aria-hidden /> Correct! +{res.worth}</> : <><X className="size-5 text-[#ff8a8d]" aria-hidden /> {res.late ? "Out of time" : "Not this time"}</>}</p>
                  <p className="mt-1 text-sm text-white/80">{res.explain}</p>
                  <button type="button" onClick={() => void next()} className="arcade-btn mt-3 rounded-full bg-[#ffc83d] px-6 py-3 font-black text-[#0d1726]">Next question</button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {tab === "board" && (
        <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5">
          <div className="flex flex-wrap gap-2">
            {DIVISIONS.map((d) => <button key={d.id} type="button" onClick={() => void champBoard(d.id).then((data) => setBoard({ division: d.id, data }))} className={cn("gloss-off rounded-full px-3 py-1.5 text-xs font-black", board?.division === d.id ? "text-white" : "bg-[#f1ede4]")} style={board?.division === d.id ? { background: d.colour } : undefined}>{d.name}</button>)}
          </div>
          {!board?.data.top.length ? <p className="mt-4 text-sm text-muted-foreground">No scores in this division yet this week. Be the first!</p> : (
            <ol className="mt-4 grid gap-2">
              {board.data.top.map((r, i) => (
                <li key={`${r.name}-${i}`} className={cn("flex items-center gap-3 rounded-2xl bg-[#f7f1e6] p-3", r.me && "ring-2 ring-[#2b5fd9]")}>
                  <span className={cn("grid size-9 place-items-center rounded-full text-sm font-black", i < 3 ? "text-white" : "bg-white")} style={i < 3 ? { background: ["#e0a100", "#8a94a6", "#b26b3a"][i] } : undefined}>{i < 3 ? <Medal className="size-4" aria-hidden /> : i + 1}</span>
                  <span className="flex-1 font-black">@{r.name}{r.me && <span className="ml-2 text-xs text-[#2b5fd9]">you</span>}</span>
                  <span className="text-xs font-bold text-muted-foreground">{r.acc}%</span>
                  <span className="w-16 text-right font-black tabular-nums">{r.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5">
          {!status.history.length ? <p className="text-sm text-muted-foreground">Your past Championships will appear here.</p> : (
            <ul className="grid gap-2">
              {status.history.map((h) => (
                <li key={h.week} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f7f1e6] p-3">
                  <span className="min-w-0 flex-1"><span className="block font-black">Week of {new Date(h.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {divisionName(h.division)}</span>
                    <span className="text-xs text-muted-foreground">{ordinal(h.rank)} of {h.players} · {h.points} points · {h.answered ? Math.round((100 * h.right) / h.answered) : 0}% correct</span></span>
                  {h.badge && <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: BADGE[h.badge]?.colour }}>{BADGE[h.badge]?.name}</span>}
                  {h.reward === null && <button type="button" onClick={async () => { const r = await champClaim(h.week); setNote(r.ok ? (r.reward ? `+${r.reward} Clout and XP collected!` : "Thanks for taking part! Answer 5+ questions next week to earn a reward.") : r.error); void load(); }}
                    className="jelly flex items-center gap-1.5 rounded-full bg-[#ffc83d] px-4 py-2 text-sm font-black text-[#0d1726]"><Gift className="size-4" aria-hidden /> Collect reward</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="grid gap-3 rounded-[2rem] bg-[#f7f1e6] p-5 text-sm sm:grid-cols-2">
        <div><p className="font-black">Rewards (free, virtual)</p><p className="mt-1 text-muted-foreground">Top 10%: Gold badge + 150 Clout. Top 25%: Silver + 75. Top 50%: Bronze + 40. Answer 10+ questions: Finisher + 20. Collect them after the week ends.</p></div>
        <div><p className="font-black">Fair play</p><p className="mt-1 text-muted-foreground">Answers are checked on the server and never sent before you answer. No repeated questions, 75 seconds each, and 15 a day so nobody wins by grinding. Clout can&apos;t be swapped for money.</p></div>
      </section>
    </div>
  );
}
