"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ArrowLeft, BedDouble, Briefcase, CarFront, Shirt, Sofa, Gamepad2, Globe, House, Landmark, Lock, MapPinned, Minus, Package, PawPrint, Plus, RotateCw, Search, ShoppingBasket, ShoppingCart, Truck, X,
} from "lucide-react";

import { HotelDesk } from "./hotel-desk";
import { JobsPanel } from "./jobs-panel";
import { PetPanel } from "./pet-panel";
import { doActivity } from "./use-needs";

import { type HotelBooking, type ShopOrder, checkoutShop, loadShopAccount, consumePantryItem } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import type { Activity } from "@/game/core/needs";
import type { PracticalRole } from "@/game/core/roles";
import { DELIVERY, DEPARTMENTS, type Department, MAX_QTY, SHOP_ITEMS, type ShopItem, type Speed, basketTotal, shopItem } from "@/game/core/shop";
import { cn } from "@/lib/utils";

export type Site = "start" | "megamart" | "worknet" | "stays" | "petpals" | "autohub" | "homefinder";
const SITES: Record<Site, { url: string; title: string }> = {
  start: { url: "educreation://start", title: "EduCreation Web" },
  autohub: { url: "https://autohub.cars", title: "AutoHub · Cars" },
  homefinder: { url: "https://homefinder.homes", title: "HomeFinder · Houses" },
  megamart: { url: "https://megamart.shop", title: "MegaMart" },
  worknet: { url: "https://worknet.jobs", title: "WorkNet · Jobs" },
  stays: { url: "https://staylondon.travel", title: "StayLondon · Hotels" },
  petpals: { url: "https://petpals.pet", title: "PetPals" },
};

/**
 * The EduCreation Web: the in-game browser, and the one place to buy anything. MegaMart for
 * shopping delivered to your door, AutoHub for cars, HomeFinder for houses, WorkNet for jobs,
 * StayLondon for hotels and PetPals for pets. Bank, games, fashion and the map open their own screens.
 */
