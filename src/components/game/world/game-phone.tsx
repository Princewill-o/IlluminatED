"use client";
import { useEffect, useState, type ReactNode } from "react";

import Link from "next/link";

import {
  BatteryFull,
  Briefcase,
  ChevronLeft,
  PhoneCall,
  Search,
  Signal,
  Wifi,
} from "lucide-react";

import { CompanyLogo } from "../company-logo";

import { AppIconArt, type AppIconName } from "@/components/app-icons";
import { WORKPLACES } from "@/game/core/careers";
import { COMPANIES } from "@/game/core/companies";
import { cn } from "@/lib/utils";

const CONTACTS = [
  ...COMPANIES.map(c=>({id:c.id,name:c.name,sector:c.sector,logo:c.id})),
  ...WORKPLACES.filter(w=>!w.companyId).map(w=>({id:`work:${w.id}`,name:w.name,sector:w.sector,logo:null})),
];

type App = { name: string; icon: AppIconName; action?: () => void; href?: string };

/** iOS-style app tile: illustrated, glassy icon art with its label underneath. */
function AppIcon({ app, label = true, date }: { app: App; label?: boolean; date?: Date }) {
  const tile = (
    <>
      <span className="relative block size-[3.25rem] overflow-hidden rounded-[0.95rem] shadow-[0_1px_1px_rgba(0,0,0,.2),0_6px_14px_rgba(0,0,0,.35)]">
        <AppIconArt name={app.icon} date={date} className="block size-full" />
      </span>
      {label && <span className="max-w-[4.5rem] truncate text-[11px] leading-tight font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]">{app.name}</span>}
    </>
  );
  const cls = "gloss-off flex flex-col items-center gap-1 rounded-2xl outline-none transition active:scale-90 focus-visible:ring-2 focus-visible:ring-white";
  return app.href
    ? <Link href={app.href} prefetch={false} aria-label={app.name} className={cls}>{tile}</Link>
    : <button type="button" onClick={app.action} aria-label={app.name} className={cls}>{tile}</button>;
}

