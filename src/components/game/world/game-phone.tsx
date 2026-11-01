"use client";
import { useEffect, useRef, useState, type ElementType } from "react";

import Link from "next/link";

import {
  BatteryFull,
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  ChevronLeft,
  Compass,
  GraduationCap,
  Home,
  Landmark,
  Map,
  MessageCircle,
  Phone,
  PhoneCall,
  Search,
  Settings,
  Shirt,
  Signal,
  Sparkles,
  Store,
  Trophy,
  Users,
  Wifi,
  X,
} from "lucide-react";

import { CompanyLogo } from "../company-logo";
import { NearbyPeople, PhoneMessages } from "./phone-messages";

import { WORKPLACES } from "@/game/core/careers";
import type { NearbyPerson } from "@/game/core/city-social";
import { COMPANIES } from "@/game/core/companies";

const CONTACTS = [
  ...COMPANIES.map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector,
    logo: c.id,
  })),
  ...WORKPLACES.filter((w) => !w.companyId).map((w) => ({
    id: `work:${w.id}`,
    name: w.name,
    sector: w.sector,
    logo: null,
  })),
];
type AppId = "home" | "contacts" | "messages" | "nearby" | "settings";
interface PhoneApp {
  name: string;
  Icon: ElementType;
  colour: string;
  action?: () => void;
  href?: string;
}

