"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookOpen, CarFront, Gamepad2, Smartphone, Trophy } from "lucide-react";

import { play, soundOn } from "../sound";
import { NPC_SPOTS, PLAYER, TRAFFIC_BOXES } from "./art";
import type { BusTrip } from "./bus-stop";
import { CityMap, MiniMap, type Place, nearest, placeForTask } from "./city-map";
import { PoliceChallenge, PrisonStudy } from "./law-dialogs";
import { ArrestOverlay, HearingDialog, PrisonHud, ShopDialog, WantedStars } from "./life";
import { LevelBadge, LifeHud, type Quest } from "./life-hud";
import { SceneWipe, TUTORIAL_KEY, Tutorial } from "./scene";
import { SceneMusic } from "./scene-music";
import { TRAIN_CALL } from "./train-state";
import { BikeDock, Dealership } from "./transport";
import type { TubeTrip } from "./tube-map";
import { useLife } from "./use-life";
import { useNeeds, doActivity } from "./use-needs";
import { type Me, useLobby } from "./use-world";
import { WorldView } from "./world-view";
import { EventAdPopup, useTechEvents } from "../event-ads";
const GamesHub = dynamic(() => import("../hub/games-hub").then((module) => module.GamesHub), { ssr: false, loading: () => null });
const StudyRoom = dynamic(() => import("../study/study-room").then((module) => module.StudyRoom), { ssr: false, loading: () => null });
const GamePhone = dynamic(() => import("./game-phone").then((module) => module.GamePhone), { ssr: false, loading: () => null });
const LearningAwards = dynamic(() => import("./learning-awards").then((module) => module.LearningAwards), { ssr: false, loading: () => null });
const UniversityGuide = dynamic(() => import("./university-guide").then((module) => module.UniversityGuide), { ssr: false, loading: () => null });
const DailyShift = dynamic(() => import("./daily-shift").then((module) => module.DailyShift), { ssr: false, loading: () => null });
const BusStop = dynamic(() => import("./bus-stop").then((module) => module.BusStop), { ssr: false, loading: () => null });
const TubeMap = dynamic(() => import("./tube-map").then((module) => module.TubeMap), { ssr: false, loading: () => null });
const HomeEditor = dynamic(() => import("../../careers/home-editor").then(module => module.HomeEditor), { ssr: false });

const TrainCutscene = dynamic(() => import("./train-cutscene").then((module) => module.TrainCutscene), { ssr: false, loading: () => null });

import { earnWorldXp } from "@/app/games/world/actions";
import type { ActiveJob } from "@/components/careers/work";
import { WorkplaceDoor } from "@/components/careers/work";
import type { LearningAward } from "@/game/core/awards";
import type { BikeBrand } from "@/game/core/bikes";
import { WORKPLACES, workplaceById } from "@/game/core/careers";
import { carById } from "@/game/core/cars";
import { COMPANIES } from "@/game/core/companies";
import { nearestDrivingSpot, nearestParkingSpot } from "@/game/core/driving";
import { type Placed, type HomeAction, furnitureById, homeUse } from "@/game/core/homes";
import { PRISON_LOOK, SHOP, releaseFromPrison, addStar, cardsLeft, clearWanted, wantedCharge, sentenceMs } from "@/game/core/law";
import { homeStyle } from "@/game/core/london";
import { type Pursuit, startPursuit, tickPursuit, caughtByPrisonGuard } from "@/game/core/pursuit";
import type { RoadViolation } from "@/game/core/traffic-rules";
import { canBoardTrain } from "@/game/core/train";
import {
  CITY,
  universityDistrictMap, universityInteriorMap, supermarketMap,
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
  workplaceMap,
  hotelMap,
  pickServer,
  safeSpot,
  serverById,
} from "@/game/core/world";
import type { HomeState } from "@/lib/game/careers-server";
import { cn } from "@/lib/utils";

const REGION_KEY = "world-region";

