"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Gamepad2, Smartphone } from "lucide-react";

import { play, soundOn } from "../sound";
import { PLAYER } from "./art";
import { BusStop, type BusTrip } from "./bus-stop";
import { CityMap, MiniMap, type Place, nearest, placeForTask } from "./city-map";
import { GamePhone } from "./game-phone";
import { PoliceChallenge, PrisonStudy } from "./law-dialogs";
import { ArrestOverlay, HearingDialog, PrisonHud, ShopDialog, WantedStars } from "./life";
import { LevelBadge, LifeHud, type Quest } from "./life-hud";
import { SceneWipe, TUTORIAL_KEY, Tutorial } from "./scene";
import { TrainCutscene } from "./train-cutscene";
import { BikeDock, Dealership } from "./transport";
import { TubeMap, type TubeTrip } from "./tube-map";
import { useLife } from "./use-life";
import { useNeeds } from "./use-needs";
import { doActivity } from "./use-needs";
import { type Me, useLobby } from "./use-world";
import { WorldView } from "./world-view";
import { TRAIN_CALL } from "./world3d";
import { NPC_SPOTS } from "./world3d";
import { EventAdPopup, useTechEvents } from "../event-ads";
import { GamesHub } from "../hub/games-hub";

import { earnWorldXp } from "@/app/games/world/actions";
import { type ActiveJob, WorkplaceDoor } from "@/components/careers/work";
import type { BikeBrand } from "@/game/core/bikes";
import { WORKPLACES } from "@/game/core/careers";
import { workplaceById } from "@/game/core/careers";
import { carById } from "@/game/core/cars";
import { COMPANIES } from "@/game/core/companies";
import type { Placed } from "@/game/core/homes";
import { PRISON_LOOK, SHOP, addStar, cardsLeft, chargeFor, sentenceMs } from "@/game/core/law";
import { homeStyle } from "@/game/core/london";
import { type Pursuit, startPursuit, tickPursuit, caughtByPrisonGuard } from "@/game/core/pursuit";
import {
  CITY,
  STATION_PLATFORM_Y,
  TILE,
  stationMap,
  studyLobbyMap,
  type OfficeOrg,
  type Portal,
  REGIONS,
  type RegionId,
  SERVERS,
  SERVER_CAPACITY,
  type WorldMap,
  campusMap,
  courtMap,
  hospitalMap,
  prisonMap,
  highlandsMap,
  busStops,
  homeMap,
  tubeStations,
  guessRegion,
  isRegion,
  officeMap,
  pickServer,
  safeSpot,
  serverById,
} from "@/game/core/world";
import { cn } from "@/lib/utils";

const REGION_KEY = "world-region";

const STATIONS = tubeStations();
const HIGHLANDS = highlandsMap();
const BUS_STOPS = busStops();

let HOME: { style: number; layout: Placed[] } | null = null;
function loadMap(id: string, offices: OfficeOrg[], meId = ""): WorldMap | null {
  if (id === "city") return CITY;
  if (id === "home") return HOME ? homeMap(HOME.style, HOME.layout) : homeMap(homeStyle(meId));
  if (id === "study-lobby") return studyLobbyMap();
  if (id === "campus") return campusMap(offices);
  if (id === "highlands") return HIGHLANDS;
  if (id === "hospital") return hospitalMap();
  if (id === "court") return courtMap();
  if (id === "prison") return prisonMap();
  if (id.startsWith("station-")) return stationMap(id.slice("station-".length));
  if (id.startsWith("office-")) {
    const org = offices.find((o) => `office-${o.slug}` === id);
    return org ? officeMap(org) : null;
  }
  return null;
}

export interface OfficeStaff {
  userId: string;
  username: string;
  title: string | null;
}

