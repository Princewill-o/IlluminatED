"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookOpen, CircleHelp, Gamepad2, Menu, Smartphone, Trophy } from "lucide-react";

import { play, soundOn } from "../sound";
import { AUTOPILOT, NPC_SPOTS, PLAYER, PLAYER_VEHICLE, TRAFFIC_BOXES, TUTOR } from "./art";
import { BankDialog, type BankLoan } from "./bank";
import type { BusTrip } from "./bus-stop";
import { CityMap, MiniMap, type Place, nearest, placeForTask } from "./city-map";
import { DeveloperTeleport, type TeleportDestination } from "./developer-teleport";
import { FLIGHT_SCHOOL_KEY, FLIGHT_STEPS, FlightSchoolDesk, FlightSchoolGuide, FlightSchoolQuiz, PlaneCutscene } from "./flight-school";
import { FrightNight } from "./fright-night";
import { GameMenu, saveResume } from "./game-menu";
import { HudLayout, HudSlot } from "./hud";
import { BlameOfferPrompt, InterviewRoom } from "./interview-room";
import { PoliceChallenge, PrisonStudy } from "./law-dialogs";
import { ArrestOverlay, HearingDialog, PrisonHud, ShopDialog, WantedStars } from "./life";
import { LevelBadge, LifeHud, type Quest } from "./life-hud";
import { PoliceTransportCutscene } from "./police-transport-cutscene";
import { SceneWipe, TUTORIAL_KEY, Tutorial } from "./scene";
import { SceneMusic } from "./scene-music";
import { TRAIN_CALL } from "./train-state";
import { BikeDock, Dealership } from "./transport";
import type { TubeTrip } from "./tube-map";
import { useLife } from "./use-life";
import { useNeeds, doActivity } from "./use-needs";
import { type Me, useLobby } from "./use-world";
import { WorldView } from "./world-view";
import { useTechEvents } from "../event-ads";
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

import { earnWorldXp, worldBankStatus } from "@/app/games/world/actions";
import type { ActiveJob } from "@/components/careers/work";
import { WorkplaceDoor } from "@/components/careers/work";
import { EventBanner } from "@/components/game/season/event-banner";
import type { LearningAward } from "@/game/core/awards";
import type { BikeBrand } from "@/game/core/bikes";
import { WORKPLACES, workplaceById } from "@/game/core/careers";
import { carById } from "@/game/core/cars";
import { COMPANIES } from "@/game/core/companies";
import { nearestDrivingSpot, nearestParkingSpot, roadRoute } from "@/game/core/driving";
import { gameDateAt } from "@/game/core/game-clock";
import { type Placed, type HomeAction, furnitureById, homeUse } from "@/game/core/homes";
import { PRISON_LOOK, SHOP, POLICE_STARS, policeUnsure, releaseFromPrison, escapeFromPrison, addStar, cardsLeft, clearWanted, commit, warningFor, wantedCharge, sentenceMs, type Offence } from "@/game/core/law";
import { currentEvent } from "@/game/core/live-events";
import { homeStyle } from "@/game/core/london";
import { areaAt } from "@/game/core/map-guide";
import { type Pursuit, startPursuit, tickPursuit, caughtByPrisonGuard } from "@/game/core/pursuit";
import type { RoadViolation } from "@/game/core/traffic-rules";
import { canBoardTrain } from "@/game/core/train";
import { venueMap } from "@/game/core/venues";
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
  type WorldMap,
  campusMap,
  courtMap,
  hospitalMap,
  prisonMap,
  tutorialMap,
  TUTORIAL_MAP_ID,
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
} from "@/game/core/world";
import type { HomeState } from "@/lib/game/careers-server";
import { cn } from "@/lib/utils";


const REGION_KEY = "world-region";

const STATIONS = tubeStations();
const HIGHLANDS = highlandsMap();
const BUS_STOPS = busStops();

