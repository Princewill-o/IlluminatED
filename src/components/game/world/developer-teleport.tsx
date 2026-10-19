"use client";

import { useState } from "react";

import { MapPinned, X } from "lucide-react";

export type TeleportDestination = { id: string; label: string; mapId: string; x: number; y: number };

export function DeveloperTeleport({ destinations, onTeleport }: {
  destinations: TeleportDestination[];
  onTeleport: (destination: TeleportDestination) => void;
}) {
  const [open, setOpen] = useState(false);
  return <div className="absolute right-3 top-3 z-[100003]" onPointerDown={event => event.stopPropagation()}>
    <button type="button" onClick={() => setOpen(value => !value)} className="flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-[#32205e] px-4 text-xs font-black text-white shadow-xl"><MapPinned size={15}/>Developer teleport</button>
    {open && <section aria-label="Developer teleport destinations" className="mt-2 w-64 rounded-2xl border border-violet-200 bg-[#f6f2ff] p-3 text-[#1a1833] shadow-2xl">
      <div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wider text-violet-800">Jump to a feature</p><button type="button" onClick={() => setOpen(false)} aria-label="Close teleport list" className="rounded-full p-1 hover:bg-violet-100"><X size={16}/></button></div>
      <div className="max-h-[55dvh] space-y-1 overflow-y-auto">{destinations.map(destination => <button key={destination.id} type="button" onClick={() => { onTeleport(destination); setOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-violet-100">{destination.label}</button>)}</div>
      <p className="mt-2 border-t border-violet-100 pt-2 text-[10px] leading-relaxed text-violet-800">Visible only on your owner account. Other players do not get this control.</p>
    </section>}
  </div>;
}