export function WebBrowser({ start = "start", renderCars, renderHouses, wallet, mapId, activeRole, hotelBooking, onWallet, onHotelBooking, onGoToRoom, onStartJob, onTravelJob, onOpen, onClose }: {
  start?: Site;
  /** Existing shop screens shown as websites (their pop-up is contained inside the page). */
  renderCars: (back: () => void) => ReactNode;
  renderHouses: (back: () => void) => ReactNode;
  wallet: number;
  mapId: string;
  activeRole: string | null;
  hotelBooking: HotelBooking | null;
  onWallet: (change: number) => void;
  onHotelBooking: (b: HotelBooking | null) => void;
  onGoToRoom: (b: HotelBooking) => void;
  onStartJob: (role: PracticalRole, level: number) => void;
  onTravelJob: (role: PracticalRole) => void;
  onOpen: (app: "bank" | "games" | "map" | "fashion" | "furniture") => void;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<Site[]>([start]);
  const site = history[history.length - 1];
  const go = (s: Site) => setHistory((h) => (h[h.length - 1] === s ? h : [...h, s]));
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  const [reload, setReload] = useState(0);
  const [hotel, setHotel] = useState<"hotel-0" | "hotel-1">("hotel-0");
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100009] grid place-items-center bg-black/55 p-0 sm:p-4" role="dialog" aria-label="EduCreation Web">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#e9ecf2] text-[#13203a] shadow-2xl [color-scheme:light] sm:h-[92dvh] sm:rounded-2xl sm:border-[3px] sm:border-[#141020]">
        {/* Browser chrome: tab, buttons and address bar. */}
        <div className="flex items-end gap-1 bg-[#cfd5df] px-2 pt-[max(6px,env(safe-area-inset-top))]">
          <span className="flex max-w-56 min-w-0 items-center gap-2 truncate rounded-t-xl bg-[#e9ecf2] px-3 py-1.5 text-xs font-bold"><Globe className="size-3.5 shrink-0" />{SITES[site].title}</span>
          <button type="button" onClick={onClose} aria-label="Close browser" className="mb-1 ml-auto grid size-9 place-items-center rounded-full hover:bg-black/10"><X className="size-5" /></button>
        </div>
        <div className="flex items-center gap-1.5 border-b border-black/10 px-2 py-1.5">
          <button type="button" onClick={back} disabled={history.length < 2} aria-label="Back" className="grid size-9 place-items-center rounded-full hover:bg-black/10 disabled:opacity-30"><ArrowLeft className="size-4" /></button>
          <button type="button" onClick={() => setReload((n) => n + 1)} aria-label="Reload" className="grid size-9 place-items-center rounded-full hover:bg-black/10"><RotateCw className="size-4" /></button>
          <button type="button" onClick={() => go("start")} aria-label="Start page" className="grid size-9 place-items-center rounded-full hover:bg-black/10"><House className="size-4" /></button>
          <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 text-sm ring-1 ring-black/10">
            {site === "start" ? <Search className="size-3.5 shrink-0 opacity-50" /> : <Lock className="size-3.5 shrink-0 text-[#2f8a4c]" />}
            <span className="truncate">{SITES[site].url}</span>
          </div>
        </div>
        <div key={`${site}-${reload}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
          {site === "start" && <StartPage go={go} onOpen={onOpen} />}
          {site === "megamart" && <MegaMart wallet={wallet} onWallet={onWallet} />}
          {site === "worknet" && <JobsPanel embedded mapId={mapId} activeRole={activeRole} onClose={() => go("start")} onStart={onStartJob} onTravel={onTravelJob} />}
          {site === "stays" && (
            <div className="flex h-full flex-col">
              <div className="flex gap-2 border-b border-black/10 bg-[#f7f1e6] px-4 py-2">
                {(["hotel-0", "hotel-1"] as const).map((h) => <button key={h} type="button" onClick={() => setHotel(h)} className={cn("min-h-9 rounded-full px-4 text-sm font-black", hotel === h ? "bg-[#13203a] text-white" : "bg-white ring-1 ring-black/10")}>{h === "hotel-0" ? "The Lantern" : "The Garden House"}</button>)}
              </div>
              <div className="min-h-0 flex-1"><HotelDesk embedded hotel={hotel} booking={hotelBooking} wallet={wallet} onClose={() => go("start")}
                onBooking={(b, change) => { onHotelBooking(b); onWallet(change); }} onGoToRoom={onGoToRoom} /></div>
            </div>
          )}
          {site === "petpals" && <PetPanel embedded onClose={() => go("start")} onClout={onWallet} />}
          {/* A transform makes the shop's own full-screen layout fit inside the page. */}
          {site === "autohub" && <div className="relative h-full overflow-hidden [transform:translateZ(0)]">{renderCars(() => go("start"))}</div>}
          {site === "homefinder" && <div className="relative h-full overflow-hidden [transform:translateZ(0)]">{renderHouses(() => go("start"))}</div>}
        </div>
      </div>
    </div>
  );
}

function StartPage({ go, onOpen }: { go: (s: Site) => void; onOpen: (app: "bank" | "games" | "map" | "fashion" | "furniture") => void }) {
  const [q, setQ] = useState("");
  const apps: { name: string; blurb: string; icon: ReactNode; colour: string; open: () => void }[] = [
    { name: "MegaMart", blurb: "Groceries, snacks and more, delivered to your door", icon: <ShoppingBasket className="size-7" />, colour: "#e4572e", open: () => go("megamart") },
    { name: "AutoHub", blurb: "Buy a car and take one out of your garage", icon: <CarFront className="size-7" />, colour: "#c8322d", open: () => go("autohub") },
    { name: "HomeFinder", blurb: "Buy or move house anywhere in London", icon: <House className="size-7" />, colour: "#704c47", open: () => go("homefinder") },
    { name: "HomeStyle", blurb: "Furniture for your home: shop and arrange it", icon: <Sofa className="size-7" />, colour: "#b58ad8", open: () => onOpen("furniture") },
    { name: "Fashion Locker", blurb: "Outfits, hair and accessories", icon: <Shirt className="size-7" />, colour: "#ff5a7a", open: () => onOpen("fashion") },
    { name: "WorkNet", blurb: "Find a job, start a shift, see your career tier", icon: <Briefcase className="size-7" />, colour: "#2b5fd9", open: () => go("worknet") },
    { name: "StayLondon", blurb: "Book a hotel room and see your stay", icon: <BedDouble className="size-7" />, colour: "#315b50", open: () => go("stays") },
    { name: "PetPals", blurb: "Adopt and look after your pets", icon: <PawPrint className="size-7" />, colour: "#8a5a1f", open: () => go("petpals") },
    { name: "My bank", blurb: "Your Clout, savings and payments", icon: <Landmark className="size-7" />, colour: "#13203a", open: () => onOpen("bank") },
    { name: "Games", blurb: "Play mini-games and tournaments", icon: <Gamepad2 className="size-7" />, colour: "#7a5ce6", open: () => onOpen("games") },
    { name: "City map", blurb: "Find places and plan a route", icon: <MapPinned className="size-7" />, colour: "#15987f", open: () => onOpen("map") },
  ];
  const shown = apps.filter((a) => `${a.name} ${a.blurb}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-center text-4xl font-black tracking-tight"><span className="text-[#2b5fd9]">Edu</span><span className="text-[#e4572e]">Creation</span></p>
      <p className="mt-1 text-center text-xs font-bold tracking-widest text-[#13203a]/50 uppercase">The web · everything you can buy in the city</p>
      <label className="mx-auto mt-4 flex max-w-xl items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow ring-1 ring-black/10">
        <Search className="size-4 opacity-50" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the city's websites" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((a) => (
          <li key={a.name}>
            <button type="button" onClick={a.open} className="flex h-full w-full flex-col items-start gap-2 rounded-2xl border-[3px] border-[#141020] bg-white p-3 text-left shadow-[0_4px_0_#141020] transition hover:-translate-y-0.5">
              <span className="grid size-12 place-items-center rounded-xl text-white" style={{ background: a.colour }}>{a.icon}</span>
              <span className="font-black">{a.name}</span>
              <span className="text-xs text-[#13203a]/70">{a.blurb}</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="col-span-full text-center text-sm text-[#13203a]/60">No websites match &ldquo;{q}&rdquo;.</li>}
      </ul>
    </div>
  );
}