/** Screen inside an app: iOS navigation bar with a back label and large title. */
function AppScreen({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="phone-app absolute inset-0 z-10 flex flex-col bg-[#f2f2f7] pt-11 text-black">
      <button type="button" onClick={onBack} className="gloss-off flex items-center gap-0.5 self-start px-2 py-1 text-[15px] text-[#007aff]"><ChevronLeft className="size-6" strokeWidth={2.4} />Home</button>
      <h2 className="px-4 pb-2 text-[28px] leading-tight font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

/** A fictional iPhone-style phone: calls open the game's contacts, never real phone numbers. */
export function GamePhone({
  onClose,
  onCall,
  onMap,
  onHome,
  onLocker,
  onStudy,
  onAwards,
  onGarage = onMap,
  onUniversities = onMap,
  onBus,
  time,
  clout,
}: {
  onClose: () => void;
  onCall: (id: string) => void;
  onMap: () => void;
  onHome: () => void;
  onLocker: () => void;
  onStudy: () => void;
  onAwards: () => void;
  onGarage?: () => void;
  onUniversities?: () => void;
  /** Hail a bus and choose where it goes. */
  onBus?: () => void;
  /** In-game clock. */
  time?: Date;
  clout?: number;
}) {
  const [screen, setScreen] = useState<"home" | "phone">("home");
  const [search, setSearch] = useState("");
  const now = time ?? new Date();
  const clock = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { if (screen === "home") onClose(); else setScreen("home"); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [screen, onClose]);

  const facetime = () => { onClose(); window.dispatchEvent(new Event("illuminated:open-calls")); };
  const grid: App[] = [
    { name: "Maps", icon: "maps", action: onMap },
    { name: "Bus", icon: "bus", action: onBus ?? onMap },
    { name: "Garage", icon: "garage", action: onGarage },
    { name: "Unis", icon: "unis", action: onUniversities },
    { name: "Home", icon: "home", action: onHome },
    { name: "Locker", icon: "locker", action: onLocker },
    { name: "Study", icon: "study", action: onStudy },
    { name: "Awards", icon: "awards", action: onAwards },
    { name: "Wallet", icon: "wallet", href: "/games/wealth" },
    { name: "Weekly", icon: "weekly", href: "/games/weekly" },
    { name: "Illumship", icon: "illumship", href: "/games/illumship" },
    { name: "Books", icon: "books", href: "/games/sources" },
    { name: "Store", icon: "store", href: "/games/expansions" },
  ];
  const dock: App[] = [
    { name: "Phone", icon: "phone", action: () => setScreen("phone") },
    { name: "FaceTime", icon: "facetime", action: facetime },
    { name: "Messages", icon: "messages", href: "/games/friends" },
    { name: "Maps", icon: "maps", action: onMap },
  ];

  return (
    <div className="absolute inset-0 z-[100007] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] md:items-center md:justify-end md:p-8" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Your game phone"
        onClick={(e) => e.stopPropagation()}
        className="iphone relative aspect-[9/19.5] h-[min(42rem,calc(100dvh-1.5rem))] max-w-full overflow-hidden rounded-[3.1rem] border-[10px] border-[#1c1c1e] bg-black [color-scheme:light] shadow-[0_0_0_2px_#8e8e93,0_30px_60px_rgba(0,0,0,.5)]"
      >
        {/* Wallpaper */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_45%_at_50%_42%,#4b6fa8_0%,transparent_70%),radial-gradient(70%_30%_at_10%_78%,#2c4a7e_0%,transparent_70%),linear-gradient(180deg,#0a1224_0%,#152a4f_40%,#0c1630_75%,#050a16_100%)]" />
        {/* Status bar + Dynamic Island */}
        <div className="relative z-20 flex h-11 items-center justify-between px-7 pt-1 text-[13px] font-semibold text-white">
          <span>{clock}</span>
          <span aria-hidden className="absolute top-2 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1" aria-hidden><Signal className="size-3.5" /><Wifi className="size-3.5" /><BatteryFull className="size-5" /></span>
        </div>

        {screen === "home" && (
          <div className="relative z-10 flex h-[calc(100%-2.75rem)] flex-col px-4 pb-6">
            {/* Widgets */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex aspect-square flex-col rounded-[1.4rem] border border-white/20 bg-[#a9c7dd]/80 p-3 text-white shadow-lg backdrop-blur-xl">
                <p className="text-[12px] font-semibold">London ➚</p>
                <p className="text-[34px] leading-tight font-light tabular-nums">{clock}</p>
                <p className="mt-auto text-[11px] font-semibold">In-game time</p>
                <p className="text-[11px] font-medium opacity-90">{now.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
              </div>
              <Link href="/games/wealth" prefetch={false} className="gloss-off flex aspect-square flex-col rounded-[1.4rem] bg-white p-3 text-black shadow-lg">
                <p className="text-[11px] font-bold tracking-wide text-[#ff3b30] uppercase">{now.toLocaleDateString("en-GB", { weekday: "long" })}</p>
                <p className="text-[34px] leading-tight font-normal tabular-nums">{now.getDate()}</p>
                <p className="mt-auto text-[12px] text-[#3c3c43]/70">Wallet</p>
                <p className="text-[13px] font-semibold tabular-nums">{(clout ?? 0).toLocaleString("en-GB")} Clout</p>
              </Link>
            </div>
            {/* Apps */}
            <div className="mt-4 grid grid-cols-4 content-start gap-x-2 gap-y-3">
              {grid.map(app => <AppIcon key={app.name} app={app} date={now} />)}
            </div>
            <div className="mt-auto flex justify-center pb-2">
              <button type="button" onClick={() => setScreen("phone")} className="gloss-off flex items-center gap-1 rounded-full border border-white/15 bg-white/15 px-3.5 py-1 text-[12px] font-medium text-white/90 backdrop-blur-md"><Search className="size-3" />Search</button>
            </div>
            {/* Dock */}
            <nav aria-label="Dock" className="grid grid-cols-4 gap-2 rounded-[1.9rem] border border-white/15 bg-white/12 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-2xl">
              {dock.map(app => <AppIcon key={app.name} app={app} label={false} />)}
            </nav>
          </div>
        )}

        {screen === "phone" && (
          <AppScreen title="Contacts" onBack={() => setScreen("home")}>
            <label className="mx-4 flex items-center gap-1.5 rounded-[10px] bg-[#767680]/15 px-2 py-1.5 text-[15px]">
              <Search className="size-4 text-[#8e8e93]" aria-hidden />
              <input aria-label="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8e8e93]" />
            </label>
            <ul className="mx-4 mt-3 min-h-0 flex-1 divide-y divide-[#c6c6c8]/60 overflow-y-auto rounded-xl bg-white">
              {CONTACTS.filter((c) => `${c.name} ${c.sector}`.toLowerCase().includes(search.toLowerCase())).map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onCall(c.id)} className="gloss-off flex w-full items-center gap-3 px-3 py-2 text-left active:bg-black/5">
                    {c.logo ? <CompanyLogo id={c.logo} size={32} /> : <span className="grid size-8 place-items-center rounded-full bg-[#e5e5ea] text-[#8e8e93]"><Briefcase className="size-4" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-[#8e8e93]">{c.sector}</span>
                    </span>
                    <PhoneCall className="size-4 text-[#34c759]" aria-label="Call" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-5 py-2 text-center text-[10px] text-[#8e8e93]">In-game calls only. Unofficial company simulations; no affiliation or endorsement.</p>
          </AppScreen>
        )}

        {/* Home indicator: tap to go home, or close from the home screen. */}
        <button type="button" aria-label={screen === "home" ? "Close phone" : "Back to home screen"} onClick={() => (screen === "home" ? onClose() : setScreen("home"))} className={cn("gloss-off absolute bottom-1.5 left-1/2 z-30 h-5 w-36 -translate-x-1/2 rounded-full")}>
          <span className={cn("mx-auto block h-[5px] w-32 rounded-full", screen === "home" ? "bg-white" : "bg-black")} />
        </button>
      </section>
    </div>
  );
}