export function WorldApp({
  me,
  offices,
  staff,
  initialMap,
  initialServer,
  job,
  home,
  clout,
  quests,
  homework = [],
  cars = [],
  xp = 0,
  homeworkDone = 0,
}: {
  /** Homework you've handed in: each one is a get-out-of-jail-free card. */
  homeworkDone?: number;
  /** Cars you own (dealership). */
  cars?: string[];
  /** Total XP, for the level badge. */
  xp?: number;
  /** Question keys from homework you haven't handed in: the bus revises those topics. */
  homework?: string[];
  me: Me;
  offices: OfficeOrg[];
  /** Verified staff for each office slug (for the Advice Desk). */
  staff: Record<string, OfficeStaff[]>;
  initialMap: string;
  initialServer: string | null;
  /** Your current job (for workplace doors and your uniform). */
  job: ActiveJob | null;
  /** Your home's colourway and furniture layout. */
  home: { style: number; layout: Placed[] };
  clout: number;
  quests: Quest[];
}) {
  HOME = home;
  const router = useRouter();
  const [mapId, setMapId] = useState(() => (loadMap(initialMap, offices, me.id) ? initialMap : "city"));
  const [tube, setTube] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);
  const [mindGap, setMindGap] = useState(false);
  const [server, setServer] = useState<string | null>(initialServer && serverById(initialServer) ? initialServer : null);
  const [region, setRegion] = useState<RegionId>("lse");
  const [arrive, setArrive] = useState<{ x: number; y: number } | undefined>();
  const [desk, setDesk] = useState(false);
  const [work, setWork] = useState<string | null>(null);
  const [bus, setBus] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [sceneName, setSceneName] = useState("London");
  const [tutorial, setTutorial] = useState(false);
  const [waypoint, setWaypoint] = useState<Place | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const arrived = useCallback(() => setWaypoint(null), []);
  useEffect(() => setWaypoint(null), [mapId]);
  useEffect(() => {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setTutorial(true);
    } catch {
      setTutorial(true);
    }
  }, []);
  const [dock, setDock] = useState(false);
  const [games, setGames] = useState(false);
  const [bike, setBike] = useState<{ brand: BikeBrand; until: number } | null>(null);
  const [wallet, setWallet] = useState(clout);
  const [dealer, setDealer] = useState(false);
  const [boarding, setBoarding] = useState(false);
  const events = useTechEvents();
  const [garage, setGarage] = useState<string[]>(cars);
  const [driving, setDriving] = useState<string | null>(null);
  const [xpNow, setXpNow] = useState(xp);
  const [toast, setToast] = useState<{ text: string; big?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gainXp = useCallback(async (kind: "bus" | "hike" | "train" | "eat" | "study" | "sleep") => {
    const r = await earnWorldXp(kind);
    if (!r || !r.xp) return;
    setXpNow((x) => r.total ?? x + r.xp);
    setToast(r.levelled ? { text: `Level up! You're now level ${r.level}`, big: true } : { text: `+${r.xp} XP` });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), r.levelled ? 3200 : 1800);
  }, []);
  const [shop, setShop] = useState<"tescow" | "bootz" | null>(null);
  const [phone, setPhone] = useState(false);
  const [study, setStudy] = useState(false);
  const [inmate, setInmate] = useState<string | null>(null);
  const [pursuit, setPursuit] = useState<Pursuit | null>(null);
  const pursuitRef = useRef<Pursuit | null>(null);
  const guardCaughtAt = useRef(0);
  const releaseReason = useRef("released");
  const arrestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (arrestTimer.current) clearTimeout(arrestTimer.current); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("phone") === "1") setPhone(true); }, []);
  const [arrest, setArrest] = useState(false);
  const { life, update: updateLife } = useLife();
  const { needs } = useNeeds();
  const [nearPerson, setNearPerson] = useState(false);
  const say = useCallback((text: string, big = false) => {
    setToast({ text, big });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), big ? 3200 : 2200);
  }, []);
  const jailed = life.jailUntil > 0;
  const cards = cardsLeft(homeworkDone, life);
  const [journey, setJourney] = useState<{ to: string; go: () => void } | null>(null);
  useEffect(() => setWallet(clout), [clout]);
  // Hired bikes go back to the dock by themselves when the time runs out.
  useEffect(() => {
    if (!bike) return;
    const t = setTimeout(() => setBike(null), Math.max(0, bike.until - Date.now()));
    return () => clearTimeout(t);
  }, [bike]);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  }, []);
  const map = useMemo(() => loadMap(mapId, offices, me.id) ?? CITY, [mapId, offices, me.id]);
  const inOffice = mapId.startsWith("office-");
  const outdoors = mapId === "city" || mapId === "highlands";
  const atHome = mapId === "home";
  const lobby = useLobby(server && !atHome ? { map: mapId, server: inOffice ? "main" : server } : null, me.id);

  // Where you are decides your server: we read your device's time zone (no GPS, nothing stored
  // on our side) and drop you straight into the nearest region's least-empty open server.
  useEffect(() => {
    const here = guessRegion(Intl.DateTimeFormat().resolvedOptions().timeZone);
    let r = here;
    try {
      const saved = localStorage.getItem(REGION_KEY);
      if (saved && isRegion(saved)) r = saved;
    } catch {
      // Private browsing: use the time zone.
    }
    setRegion(r);
    setServer((s) => s ?? pickServer(r, {}).id);
  }, []);

  // Keep the address bar shareable: /games/world?map=campus&server=lse-1
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("map", mapId);
    if (server) url.searchParams.set("server", server);
    else url.searchParams.delete("server");
    window.history.replaceState(null, "", url);
  }, [mapId, server]);

  const chooseRegion = (r: RegionId) => {
    setRegion(r);
    try {
      localStorage.setItem(REGION_KEY, r);
    } catch {
      // Not saved; fine for this visit.
    }
  };

  const onPortal = useCallback(
    (portal: Portal) => {
      const to = portal.to;
      if (jailed && to.kind !== "prison") { say("Find the study desk or explore the prison first."); return; }
      if (life.stars >= 2 && ["map", "link", "game", "bus", "tube"].includes(to.kind)) { say("Lose the wanted stars before travelling or starting another activity."); return; }
      if (to.kind === "prison") {
        if (to.action === "study") setStudy(true);
        else if (to.action === "talk") setInmate(to.name ?? "Sam");
        else { releaseReason.current = "escaped"; updateLife(l=>({...l,jailUntil:0,stars:2,heatAt:Date.now()})); }
        return;
      }
      if (to.kind === "game") router.push(`/games/promotion-panic/${to.companyId}`);
      else if (to.kind === "link") {
        if (to.href === "/learn") doActivity("study");
        // Games open as a pop-up right here instead of leaving the world.
        if (to.href === "/games" || to.href === "/games/hub" || to.href === "/games/arcade") setGames(true);
        else router.push(to.href);
      } else if (to.kind === "bus") setBus(to.stop);
      else if (to.kind === "act") {
        play("door", soundOn());
        doActivity(to.activity);
        void gainXp(to.activity);
      }
      else if (to.kind === "desk") setDesk(true);
      else if (to.kind === "tube") setTube(to.station);
      else if (to.kind === "work") setWork(to.workplace);
      else if (to.kind === "bike") setDock(true);
      else if (to.kind === "games") setGames(true);
      else if (to.kind === "dealer") setDealer(true);
      else if (to.kind === "shop") setShop(to.shop);
      else if (to.kind === "doctor") {
        play("door", soundOn());
        doActivity("hospital");
        updateLife((l) => ({ ...l, sick: false }));
        say("The doctor sorted you out. Feeling much better.", true);
      } else if (to.kind === "map") {
        // No bikes or cars indoors: leave them outside.
        if (to.mapId !== "city") setBike(null);
        if (to.mapId !== "city" && to.mapId !== "highlands") setDriving(null);
        const next = loadMap(to.mapId, offices, me.id);
        if (!next) return;
        // Arrive outside the door that leads back to where you came from.
        const back = next.portals.find((p) => p.to.kind === "map" && p.to.mapId === mapId);
        const spot = back
          ? safeSpot(next, back.rect.x + back.rect.w / 2, back.rect.y + (back.rect.y + back.rect.h >= next.height - 4 ? -24 : back.rect.y > next.height / 2 ? -50 : back.rect.h + 50))
          : next.spawn;
        // Fade to black, swap the map underneath, then fade back in.
        play("door", soundOn());
        setSceneName(to.label);
        setFading(true);
        setDesk(false);
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => {
          setArrive(spot);
          setMapId(to.mapId);
          fadeTimer.current = setTimeout(() => setFading(false), 550);
        }, 430);
      }
    },
    [router, offices, mapId, me.id, updateLife, say, jailed, life.stars],
  );

  /** Taken somewhere (arrest, prison, release): fade and arrive at a set spot or the map's start. */
  const goTo = useCallback((dest: string, label: string, spot?: { x: number; y: number }) => {
    const next = loadMap(dest, offices, me.id);
    if (!next) return;
    setBike(null);
    setDriving(null);
    setGames(false); setPhone(false); setStudy(false); setInmate(null);
    setShop(null); setWork(null); setTube(null); setBus(null); setMapOpen(false);
    setDealer(false); setDock(false); setDesk(false);
    setSceneName(label);
    setFading(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setArrive(spot ?? next.spawn);
      setMapId(dest);
      setTrip((n) => n + 1);
      fadeTimer.current = setTimeout(() => setFading(false), 550);
    }, 430);
  }, [offices, me.id]);
  const courtSteps = useMemo(() => {
    const p = CITY.portals.find((q) => q.id === "court");
    return p ? safeSpot(CITY, p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h + 40) : undefined;
  }, []);

  // Feeling unwell when you run yourself down: slower, until medicine or a doctor.
  useEffect(() => {
    if (needs && needs.energy < 12 && !life.sick) {
      updateLife((l) => ({ ...l, sick: true }));
      say("You feel unwell. Get medicine at Bootz (1 Clout) or see a doctor at St Tomas' Hospital.", true);
    }
  }, [needs, life.sick, updateLife, say]);

  // Spatial pursuit: actual car arrival, foot chase, a search area and a knowledge challenge.
  useEffect(() => {
    if (life.stars < 2 || jailed || life.hearing || !outdoors || arrest) {
      pursuitRef.current = null; setPursuit(null); return;
    }
    const timer = setInterval(() => {
      const current = pursuitRef.current ?? startPursuit(map, PLAYER);
      const next = tickPursuit(current, map, PLAYER, Date.now(), 0.2);
      if (next.escaped) {
        pursuitRef.current = null; setPursuit(null);
        updateLife(l=>({...l,stars:0,heatAt:0}));
        say("You left the search area and lost the police. Wanted stars cleared.", true);
      } else { pursuitRef.current = next; setPursuit(next); }
    }, 200);
    return () => clearInterval(timer);
  }, [life.stars, life.hearing, jailed, outdoors, mapId, map, arrest, updateLife, say]);

  useEffect(() => {
    if (jailed && life.prisonWork >= 3 && Date.now() >= life.jailUntil) {
      updateLife(l=>({...l,jailUntil:0})); return;
    }
    if (jailed && mapId !== "prison") goTo("prison", "HMP Thames");
    if (!jailed && mapId === "prison") {
      say(releaseReason.current === "escaped" ? "You found the service exit. Escape succeeded — the police are looking for you." : "Study complete. You've been released!", true);
      setStudy(false); setInmate(null);
      goTo("city", "London", courtSteps);
      releaseReason.current = "released";
    }
  }, [jailed, life, mapId, goTo, say, courtSteps, updateLife]);

  useEffect(() => {
    if (!jailed || mapId !== "prison" || study || inmate) return;
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - guardCaughtAt.current > 6000 && caughtByPrisonGuard(map, PLAYER, now/1000)) {
        guardCaughtAt.current = now;
        updateLife(l=>({...l,jailUntil:Math.max(l.jailUntil,now)+45000}));
        say("A guard caught your escape attempt. 45 seconds added; your study progress is kept.", true);
        goTo("prison", "Back to your cell");
      }
    }, 250);
    return () => clearInterval(timer);
  }, [jailed, mapId, map, study, inmate, updateLife, say, goTo]);

  // Someone near you on the street (for the Shove button).
  useEffect(() => {
    if (!outdoors) return setNearPerson(false);
    const t = setInterval(() => setNearPerson(NPC_SPOTS.some((n) => Math.hypot(n.x - PLAYER.x, n.y - PLAYER.y) < 52)), 300);
    return () => clearInterval(t);
  }, [outdoors]);
  const fight = useCallback(() => {
    window.dispatchEvent(new Event("illuminated:fight"));
    updateLife((l) => addStar(l, Date.now()));
    say("Scuffle! The police are watching...");
  }, [updateLife, say]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && nearPerson && !phone && !study && !inmate && !arrest && pursuit?.stage !== "challenge" && !document.querySelector('[role="dialog"]') && !(e.target instanceof HTMLElement && e.target.closest("input, textarea, button, [role=dialog]"))) fight();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [nearPerson, fight, phone, study, inmate, arrest, pursuit?.stage]);

  // Riding the Underground: to another London station, or further afield.
  const ride = useCallback(
    (t: TubeTrip) => {
      setTube(null);
      let dest = "city";
      let spot: { x: number; y: number } | undefined;
      if (t.kind === "station") {
        const st = STATIONS.find((s) => s.id === t.id);
        const inside = stationMap(t.id);
        if (!st || !inside) return;
        // Ride inside the carriage, then step off onto the other station's platform.
        setBike(null);
        void gainXp("train");
        // The train pulls in to the platform first, then you're on board.
        TRAIN_CALL.at = performance.now();
        setBoarding(true);
        setTimeout(() => setBoarding(false), 5200);
        setTimeout(() => setJourney({
          to: st.name,
          go: () => {
            setJourney(null);
            setArrive(safeSpot(inside, inside.width / 2, (STATION_PLATFORM_Y + 0.5) * TILE));
            TRAIN_CALL.at = performance.now() - 5500;
            setMapId(`station-${t.id}`);
            setTrip((n) => n + 1);
          },
        }), 5200);
        play("train", soundOn());
        return;
      } else {
        dest = t.mapId;
        const next = loadMap(dest, offices, me.id);
        if (!next) return;
        spot = next.spawn;
        if (dest === "highlands") {
          // The long way north: ride the train, then step out at Glen Lorne.
          setBike(null);
          setJourney({
            to: "Glen Lorne",
            go: () => {
              setJourney(null);
              setArrive(spot);
              setMapId(dest);
              setTrip((n) => n + 1);
            },
          });
          play("train", soundOn());
          return;
        }
      }
      play("train", soundOn());
      setMindGap(true);
      setSceneName(t.kind === "map" ? t.label : "London");
      setFading(true);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setArrive(spot);
        setMapId(dest);
        setTrip((n) => n + 1);
        fadeTimer.current = setTimeout(() => {
          setFading(false);
          setMindGap(false);
        }, 650);
      }, 700);
    },
    [offices, me.id],
  );

  // Riding the bus: to another stop in London, home, or the Careers Campus.
  const busRide = useCallback(
    (t: BusTrip, revised: boolean) => {
      setBus(null);
      if (revised) {
        doActivity("bus");
        void gainXp("bus");
      }
      let dest = "city";
      let spot: { x: number; y: number } | undefined;
      if (t.kind === "stop") {
        const st = BUS_STOPS.find((s) => s.id === t.id);
        if (!st) return;
        spot = safeSpot(CITY, st.exitPx.x, st.exitPx.y);
      } else {
        dest = t.mapId;
        const next = loadMap(dest, offices, me.id);
        if (!next) return;
        spot = next.spawn;
      }
      play("train", soundOn());
      setSceneName(t.kind === "stop" ? t.name : t.label);
      setFading(true);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setArrive(spot);
        setMapId(dest);
        setTrip((n) => n + 1);
        fadeTimer.current = setTimeout(() => setFading(false), 500);
      }, 500);
    },
    [offices, me.id],
  );

  const countFor = (m: string, s: string) => lobby.counts[`${m}:${s}`] ?? 0;
  const officeSlug = inOffice ? mapId.slice("office-".length) : null;
  const officeStaff = officeSlug ? (staff[officeSlug] ?? []) : [];

  if (!server) {
    const counts = Object.fromEntries(SERVERS.map((s) => [s.id, countFor(mapId, s.id)]));
    const best = pickServer(region, counts);
    return (
      <div className="mx-auto max-w-3xl px-4 pt-5 pb-10 md:pt-10">
        <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Worlds</p>
        <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Join a server</h1>
        <p className="mt-2 text-muted-foreground">
          Walk around {map.name} with other learners, step into companies and meet verified employers. Servers are grouped by
          region so you meet people near you, and they all run in London for a fast connection across the UK.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Maps">
          {[
            { id: "city", name: "IlluminatED City" },
            { id: "campus", name: "Careers Campus" },
          ].map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mapId === m.id}
              onClick={() => setMapId(m.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-extrabold",
                mapId === m.id ? "bg-foreground text-background" : "bg-secondary",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        <label className="mt-6 block text-sm font-bold" htmlFor="region">
          Your region
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => chooseRegion(e.target.value as RegionId)}
          className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 font-bold sm:w-80"
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setServer(best.id)}
          className="arcade-btn mt-6 w-full rounded-full bg-[#f2d9a6] py-4 text-lg font-black text-[#0d1726] sm:w-auto sm:px-10"
        >
          Quick join: {best.name} →
        </button>

        <h2 className="mt-8 text-lg font-extrabold">All servers</h2>
        {!lobby.ready && <p className="mt-2 text-sm text-muted-foreground">Checking who&apos;s online…</p>}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SERVERS.filter((s) => s.region === region)
            .concat(SERVERS.filter((s) => s.region !== region))
            .map((s) => {
              const n = countFor(mapId, s.id);
              const full = n >= SERVER_CAPACITY;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => setServer(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40",
                      s.region === region ? "border-primary/50" : "border-border",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{s.name}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
                        <span className="block h-full bg-[#5fd3a5]" style={{ width: `${(n / SERVER_CAPACITY) * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-sm font-black tabular-nums">
                      {full ? "Full" : `${n}/${SERVER_CAPACITY}`}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh">
      <WorldView
        key={`${mapId}:${server}:${trip}`}
        paused={Boolean(bus || tube || games || tutorial || mapOpen || desk || work || dock || dealer || journey || fading || phone || study || inmate || shop || boarding || arrest || pursuit?.stage === "challenge")}
        police={pursuit}
        map={map}
        serverId={atHome ? "solo" : inOffice ? "main" : server}
        arriveAt={arrive}
        onPortal={onPortal}
        onRoom={setRoom}
        onChangeServer={() => { if (jailed || life.stars >= 2) say("Finish your current law activity before changing servers."); else setServer(null); }}
        ads={events}
        me={jailed || mapId === "prison" ? { ...me, avatar: { ...me.avatar, ...PRISON_LOOK } } : me}
        speed={(life.sick ? 0.7 : 1) * (driving && outdoors ? (carById(driving)?.speed ?? 1) : bike && outdoors ? bike.brand.speed : 1)}
        car={driving && outdoors ? driving : null}
        bike={!driving && bike && outdoors ? bike.brand.colour : null}
      />
      {bike && mapId === "city" && (
        <button
          type="button"
          onClick={() => setBike(null)}
          className="absolute bottom-3 left-1/2 z-[100001] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-black text-white shadow-lg"
          style={{ background: bike.brand.colour }}
        >
          Riding {bike.brand.name} · Get off
        </button>
      )}
      {dock && (
        <BikeDock
          clout={wallet}
          riding={bike?.brand ?? null}
          onRide={(b, left) => {
            setWallet(left);
            setBike({ brand: b, until: Date.now() + b.minutes * 60_000 });
            setDock(false);
            router.refresh();
          }}
          onDock={() => {
            setBike(null);
            setDock(false);
          }}
          onClose={() => setDock(false)}
        />
      )}
      {games && <GamesHub serverId={server} me={{ id: me.id, username: me.username }} onClose={() => setGames(false)} />}
      {dealer && (
        <Dealership
          clout={wallet}
          owned={garage}
          driving={driving}
          onBought={(c, left) => {
            setWallet(left);
            setGarage((g) => [...g, c]);
            setDriving(c);
            setBike(null);
            router.refresh();
          }}
          onDrive={(c) => {
            setDriving(c);
            if (c) setBike(null);
            setDealer(false);
          }}
          onClose={() => setDealer(false)}
        />
      )}
      {driving && outdoors && (
        <button type="button" onClick={() => setDriving(null)} className="absolute bottom-3 left-1/2 z-[100001] -translate-x-1/2 rounded-full bg-[#13203a] px-4 py-2 text-sm font-black text-white shadow-lg">
          Driving your {carById(driving)?.name} · Park
        </button>
      )}
      <LevelBadge xp={xpNow} />
      <button type="button" onClick={() => { if(jailed || life.stars >= 2) say("Finish your current law activity first."); else setGames(true); }} className="absolute right-3 bottom-40 z-[100001] flex items-center gap-1.5 rounded-full bg-[#7a5ce6] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Gamepad2 className="size-4" aria-hidden /> Games
      </button>
      <EventAdPopup events={events} />
      <WantedStars stars={life.stars} />
      {life.sick && <p className="pointer-events-none absolute top-[104px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#c8322d] px-3 py-1 text-xs font-black text-white">Unwell: get medicine or see a doctor</p>}
      {nearPerson && !jailed && (
        <button type="button" onClick={fight} className="absolute right-3 bottom-52 z-[100001] rounded-full bg-[#c8322d] px-4 py-2 text-sm font-black text-white shadow-lg">
          Shove (F)
        </button>
      )}
      {pursuit && pursuit.stage !== "challenge" && <div role="status" className="pointer-events-none absolute top-40 left-1/2 z-[65] max-w-[60%] -translate-x-1/2 rounded-2xl bg-[#13203a]/95 px-4 py-2 text-center text-sm font-bold text-white">{pursuit.stage === "arriving" ? "Police car responding" : "Officers are searching"}<p className="text-xs text-white/80">Leave the red search circle for 6 seconds to clear your stars.{pursuit.outsideSince !== null ? ` ${Math.max(0,6-Math.floor((Date.now()-pursuit.outsideSince)/1000))}s left` : ""}</p></div>}
      {pursuit?.stage === "challenge" && <PoliceChallenge onResult={correct=>{
        pursuitRef.current = null; setPursuit(null);
        if(correct) { updateLife(l=>({...l,stars:0,heatAt:0})); say("Correct. The officers let you go with a warning.",true); }
        else { setArrest(true); arrestTimer.current=setTimeout(()=>{updateLife(l=>({...l,hearing:{stars:l.stars,charge:chargeFor(l.stars)},stars:0,heatAt:0}));setArrest(false);goTo("court","Crown Court");},2600); }
      }}/ >}
      {arrest && <ArrestOverlay />}
      <button type="button" onClick={()=>setPhone(true)} aria-label="Open your game phone" className="absolute right-3 bottom-24 z-[100001] grid size-12 place-items-center rounded-2xl border-2 border-white bg-[#13203a] text-white shadow-lg"><Smartphone className="size-6"/></button>
      {phone && <GamePhone onClose={()=>setPhone(false)} onMap={()=>{setPhone(false);setMapOpen(true);}} onHome={()=>{setPhone(false);if(jailed||life.stars>=2)say("Finish your current law activity first.");else router.push("/games/home");}} onLocker={()=>{if(!jailed&&life.stars<2)router.push("/games/locker");else say("Finish your current law activity first.");}} onCall={id=>{
        setPhone(false);
        if(jailed||life.stars>=2){say("Finish your current law activity before calling companies.");return;}
        const workplace=id.startsWith("work:") ? workplaceById(id.slice(5)) : WORKPLACES.find(w=>w.companyId===id);
        if(workplace)setWork(workplace.id);
        else { const company=COMPANIES.find(c=>c.id===id); setInmate(`Call: ${company?.name??id}`); }
      }}/ >}
      {study && <PrisonStudy progress={life.prisonWork} onCorrect={()=>updateLife(l=>({...l,prisonWork:Math.min(3,l.prisonWork+1)}))} onClose={()=>setStudy(false)}/>}
      {inmate && <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-label={inmate} className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"><h2 className="text-2xl font-black">{inmate}</h2><p className="mt-3 leading-relaxed">{inmate.startsWith("Call:")?"Thanks for calling. Visit our headquarters in the city to start your revision shift. Look for our company sign and walk to the glowing door.":inmate==="Sam"?"The cell doors are open. The study desk is in the south-west corner. Three correct revision answers count towards your release, or use a completed homework card.":"The service corridor starts through the eastern wall. The gaps alternate north and south. Watch the patrolling guards; getting caught adds time."}</p><p className="mt-3 text-xs text-[#5a6272]">Scripted character dialogue — no live chat.</p><button type="button" onClick={()=>setInmate(null)} className="mt-5 rounded-full bg-[#2b5fd9] px-5 py-2 font-black text-white">End conversation</button></section></div>}
      {mapId === "court" && life.hearing && (
        <HearingDialog
          charge={life.hearing.charge}
          stars={life.hearing.stars}
          cards={cards}
          onVerdict={(v) => {
            const h = life.hearing!;
            if (v === "guilty") {
              updateLife((l) => ({ ...l, hearing: null, jailUntil: Date.now() + sentenceMs(h.stars), prisonWork: 0 }));
            } else {
              updateLife((l) => ({ ...l, hearing: null, cardsUsed: l.cardsUsed + (v === "dismissed" ? 1 : 0) }));
              say(v === "dismissed" ? "Case dismissed: your homework got you off!" : "Not guilty. You're free to go.", true);
              goTo("city", "London", courtSteps);
            }
          }}
        />
      )}
      {jailed && mapId === "prison" && (
        <PrisonHud
          leftMs={life.jailUntil - Date.now()}
          cards={cards}
          progress={life.prisonWork}
          onStudy={()=>setStudy(true)}
          onCard={() => updateLife((l) => ({ ...l, jailUntil: 0, cardsUsed: l.cardsUsed + 1 }))}
        />
      )}
      {shop && (
        <ShopDialog
          shop={shop}
          clout={wallet}
          onBought={(item, left) => {
            if (left !== null) setWallet(left);
            doActivity(item === "medicine" ? "medicine" : item);
            if (item === "medicine") updateLife((l) => ({ ...l, sick: false }));
            say(item === "medicine" ? "Medicine taken. You feel better." : `${SHOP[item].name}: ${SHOP[item].blurb}`);
            setShop(null);
          }}
          onClose={() => setShop(null)}
        />
      )}
      {toast && (
        <div className={cn("xp-toast pointer-events-none absolute top-20 left-1/2 z-[100002] -translate-x-1/2 rounded-full px-5 py-2 font-black shadow-xl", toast.big ? "bg-[#f2d9a6] text-xl text-[#13203a]" : "bg-[#2b5fd9] text-white")} role="status">
          {toast.text}
        </div>
      )}
      {boarding && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-[100001] mx-auto w-fit rounded-full bg-[#141418] px-5 py-2 font-mono text-sm font-black text-[#ffd400] shadow-xl" role="status">
          Train approaching. Please stand behind the yellow line.
        </div>
      )}
      {journey && <TrainCutscene to={journey.to} line="Revision" avatar={me.avatar} onArrive={journey.go} />}
<SceneWipe show={fading} label={sceneName} />
      <button
        type="button"
        onClick={() => setTutorial(true)}
        className="absolute right-3 bottom-16 z-[100001] rounded-full bg-[#f6f2e8] px-3 py-1.5 text-xs font-black text-[#13203a] shadow-lg"
      >
        How to play
      </button>
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      {mindGap && (
        <div className="pointer-events-none absolute inset-0 z-[100001] grid place-items-center" aria-live="polite">
          <p className="rounded-2xl bg-[#f6f2e8] px-5 py-3 text-lg font-black tracking-wide text-[#13203a]">Please mind the gap</p>
        </div>
      )}
      {atHome && (
        <Link href="/games/home" className="absolute right-3 bottom-3 z-[100001] rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black text-[#0d1726] shadow-lg">
          Decorate
        </Link>
      )}
      {work && workplaceById(work) && <WorkplaceDoor workplace={workplaceById(work)!} job={job} avatar={me.avatar} onClose={() => setWork(null)} />}
      {bus && <BusStop here={bus} stops={BUS_STOPS} homework={homework} onGo={busRide} onClose={() => setBus(null)} />}
      <LifeHud avatar={me.avatar} name={me.username} clout={wallet}
        quests={quests}
        onLocate={(q) => {
          const kind = placeForTask(q.tag, q.title);
          if (!kind) return false;
          if (mapId !== "city") return false;
          setWaypoint(nearest(kind));
          return true;
        }}
      />
      {map.art && (mapId === "city" || mapId === "highlands") && <MiniMap map={map} searchArea={pursuit} waypoint={waypoint} onOpen={() => setMapOpen(true)} onArrive={arrived} />}
      {mapOpen && <CityMap map={map} searchArea={pursuit} waypoint={waypoint} onPick={setWaypoint} onClose={() => setMapOpen(false)} />}
      {tube && <TubeMap here={tube} stations={STATIONS} offices={offices} onGo={ride} onClose={() => setTube(null)} />}
      {room && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-brand px-4 py-2 text-sm font-black" role="status">
          {room}
          {officeSlug && (
            <Link href={`/messages?org=${officeSlug}`} className="pointer-events-auto ml-2 underline">
              Open my meetings
            </Link>
          )}
        </div>
      )}
      {desk && officeSlug && (
        <div className="absolute inset-0 grid place-items-end bg-black/60 md:place-items-center" onClick={() => setDesk(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Advice Desk"
          >
            <p className="text-xs font-black tracking-[0.25em] text-ink-lilac uppercase">Advice Desk</p>
            <h2 className="mt-1 text-2xl font-black">{map.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verified people from this company who give advice to learners.</p>
            <ul className="mt-4 space-y-2">
              {officeStaff.length === 0 && <li className="text-sm text-muted-foreground">No advisers listed yet.</li>}
              {officeStaff.map((s) => (
                <li key={s.userId} className="flex items-center gap-3 rounded-2xl bg-foreground/[0.05] px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">@{s.username}</span>
                    {s.title && <span className="block truncate text-xs text-muted-foreground">{s.title}</span>}
                  </span>
                  {s.userId !== me.id && (
                    <Link href={`/messages/new?to=${s.userId}`} className="rounded-full bg-[#f2d9a6] px-3 py-1.5 text-xs font-black text-[#0d1726]">
                      Message
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/companies/${officeSlug}`} className="rounded-full bg-brand py-2.5 text-center text-sm font-black">
                Company profile
              </Link>
              <Link href={`/companies/${officeSlug}#office-hours`} className="rounded-full bg-secondary py-2.5 text-center text-sm font-black">
                Book office hours
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