/** IlluminatED's fictional handset. Every app opens an existing game feature. */
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
  onVenture,
  onBank,
  onNearbyRequest,
  nearby = [],
  meId,
  username,
  clout = 0,
  initialApp = "home",
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
  onVenture: () => void;
  onBank: () => void;
  onNearbyRequest: (name: string) => Promise<string | null>;
  nearby?: NearbyPerson[];
  meId: string;
  username: string;
  clout?: number;
  initialApp?: AppId;
}) {
  const [app, setApp] = useState<AppId>(initialApp),
    [search, setSearch] = useState(""),
    [clock, setClock] = useState("");
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const timer = setInterval(tick, 30000);
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const items = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a[href],input,summary",
            ) ?? [],
          ),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", keys);
      before?.focus();
    };
  }, []);
  const apps: PhoneApp[] = [
    {
      name: "Messages",
      Icon: MessageCircle,
      colour: "from-[#43d75b] to-[#25a940]",
      action: () => setApp("messages"),
    },
    {
      name: "Nearby",
      Icon: Users,
      colour: "from-[#56c9d3] to-[#258c94]",
      action: () => setApp("nearby"),
    },
    {
      name: "Maps",
      Icon: Map,
      colour: "from-[#67bdb0] to-[#326d60]",
      action: onMap,
    },
    {
      name: "Study",
      Icon: BookOpen,
      colour: "from-[#f5b757] to-[#df8c25]",
      action: onStudy,
    },
    {
      name: "Venture",
      Icon: Store,
      colour: "from-[#bc91ef] to-[#7758be]",
      action: onVenture,
    },
    {
      name: "Jobs",
      Icon: BriefcaseBusiness,
      colour: "from-[#85a2b0] to-[#456675]",
      action: () => setApp("contacts"),
    },
    {
      name: "Bank",
      Icon: Landmark,
      colour: "from-[#dbc78b] to-[#9a7e3d]",
      action: onBank,
    },
    {
      name: "Home",
      Icon: Home,
      colour: "from-[#efad7d] to-[#c47450]",
      action: onHome,
    },
    {
      name: "Locker",
      Icon: Shirt,
      colour: "from-[#e997b6] to-[#b85d85]",
      action: onLocker,
    },
    {
      name: "Garage",
      Icon: CarFront,
      colour: "from-[#789ee8] to-[#4866b0]",
      action: onGarage,
    },
    {
      name: "University",
      Icon: GraduationCap,
      colour: "from-[#70aba2] to-[#3c726b]",
      action: onUniversities,
    },
    {
      name: "Awards",
      Icon: Trophy,
      colour: "from-[#f1d47a] to-[#c39735]",
      action: onAwards,
    },
    {
      name: "Wealth",
      Icon: Sparkles,
      colour: "from-[#9dc5a5] to-[#5c9367]",
      href: "/games/wealth",
    },
    {
      name: "Challenges",
      Icon: Compass,
      colour: "from-[#ef8e80] to-[#c35454]",
      href: "/games/weekly",
    },
    {
      name: "Learn",
      Icon: GraduationCap,
      colour: "from-[#71b1ed] to-[#3178b9]",
      href: "/dashboard",
    },
    {name:"Ask Tiggy",Icon:Sparkles,colour:"from-[#e4b278] to-[#b47c42]",href:"/tiggy"},
    {name:"Homework",Icon:BookOpen,colour:"from-[#89b7d1] to-[#4d829e]",href:"/homework"},
    {name:"Careers",Icon:BriefcaseBusiness,colour:"from-[#82b29b] to-[#467d61]",href:"/games/careers"},
    {name:"Community",Icon:Users,colour:"from-[#caabdb] to-[#9171a7]",href:"/social"},
    {name:"Expansions",Icon:Compass,colour:"from-[#d1b17f] to-[#9a7643]",href:"/games/expansions"},
    {name:"Advice",Icon:MessageCircle,colour:"from-[#78a9b8] to-[#47788b]",href:"/messages"},
    {
      name: "Settings",
      Icon: Settings,
      colour: "from-[#a9afb9] to-[#656f7b]",
      action: () => setApp("settings"),
    },
  ];
  const icon = ({ name, Icon, colour }: PhoneApp) => (
    <>
      <span
        className={`grid size-[54px] place-items-center rounded-[15px] border border-white/20 bg-gradient-to-b ${colour} shadow-[0_5px_12px_#0002,inset_0_1px_1px_#ffffff70]`}
      >
        <Icon className="size-7 text-white" strokeWidth={1.8} />
      </span>
      <span className="w-full truncate text-center text-[10px] font-semibold text-white drop-shadow">
        {name}
      </span>
    </>
  );
  return (
    <div
      className="absolute inset-0 z-[100007] flex items-center justify-center bg-[#081b16]/45 p-2 backdrop-blur-sm sm:justify-end sm:p-6"
      onClick={onClose}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="IlluminatED phone"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[min(790px,94dvh)] w-full max-w-[360px] flex-col overflow-hidden rounded-[2.9rem] border-[7px] border-[#172723] bg-[#edf0e9] text-[#142b25] [color-scheme:light] shadow-[0_24px_100px_#0007,0_0_0_1px_#c6b68a] outline-none"
      >
        <div
          className={`flex h-12 shrink-0 items-center justify-between px-6 text-[11px] font-bold ${app === "home" ? "bg-[#244f45] text-white" : "bg-[#f2f2f7]"}`}
        >
          <span suppressHydrationWarning>{clock || "City"}</span>
          <span
            aria-hidden
            className="absolute top-2 left-1/2 h-6 w-[92px] -translate-x-1/2 rounded-full bg-[#12231f]"
          />
          <span className="flex gap-1.5" aria-label="Game phone connected">
            <Signal className="size-3" />
            <Wifi className="size-3" />
            <BatteryFull className="size-4" />
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {app === "home" ? (
            <div className="flex h-full flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_0%_0%,#477e65_0%,#244f45_40%,#152e30_100%)] px-4 pt-2 pb-3">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#d7d0a8] uppercase">
                    IlluminatED City
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                    Your city. In your pocket.
                  </h2>
                </div>
                <button
                  aria-label="Close phone"
                  onClick={onClose}
                  className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-white/75"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <button
                  onClick={onStudy}
                  className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 text-left text-white"
                >
                  <BookOpen className="mb-3 size-6 text-[#ebd49a]" />
                  <p className="text-sm font-semibold">A little every day</p>
                  <p className="mt-1 text-[10px] text-white/70">
                    Open your study room →
                  </p>
                </button>
                <div className="rounded-[1.35rem] bg-[#ead7a8] p-4 text-[#254237]">
                  <p className="text-[10px] font-bold tracking-wider uppercase">
                    Your Clout
                  </p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {clout.toLocaleString()}
                  </p>
                  <p className="mt-1 truncate text-[10px]">@{username}</p>
                </div>
              </div>
              <label className="mb-4 flex items-center gap-2 rounded-full bg-black/15 px-3 py-2 text-white/70">
                <Search className="size-3.5" />
                <input
                  aria-label="Search phone apps"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your apps"
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/60"
                />
              </label>
              <nav
                aria-label="Phone apps"
                className="grid grid-cols-4 gap-x-2 gap-y-4"
              >
                {apps
                  .filter((a) =>
                    a.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((a) =>
                    a.href ? (
                      <Link
                        key={a.name}
                        href={a.href}
                        className="flex min-h-20 min-w-0 flex-col items-center gap-1.5"
                      >
                        {icon(a)}
                      </Link>
                    ) : (
                      <button
                        key={a.name}
                        type="button"
                        onClick={a.action}
                        className="flex min-h-20 min-w-0 flex-col items-center gap-1.5"
                      >
                        {icon(a)}
                      </button>
                    ),
                  )}
              </nav>
              <nav
                aria-label="Phone dock"
                className="mt-auto flex justify-around rounded-[1.7rem] border border-white/15 bg-white/15 p-3 pt-3 backdrop-blur-xl"
              >
                <button
                  aria-label="Open phone contacts"
                  onClick={() => {
                    setSearch("");
                    setApp("contacts");
                  }}
                  className="grid size-12 place-items-center rounded-[14px] bg-[#32bf52] text-white"
                >
                  <Phone />
                </button>
                <button
                  aria-label="Open messages"
                  onClick={() => setApp("messages")}
                  className="grid size-12 place-items-center rounded-[14px] bg-[#32bf52] text-white"
                >
                  <MessageCircle />
                </button>
                <button
                  aria-label="Open map"
                  onClick={onMap}
                  className="grid size-12 place-items-center rounded-[14px] bg-[#4a9b8e] text-white"
                >
                  <Map />
                </button>
                <Link
                  aria-label="Account settings"
                  href="/dashboard/settings"
                  className="grid size-12 place-items-center rounded-[14px] bg-[#909ba3] text-white"
                >
                  <Settings />
                </Link>
              </nav>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <header className="flex h-11 shrink-0 items-center justify-between bg-[#f2f2f7] px-2">
                <button
                  onClick={() => {
                    setApp("home");
                    setSearch("");
                  }}
                  className="flex min-h-11 items-center text-sm text-[#1675ed]"
                >
                  <ChevronLeft className="size-5" />
                  Home
                </button>
                <button
                  aria-label="Close phone"
                  onClick={onClose}
                  className="grid size-11 place-items-center"
                >
                  <X className="size-5" />
                </button>
              </header>
              <div className="min-h-0 flex-1">
                {app === "messages" && <PhoneMessages meId={meId} />}
                {app === "nearby" && (
                  <NearbyPeople
                    people={nearby}
                    meId={meId}
                    mapId={
                      nearby[0]?.kind === "npc"
                        ? nearby[0].id.split(":resident:")[0]
                        : "city"
                    }
                    onRequest={onNearbyRequest}
                    onClose={onClose}
                  />
                )}
                {app === "contacts" && (
                  <div className="flex h-full flex-col bg-[#f2f2f7] p-3">
                    <h2 className="px-1 pb-3 text-3xl font-bold tracking-tight">
                      Contacts
                    </h2>
                    <input
                      aria-label="Search company contacts"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search jobs and companies"
                      className="mb-3 w-full rounded-xl bg-black/5 px-3 py-2 text-sm"
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white">
                      {CONTACTS.filter((c) =>
                        `${c.name} ${c.sector}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      ).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onCall(c.id)}
                          className="flex min-h-16 w-full items-center gap-3 border-b border-black/5 p-3 text-left"
                        >
                          {c.logo ? (
                            <CompanyLogo id={c.logo} size={32} />
                          ) : (
                            <BriefcaseBusiness className="size-8 text-[#357b66]" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">
                              {c.name}
                            </span>
                            <span className="block truncate text-xs text-[#63716e]">
                              {c.sector}
                            </span>
                          </span>
                          <PhoneCall className="size-4 text-[#2bad58]" />
                        </button>
                      ))}
                    </div>
                    <p className="px-2 pt-3 text-[10px] text-[#63716e]">
                      Fictional in-game calls and unofficial company
                      simulations.
                    </p>
                  </div>
                )}
                {app === "settings" && (
                  <div className="h-full space-y-3 overflow-y-auto bg-[#f2f2f7] p-4">
                    <h2 className="text-3xl font-bold">Settings</h2>
                    <p className="rounded-2xl bg-white p-4 text-sm">
                      @{username}
                      <span className="mt-1 block text-xs text-[#63716e]">
                        Your IlluminatED account
                      </span>
                    </p>
                    {[
                      ["Account & preferences", "/dashboard/settings"],
                      ["Membership", "/games/illumship"],
                      ["Learning sources", "/games/sources"],
                      ["Help & safety", "/safeguarding"],
                      ["Back to games", "/games"],
                    ].map(([label, href]) => (
                      <Link
                        key={href}
                        href={href}
                        className="block rounded-2xl bg-white px-4 py-4 text-sm text-[#1675ed]"
                      >
                        {label} →
                      </Link>
                    ))}
                    <p className="text-xs text-[#63716e]">
                      Use the game’s graphics and music controls to adjust this
                      device’s experience.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setApp("home");
            setSearch("");
          }}
          aria-label="Phone home screen"
          className={`grid h-7 shrink-0 place-items-center ${app === "home" ? "bg-[#152e30]" : "bg-[#f2f2f7]"}`}
        >
          <span
            className={`h-1 w-24 rounded-full ${app === "home" ? "bg-white/80" : "bg-[#172723]"}`}
          />
        </button>
      </section>
    </div>
  );
}
