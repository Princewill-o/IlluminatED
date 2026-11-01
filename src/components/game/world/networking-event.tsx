"use client";

import { useEffect, useState } from "react";

import { BadgeCheck, Handshake, IdCard, Sparkles, UserPlus, Users, X } from "lucide-react";

import { ONLINE } from "./art";

import { cityAction } from "@/app/games/city-actions";
import { earnWorldXp } from "@/app/games/world/actions";
import { eventAt, timeLeft, type Guest } from "@/game/core/networking";
import { cn } from "@/lib/utils";

/**
 * A live networking event in a venue. Meet the fictional industry guests
 * (practise a good opener: pick the best reply), then swap cards with real
 * players in the same room (a friend request). Meeting all three guests
 * finishes the event and earns XP.
 */
export function NetworkingEvent({ venue, meId, onClose, onDone }: { venue: string; meId: string; onClose: () => void; onDone: (xp: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const { event, next, endsAt, venue: where } = eventAt(venue, now);
  const [met, setMet] = useState<Record<number, boolean>>({});
  const [talking, setTalking] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [online, setOnline] = useState(() => [...ONLINE]);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); setOnline([...ONLINE]); }, 2000);
    return () => clearInterval(t);
  }, []);
  // A new event starting while you're here resets your guest list.
  useEffect(() => { setMet({}); setTalking(null); setFinished(false); }, [event.id]);
  const metCount = Object.values(met).filter(Boolean).length;
  const guest: Guest | null = talking === null ? null : event.guests[talking];
  const others = online.filter((p) => p.id !== meId);

  const finishTalk = () => {
    if (talking === null || picked === null) return;
    const good = picked === event.guests[talking].best;
    const nextMet = { ...met, [talking]: good || met[talking] };
    setMet(nextMet);
    setTalking(null); setPicked(null);
    if (!finished && Object.values(nextMet).filter(Boolean).length === 3) {
      setFinished(true);
      void earnWorldXp("network").then((r) => onDone(r?.xp ?? 0)).catch(() => onDone(0));
    }
  };
  const swap = async (username: string) => {
    setSent((s) => ({ ...s, [username]: "Sending…" }));
    const r = await cityAction("city_friend_action", { p_username: username, p_action: "request" });
    setSent((s) => ({ ...s, [username]: r.error ? r.error : "Card sent: friend request on its way" }));
  };

  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-[#07101f]/60 p-3 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="networking-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f7f1e6] text-[#13203a] shadow-[0_30px_80px_rgba(0,0,0,.45)]">
        <header className="relative overflow-hidden rounded-t-[2rem] p-5 text-white" style={{ background: event.colour }}>
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/15" aria-hidden />
          <div className="relative flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase"><span className="size-2 animate-pulse rounded-full bg-[#7dff9b]" /> Live now · {where}</p>
              <h2 id="networking-title" className="mt-1 text-2xl leading-tight font-black">{event.title}</h2>
              <p className="mt-1 text-sm text-white/85">{event.blurb}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Leave the event" className="jelly grid size-9 shrink-0 place-items-center rounded-full bg-white/20"><X className="size-4" aria-hidden /></button>
          </div>
          <p className="relative mt-3 text-xs font-bold text-white/80">{timeLeft(endsAt, now)} · Next: {next.title}</p>
        </header>

        {guest ? (
          <div className="p-5">
            <p className="text-xs font-black tracking-widest text-[#5a6272] uppercase">{guest.role}</p>
            <p className="text-lg font-black">{guest.name}</p>
            <p className="mt-3 rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">“{guest.opener}”</p>
            <p className="mt-4 text-sm font-bold">What do you say?</p>
            <div className="mt-2 grid gap-2">
              {guest.replies.map((r, i) => (
                <button key={r} type="button" disabled={picked !== null} onClick={() => setPicked(i)}
                  className={cn("rounded-2xl border-2 p-3 text-left text-sm font-bold transition",
                    picked === null ? "border-transparent bg-white hover:border-[#2b5fd9]" :
                      i === guest.best ? "border-[#15987f] bg-[#e3f6ef]" : i === picked ? "border-[#e5484d] bg-[#fde8e8]" : "border-transparent bg-white opacity-60")}>
                  {r}
                </button>
              ))}
            </div>
            {picked !== null && (
              <div role="status" className="mt-3 rounded-2xl bg-[#13203a] p-3 text-sm text-white">
                <p className="font-black">{picked === guest.best ? "Great networking!" : "Not the strongest opener."}</p>
                <p className="mt-1 text-white/85">{guest.why}</p>
                <button type="button" onClick={finishTalk} className="jelly mt-3 rounded-full bg-[#f2d9a6] px-4 py-2 font-black text-[#0d1726]">
                  {picked === guest.best ? "Swap business cards" : "Try someone else"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-black"><Handshake className="size-5" aria-hidden /> Guests from {event.industry.toLowerCase()}</h3>
              <span className="rounded-full bg-[#13203a] px-2.5 py-1 text-xs font-black text-white">{metCount}/3 cards</span>
            </div>
            <ul className="mt-3 grid gap-2">
              {event.guests.map((g, i) => (
                <li key={g.name}>
                  <button type="button" onClick={() => { setTalking(i); setPicked(null); }} disabled={met[i]}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-[#2b5fd9] disabled:opacity-70 disabled:hover:ring-0">
                    <span className="grid size-11 place-items-center rounded-full text-sm font-black text-white" style={{ background: event.colour }}>{g.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                    <span className="min-w-0 flex-1"><span className="block font-black">{g.name}</span><span className="block text-xs text-[#5a6272]">{g.role}</span></span>
                    {met[i] ? <BadgeCheck className="size-5 text-[#15987f]" aria-label="Card swapped" /> : <span className="text-xs font-black text-[#2b5fd9]">Say hello</span>}
                  </button>
                </li>
              ))}
            </ul>
            {finished && (
              <p role="status" className="mt-3 flex items-center gap-2 rounded-2xl bg-[#e3f6ef] p-3 text-sm font-bold text-[#0d5c48]"><Sparkles className="size-4" aria-hidden /> You met every guest. Event complete!</p>
            )}

            <h3 className="mt-6 flex items-center gap-2 font-black"><Users className="size-5" aria-hidden /> Players at this event</h3>
            {!others.length ? (
              <p className="mt-2 rounded-2xl bg-white p-3 text-sm text-[#5a6272]">Nobody else is here yet. Events are busiest after school; invite a friend from your phone.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {others.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <IdCard className="size-5 text-[#5a6272]" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block font-black">@{p.username}</span>{sent[p.username] && <span className="block text-xs text-[#5a6272]">{sent[p.username]}</span>}</span>
                    <button type="button" disabled={Boolean(sent[p.username])} onClick={() => void swap(p.username)} className="jelly flex items-center gap-1 rounded-full bg-[#2b5fd9] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                      <UserPlus className="size-3.5" aria-hidden /> Swap cards
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-[#5a6272]">Guests are fictional. Swapping cards sends a friend request; they choose whether to accept. Be kind, and never share personal details like your address or phone number.</p>
          </div>
        )}
      </section>
    </div>
  );
}
