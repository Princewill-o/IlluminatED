"use client";
import { useState } from "react";

import { Map, Phone, PhoneCall, X, Home, Shirt, Briefcase } from "lucide-react";

import { CompanyLogo } from "../company-logo";

import { WORKPLACES } from "@/game/core/careers";
import { COMPANIES } from "@/game/core/companies";

const CONTACTS = [
  ...COMPANIES.map(c=>({id:c.id,name:c.name,sector:c.sector,logo:c.id})),
  ...WORKPLACES.filter(w=>!w.companyId).map(w=>({id:`work:${w.id}`,name:w.name,sector:w.sector,logo:null})),
];

/** A fictional phone: calls open the game's contacts, never real phone numbers. */
export function GamePhone({
  onClose,
  onCall,
  onMap,
  onHome,
  onLocker,
}: {
  onClose: () => void;
  onCall: (id: string) => void;
  onMap: () => void;
  onHome: () => void;
  onLocker: () => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <div
      className="absolute inset-0 z-[100007] flex items-end justify-end bg-black/40 p-3 md:items-center md:p-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Your game phone"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90%] w-full max-w-sm flex-col overflow-hidden rounded-[2.5rem] border-[7px] border-[#13203a] bg-[#f7f1e6] text-[#13203a] [color-scheme:light] shadow-2xl"
      >
        <header className="flex items-center gap-2 bg-[#13203a] px-5 py-4 text-white">
          <Phone className="size-5" />
          <h2 className="flex-1 font-black">City Phone</h2>
          <button type="button" aria-label="Close phone" onClick={onClose}>
            <X className="size-5" />
          </button>
        </header>
        <div className="grid grid-cols-3 gap-2 p-4 text-xs font-bold">
          {[
            { name: "City map", Icon: Map, action: onMap },
            { name: "Home services", Icon: Home, action: onHome },
            { name: "Locker", Icon: Shirt, action: onLocker },
          ].map(({ name, Icon, action }) => (
            <button
              key={name}
              type="button"
              onClick={action}
              className="grid justify-items-center gap-2 rounded-2xl bg-white p-3"
            >
              <Icon className="size-6 text-[#2b5fd9]" />
              {name}
            </button>
          ))}
        </div>
        <div className="px-4">
          <label
            htmlFor="phone-search"
            className="text-xs font-black tracking-widest uppercase"
          >
            Company contacts
          </label>
          <input
            id="phone-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a company…"
            className="mt-2 w-full rounded-2xl border border-[#13203a]/15 bg-white px-4 py-3 text-sm"
          />
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {CONTACTS.filter((c) =>
            `${c.name} ${c.sector}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          ).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onCall(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left"
              >
                {c.logo ? <CompanyLogo id={c.logo} size={36} /> : <span className="grid size-9 place-items-center rounded-xl bg-[#e8eefb] text-[#2b5fd9]"><Briefcase className="size-5"/></span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{c.name}</span>
                  <span className="block truncate text-xs text-[#5a6272]">
                    {c.sector}
                  </span>
                </span>
                <PhoneCall
                  className="size-4 text-[#15987f]"
                  aria-label="Call"
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-center text-[11px] text-[#5a6272]">
          In-game calls only. Unofficial company simulations; no affiliation or endorsement.
        </p>
      </section>
    </div>
  );
}
