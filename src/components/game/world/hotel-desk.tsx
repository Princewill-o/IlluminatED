"use client";

import { useEffect, useState } from "react";

import { BedDouble, CalendarDays, Coins, KeyRound, Minus, Plus, X } from "lucide-react";

import { type HotelBooking, bookHotel, checkOutHotel, extendHotel, hotelAvailability } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { HOTELS, MAX_NIGHTS, ROOM_TYPES, type RoomType, earlyRefund, isHotel, roomInfo, stayPrice } from "@/game/core/hotels";
import { cn } from "@/lib/utils";

const TYPES: RoomType[] = ["standard", "deluxe", "suite"];
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Hotel reception: nightly rates, room types and availability, book and pay, then your key card. */
export function HotelDesk({ hotel, booking, wallet, onBooking, onGoToRoom, onClose }: {
  hotel: string;
  booking: HotelBooking | null;
  wallet: number;
  onBooking: (b: HotelBooking | null, spent: number) => void;
  onGoToRoom: (b: HotelBooking) => void;
  onClose: () => void;
}) {
  const h = isHotel(hotel) ? HOTELS[hotel] : HOTELS["hotel-0"];
  const [avail, setAvail] = useState<Record<string, { rate: number; free: number }>>({});
  const [type, setType] = useState<RoomType>("standard");
  const [nights, setNights] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { void hotelAvailability(hotel).then(setAvail).catch(() => {}); }, [hotel, booking]);
  const rate = (t: RoomType) => avail[t]?.rate ?? h.rates[t];
  const total = stayPrice(rate(type), nights);
  const here = booking && booking.hotel === hotel;

  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(""); setNote(""); try { await fn(); } finally { setBusy(false); } };
  const book = () => run(async () => {
    const r = await bookHotel(hotel, type, nights).catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't book."); return; }
    notifyPlayerChanged();
    onBooking(r.booking, -r.booking.paid);
    setNote(`Welcome! Room ${r.booking.room} is yours. Your key card works on the door.`);
  });
  const extend = () => run(async () => {
    const r = await extendHotel(1).catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't extend."); return; }
    notifyPlayerChanged();
    onBooking(r.booking, -r.booking.rate);
    setNote("Extended by one night.");
  });
  const checkout = () => run(async () => {
    const r = await checkOutHotel().catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't check out."); return; }
    notifyPlayerChanged();
    onBooking(null, r.refund);
    setNote(r.refund ? `Checked out. ${r.refund} Clout refunded for unused nights.` : "Checked out. Thanks for staying!");
  });

  return (
    <div className="fixed inset-0 z-[100010] grid place-items-center bg-black/55 p-3" role="dialog" aria-label={`${h.name} reception`}>
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-[3px] border-[#141020] bg-[#f7f1e6] text-[#13203a] shadow-[0_8px_0_#141020] [color-scheme:light]">
        <header className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: hotel === "hotel-1" ? "#704c47" : "#315b50" }}>
          <BedDouble className="size-5 text-[#ffd166]" />
          <div><h2 className="text-lg leading-tight font-black">{h.name} · Reception</h2><p className="text-xs text-white/75">{h.tagline}</p></div>
          <p className="ml-auto flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-sm font-black"><Coins className="size-4 text-[#ffd166]" />{wallet}</p>
          <button type="button" onClick={onClose} aria-label="Close reception" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {booking ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
              <div>
                <p className="text-xs font-black tracking-widest text-[#13203a]/60 uppercase">Your stay</p>
                <p className="mt-1 text-2xl font-black">{HOTELS[booking.hotel as keyof typeof HOTELS]?.name ?? "Hotel"} · Room {booking.room}</p>
                <p className="text-sm">{ROOM_TYPES[booking.room_type as RoomType]?.name} · {booking.rate} Clout a night · floor {roomInfo(booking.room)?.floor}</p>
                <p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays className="size-4" /> Checked in {when(booking.check_in)}</p>
                <p className="flex items-center gap-2 text-sm font-black"><CalendarDays className="size-4" /> Check-out {when(booking.check_out)}</p>
                {!here && <p className="mt-3 rounded-xl bg-black/5 p-3 text-sm">Your room is at the other hotel. You can only hold one stay at a time.</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {here && <button type="button" onClick={() => onGoToRoom(booking)} className="min-h-11 rounded-full bg-[#13203a] px-5 font-black text-white">Go to my room</button>}
                  <button type="button" disabled={busy || booking.nights >= 14 || wallet < booking.rate} onClick={() => void extend()} className="min-h-11 rounded-full bg-[#ffd166] px-5 font-black disabled:opacity-50">Extend 1 night · {booking.rate}</button>
                  {here && <button type="button" disabled={busy} onClick={() => void checkout()} className="min-h-11 rounded-full bg-white px-5 font-bold ring-2 ring-black/10 disabled:opacity-50">Check out{earlyRefund(booking.rate, Date.parse(booking.check_out) - Date.now()) ? ` · ${earlyRefund(booking.rate, Date.parse(booking.check_out) - Date.now())} back` : ""}</button>}
                </div>
              </div>
              <KeyCard hotel={h.name} room={booking.room} until={booking.check_out} colour={booking.hotel === "hotel-1" ? "#704c47" : "#315b50"} />
            </div>
          ) : (
            <>
              <p className="text-sm">Pick a room and how many nights. One night lasts a real day. Stay a week and the seventh night is free.</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {TYPES.map((t) => {
                  const full = avail[t] && avail[t].free <= 0;
                  return (
                    <li key={t}>
                      <button type="button" disabled={full} onClick={() => setType(t)} className={cn("flex h-full w-full flex-col rounded-2xl border-[3px] bg-white p-3 text-left transition", type === t ? "border-[#141020] shadow-[0_4px_0_#141020]" : "border-black/10 hover:border-black/30", full && "opacity-50")}>
                        <span className="text-base font-black">{ROOM_TYPES[t].name}</span>
                        <span className="text-xs text-[#13203a]/60">{ROOM_TYPES[t].sleeps}</span>
                        <span className="mt-2 text-2xl font-black">{rate(t)}<span className="text-xs font-bold text-[#13203a]/60"> Clout / night</span></span>
                        <ul className="mt-2 grid gap-0.5 text-xs">{ROOM_TYPES[t].perks.map((p) => <li key={p}>· {p}</li>)}</ul>
                        <span className={cn("mt-auto pt-2 text-[11px] font-black", full ? "text-[#c8322d]" : "text-[#2f8a4c]")}>{avail[t] ? (full ? "Fully booked" : `${avail[t].free} free`) : " "}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3">
                <span className="text-sm font-black">Nights</span>
                <button type="button" aria-label="Fewer nights" onClick={() => setNights((n) => Math.max(1, n - 1))} className="grid size-9 place-items-center rounded-full bg-black/5"><Minus className="size-4" /></button>
                <span className="w-6 text-center text-xl font-black">{nights}</span>
                <button type="button" aria-label="More nights" onClick={() => setNights((n) => Math.min(MAX_NIGHTS, n + 1))} className="grid size-9 place-items-center rounded-full bg-black/5"><Plus className="size-4" /></button>
                <span className="ml-auto text-right"><span className="block text-xs text-[#13203a]/60">{nights} × {rate(type)}{nights >= 7 ? " · 7th night free" : ""}</span><span className="text-xl font-black">{total} Clout</span></span>
                <button type="button" disabled={busy || wallet < total} onClick={() => void book()} className="min-h-11 rounded-full bg-[#13203a] px-6 font-black text-white disabled:opacity-50">{wallet < total ? "Not enough Clout" : "Book and pay"}</button>
              </div>
            </>
          )}
          {(error || note) && <p className={cn("mt-3 rounded-xl p-3 text-sm font-bold", error ? "bg-[#ffe1dc] text-[#9b1c13]" : "bg-[#dff5e3] text-[#1d6b34]")}>{error || note}</p>}
        </div>
      </section>
    </div>
  );
}

function KeyCard({ hotel, room, until, colour }: { hotel: string; room: string; until: string; colour: string }) {
  return (
    <div className="relative aspect-[1.6] overflow-hidden rounded-2xl p-4 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${colour}, #141020)` }} aria-label={`Key card for room ${room}`}>
      <span className="absolute -top-8 -right-8 size-28 rounded-full bg-white/10" />
      <p className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase"><KeyRound className="size-3.5 text-[#ffd166]" /> Key card</p>
      <p className="mt-2 text-4xl font-black">{room}</p>
      <p className="text-xs text-white/80">{hotel}</p>
      <p className="absolute bottom-3 left-4 text-[10px] text-white/70">Valid until {new Date(until).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
      <span className="absolute right-4 bottom-3 h-6 w-9 rounded bg-[#ffd166]/80" />
    </div>
  );
}