function ProductArt({ item, big = false }: { item: ShopItem; big?: boolean }) {
  return (
    <span className={cn("relative grid place-items-center overflow-hidden rounded-xl border-[3px] border-[#141020]", big ? "h-28" : "h-20")} style={{ background: `linear-gradient(160deg, ${item.colour}, ${item.colour}cc)` }} aria-hidden>
      <span className="absolute -top-4 -right-4 size-16 rounded-full bg-white/20" />
      <span className="rounded-lg border-2 border-[#141020] bg-white px-2 py-0.5 text-xs font-black tracking-widest text-[#141020]">{item.label}</span>
    </span>
  );
}

const ACT_WORD: Partial<Record<Activity, string>> = { eat: "Eat", meal: "Cook and eat", drink: "Drink", coffee: "Make a coffee", shower: "Shower", medicine: "Use", study: "Revise", relax: "Relax", music: "Listen", watch: "Snack", arcade: "Play" };

function MegaMart({ wallet, onWallet }: { wallet: number; onWallet: (change: number) => void }) {
  const [dept, setDept] = useState<Department | "All">("All");
  const [q, setQ] = useState("");
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [view, setView] = useState<"shop" | "basket" | "account">("shop");
  const [speed, setSpeed] = useState<Speed>("standard");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [account, setAccount] = useState<{ orders: ShopOrder[]; pantry: Record<string, number> } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { void loadShopAccount().then(setAccount).catch(() => setAccount({ orders: [], pantry: {} })); }, [view]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const lines = useMemo(() => Object.entries(basket).filter(([, n]) => n > 0).map(([id, qty]) => ({ id, qty })), [basket]);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = basketTotal(lines, speed);
  const items = SHOP_ITEMS.filter((i) => (dept === "All" || i.dept === dept) && `${i.name} ${i.blurb}`.toLowerCase().includes(q.trim().toLowerCase()));
  const add = (id: string, n: number) => setBasket((b) => ({ ...b, [id]: Math.max(0, Math.min(MAX_QTY, (b[id] ?? 0) + n)) }));

  const checkout = async () => {
    setBusy(true); setMsg(null);
    const r = await checkoutShop(lines, speed).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) { setMsg({ ok: false, text: r?.error ?? "Couldn't place the order." }); return; }
    onWallet(-r.order.total);
    notifyPlayerChanged();
    setBasket({});
    setMsg({ ok: true, text: `Order placed! A courier will bring it to your front door in ${speed === "express" ? "under a minute" : "about three minutes"}. Be at home to sign for it.` });
    setView("account");
  };
  const use = async (id: string) => {
    const r = await consumePantryItem(id).catch(() => null);
    if (!r || !r.ok) { setMsg({ ok: false, text: r?.error ?? "Couldn't use that." }); return; }
    doActivity(r.activity as Activity);
    setMsg({ ok: true, text: `${shopItem(id)?.name}: done. You feel better.` });
    setAccount((a) => (a ? { ...a, pantry: { ...a.pantry, [id]: Math.max(0, (a.pantry[id] ?? 1) - 1) } } : a));
  };

  return (
    <div className="min-h-full bg-[#fff8ef]">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-[#e4572e] px-4 py-2.5 text-white shadow">
        <button type="button" onClick={() => setView("shop")} className="flex items-center gap-1.5 text-xl font-black tracking-tight"><ShoppingBasket className="size-6" /> MegaMart</button>
        <label className="order-3 flex min-h-9 w-full items-center gap-2 rounded-full bg-white px-3 text-[#13203a] sm:order-none sm:w-auto sm:flex-1">
          <Search className="size-4 opacity-50" /><input value={q} onChange={(e) => { setQ(e.target.value); setView("shop"); }} placeholder="Search MegaMart" aria-label="Search MegaMart" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <span className="ml-auto rounded-full bg-black/20 px-3 py-1 text-xs font-black">{wallet} Clout</span>
        <button type="button" onClick={() => setView("account")} className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-bold"><Package className="size-4" /> Orders</button>
        <button type="button" onClick={() => setView("basket")} className="relative flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-black text-[#e4572e]"><ShoppingCart className="size-4" /> Basket{count > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#13203a] text-[10px] text-white">{count}</span>}</button>
      </header>
      {msg && <p className={cn("mx-4 mt-3 rounded-xl p-3 text-sm font-bold", msg.ok ? "bg-[#dff5e3] text-[#1d6b34]" : "bg-[#ffe1dc] text-[#9b1c13]")}>{msg.text}</p>}

      {view === "shop" && (
        <div className="p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["All", ...DEPARTMENTS] as const).map((d) => <button key={d} type="button" onClick={() => setDept(d)} className={cn("min-h-9 shrink-0 rounded-full px-4 text-sm font-bold", dept === d ? "bg-[#13203a] text-white" : "bg-white ring-1 ring-black/10")}>{d}</button>)}
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-[#13203a] p-3 text-sm text-white"><Truck className="size-5 text-[#ffd166]" /> Free delivery to your front door in about 3 minutes, or express in under a minute.</div>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/10">
                <ProductArt item={i} />
                <p className="mt-2 text-sm leading-tight font-black">{i.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-[#13203a]/70">{i.blurb}</p>
                <p className="mt-auto pt-2 text-lg font-black">{i.price} <span className="text-xs font-bold text-[#13203a]/60">Clout</span></p>
                {basket[i.id] ? (
                  <div className="mt-1 flex items-center justify-between rounded-full bg-[#fff1e8] p-1">
                    <button type="button" aria-label={`One less ${i.name}`} onClick={() => add(i.id, -1)} className="grid size-8 place-items-center rounded-full bg-white"><Minus className="size-4" /></button>
                    <span className="font-black">{basket[i.id]}</span>
                    <button type="button" aria-label={`One more ${i.name}`} onClick={() => add(i.id, 1)} className="grid size-8 place-items-center rounded-full bg-white"><Plus className="size-4" /></button>
                  </div>
                ) : <button type="button" onClick={() => add(i.id, 1)} className="mt-1 min-h-10 rounded-full bg-[#ffd166] text-sm font-black">Add to basket</button>}
              </li>
            ))}
          </ul>
          {!items.length && <p className="mt-6 text-center text-sm text-[#13203a]/60">Nothing matches that search.</p>}
        </div>
      )}

      {view === "basket" && (
        <div className="mx-auto max-w-2xl p-4">
          <h2 className="text-xl font-black">Your basket</h2>
          {!lines.length ? <p className="mt-2 text-sm text-[#13203a]/70">Your basket is empty. <button type="button" className="font-bold underline" onClick={() => setView("shop")}>Start shopping</button></p> : (
            <>
              <ul className="mt-3 divide-y divide-black/10 rounded-2xl bg-white ring-1 ring-black/10">
                {lines.map((l) => { const i = shopItem(l.id)!; return (
                  <li key={l.id} className="flex items-center gap-3 p-3">
                    <span className="w-16 shrink-0"><ProductArt item={i} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-black">{i.name}</span><span className="text-xs text-[#13203a]/60">{i.price} Clout each</span></span>
                    <span className="flex items-center gap-1"><button type="button" aria-label="One less" onClick={() => add(l.id, -1)} className="grid size-8 place-items-center rounded-full bg-black/5"><Minus className="size-4" /></button><span className="w-6 text-center font-black">{l.qty}</span><button type="button" aria-label="One more" onClick={() => add(l.id, 1)} className="grid size-8 place-items-center rounded-full bg-black/5"><Plus className="size-4" /></button></span>
                    <span className="w-16 text-right font-black">{i.price * l.qty}</span>
                  </li>
                ); })}
              </ul>
              <fieldset className="mt-4 grid gap-2">
                <legend className="text-sm font-black">Delivery to your front door</legend>
                {(Object.keys(DELIVERY) as Speed[]).map((s) => (
                  <label key={s} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 ring-2", speed === s ? "ring-[#e4572e]" : "ring-black/10")}>
                    <input type="radio" name="speed" checked={speed === s} onChange={() => setSpeed(s)} />
                    <span className="flex-1 text-sm font-bold">{DELIVERY[s].label}</span><span className="text-sm font-black">{DELIVERY[s].fee ? `${DELIVERY[s].fee} Clout` : "Free"}</span>
                  </label>
                ))}
              </fieldset>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#13203a] p-4 text-white">
                <span className="flex-1"><span className="block text-xs text-white/70">Total</span><span className="text-2xl font-black">{total} Clout</span></span>
                <button type="button" disabled={busy || wallet < total} onClick={() => void checkout()} className="min-h-11 rounded-full bg-[#ffd166] px-6 font-black text-[#13203a] disabled:opacity-50">{wallet < total ? "Not enough Clout" : busy ? "Placing order…" : "Place order"}</button>
              </div>
            </>
          )}
        </div>
      )}

      {view === "account" && (
        <div className="mx-auto max-w-2xl p-4">
          <h2 className="text-xl font-black">Your orders</h2>
          {!account ? <p className="mt-2 text-sm">Loading…</p> : !account.orders.length ? <p className="mt-2 text-sm text-[#13203a]/70">No orders yet.</p> : (
            <ul className="mt-3 grid gap-2">
              {account.orders.map((o) => {
                const left = Math.max(0, Math.ceil((Date.parse(o.arrives_at) - now) / 1000));
                const status = o.status === "delivered" ? "Delivered" : left > 0 ? `On the way · about ${left >= 60 ? `${Math.ceil(left / 60)} min` : `${left}s`}` : "Arrived · waiting at your front door";
                return (
                  <li key={o.id} className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
                    <p className="flex items-center gap-2 text-sm font-black"><Truck className="size-4" /> {status}<span className="ml-auto">{o.total} Clout</span></p>
                    <p className="mt-1 text-xs text-[#13203a]/70">{o.lines.map((l) => `${l.qty}× ${shopItem(l.id)?.name ?? l.id}`).join(", ")}</p>
                    {o.status !== "delivered" && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#e4572e] transition-[width]" style={{ width: `${Math.min(100, 100 - (left / DELIVERY[o.speed].seconds) * 100)}%` }} /></div>}
                  </li>
                );
              })}
            </ul>
          )}
          <h2 className="mt-6 text-xl font-black">Your pantry</h2>
          <p className="text-xs text-[#13203a]/70">Everything you&apos;ve signed for. Use it wherever you are.</p>
          {account && !Object.values(account.pantry).some((n) => n > 0) && <p className="mt-2 text-sm text-[#13203a]/70">Empty. Order something and sign for it at your front door.</p>}
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {account && Object.entries(account.pantry).filter(([, n]) => n > 0).map(([id, n]) => { const i = shopItem(id); if (!i) return null; return (
              <li key={id} className="flex flex-col gap-1 rounded-2xl bg-white p-2.5 ring-1 ring-black/10">
                <ProductArt item={i} />
                <p className="text-sm font-black">{i.name} <span className="text-[#13203a]/60">× {n}</span></p>
                <button type="button" onClick={() => void use(id)} className="mt-auto min-h-9 rounded-full bg-[#13203a] text-sm font-black text-white">{ACT_WORD[i.use] ?? "Use"}</button>
              </li>
            ); })}
          </ul>
        </div>
      )}
    </div>
  );
}
