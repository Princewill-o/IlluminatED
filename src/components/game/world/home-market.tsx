"use client";

import { useEffect, useRef, useState } from "react";

import { Check, House, X } from "lucide-react";

import { buyHome } from "@/app/games/careers/actions";
import { HOMES, homeById } from "@/game/core/homes";

export function HomeMarket({ claimed, owned, current, clout, onClose, onPurchased, onEnterHome }: {
  claimed: boolean; owned: string[]; current: string; clout: number;
  onClose: () => void;
  onPurchased: (home: string, balance: number | null) => void;
  onEnterHome: () => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string[]>([]);
  const section = useRef<HTMLElement>(null);
  const purchaseLock = useRef(false);
  const currentHome = receipt ?? current;
  const hasClaimed = claimed || purchased.length > 0;
  const selected = confirm ? homeById(confirm) : null;

  useEffect(() => {
    const previous = document.activeElement;
    section.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (pending) section.current?.focus();
    else if (confirm) section.current?.querySelector<HTMLButtonElement>("[data-confirm-purchase]")?.focus();
    else if (receipt) section.current?.querySelector<HTMLButtonElement>("[data-enter-home]")?.focus();
  }, [pending, confirm, receipt]);

  const purchase = async (id: string) => {
    if (purchaseLock.current) return;
    purchaseLock.current = true; setPending(true); setError("");
    try {
      const result = await buyHome(id);
      if (!result.ok) { setError(result.error); return; }
      setPurchased(homes => [...new Set([...homes, id])]);
      setReceipt(id); setConfirm(null);
      onPurchased(id, result.data.clout);
    } catch { setError("Couldn't reach the housing office. Try again shortly."); }
    finally { purchaseLock.current = false; setPending(false); }
  };

  return <div className="absolute inset-0 z-[100030] grid place-items-center bg-[#101a2b]/70 p-3 sm:p-6" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!pending) { if (confirm) setConfirm(null); else onClose(); } }
    if (event.key === "Tab") {
      const controls = Array.from(section.current?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]") ?? []).filter(control => control.offsetParent !== null);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <section ref={section} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="home-market-title" className="flex max-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#d8c8ab] bg-[#faf6ed] text-[#183b35] shadow-2xl outline-none">
      <header className="flex items-center gap-3 bg-[#183b35] p-5 text-white">
        <House className="size-8 shrink-0 text-[#e4bd76]" />
        <div className="flex-1"><h2 id="home-market-title" className="text-xl font-black">Buy a house</h2><p className="text-xs text-white/75">Your own place in IlluminatED City</p></div>
        <button type="button" disabled={pending} aria-label="Close houses" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"><X className="size-5" /></button>
      </header>
      <div className="overflow-y-auto p-4 sm:p-6">
        <p className="mb-4 text-sm">Your balance: <strong>{clout.toLocaleString("en-GB")} Clout</strong>. Houses use in-game Clout. Claim your starter home free, or buy an upgrade.</p>
        {receipt && <div role="status" className="mb-4 rounded-2xl border border-[#9abc9e] bg-[#e4efdc] p-4"><p className="font-bold"><Check className="mr-1 inline size-4" />{homeById(receipt)?.name} is now your home.</p><p className="mt-1 text-xs">Ownership is saved. You can return to any home you own without paying again.</p><button type="button" data-enter-home disabled={pending} onClick={onEnterHome} className="mt-3 min-h-11 rounded-full bg-[#183b35] px-5 text-sm font-bold text-white">Enter your home</button></div>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</p>}
        {selected ? <div className="rounded-2xl border border-[#d8c8ab] bg-white p-5">
          <h3 className="text-lg font-black">Buy {selected.name}?</h3><p className="mt-2 text-sm">{selected.area} · {selected.blurb}</p>
          <p className="mt-4 font-bold">Price: {selected.price.toLocaleString("en-GB")} Clout</p><p className="text-sm">Balance after purchase: {Math.max(0, clout-selected.price).toLocaleString("en-GB")} Clout</p>
          {clout < selected.price && <p className="mt-2 text-sm text-red-700">You need {(selected.price-clout).toLocaleString("en-GB")} more Clout.</p>}
          <div className="mt-5 flex gap-2"><button type="button" data-confirm-purchase disabled={pending || clout < selected.price} onClick={() => void purchase(selected.id)} className="min-h-11 rounded-full bg-[#183b35] px-5 text-sm font-bold text-white disabled:opacity-40">{pending ? "Buying…" : "Confirm purchase"}</button><button type="button" disabled={pending} onClick={() => {setConfirm(null);setError("");}} className="min-h-11 rounded-full border border-[#d8c8ab] px-5 text-sm font-bold">Back to houses</button></div>
        </div> : <ul className="grid gap-3 sm:grid-cols-2">{HOMES.map(home => {
          const have = owned.includes(home.id) || purchased.includes(home.id);
          const active = hasClaimed && currentHome === home.id;
          const claim = home.id === "studio" && !hasClaimed;
          const shortfall = !have ? Math.max(0, home.price-clout) : 0;
          return <li key={home.id} className={`flex flex-col rounded-2xl border bg-white p-4 ${active ? "border-[#60866a]" : "border-[#d8c8ab]"}`}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-black">{home.name}</h3>{active && <span className="rounded-full bg-[#e4efdc] px-2 py-1 text-[10px] font-bold">Current home</span>}</div>
            <p className="mt-1 text-xs font-bold text-[#7d674d]">{home.area}</p><p className="mt-2 flex-1 text-sm">{home.blurb}</p>
            <p className="mt-4 text-lg font-black">{home.price === 0 ? "Free starter home" : `${home.price.toLocaleString("en-GB")} Clout`}</p>
            <button type="button" disabled={pending || active || shortfall > 0} onClick={() => {setError("");if (claim || have) void purchase(home.id);else setConfirm(home.id);}} className="mt-3 min-h-11 rounded-xl bg-[#183b35] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{active ? "You live here" : claim ? "Claim free home" : have ? "Move here · owned" : "Buy this house"}</button>
            {shortfall > 0 && <p className="mt-2 text-xs text-[#7d674d]">Earn {shortfall.toLocaleString("en-GB")} more Clout to buy.</p>}
          </li>;
        })}</ul>}
      </div>
    </section>
  </div>;
}