let HOME: { style: number; layout: Placed[] } | null = null;
function loadMap(id: string, offices: OfficeOrg[], meId = ""): WorldMap | null {
  if (id.startsWith("venue-")) return venueMap(id);
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
  if (id === TUTORIAL_MAP_ID) return tutorialMap();
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
  initialArrival,
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
  developerTeleport = false,
}: {
  initialBuild?: boolean;
  developerTeleport?: boolean;
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
  initialArrival?: { x: number; y: number };
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
  const [server, setServer] = useState<string | null>(() => initialServer);
  const [region, setRegion] = useState<RegionId>("lse");
  const [arrive, setArrive] = useState<{ x: number; y: number; heading?: number } | undefined>(initialArrival);
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
  // Fresh accounts start in Flight School: follow Ava, then fly to London.
  const [flight, setFlight] = useState<number | null>(null);
  const [flightModal, setFlightModal] = useState<"desk" | "quiz" | null>(null);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    let fresh = false;
    try {
      fresh = !localStorage.getItem(`${FLIGHT_SCHOOL_KEY}:${me.id}`) && !localStorage.getItem(`${TUTORIAL_KEY}:${me.id}`);
    } catch { fresh = false; }
    if (!fresh) return;
    const training = tutorialMap();
    TUTOR.x = 7.5 * TILE; TUTOR.y = 9.5 * TILE; TUTOR.active = true;
    setArrive(training.spawn);
    setMapId(TUTORIAL_MAP_ID);
    setTrip(n => n + 1);
    setFlight(0);
  }, [me.id]);
  const [dock, setDock] = useState(false);
  const [games, setGames] = useState(false);
  const [bike, setBike] = useState<{ brand: BikeBrand; until: number } | null>(null);
  const [wallet, setWallet] = useState(clout);
  /** A police interview in progress (the police aren't sure it was you). */
  const [interview, setInterview] = useState<{ stars: number; charge: string; area: string } | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankLoan, setBankLoan] = useState<BankLoan>({ balance: 0, status: "none" });
  const [gameDate, setGameDate] = useState(() => new Date());
  const bankCourtSeen = useRef(false);
  useEffect(() => {
    const updateClock = () => setGameDate(gameDateAt());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [me.id]);
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
  const [policeTransport, setPoliceTransport] = useState(false);
  const transportStars = useRef(4);
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
    say(`${offence.message} +1 wanted star. ${warningFor({ ...life, stars: Math.min(5, life.stars + 1) })}`, true);
  }, [driving, mapId, jailed, arrest, life, pursuit?.stage, updateLife, say]);
  /** Commit an offence from the rulebook and tell the player where it leaves them. */
  const offend = useCallback((offence: Offence, lead = "") => {
    if (jailed) return;
    updateLife(l => commit(l, Date.now(), offence));
    const next = Math.min(5, life.stars + (offence === "shoplifting" || offence === "trespass" ? 2 : offence === "car-theft" ? 3 : 1));
    say(`${lead ? lead + " " : ""}${warningFor({ ...life, stars: next })}`, true);
  }, [jailed, life, updateLife, say]);
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
  // Hop-on bus: choose anywhere on the map and the bus drives you there.
  const [busPick, setBusPick] = useState(false);
  const [botFight, setBotFight] = useState(false);
  const [hop, setHop] = useState<{ to: string; route: string } | null>(null);
  const hopOn = useCallback((place: Place) => {
    setBusPick(false);
    if (mapId !== "city") { say("Buses run in London. Head outside first."); return; }
    const route = roadRoute(map, PLAYER, place);
    if (route.length < 2) { say("You're already there!"); return; }
    const line = ["24", "38", "73", "159", "N11"][Math.abs(Math.round(place.x + place.y)) % 5];
    setDriving(null); setBike(null); setWaypoint(place);
    Object.assign(AUTOPILOT, { route, leg: 0, speed: 0, onArrive: () => {
      const spot = nearestParkingSpot(map, PLAYER) ?? safeSpot(map, place.x, place.y);
      setHop(null); setArrive(spot); setWaypoint(null);
      doActivity("bus"); void gainXp("bus");
      say(`You've arrived at ${place.name}. Mind the step!`, true);
    } });
    setHop({ to: place.name, route: line });
    play("train", soundOn());
  }, [map, mapId, say, gainXp]);
  useEffect(() => {
    // Local debugging only: lets automated walkthroughs read positions.
    if (process.env.NODE_ENV === "development") (window as unknown as { __game?: unknown }).__game = { PLAYER, AUTOPILOT, interview: (stars = 2, charge = "Shoplifting from a high-street shop") => setInterview({ stars, charge, area: "Fountain Square" }) };
  }, []);
  const hopOff = useCallback(() => {
    Object.assign(AUTOPILOT, { route: [], leg: 0, speed: 0, onArrive: null });
    setHop(null);
    const spot = nearestParkingSpot(map, PLAYER);
    if (spot) setArrive(spot);
  }, [map]);
  useEffect(() => { if (mapId !== "city" && hop) hopOff(); }, [mapId, hop, hopOff]);
  useEffect(()=>{const scene=(e:Event)=>{const d=(e as CustomEvent<{title?:string;subtitle?:string}>).detail;if(d?.title)say(d.title.slice(0,100));};window.addEventListener("illuminated:scene",scene);return()=>window.removeEventListener("illuminated:scene",scene);},[say]);

  const atHome = mapId === "home";
  const inTutorial = mapId === TUTORIAL_MAP_ID;
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
    setDealer(false); setDock(false); setDesk(false); setBankOpen(false); setRoom(null);
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

  const teleportDestinations: TeleportDestination[] = useMemo(() => {
    const places: TeleportDestination[] = [
      { id: "westminster", label: "London · Westminster", mapId: "city", x: 23, y: 31 },
      { id: "city", label: "London · City centre", mapId: "city", x: 34, y: 26 },
      { id: "eye", label: "London · South Bank", mapId: "city", x: 33, y: 43 },
      { id: "careers", label: "London · Career District", mapId: "city", x: 70, y: 18 },
      { id: "bank", label: "London · Thames & Co Bank", mapId: "city", x: 169, y: 36 },
      { id: "riverside", label: "London · Riverside Campus", mapId: "city", x: 146, y: 23 },
      { id: "wharf", label: "London · Wharf Gardens", mapId: "city", x: 146, y: 80 },
      { id: "mews", label: "London · Primrose Mews", mapId: "city", x: 30, y: 119 },
      { id: "orchard", label: "London · Orchard Commons", mapId: "city", x: 93, y: 97 },
      { id: "conservatory", label: "London · Conservatory Quarter", mapId: "city", x: 151, y: 128 },
      { id: "campus", label: "Careers Campus", mapId: "campus", x: 10, y: 10 },
      { id: "universities", label: "University Quarter", mapId: "universities", x: 15, y: 9 },
      { id: "study", label: "Study Quarter", mapId: "study-lobby", x: 10, y: 10 },
      { id: "home", label: "Your home", mapId: "home", x: 10, y: 10 },
      { id: "hospital", label: "St Tomas’ Hospital", mapId: "hospital", x: 13, y: 8 },
      { id: "court", label: "Crown Court", mapId: "court", x: 11, y: 8 },
      { id: "prison", label: "HMP Thames", mapId: "prison", x: 15, y: 12 },
      ...offices.map(office => ({ id: `office-${office.slug}`, label: `${office.name} · Office`, mapId: `office-${office.slug}`, x: 10, y: 10 })),
      ...WORKPLACES.map(workplace => ({ id: `workplace-${workplace.id}`, label: `${workplace.name} · Workplace`, mapId: `workplace-${workplace.id}`, x: 10, y: 10 })),
      ...CITY.portals.filter(portal => portal.to.kind === "map" && portal.to.mapId.startsWith("station-")).map(portal => portal.to.kind === "map" ? ({ id: portal.to.mapId, label: `${portal.label} · Station`, mapId: portal.to.mapId, x: 14, y: 3 }) : null).filter((place): place is TeleportDestination => place !== null),
    ];
    return places;
  }, [offices]);

  useEffect(() => {
    if (life.hearing && mapId !== "court" && !fading) goTo("court", "Crown Court");
  }, [life.hearing, mapId, fading, goTo]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const loan = await worldBankStatus();
      if (!loan || !active) return;
      setBankLoan(loan);
      if (loan.status === "court" && !bankCourtSeen.current && !life.bankCourtSeen && !life.hearing) {
        bankCourtSeen.current = true;
        const charge = `Failure to repay a ${loan.principal ?? loan.balance} Clout bank loan`;
        updateLife(current => ({ ...current, bankCourtSeen: true, hearing: { stars: 1, charge } }));
        setBankOpen(false);
        goTo("court", "Crown Court");
        say("The bank has referred your overdue loan to Crown Court.", true);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [life.bankCourtSeen, life.hearing, updateLife, goTo, say]);

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
      if (to.kind === "guide") {
        if (to.guide === "study") setLearning(true);
        else if (to.guide === "transport") setTube(map.id.slice("station-".length));
        else router.push("/games/careers");
        return;
      }
      if (to.kind === "tutorial") {
        const goal = flight === null ? null : FLIGHT_STEPS[flight]?.goal;
        if (goal !== to.step) { say(flight === null ? "Training's done. Use the gate to fly to London." : "Follow Ava first. She'll show you when to use this."); if (flight === null && to.step === "board") setFlying(true); return; }
        if (to.step === "interact") setFlightModal("desk");
        else if (to.step === "study") setFlightModal("quiz");
        else if (to.step === "eat") { say("Yum! Hunger topped up. Keep an eye on your needs in London.", true); setFlight(n => n === null ? n : n + 1); }
        else setFlying(true);
        return;
      }
      if (to.kind === "bank") { setBankOpen(true); return; }
      if (to.kind === "study-room") { setLearning(true); return; }
      if (to.kind === "awards") { setAwardsOpen(true); return; }
      if (to.kind === "prison") {
        if (to.action === "study") setStudy(true);
        else if (to.action === "talk") setInmate(to.name ?? "Sam");
        else { releaseReason.current = "escaped"; updateLife(l=>escapeFromPrison(l, Date.now())); }
        return;
      }
      if (to.kind === "game") {
        const outside = safeSpot(
          map,
          portal.rect.x + portal.rect.w / 2,
          portal.rect.y + portal.rect.h / 2 + (portal.rect.y < map.height / 2 ? TILE * 2 : -TILE * 2),
        );
        const returnParams = new URLSearchParams({ map: mapId, x: String(Math.round(outside.x)), y: String(Math.round(outside.y)) });
        if (server) returnParams.set("server", server);
        const params = new URLSearchParams({ returnTo: `/games/world?${returnParams}` });
        router.push(`/games/promotion-panic/${to.companyId}?${params}`);
      }
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
    [router, offices, mapId, map, me.id, updateLife, say, jailed, gainXp, goTo, flight],
  );

  // Flight School: opening the phone completes the phone step.
  useEffect(() => {
    if (phone && flight !== null && FLIGHT_STEPS[flight]?.goal === "phone") setFlight(n => n === null ? n : n + 1);
  }, [phone, flight]);
  const landInLondon = useCallback(() => {
    try { localStorage.setItem(`${FLIGHT_SCHOOL_KEY}:${me.id}`, "done"); localStorage.setItem(`${TUTORIAL_KEY}:${me.id}`, "seen"); } catch { /* Shown again next visit. */ }
    TUTOR.active = false;
    setFlying(false); setFlight(null); setFlightModal(null);
    goTo("city", "Welcome to London");
    say("Welcome to London! Your tasks are top left. Tap How to play any time for a reminder.", true);
  }, [me.id, goTo, say]);

  const courtSteps = useMemo(() => {
    const p = CITY.portals.find((q) => q.id === "court");
    return p ? safeSpot(CITY, p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h + 40) : undefined;
  }, []);

  // Feeling unwell when you run yourself down: slower, until medicine or a doctor.
  // Cycling on the pavement for more than a few seconds is an offence (once every 30s at most).
  const pavementSince = useRef<number | null>(null);
  const pavementCharged = useRef(0);
  useEffect(() => {
    if (!bike || mapId !== "city" || jailed) { pavementSince.current = null; return; }
    const t = setInterval(() => {
      const tile = map.tiles[Math.floor(PLAYER.y / TILE)]?.[Math.floor(PLAYER.x / TILE)];
      const now = Date.now();
      if (tile !== "-") { pavementSince.current = null; return; }
      pavementSince.current ??= now;
      if (now - pavementSince.current > 4000 && now - pavementCharged.current > 30000) {
        pavementCharged.current = now; pavementSince.current = null;
        offend("pavement-cycling", "Cycling on the pavement puts pedestrians at risk.");
      }
    }, 500);
    return () => clearInterval(t);
  }, [bike, mapId, jailed, map, offend]);

  useEffect(() => {
    if (needs && needs.energy < 12 && !life.sick) {
      updateLife((l) => ({ ...l, sick: true }));
      say("You feel unwell. Get medicine at Bootz (1 Clout) or see a doctor at St Tomas' Hospital.", true);
    }
  }, [needs, life.sick, updateLife, say]);

  // Police catch the player with a brief taser stop before the challenge or escort.
  useEffect(() => {
    if (life.stars < POLICE_STARS || jailed || life.hearing || !outdoors) {
      pursuitRef.current = null; setPursuit(null); return;
    }
    if (arrest || policeTransport) return;
    const timer = setInterval(() => {
      const current = pursuitRef.current ?? startPursuit(map, PLAYER);
      const traffic = TRAFFIC_BOXES.filter((box): box is NonNullable<typeof box> => Boolean(box));
      if (PLAYER_VEHICLE.active) traffic.push({ id: "player", x: PLAYER_VEHICLE.x, y: PLAYER_VEHICLE.y, hw: TILE * 0.9, hh: TILE * 0.9, dx: 0, dy: 0 });
      const next = tickPursuit(current, map, PLAYER, Date.now(), 0.2, traffic);
      if (next.escaped) {
        pursuitRef.current = null; setPursuit(null);
        updateLife(clearWanted);
        say("You left the search area and lost the police. Wanted stars cleared.", true);
      } else {
        pursuitRef.current = next; setPursuit(next);
        if (next.stage === "tased") {
          setArrest(true);
          arrestTimer.current = setTimeout(() => {
            setArrest(false);
            if (life.stars >= 4) {
              transportStars.current = life.stars;
              pursuitRef.current = null; setPursuit(null);
              setPoliceTransport(true);
            } else {
              const challenged = { ...next, stage: "challenge" as const };
              pursuitRef.current = challenged; setPursuit(challenged);
            }
          }, 1700);
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [life.stars, life.hearing, jailed, outdoors, mapId, map, arrest, policeTransport, updateLife, say]);

  useEffect(() => {
    if (jailed && (life.prisonWork >= 3 || Date.now() >= life.jailUntil)) {
      updateLife(l=>releaseFromPrison(l)); return;
    }
    if (jailed && mapId !== "prison") goTo("prison", "HMP Thames");
    if (!jailed && mapId === "prison" && releaseReason.current === "escaped") {
      // Broke out: keep the wanted stars so the police chase starts outside.
      say("You're out, but the alarm is raised. The police are coming: get out of the search area to lose them. If they catch you, it's back inside for longer.", true);
      setStudy(false); setInmate(null);
      goTo("city", "London", courtSteps);
      releaseReason.current = "released";
      return;
    }
    if (!jailed && mapId === "prison") {
      if (life.stars || life.heatAt || life.hearing) updateLife(releaseFromPrison);
      say(life.prisonWork>=3?"Study complete. You have been released with no wanted stars.":"You have served your sentence. Your wanted stars are cleared.", true);
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

  // Pause menu: Esc (or the Menu button) to continue playing or leave the game.
  const [menu, setMenu] = useState(false);
  const busy = Boolean(interview || safety || dailyBusy || Boolean(flightModal) || flying || busPick || botFight || Boolean(university) || Boolean(bus || tube || games || tutorial || mapOpen || desk || work || dock || dealer || journey || fading || phone || study || learning || awardsOpen || inmate || shop || homeAction || bankOpen || life.hearing) || arrest || policeTransport || pursuit?.stage === "challenge" || pursuit?.stage === "tased");
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const resumable = !inTutorial && !jailed && !flying && map.kind !== "prison" && map.kind !== "court";
  const remember = useCallback(() => {
    if (resumable && Number.isFinite(PLAYER.x) && Number.isFinite(PLAYER.y) && PLAYER.x >= 0 && PLAYER.y >= 0) saveResume(me.id, { map: mapId, name: map.name, x: PLAYER.x, y: PLAYER.y });
  }, [resumable, me.id, mapId, map.name]);
  useEffect(() => {
    const tick = setInterval(remember, 5000);
    window.addEventListener("pagehide", remember);
    return () => { clearInterval(tick); window.removeEventListener("pagehide", remember); remember(); };
  }, [remember]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]")) return;
      if (busyRef.current) return;
      setMenu(open => !open);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const leaveGame = () => { remember(); setMenu(false); router.push("/games"); };


  if (!server && !inTutorial) {
    return <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black">Join your regional community</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose your region. We connect you automatically; individual servers are managed in the background.</p>
      <label className="mt-5 block text-sm font-bold" htmlFor="region">Your region</label>
      <select id="region" value={region} onChange={e => chooseRegion(e.target.value as RegionId)} className="mt-2 w-full rounded-xl border bg-card p-3">
        {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <button type="button" onClick={() => setServer(pickServer(region, Object.fromEntries(SERVERS.filter(s => s.region === region).map(s => [s.id, countFor(mapId, s.id)]))).id)} className="jelly mt-5 min-h-11 rounded-full bg-primary px-6 font-bold text-primary-foreground">Join region</button>
    </div>;
  }

  return (
    <div className="relative h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh">
    <HudLayout>
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
        paused={busy || menu}
        homeAction={homeAction}
        police={pursuit}
        map={map}
        serverId={atHome || inTutorial || !server ? "solo" : server}
        arriveAt={arrive}
        onPortal={onPortal}
        onRoom={setRoom}
        onChangeServer={() => { if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity before changing servers."); else setServer(null); }}
        onDrivingOffence={drivingOffence}
        ads={events}
        me={jailed || mapId === "prison" ? { ...me, avatar: { ...me.avatar, ...PRISON_LOOK } } : me}
        speed={(life.sick ? 0.7 : 1) * (driving && outdoors ? (carById(driving)?.speed ?? 1) : bike && outdoors ? bike.brand.speed : 1)}
        car={hop ? `bus:${hop.route}` : driving && outdoors ? driving : null}
        bike={!driving && bike && outdoors ? bike.brand.colour : null}
      />}
      {developerTeleport && <DeveloperTeleport destinations={teleportDestinations} onTeleport={destination => {
        const targetMap = loadMap(destination.mapId, offices, me.id);
        if (!targetMap) return;
        const spot = safeSpot(targetMap, destination.x * TILE + TILE / 2, destination.y * TILE + TILE / 2);
        setBankOpen(false);
        goTo(destination.mapId, destination.label, spot);
      }} />}
      {building && mapId === "home" && <HomeEditor embedded onClose={() => setBuilding(false)} claimed={home.claimed} avatar={me.avatar} owned={home.owned} current={home.current} layout={home.layout} bought={home.furniture} clout={wallet} />}
      {mapId === "home" && !building && !homeAction && <HudSlot area="tr" order={70}><button type="button" onClick={() => { setArrive({ x: PLAYER.x, y: PLAYER.y }); setBuilding(true); }} className="jelly rounded-full border border-[#c8b182] bg-[#fff3d8] px-4 py-3 text-xs font-bold text-[#183b35] shadow-lg">Build & buy · arrange your home</button></HudSlot>}
      {homeAction && <HudSlot area="bc" order={10}><div role="status" className="w-64 max-w-full rounded-2xl border border-[#c8b182] bg-[#faf6ed] p-4 text-center text-[#183b35] shadow-xl">
        <p className="font-bold">{homeAction.label}</p>
        <p className="mt-1 text-xs">{Math.round(homeAction.duration / 1000)} seconds · needs improve when you finish</p>
        <button type="button" onClick={() => setHomeAction(null)} className="mt-3 min-h-11 rounded-full bg-[#183b35] px-5 text-xs font-bold text-white">Stop activity</button>
      </div></HudSlot>}
      {bike && mapId === "city" && (
        <HudSlot area="bc" order={0}><button
          type="button"
          onClick={() => setBike(null)}
          className="rounded-full px-4 py-2 text-sm font-black text-white shadow-lg"
          style={{ background: bike.brand.colour }}
        >
          Riding {bike.brand.name} · Get off
        </button></HudSlot>
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
      <FrightNight map={map} userId={me.id} active={mapId === "city" && !jailed && currentEvent().event.id === "fright-night"} onOpen={setBotFight} onReward={(text) => { say(text, true); void gainXp("study"); }} />
      {hop && (
        <HudSlot area="bc" order={1}><div role="status" className="flex items-center gap-3 rounded-full bg-[#c8102e] py-1.5 pr-1.5 pl-4 text-white shadow-xl">
          <span className="rounded-md bg-black/80 px-1.5 font-mono text-xs font-black text-[#ffd176]">{hop.route}</span>
          <span className="text-sm font-bold">Next stop: {hop.to}</span>
          <button type="button" onClick={hopOff} className="jelly min-h-9 rounded-full bg-white px-3 text-xs font-black text-[#c8102e]">Get off</button>
        </div></HudSlot>
      )}
      {busPick && (
        <CityMap map={map} waypoint={null} intro="You're on the bus! Pick any place on the map or in the list and the bus will drive you there." onPick={place => { if (place) hopOn(place); }} onClose={() => setBusPick(false)} />
      )}
      {driving && outdoors && (
        <HudSlot area="bc" order={1}><button type="button" onClick={() => driveCar(null)} className="jelly min-h-11 rounded-full bg-[#13203a] px-4 py-2 text-xs font-black text-white shadow-lg">
          Park {carById(driving)?.name}
        </button></HudSlot>
      )}
      <LevelBadge xp={xpNow} />
      {mapId === "study-lobby" && <HudSlot area="tc" order={20}><div className="flex gap-2 rounded-2xl bg-[#f7f1e6]/95 p-2 text-[#13203a] shadow-lg">
        <button type="button" onClick={() => setLearning(true)} className="jelly flex min-h-11 items-center gap-2 rounded-xl bg-[#2b5fd9] px-4 text-sm font-bold text-white"><BookOpen className="size-4" aria-hidden /> Study</button>
        <button type="button" onClick={() => setAwardsOpen(true)} className="jelly flex min-h-11 items-center gap-2 rounded-xl bg-[#ffd166] px-4 text-sm font-bold"><Trophy className="size-4" aria-hidden /> Awards</button>
      </div></HudSlot>}
      {!driving && !bike && <HudSlot area="br-act" order={2} className="md:hidden"><button type="button" onClick={() => window.dispatchEvent(new Event("illuminated:jump"))} aria-label="Jump (Space)" className="jelly min-h-11 rounded-full border-2 border-[#1d1a4a] bg-[#ffd23f] px-4 py-1.5 text-xs font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a] active:translate-y-0.5">Jump</button></HudSlot>}
      <HudSlot area="br-nav" order={3}><button type="button" onClick={() => { if(jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setGames(true); }} aria-label="Games" className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#7a5ce6] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Gamepad2 className="size-4" aria-hidden /> <span className="hidden sm:inline">Games</span>
      </button></HudSlot>
      <WantedStars stars={life.stars} />
      {safety && <div className="absolute inset-0 z-[100010] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Choose kindness" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]">
        <h2 className="text-2xl font-black">Pause. Choose kindness.</h2>
        <p className="mt-3">Hitting or pushing can hurt someone and make them feel unsafe. In real life, step back, use calm words and ask a trusted adult for help. Everyone deserves to feel safe.</p>
        <p className="mt-3 text-sm">In this fictional game, choosing to shove brings the police. There is no reward for hurting others.</p>
        <button type="button" className="jelly mt-5 w-full rounded-full bg-[#2b5fd9] px-4 py-3 font-bold text-white" onClick={()=>{setSafety(false);say("Good choice. Give people space and keep the city friendly.",true);}}>Walk away</button>
        <button type="button" className="mt-3 w-full rounded-full border border-[#13203a]/20 px-4 py-2 text-sm" onClick={()=>{setSafety(false);window.dispatchEvent(new Event("illuminated:fight"));offend("scuffle","Someone was hurt.");}}>Continue with consequences</button>
      </section></div>}
      {outdoors && !jailed && <HudSlot area="tr" order={50} className="hidden sm:block"><EventBanner className="flex max-w-[220px]" /></HudSlot>}
      {life.sick && <HudSlot area="tc" order={30} className="pointer-events-none"><p className="rounded-full bg-[#c8322d] px-3 py-1 text-xs font-black text-white">Unwell: get medicine or see a doctor</p></HudSlot>}
      {nearPerson && !jailed && !driving && (
        <HudSlot area="br-act" order={1}><button type="button" onClick={fight} className="jelly min-h-11 rounded-full bg-[#c8322d] px-4 py-2 text-sm font-black text-white shadow-lg">
          Shove (F)
        </button></HudSlot>
      )}
      {pursuit && pursuit.stage !== "challenge" && pursuit.stage !== "tased" && <HudSlot area="tc" order={15} className="pointer-events-none"><div role="status" className="rounded-2xl bg-[#13203a]/95 px-4 py-2 text-center text-sm font-bold text-white">{pursuit.stage === "arriving" ? "Police car responding" : "Officers are searching"}<p className="text-xs text-white/80">Leave the red search circle for 6 seconds to clear your stars.{pursuit.outsideSince !== null ? ` ${Math.max(0,6-Math.floor((Date.now()-pursuit.outsideSince)/1000))}s left` : ""}</p></div></HudSlot>}
      {pursuit?.stage === "challenge" && <PoliceChallenge onResult={correct=>{
        pursuitRef.current = null; setPursuit(null);
        if(correct) { updateLife(clearWanted); say("Correct. The officers let you go with a warning.",true); }
        else {
          setArrest(true);
          const stars = life.stars, charge = wantedCharge(life);
          arrestTimer.current=setTimeout(()=>{
            setArrest(false);
            // Not sure it was you: an interview first. Otherwise straight to court.
            if (policeUnsure(stars, charge)) {
              updateLife(clearWanted);
              setInterview({ stars, charge, area: areaAt(Math.floor(PLAYER.x / TILE), Math.floor(PLAYER.y / TILE)) ?? "the city" });
            } else {
              updateLife(l=>({...clearWanted(l),hearing:{stars:l.stars,charge:wantedCharge(l)}}));
              goTo("court","Crown Court");
            }
          },2600);
        }
      }}/ >}
      {arrest && <ArrestOverlay />}
      {interview && <InterviewRoom charge={interview.charge} stars={interview.stars} area={interview.area} wallet={wallet} onDone={(outcome) => {
        setInterview(null);
        if (outcome.kind === "free") {
          setWallet(w => Math.max(0, w - outcome.clout));
          say(`@${outcome.by} took the blame. You walk out of the station a free person, ${outcome.clout} Clout lighter.`, true);
          router.refresh();
        } else updateLife(l => ({ ...l, hearing: { stars: outcome.stars, charge: outcome.charge } }));
      }} />}
      <BlameOfferPrompt busy={Boolean(interview || arrest || jailed || life.hearing || mapId === "court")} onAccepted={(deal) => {
        if (typeof deal.wallet === "number") setWallet(deal.wallet);
        updateLife(l => ({ ...l, hearing: { stars: deal.stars, charge: deal.charge } }));
        say(`Deal done: +${deal.clout} Clout from @${deal.from}. You're due in court for ${deal.charge.toLowerCase()}.`, true);
      }} />
      <HudSlot area="br-nav" order={0}><button type="button" onClick={() => setMenu(true)} aria-label="Game menu" title="Menu (Esc)" className="jelly grid size-11 place-items-center rounded-2xl bg-[#13203a] text-white shadow-lg"><Menu className="size-5" aria-hidden /></button></HudSlot>
      {menu && <GameMenu place={map.name} onContinue={() => setMenu(false)} onLeave={leaveGame} />}
      <HudSlot area="br-nav" order={1}><button type="button" onClick={()=>setPhone(true)} aria-label="Open your game phone" className="jelly grid size-11 place-items-center rounded-2xl bg-[#13203a] text-white shadow-lg"><Smartphone className="size-5"/></button></HudSlot>
      {phone && <GamePhone time={gameDate} clout={wallet} onBus={() => { setPhone(false); if (mapId !== "city" || jailed) say("Buses run on London streets. Head outside first."); else setBusPick(true); }} onGarage={() => { setPhone(false); if (outdoors && !jailed) setDealer(true); else say("Head outside to open your garage."); }} onStudy={() => { setPhone(false); if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setLearning(true); }} onAwards={() => { setPhone(false); setAwardsOpen(true); }} onUniversities={()=>{setPhone(false);const gate=map.portals.find(p=>p.to.kind==="map"&&p.to.mapId==="universities");if(gate){setWaypoint({id:gate.id,name:"University Quarter",kind:"university",x:gate.rect.x+gate.rect.w/2,y:gate.rect.y+gate.rect.h/2});say("Follow the university marker to explore the district.",true);}else setMapOpen(true);}} onClose={()=>setPhone(false)} onMap={()=>{setPhone(false);setMapOpen(true);}} onHome={()=>{setPhone(false);if(jailed||life.stars>=POLICE_STARS)say("Finish your current law activity first.");else goTo("home","Your house");}} onLocker={()=>{if(!jailed&&life.stars<POLICE_STARS)router.push("/games/locker");else say("Finish your current law activity first.");}} onCall={id=>{
        setPhone(false);
        if(jailed||life.stars>=POLICE_STARS){say("Finish your current law activity before calling companies.");return;}
        const workplace=id.startsWith("work:") ? workplaceById(id.slice(5)) : WORKPLACES.find(w=>w.companyId===id);
        if(workplace){goTo(`workplace-${workplace.id}`,workplace.name);say("Walk to reception to apply, or use a computer or counter to clock in.",true);}
        else { const company=COMPANIES.find(c=>c.id===id); setInmate(`Call: ${company?.name??id}`); }
      }}/ >}
      {study && <PrisonStudy progress={life.prisonWork} onCorrect={()=>updateLife(l=>({...l,prisonWork:Math.min(3,l.prisonWork+1)}))} onClose={()=>setStudy(false)}/>}
      {inmate && <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-label={inmate} className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"><h2 className="text-2xl font-black">{inmate}</h2><p className="mt-3 leading-relaxed">{inmate.startsWith("Call:")?"Thanks for calling. Visit our headquarters in the city to start your revision shift. Look for our company sign and walk to the glowing door.":inmate==="Sam"?"The cell doors are open. The study desk is in the south-west corner. Three correct revision answers count towards your release, or use a completed homework card.":"The service corridor starts through the eastern wall. The gaps alternate north and south. Watch the patrolling guards; getting caught adds time."}</p><p className="mt-3 text-xs text-[#5a6272]">Scripted character dialogue — no live chat.</p><button type="button" onClick={()=>setInmate(null)} className="jelly mt-5 rounded-full bg-[#2b5fd9] px-5 py-2 font-black text-white">End conversation</button></section></div>}
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
          onSteal={() => { setShop(null); doActivity("meal"); offend("shoplifting", "You walked out with a meal deal you didn't pay for."); }}
        />
      )}
      {bankOpen && <BankDialog loan={bankLoan} clout={wallet} gameDate={gameDate} onClose={() => setBankOpen(false)} onUpdate={(loan, balance) => {
        setBankLoan(loan);
        if (balance !== undefined) setWallet(balance);
        if (loan.status === "active") updateLife(current => ({ ...current, bankCourtSeen: false }));
        if (loan.status === "paid") { updateLife(current => ({ ...current, bankCourtSeen: true })); say("Loan repaid in full. Your account is clear.", true); }
      }} />}
      {toast && (
        <div className={cn("xp-toast pointer-events-none absolute top-20 left-1/2 z-[100002] -translate-x-1/2 rounded-full px-5 py-2 font-black shadow-xl", toast.big ? "bg-[#f2d9a6] text-xl text-[#13203a]" : "bg-[#2b5fd9] text-white")} role="status">
          {toast.text}
        </div>
      )}
      {journey && <TrainCutscene to={journey.to} line="Revision" avatar={me.avatar} onArrive={journey.go} />}
      {policeTransport && <PoliceTransportCutscene onArrive={() => {
        const stars = transportStars.current;
        updateLife(life => ({ ...clearWanted(life), jailUntil: Date.now() + sentenceMs(stars), hearing: null, prisonWork: 0 }));
        setPoliceTransport(false); setArrest(false);
        say("The police escort has arrived at HMP Thames. Your sentence has started.", true);
        goTo("prison", "HMP Thames");
      }} />}
{inTutorial && flight !== null && !flying && <FlightSchoolGuide step={flight} onNext={() => setFlight(n => n === null ? n : n + 1)} onSkip={() => setFlying(true)} />}
      {flightModal === "desk" && <FlightSchoolDesk onClose={() => { setFlightModal(null); setFlight(n => n === null ? n : n + 1); }} />}
      {flightModal === "quiz" && <FlightSchoolQuiz onClose={() => setFlightModal(null)} onDone={() => { setFlightModal(null); setFlight(n => n === null ? n : n + 1); }} />}
      {flying && <PlaneCutscene onArrive={landInLondon} />}
      <SceneWipe show={fading} label={sceneName} />
      <HudSlot area="br-nav" order={4}><button
        type="button"
        onClick={() => setTutorial(true)}
        aria-label="How to play"
        className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#f6f2e8] px-3 py-1.5 text-xs font-black text-[#13203a] shadow-lg"
      >
        <CircleHelp className="size-4 sm:hidden" aria-hidden /><span className="hidden sm:inline">How to play</span>
      </button></HudSlot>
      {tutorial && <Tutorial onClose={() => {
        try { localStorage.setItem(`${TUTORIAL_KEY}:${me.id}`, "seen"); } catch { /* Show again when storage is unavailable. */ }
        setTutorial(false);
      }} />}
      {mindGap && (
        <div className="pointer-events-none absolute inset-0 z-[100001] grid place-items-center" aria-live="polite">
          <p className="rounded-2xl bg-[#f6f2e8] px-5 py-3 text-lg font-black tracking-wide text-[#13203a]">Please mind the gap</p>
        </div>
      )}
      {atHome && (
        <HudSlot area="br-act" order={3}><Link href="/games/home" className="jelly rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black text-[#0d1726] shadow-lg">
          Decorate
        </Link></HudSlot>
      )}
      {university&&<UniversityGuide id={university.id} topic={university.topic} onClose={()=>setUniversity(null)}/>}
      {dailyJob&&map.id===(dailyJob.workplace==="tescow"?"supermarket":"city")&&<DailyShift job={dailyJob} map={map} onTarget={setWaypoint} onBusy={setDailyBusy} onPaid={pay=>setWallet(n=>n+pay)} onClose={()=>{setDailyJob(null);setDailyBusy(false);setWaypoint(null);}}/>}
      {work && mapId === `workplace-${work}` && workplaceById(work) && <WorkplaceDoor station={workStation} workplace={workplaceById(work)!} job={job} avatar={me.avatar} onClose={() => setWork(null)} onPracticalShift={next=>{setWork(null);if(next.workplace==="tescow"){setDailyJob(next);goTo("supermarket","Tesco practice store");}else {setDailyJob(next);goTo("city","Pizza delivery route");say("Delivery route ready. Follow your work markers.");}}} />}
      {bus && <BusStop here={bus} stops={BUS_STOPS} homework={homework} onGo={busRide} onClose={() => setBus(null)} onPickOnMap={() => { setBus(null); setBusPick(true); }} />}
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
        <HudSlot area="tc" order={25}><div className="rounded-full bg-brand px-4 py-2 text-sm font-black" role="status">
          {room}
          {officeSlug && (
            <Link href={`/messages?org=${officeSlug}`} className="pointer-events-auto ml-2 underline">
              Open my meetings
            </Link>
          )}
        </div></HudSlot>
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
                    <Link href={`/messages/new?to=${s.userId}`} className="jelly rounded-full bg-[#f2d9a6] px-3 py-1.5 text-xs font-black text-[#0d1726]">
                      Message
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/companies/${officeSlug}`} className="jelly rounded-full bg-brand py-2.5 text-center text-sm font-black">
                Company profile
              </Link>
              <Link href={`/companies/${officeSlug}#office-hours`} className="jelly rounded-full bg-secondary py-2.5 text-center text-sm font-black">
                Book office hours
              </Link>
            </div>
          </div>
        </div>
      )}
    </HudLayout>
    </div>
  );
}