const STATIONS = tubeStations();
const HIGHLANDS = highlandsMap();
const BUS_STOPS = busStops();

let HOME: { style: number; layout: Placed[] } | null = null;
function loadMap(id: string, offices: OfficeOrg[], meId = ""): WorldMap | null {
  if (id.startsWith("hotel-")) return hotelMap(id);
  if (id.startsWith("workplace-")) return workplaceMap(id.slice(10));
  if (id === "city") return CITY;
  if (id === "universities") return universityDistrictMap();
  if (id === "supermarket") return supermarketMap();
  if (id.startsWith("university-")) return universityInteriorMap(id.slice(11));
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
  studyCourses = [],
  awards = [],
  wantedResetToken,
  initialBuild = false,
}: {
  initialBuild?: boolean;
  studyCourses?: { id: string; title: string; level: string }[];
  awards?: LearningAward[];
  /** Homework you've handed in: each one is a get-out-of-jail-free card. */
  homeworkDone?: number;
  wantedResetToken?: string;
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
  home: HomeState & { style: number };
  clout: number;
  quests: Quest[];
}) {
  HOME = home;
  const router = useRouter();
  const [mapId, setMapId] = useState(() => (loadMap(initialMap, offices, me.id) ? initialMap : "city"));
  const [building, setBuilding] = useState(initialBuild && initialMap === "home");
  const [tube, setTube] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);
  const [mindGap, setMindGap] = useState(false);
  const [server, setServer] = useState<string | null>(initialServer && serverById(initialServer) ? initialServer : null);
  const [region, setRegion] = useState<RegionId>("lse");
  const [arrive, setArrive] = useState<{ x: number; y: number; heading?: number } | undefined>();
  const [desk, setDesk] = useState(false);
  const [work, setWork] = useState<string | null>(null);
  const [workStation, setWorkStation] = useState<"reception" | "terminal">("reception");
  const [dailyJob,setDailyJob]=useState<ActiveJob|null>(null);
  const [dailyBusy,setDailyBusy]=useState(false);
  const [university,setUniversity]=useState<{id:string;topic:"courses"|"events"|"networking"}|null>(null);
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
  const boardedStation = useRef<string | null>(null);
  const [homeAction, setHomeAction] = useState<HomeAction | null>(null);
  useEffect(() => {
    if (!homeAction) return;
    if (mapId !== "home") { setHomeAction(null); return; }
    const timer = window.setTimeout(() => {
      doActivity(homeAction.effect);
      setHomeAction(null);
    }, homeAction.duration);
    return () => window.clearTimeout(timer);
  }, [homeAction, mapId]);
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
  const [learning, setLearning] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [inmate, setInmate] = useState<string | null>(null);
  const [pursuit, setPursuit] = useState<Pursuit | null>(null);
  const pursuitRef = useRef<Pursuit | null>(null);
  const guardCaughtAt = useRef(0);
  const drivingOffenceAt = useRef(-Infinity);
  const releaseReason = useRef("released");
  const arrestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (arrestTimer.current) clearTimeout(arrestTimer.current); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("phone") === "1") setPhone(true); }, []);
  const [arrest, setArrest] = useState(false);
  const { life, update: updateLife } = useLife(me.id,wantedResetToken);
  const { needs } = useNeeds();
  const [nearPerson, setNearPerson] = useState(false);
  const [safety, setSafety] = useState(false);
  const say = useCallback((text: string, big = false) => {
    setToast({ text, big });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), big ? 3200 : 2200);
  }, []);
  const jailed = life.jailUntil > 0;
  const cards = cardsLeft(homeworkDone, life);
  const [journey, setJourney] = useState<{ to: string; go: () => void } | null>(null);
  useEffect(() => setWallet(clout), [clout]);
  useEffect(() => setXpNow(xp), [xp]);
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
  const map = useMemo(() => mapId === "home" ? homeMap(home.style, home.layout) : loadMap(mapId, offices, me.id) ?? CITY, [mapId, offices, me.id, home.style, home.layout]);
  const inOffice = mapId.startsWith("office-");
  const outdoors = mapId === "city" || mapId === "highlands";
  const drivingOffence = useCallback((offence: RoadViolation) => {
    const now = Date.now();
    if (!driving || mapId !== "city" || jailed || arrest || life.hearing || pursuit?.stage === "challenge" || now - drivingOffenceAt.current < 3000) return;
    const charges: Record<RoadViolation["reason"], string> = {
      "red-light": "Driving through a red light",
      "wrong-way": "Driving against the flow of traffic",
      collision: "Causing a road collision",
      crossing: "Failing to give way at a pedestrian crossing",
    };
    drivingOffenceAt.current = now;
    updateLife(l => addStar(l, now, charges[offence.reason]));
    say(`${offence.message} +1 wanted star. Follow the road rules to keep out of trouble.`, true);
  }, [driving, mapId, jailed, arrest, life.hearing, pursuit?.stage, updateLife, say]);
  const driveCar = (car: string | null) => {
    if (!outdoors) { say("Head outside to take a car from your garage."); return; }
    if (car) {
      const spot = nearestDrivingSpot(map, PLAYER, TRAFFIC_BOXES.filter((vehicle): vehicle is NonNullable<typeof vehicle> => Boolean(vehicle)));
      if (!spot) { say("Move closer to a clear road before taking your car out."); return; }
      setArrive(spot);
      setDriving(car);
      setBike(null);
      setDealer(false);
      say("Car ready. Keep left, stop at red lights and give way at crossings. Road offences add wanted stars.", true);
    } else {
      const spot = nearestParkingSpot(map, PLAYER);
      if (!spot) { say("Pull up beside a pavement before getting out."); return; }
      setDriving(null);
      setArrive(spot);
      setDealer(false);
    }
  };
  useEffect(()=>{const scene=(e:Event)=>{const d=(e as CustomEvent<{title?:string;subtitle?:string}>).detail;if(d?.title)say(d.title.slice(0,100));};window.addEventListener("illuminated:scene",scene);return()=>window.removeEventListener("illuminated:scene",scene);},[say]);

  const atHome = mapId === "home";
  const lobby = useLobby(server && !atHome ? { map: mapId, server } : null, me.id);

  useEffect(() => {
    if (TRAIN_CALL.at < 0) TRAIN_CALL.at = performance.now() - 6500;
  }, []);

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

  /** Taken somewhere (arrest, prison, release): fade and arrive at a set spot or the map's start. */
  const goTo = useCallback((dest: string, label: string, spot?: { x: number; y: number }) => {
    const next = loadMap(dest, offices, me.id);
    if (!next) return;
    setBike(null);
    setDriving(null);
    setGames(false); setPhone(false); setStudy(false); setInmate(null); setLearning(false); setAwardsOpen(false);
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

  const onPortal = useCallback(
    (portal: Portal) => {
      const to = portal.to;
      if (to.kind === "home-use") {
        const placed = map.layout?.find(item => item.key === to.key);
        const furniture = placed && furnitureById(placed.item);
        if (placed && furniture) {
          const use = homeUse(placed.item);
          const sofa = use.animation === "watch" ? map.layout?.find(p => (furnitureById(p.item)?.design ?? p.item) === "sofa") : undefined;
          const sofaSize = sofa && furnitureById(sofa.item);
          setHomeAction({ ...use, item: placed.item, x: placed.x, y: placed.y, w: furniture.w, h: furniture.h, started: performance.now(), seat: sofa && sofaSize ? { x: sofa.x, y: sofa.y, w: sofaSize.w, h: sofaSize.h } : undefined });
        }
        return;
      }
      if (jailed && to.kind !== "prison") { say("Find the study desk or explore the prison first."); return; }
      if (to.kind === "study-room") { setLearning(true); return; }
      if (to.kind === "awards") { setAwardsOpen(true); return; }
      if (to.kind === "prison") {
        if (to.action === "study") setStudy(true);
        else if (to.action === "talk") setInmate(to.name ?? "Sam");
        else { releaseReason.current = "escaped"; updateLife(l=>releaseFromPrison(l)); }
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
        say({sleep:"Rested and recharged",eat:"Meal enjoyed",study:"Focus restored",hike:"Fresh air break complete"}[to.activity]);
      }
      else if (to.kind === "desk") {setDesk(true);}
      else if (to.kind === "tube") {
        if (map.kind === "station") {
          if (!canBoardTrain(performance.now() - TRAIN_CALL.at, map.cols, PLAYER.x / TILE, PLAYER.y / TILE)) return;
          boardedStation.current = map.id;
        }
        setTube(to.station);
      }
      else if (to.kind === "university") setUniversity({id:to.university,topic:to.topic});
      else if (to.kind === "work") {goTo(`workplace-${to.workplace}`, workplaceById(to.workplace)?.name ?? "Workplace");}
      else if (to.kind === "workstation" && map.id === `workplace-${to.workplace}`) {setWorkStation(to.station);setWork(to.workplace);}
      else if (to.kind === "bike") {setDock(true);}
      else if (to.kind === "games") {setGames(true);}
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
    [router, offices, mapId, map, me.id, updateLife, say, jailed, gainXp, goTo],
  );

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
    if (life.stars < 1 || jailed || life.hearing || !outdoors || arrest) {
      pursuitRef.current = null; setPursuit(null); return;
    }
    const timer = setInterval(() => {
      const current = pursuitRef.current ?? startPursuit(map, PLAYER);
      const next = tickPursuit(current, map, PLAYER, Date.now(), 0.2);
      if (next.escaped) {
        pursuitRef.current = null; setPursuit(null);
        updateLife(clearWanted);
        say("You left the search area and lost the police. Wanted stars cleared.", true);
      } else { pursuitRef.current = next; setPursuit(next); }
    }, 200);
    return () => clearInterval(timer);
  }, [life.stars, life.hearing, jailed, outdoors, mapId, map, arrest, updateLife, say]);

  useEffect(() => {
    if (jailed && (life.prisonWork >= 3 || Date.now() >= life.jailUntil)) {
      updateLife(l=>releaseFromPrison(l)); return;
    }
    if (jailed && mapId !== "prison") goTo("prison", "HMP Thames");
    if (!jailed && mapId === "prison") {
      if (life.stars || life.heatAt || life.hearing) updateLife(releaseFromPrison);
      say(releaseReason.current === "escaped" ? "You found the service exit. Escape succeeded — your wanted stars are cleared." : life.prisonWork>=3?"Study complete. You have been released with no wanted stars.":"You have served your sentence. Your wanted stars are cleared.", true);
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
    setSafety(true);
  }, []);
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
      if (map.kind === "station" && boardedStation.current !== map.id) return;
      boardedStation.current = null;
      setTube(null);
      let dest = "city";
      let spot: { x: number; y: number } | undefined;
      if (t.kind === "station") {
        const st = STATIONS.find((s) => s.id === t.id);
        const inside = stationMap(t.id);
        if (!st || !inside) return;
        // Ride inside the carriage, then step off onto the other station's platform.
        setBike(null);
        // The player has already walked into a stopped train before choosing a destination.
        void gainXp("train"); setJourney({
          to: st.name,
          go: () => {
            setJourney(null);
            setArrive(safeSpot(inside, inside.width / 2, (STATION_PLATFORM_Y + 0.5) * TILE));
            TRAIN_CALL.at = performance.now() - 6500;
            setMapId(`station-${t.id}`);
            setTrip((n) => n + 1);
          },
        });
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
    [offices, me.id, gainXp, map.kind, map.id],
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
    [offices, me.id, gainXp],
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
      <SceneMusic scene={
        journey || bus ? "journey"
          : games ? "arcade"
            : study || learning || map.id === "study-lobby" ? "study"
              : work || dailyBusy || map.kind === "office" ? "work"
                : university || map.id === "universities" || map.id.startsWith("university-") ? "university"
                  : shop || dealer || map.id === "supermarket" ? "shop"
                    : map.kind === "station" ? "station"
                      : map.art === "highlands" ? "nature"
                        : map.kind === "home" ? "home"
                          : map.kind === "prison" || map.kind === "hospital" || map.kind === "court" ? "quiet"
                            : map.kind === "campus" ? "university" : "city"
      } />
      {!(building && mapId === "home") && <WorldView
        key={`${mapId}:${server}:${trip}`}
        paused={safety || dailyBusy || Boolean(university) || Boolean(bus || tube || games || tutorial || mapOpen || desk || work || dock || dealer || journey || fading || phone || study || learning || awardsOpen || inmate || shop || homeAction || arrest || pursuit?.stage === "challenge")}
        homeAction={homeAction}
        police={pursuit}
        map={map}
        serverId={atHome ? "solo" : server}
        arriveAt={arrive}
        onPortal={onPortal}
        onRoom={setRoom}
        onChangeServer={() => { if (jailed || life.stars >= 2) say("Finish your current law activity before changing servers."); else setServer(null); }}
        onDrivingOffence={drivingOffence}
        ads={events}
        me={jailed || mapId === "prison" ? { ...me, avatar: { ...me.avatar, ...PRISON_LOOK } } : me}
        speed={(life.sick ? 0.7 : 1) * (driving && outdoors ? (carById(driving)?.speed ?? 1) : bike && outdoors ? bike.brand.speed : 1)}
        car={driving && outdoors ? driving : null}
        bike={!driving && bike && outdoors ? bike.brand.colour : null}
      />}
      {building && mapId === "home" && <HomeEditor embedded onClose={() => setBuilding(false)} claimed={home.claimed} avatar={me.avatar} owned={home.owned} current={home.current} layout={home.layout} bought={home.furniture} clout={wallet} />}
      {mapId === "home" && !building && !homeAction && <button type="button" onClick={() => { setArrive({ x: PLAYER.x, y: PLAYER.y }); setBuilding(true); }} className="absolute top-28 right-3 z-[70] rounded-full border border-[#c8b182] bg-[#fff3d8] px-4 py-3 text-xs font-bold text-[#183b35] shadow-lg">Build & buy · arrange your home</button>}
      {homeAction && <div role="status" className="absolute bottom-24 left-1/2 z-[100002] w-64 -translate-x-1/2 rounded-2xl border border-[#c8b182] bg-[#faf6ed] p-4 text-center text-[#183b35] shadow-xl">
        <p className="font-bold">{homeAction.label}</p>
        <p className="mt-1 text-xs">{Math.round(homeAction.duration / 1000)} seconds · needs improve when you finish</p>
        <button type="button" onClick={() => setHomeAction(null)} className="mt-3 min-h-11 rounded-full bg-[#183b35] px-5 text-xs font-bold text-white">Stop activity</button>
      </div>}
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
      {learning && <StudyRoom courses={studyCourses} onClose={() => { setLearning(false); router.refresh(); }} onReward={() => { doActivity("study"); router.refresh(); }} />}
      {awardsOpen && <LearningAwards awards={awards} onClose={() => setAwardsOpen(false)} />}
      {dealer && (
        <Dealership
          clout={wallet}
          owned={garage}
          driving={driving}
          onBought={(c, left) => {
            setWallet(left);
            setGarage((g) => g.includes(c) ? g : [...g, c]);
            driveCar(c);
            setDealer(false);
            router.refresh();
          }}
          onDrive={driveCar}
          onClose={() => setDealer(false)}
        />
      )}
      {driving && outdoors && (
        <button type="button" onClick={() => driveCar(null)} className="absolute right-3 bottom-52 z-[100001] min-h-11 max-w-[55%] rounded-2xl bg-[#13203a] px-4 py-2 text-xs font-black text-white shadow-lg sm:bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
          Park {carById(driving)?.name}
        </button>
      )}
      {!driving && !nearPerson && outdoors && <button type="button" onClick={() => setDealer(true)} className="absolute right-3 bottom-52 z-[100001] flex min-h-11 items-center gap-2 rounded-2xl bg-[#f7f1e6] px-3 text-xs font-bold text-[#13203a] shadow-lg"><CarFront className="size-4" aria-hidden /> Garage</button>}
      <LevelBadge xp={xpNow} />
      {mapId === "study-lobby" && <div className="absolute top-14 left-1/2 z-[60] flex -translate-x-1/2 gap-2 rounded-2xl bg-[#f7f1e6]/95 p-2 text-[#13203a] shadow-lg">
        <button type="button" onClick={() => setLearning(true)} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#2b5fd9] px-4 text-sm font-bold text-white"><BookOpen className="size-4" aria-hidden /> Study</button>
        <button type="button" onClick={() => setAwardsOpen(true)} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#ffedbd] px-4 text-sm font-bold"><Trophy className="size-4" aria-hidden /> Awards</button>
      </div>}
      <button type="button" onClick={() => { if(jailed || life.stars >= 2) say("Finish your current law activity first."); else setGames(true); }} className="absolute right-3 bottom-40 z-[100001] flex min-h-11 items-center gap-1.5 rounded-full bg-[#7a5ce6] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Gamepad2 className="size-4" aria-hidden /> Games
      </button>
      {!learning && !awardsOpen && <EventAdPopup events={events} />}
      <WantedStars stars={life.stars} />
      {safety && <div className="absolute inset-0 z-[100010] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Choose kindness" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]">
        <h2 className="text-2xl font-black">Pause. Choose kindness.</h2>
        <p className="mt-3">Hitting or pushing can hurt someone and make them feel unsafe. In real life, step back, use calm words and ask a trusted adult for help. Everyone deserves to feel safe.</p>
        <p className="mt-3 text-sm">In this fictional game, choosing to shove brings the police. There is no reward for hurting others.</p>
        <button type="button" className="mt-5 w-full rounded-full bg-[#2b5fd9] px-4 py-3 font-bold text-white" onClick={()=>{setSafety(false);say("Good choice. Give people space and keep the city friendly.",true);}}>Walk away</button>
        <button type="button" className="mt-3 w-full rounded-full border border-[#13203a]/20 px-4 py-2 text-sm" onClick={()=>{setSafety(false);window.dispatchEvent(new Event("illuminated:fight"));updateLife(l=>addStar(l,Date.now()));say("Someone was hurt. The police are responding. Think about how to put things right.",true);}}>Continue with consequences</button>
      </section></div>}
      {life.sick && <p className="pointer-events-none absolute top-[104px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#c8322d] px-3 py-1 text-xs font-black text-white">Unwell: get medicine or see a doctor</p>}
      {nearPerson && !jailed && !driving && (
        <button type="button" onClick={fight} className="absolute right-3 bottom-52 z-[100001] min-h-11 rounded-full bg-[#c8322d] px-4 py-2 text-sm font-black text-white shadow-lg">
          Shove (F)
        </button>
      )}
      {pursuit && pursuit.stage !== "challenge" && <div role="status" className="pointer-events-none absolute top-40 left-1/2 z-[65] max-w-[60%] -translate-x-1/2 rounded-2xl bg-[#13203a]/95 px-4 py-2 text-center text-sm font-bold text-white">{pursuit.stage === "arriving" ? "Police car responding" : "Officers are searching"}<p className="text-xs text-white/80">Leave the red search circle for 6 seconds to clear your stars.{pursuit.outsideSince !== null ? ` ${Math.max(0,6-Math.floor((Date.now()-pursuit.outsideSince)/1000))}s left` : ""}</p></div>}
      {pursuit?.stage === "challenge" && <PoliceChallenge onResult={correct=>{
        pursuitRef.current = null; setPursuit(null);
        if(correct) { updateLife(clearWanted); say("Correct. The officers let you go with a warning.",true); }
        else { setArrest(true); arrestTimer.current=setTimeout(()=>{updateLife(l=>({...clearWanted(l),hearing:{stars:l.stars,charge:wantedCharge(l)}}));setArrest(false);goTo("court","Crown Court");},2600); }
      }}/ >}
      {arrest && <ArrestOverlay />}
      <button type="button" onClick={()=>setPhone(true)} aria-label="Open your game phone" className="absolute right-3 bottom-24 z-[100001] grid size-12 place-items-center rounded-2xl border-2 border-white bg-[#13203a] text-white shadow-lg"><Smartphone className="size-6"/></button>
      {phone && <GamePhone onGarage={() => { setPhone(false); if (outdoors && !jailed) setDealer(true); else say("Head outside to open your garage."); }} onStudy={() => { setPhone(false); if (jailed || life.stars >= 2) say("Finish your current law activity first."); else setLearning(true); }} onAwards={() => { setPhone(false); setAwardsOpen(true); }} onUniversities={()=>{setPhone(false);const gate=map.portals.find(p=>p.to.kind==="map"&&p.to.mapId==="universities");if(gate){setWaypoint({id:gate.id,name:"University Quarter",kind:"university",x:gate.rect.x+gate.rect.w/2,y:gate.rect.y+gate.rect.h/2});say("Follow the university marker to explore the district.",true);}else setMapOpen(true);}} onClose={()=>setPhone(false)} onMap={()=>{setPhone(false);setMapOpen(true);}} onHome={()=>{setPhone(false);if(jailed||life.stars>=2)say("Finish your current law activity first.");else goTo("home","Your house");}} onLocker={()=>{if(!jailed&&life.stars<2)router.push("/games/locker");else say("Finish your current law activity first.");}} onCall={id=>{
        setPhone(false);
        if(jailed||life.stars>=2){say("Finish your current law activity before calling companies.");return;}
        const workplace=id.startsWith("work:") ? workplaceById(id.slice(5)) : WORKPLACES.find(w=>w.companyId===id);
        if(workplace){goTo(`workplace-${workplace.id}`,workplace.name);say("Walk to reception to apply, or use a computer or counter to clock in.",true);}
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
          onCard={() => updateLife((l) => ({ ...releaseFromPrison(l), cardsUsed: l.cardsUsed + 1 }))}
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
      {journey && <TrainCutscene to={journey.to} line="Revision" avatar={me.avatar} onArrive={journey.go} />}
<SceneWipe show={fading} label={sceneName} />
      <button
        type="button"
        onClick={() => setTutorial(true)}
        className="absolute right-3 bottom-11 z-[100001] min-h-11 rounded-full bg-[#f6f2e8] px-3 py-1.5 text-xs font-black text-[#13203a] shadow-lg"
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
      {university&&<UniversityGuide id={university.id} topic={university.topic} onClose={()=>setUniversity(null)}/>}
      {dailyJob&&map.id===(dailyJob.workplace==="tescow"?"supermarket":"city")&&<DailyShift job={dailyJob} map={map} onTarget={setWaypoint} onBusy={setDailyBusy} onPaid={pay=>setWallet(n=>n+pay)} onClose={()=>{setDailyJob(null);setDailyBusy(false);setWaypoint(null);}}/>}
      {work && mapId === `workplace-${work}` && workplaceById(work) && <WorkplaceDoor station={workStation} workplace={workplaceById(work)!} job={job} avatar={me.avatar} onClose={() => setWork(null)} onPracticalShift={next=>{setWork(null);if(next.workplace==="tescow"){setDailyJob(next);goTo("supermarket","Tesco practice store");}else {setDailyJob(next);goTo("city","Pizza delivery route");say("Delivery route ready. Follow your work markers.");}}} />}
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
      {!atHome && <MiniMap map={map} searchArea={pursuit} waypoint={waypoint} onOpen={() => setMapOpen(true)} onArrive={arrived} />}
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
