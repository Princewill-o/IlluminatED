"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./pixel-gui.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookOpen, Briefcase, CarFront, Globe, CircleHelp, Crown, DoorOpen, Feather, Footprints, Gamepad2, HeartHandshake, MapPinned, Menu, Smartphone, TrainFront, Trophy, Users, X } from "lucide-react";

import { play, soundOn } from "../sound";
import { ARRIVE_LEVEL, AUTOPILOT, CREW, LEVEL_JUMP, NPC_SPOTS, PET, loadCarPaint, PLAYER, PLAYER_VEHICLE, PLAYER_WORK, RESCUES, TRAFFIC_BOXES, TUTOR, WEATHER_NOW, WORLD_RULES } from "./art";
import { BankDialog, type BankLoan } from "./bank";
import type { BusTrip } from "./bus-stop";
import { CarRadio, type RadioStation, savedStation } from "./car-radio";
import { CityMap, MiniMap, type Place, nearest, placeForTask } from "./city-map";
import { CoachTrip } from "./coach-trip";
import { CourtTrial } from "./court-trial";
import { CrashImpact } from "./crash-impact";
import { CrewInvites } from "./crew";
import { BookingIn, HoldingCellHud } from "./custody";
import { Deliveries } from "./deliveries";
import { DeveloperTeleport, type TeleportDestination } from "./developer-teleport";
import { DisputeHelp } from "./dispute-help";
import { EventArcade, type EventGame } from "./event-arcade";
import { FLIGHT_SCHOOL_KEY, FLIGHT_STEPS, FlightSchoolDesk, FlightSchoolGuide, FlightSchoolQuiz, PlaneCutscene } from "./flight-school";
import { GameFeedback } from "./game-feedback";
import { GameMenu, saveResume } from "./game-menu";
import { HiringFlow, type HiringStage } from "./hiring";
import { HotelDesk } from "./hotel-desk";
import { HudLayout, HudSlot } from "./hud";
import { BlameOfferPrompt, InterviewRoom } from "./interview-room";
import { JobsPanel } from "./jobs-panel";
import { PoliceChallenge, PrisonStudy, StreetHearingDialog } from "./law-dialogs";
import { ArrestOverlay, PrisonHud, ShopDialog, WantedStars } from "./life";
import { LevelBadge, LifeHud, type Quest } from "./life-hud";
import { LiftPanel } from "./lift-panel";
import { LivePolicePickup } from "./live-police-pickup";
import mobileStyles from "./mobile-life.module.css";
import { NetworkingEvent } from "./networking-event";
import { NpcTalk } from "./npc-talk";
import { NpcVisits } from "./npc-visits";
import { PanicFloor } from "./panic-floor";
import { PetPanel, syncPet } from "./pet-panel";
import { PolicePatrol } from "./police-patrol";
import { PrisonJobBoard, PrisonRoutineHud, PrisonTrader, PrisonWorkbench, usePrisonLife } from "./prison-life-ui";
import { addLocalHire, useRoleHiresState } from "./role-hires";
import { RewardToasts, RoleShift } from "./role-shift";
import { SceneWipe, TUTORIAL_KEY, Tutorial } from "./scene";
import continuityStyles from "./scene-continuity.module.css";
import { SceneMusic } from "./scene-music";
import { RIDE, TRAIN_CALL } from "./train-state";
import { BikeDock, Dealership } from "./transport";
import type { TubeTrip } from "./tube-map";
import { TunnelFlash } from "./tunnel-flash";
import { useLife } from "./use-life";
import { useLifeJournal } from "./use-life-journal";
import { useNavigation } from "./use-navigation";
import { useNeeds, doActivity, setNeedsOutfit, damageEnergy } from "./use-needs";
import { usePhoneLayout } from "./use-phone-layout";
import { useSceneTransition } from "./use-scene-transition";
import { useStreetEncounters } from "./use-street-encounters";
import { type Me, useLobby } from "./use-world";
import { VehicleJourney } from "./vehicle-journey";
import { VenturePanel } from "./venture-panel";
import { type Site, WebBrowser } from "./web-browser";
import { DEFAULT_RULES, WorldAdmin, WorldMenu } from "./world-menu";
const HomeMarket = dynamic(() => import("./home-market").then(module=>module.HomeMarket),{ssr:false});
import { WorldView } from "./world-view";
import { useTechEvents } from "../event-ads";
const MobileLife = dynamic(() => import("./mobile-life").then((module) => module.MobileLife), { ssr: false, loading: () => <div className="absolute inset-0 grid place-items-center bg-[#f3f4f8] text-[#18202d]" role="status">Opening your life…</div> });

import { cityAction } from "@/app/games/city-actions";
import { acceptRoleOffer, earnWorldXp, finishRoleInterview, startRoleInterview, type HotelBooking, loadHotelBooking, loadPets, worldBankStatus, worldRules, type PlayerWorld, type WorldRules } from "@/app/games/world/actions";
import type { ActiveJob } from "@/components/careers/work";
import { WorkplaceDoor } from "@/components/careers/work";
import { EventBanner } from "@/components/game/season/event-banner";
import type { LearningAward } from "@/game/core/awards";
import type { BikeBrand } from "@/game/core/bikes";
import { WORKPLACES, roleOf, workplaceById } from "@/game/core/careers";
import { carById } from "@/game/core/cars";
import type { NearbyPerson } from "@/game/core/city-social";
import type { StreetAssessment } from "@/game/core/civilian-conflict";
import { roleWorkplaceMap } from "@/game/core/client-jobs";
import { COMPANIES } from "@/game/core/companies";
import {courtFineTotal,recordCourtFine} from "@/game/core/court-wallet";
import { nearestDrivingSpot, nearestParkingSpot, roadRoute } from "@/game/core/driving";
import { gameDateAt } from "@/game/core/game-clock";
import { announceGameMoment } from "@/game/core/game-moments";
import { type Placed, type HomeAction, furnitureById, homeById, homeUse } from "@/game/core/homes";
import { parseRoomMap, roomInfo, roomMapId } from "@/game/core/hotels";
import { roleSpec } from "@/game/core/interview";
import { PRISON_LOOK, SHOP, POLICE_STARS, policeUnsure, releaseFromPrison, escapeFromPrison, addStar, cardsLeft, clearWanted, commit, warningFor, wantedCharge, sentenceMs, type Offence } from "@/game/core/law";
import { LIVE_RESCUE_MS, rescuePlan } from "@/game/core/live-rescue";
import { isMotorway } from "@/game/core/living-world";
import { homeStyle } from "@/game/core/london";
import { areaAt } from "@/game/core/map-guide";
import { partyMap } from "@/game/core/party";
import { attend, cellSearch, coolHeat, coverHole, cutFence, detector, dig, doJob, frontGate, has as hasItem, judgePrevious, prisonClock, searchDesk, sendToSolitary, takeKeyImpression, train as trainStat, vent } from "@/game/core/prison-life";
import { type Pursuit, startPursuit, tickPursuit, caughtByPrisonGuard } from "@/game/core/pursuit";
import { type PracticalRole, ROLES, ROLE_UNIFORMS } from "@/game/core/roles";
import type { RoomStyle } from "@/game/core/room-designs";
import { beginStreetCustody, advanceStreetCustody, finishStreetTransport, canHearStreetCase, STREET_CUSTODY, type StreetCustody } from "@/game/core/street-custody";
import type { RoadViolation } from "@/game/core/traffic-rules";
import { ARRIVE_DOCK_S, RIDE_SWAP_S, arriveFrame, canBoardTrain, trainStop } from "@/game/core/train";
import { nextUKPortal, roadTransitionArrival, ukSceneName, motorwayCarArrival } from "@/game/core/uk-navigation";
import { isUKScene, UK_SCENES, ukWorldMap } from "@/game/core/uk-world";
import { universityById } from "@/game/core/universities";
import { venueMap } from "@/game/core/venues";
import { GEAR_MESSAGE, weatherGear, weatherReason } from "@/game/core/weather-gear";
import {
  CITY, ventureMap,
  universityInteriorMap, supermarketMap,
  STATION_PLATFORM_Y,
  TILE,
  stationMap,
  studyLobbyMap,
  gamesIslandMap,
  type OfficeOrg,
  type Portal,
  type RegionId,
  type WorldMap,
  campusMap,
  courtMap,
  hospitalMap,
  prisonMap,
  prisonRoomAt,
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
  policeStationMap,
  POLICE_CELLS,
  hotelMap,
  safeSpot,
  SERVERS,
} from "@/game/core/world";
import { retainNearbySnapshot } from "@/game/core/world-ui-snapshots";
import type { HomeState } from "@/lib/game/careers-server";
import { cn } from "@/lib/utils";

const CreatorStudio = dynamic(()=>import("./creator-studio").then(module=>module.CreatorStudio),{ssr:false});
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
const UKRoadMap = dynamic(() => import("./uk-road-map").then(module => module.UKRoadMap), { ssr: false });

const REGION_KEY = "world-region";

const STATIONS = tubeStations();
const HIGHLANDS = highlandsMap();
const SUPERMARKET = supermarketMap();
const BUS_STOPS = busStops();

let HOME: { style: number; layout: Placed[]; room?: RoomStyle } | null = null;
function loadMap(id: string, offices: OfficeOrg[], meId = ""): WorldMap | null {
  if(id.startsWith("party-"))return partyMap(id.slice(6));
  const regional = ukWorldMap(id);
  if (regional) return regional;
  if (id.startsWith("venue-")) return venueMap(id);
  if (id.startsWith("hotel-")) return hotelMap(id);
  if (id.startsWith("workplace-")) return workplaceMap(id.slice(10));
  if (id.startsWith("role-")) { const role = ROLES.find((r) => `role-${r.id}` === id); return role ? roleWorkplaceMap(id, role.title, role.colour) : null; }
  if (id === "city") return CITY;
  if (id === "venture-hub") return ventureMap();
  if (id === "universities") return CITY;
  if (id === "supermarket") return supermarketMap();
  if (id.startsWith("university-")) return universityInteriorMap(id.slice(11));
  if (id === "home") return HOME ? homeMap(HOME.style, HOME.layout, HOME.room) : homeMap(homeStyle(meId));
  if (id === "study-lobby") return studyLobbyMap();
  if (id === "games-island") return gamesIslandMap();
  if (id === "campus") return campusMap(offices);
  if (id === "highlands") return HIGHLANDS;
  if (id === "hospital") return hospitalMap();
  if (id === "court") return courtMap();
  if (id === "police-station") return policeStationMap();
  if (id === "prison") return prisonMap();
  if (id === TUTORIAL_MAP_ID) return tutorialMap();
  if (id.startsWith("station-")) return stationMap(id.slice("station-".length));
  if (id.startsWith("office-")) {
    const org = offices.find((o) => `office-${o.slug}` === id);
    return org ? officeMap(org) : null;
  }
  return null;
}

/** Starts a live transfer once (the custody stage only signals it). */
function LiveTransferStart({ onStart }: { onStart: () => void }) {
  const go = useRef(onStart);
  useEffect(() => { go.current(); }, []);
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
  initialActivity,
  job,
  home: savedHome,
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
  initialActivity?: EventGame;
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
  const phoneLayout = usePhoneLayout();
  const [mobileExplore, setMobileExplore] = useState(false);
  const mobileLife = phoneLayout === true && !mobileExplore;
  const [mobileWork, setMobileWork] = useState<string | null>(null);
  const { entries: lifeEntries, record: recordLife } = useLifeJournal(me.id);
  const lastJob = useRef(job);
  useEffect(() => {
    const previous = lastJob.current;
    lastJob.current = job;
    if (previous?.workplace !== job?.workplace || previous?.role !== job?.role) {
      if (job) recordLife(`You started as ${roleOf(job.workplace, job.role)?.title ?? "a new employee"} at ${workplaceById(job.workplace)?.name ?? "your workplace"}.`);
      else if (previous) recordLife("You left your job. You’re now unemployed and can study or look for your next role.");
    } else if (job && previous && job.shifts > previous.shifts) {
      recordLife(`You completed a shift at ${workplaceById(job.workplace)?.name ?? "your workplace"}.`);
    }
  }, [job, recordLife]);
  const [homeChoice, setHomeChoice] = useState<string | null>(null);
  const [newlyOwnedHomes, setNewlyOwnedHomes] = useState<string[]>([]);
  const savedHomeId = savedHome.current, savedOwnedHomes = savedHome.owned;
  const home = homeChoice ? { ...savedHome, claimed: true, current: homeChoice,
    style: homeById(homeChoice)?.style ?? savedHome.style,
    owned: [...new Set([...savedHome.owned, ...newlyOwnedHomes, homeChoice])],
  } : savedHome;
  useEffect(() => {
    // Once a server snapshot acknowledges ownership, respect its current home
    // too (another move may have completed while a refresh was in flight).
    setHomeChoice(choice => choice === savedHomeId || (choice !== null && savedOwnedHomes.includes(choice)) ? null : choice);
    setNewlyOwnedHomes(homes => homes.filter(id => !savedOwnedHomes.includes(id)));
  }, [savedHomeId, savedOwnedHomes]);
  HOME = home;
  const router = useRouter();
  const [mapId, setMapId] = useState(() => (loadMap(initialMap, offices, me.id) && (!isMotorway(initialMap) || cars.some(id => carById(id))) ? initialMap === "universities" ? "city" : initialMap : "city"));
  const [building, setBuilding] = useState(initialBuild && initialMap === "home");
  const [tube, setTube] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);

  const [server, setServer] = useState<string | null>(() => initialServer);
  const [region, setRegion] = useState<RegionId>("lse");
  const [worldInfo, setWorldInfo] = useState<PlayerWorld | null>(null);
  const [arrive, setArrive] = useState<{ x: number; y: number; heading?: number; speed?: number } | undefined>(initialArrival);
  const [desk, setDesk] = useState(false);
  const [work, setWork] = useState<string | null>(null);
  const [workStation, setWorkStation] = useState<"reception" | "terminal">("reception");
  const [dailyJob,setDailyJob]=useState<ActiveJob|null>(null);
  const [dailyBusy,setDailyBusy]=useState(false);
  const [liveTransfer, setLiveTransfer] = useState<{ destination: "court" | "prison"; ready: boolean } | null>(null);

  // Practical roles: the Jobs panel and the shift you're on.
  const [jobsOpen,setJobsOpen]=useState(false);
  const [petsOpen,setPetsOpen]=useState(false);
  const [browser,setBrowser]=useState<Site|null>(null);
  const [tunnelBlink,setTunnelBlink]=useState(0);
  // Leaving the Underground some other way takes you off the train.
  useEffect(()=>{if(!mapId.startsWith("station-"))RIDE.active=false;},[mapId]);
  useEffect(()=>{const off=()=>setTube(null);window.addEventListener("illumed:ride-off",off);return()=>window.removeEventListener("illumed:ride-off",off);},[]);
  const [hotelBooking,setHotelBooking]=useState<HotelBooking|null>(null);
  const [hotelDesk,setHotelDesk]=useState<string|null>(null);
  useEffect(()=>{void loadHotelBooking().then(setHotelBooking).catch(()=>{});},[]);
  const [lift,setLift]=useState<{mapId:string;label:string;current:boolean;level?:0|1;x?:number;y?:number}[]|null>(null);
  // Your pet comes out with you as soon as the world loads.
  useEffect(()=>{void loadPets().then(syncPet).catch(()=>{});if(process.env.NODE_ENV!=="production")(window as unknown as {__pet?:(tag:string|null)=>void}).__pet=(tag)=>{PET.tag=tag;};},[]);
  const [roleShift,setRoleShift]=useState<{role:PracticalRole;level:number}|null>(null);
  // Hiring: you apply and pass an interview before your first shift in a role.
  const {hires,ready:hiresReady}=useRoleHiresState();
  const [hiring,setHiring]=useState<{role:PracticalRole;stage:HiringStage;name:string}|null>(null);
  const [interviewAt,setInterviewAt]=useState<{role:PracticalRole;name:string}|null>(null);
  const interviewClaim=useRef<string|null>(null);
  const startRole=(role:PracticalRole,level:number)=>{
    if(roleShift?.role.id===role.id)return;
    if(hiresReady&&!hires.has(role.id)){setHiring({role,stage:"advert",name:""});return;}
    setDailyJob(null);setRoleShift({role,level});
  };
  // Arriving for an interview: reception is waiting.
  useEffect(()=>{if(interviewAt&&interviewAt.role.place.mapId===mapId){setHiring({role:interviewAt.role,stage:"reception",name:interviewAt.name});setInterviewAt(null);}},[interviewAt,mapId]);
  const [university,setUniversity]=useState<{id:string;topic:"courses"|"events"|"networking"}|null>(null);
  const [bus, setBus] = useState<string | null>(null);
  const [gamesStart, setGamesStart] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const [sceneName, setSceneName] = useState("London");
  const [tutorial, setTutorial] = useState(false);
  const [waypoint, setWaypoint] = useState<Place | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [ukRoadsOpen, setUKRoadsOpen] = useState(false);
  const [roadDestination, setRoadDestination] = useState<string | null>(null);
  const closeUKRoads = useCallback(() => setUKRoadsOpen(false), []);

  const [missionScene,setMissionScene] = useState(false);
  const arrived = useCallback(() => { setWaypoint(null); announceGameMoment({kind:"arrival",title:"Destination reached",message:"You made it. Explore the entrance or interaction nearby."}); }, []);
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
  const [eventGame, setEventGame] = useState<EventGame | null>(initialActivity ?? null);
  const closeEventGame = useCallback(() => { setEventGame(null); router.refresh(); }, [router]);
  const [bike, setBike] = useState<{ brand: BikeBrand; until: number } | null>(null);
  const [wallet, setWallet] = useState(clout);
  // Dress for the weather: a coat (and a beanie in the snow) goes on outdoors when it's wet or cold.
  const [weatherNow, setWeatherNow] = useState({ kind: WEATHER_NOW.kind, temp: WEATHER_NOW.temp, outdoors: WEATHER_NOW.outdoors, dress: true });
  useEffect(() => {
    const read = () => { let dress = true; try { dress = localStorage.getItem("weather-clothes") !== "off"; } catch { /* private mode */ } setWeatherNow({ kind: WEATHER_NOW.kind, temp: WEATHER_NOW.temp, outdoors: WEATHER_NOW.outdoors, dress }); };
    read();
    window.addEventListener("illumed:weather", read);
    return () => window.removeEventListener("illumed:weather", read);
  }, []);
  const gear = weatherNow.dress && weatherNow.outdoors ? weatherGear(me.avatar, weatherNow.kind, weatherNow.temp) : null;
  const gearReason = gear ? weatherReason(weatherNow.kind, weatherNow.temp) : null;
  const lastGear = useRef<string | null>(null);
  useEffect(() => {
    if (gearReason && gearReason !== lastGear.current) say(GEAR_MESSAGE[gearReason]);
    lastGear.current = gearReason;
  }, [gearReason]); // eslint-disable-line react-hooks/exhaustive-deps
  // A street disagreement close by that you could help calm down.
  const [dispute, setDispute] = useState<{ index: number; id: string } | null>(null);
  const [disputeOpen, setDisputeOpen] = useState<{ index: number; id: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setDispute((e as CustomEvent<{ index: number; id: string } | null>).detail ?? null);
    window.addEventListener("illumed:dispute", on);
    return () => window.removeEventListener("illumed:dispute", on);
  }, []);
  /** A police interview in progress (the police aren't sure it was you). */
  const [interview, setInterview] = useState<{ stars: number; charge: string; area: string } | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankLoan, setBankLoan] = useState<BankLoan>({ balance: 0, status: "none" });
  const [gameDate, setGameDate] = useState(() => gameDateAt());
  const bankCourtSeen = useRef(false);
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
  const [radio, setRadio] = useState<RadioStation>("track-3");
  useEffect(() => { setRadio(savedStation()); loadCarPaint(); }, []);
  const [driving, setDriving] = useState<string | null>(() => isMotorway(initialMap) ? cars.find(id => carById(id)) ?? null : null);
  const [xpNow, setXpNow] = useState(xp);
  useEffect(()=>{if(waypoint)announceGameMoment({kind:"route",title:waypoint.name,message:"Destination marked. Follow the pink trail in the world. In a car, park at road access and finish on foot."});},[waypoint]);
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
  // The HUD clock updates in its own component. Refresh this panel-only date
  // only while a consumer is open, rather than reconciling the world every second.
  useEffect(() => {
    if(!mobileLife&&!phone&&!bankOpen)return;
    const updateClock=()=>setGameDate(gameDateAt());updateClock();
    const timer=window.setInterval(updateClock,1000);
    return()=>window.clearInterval(timer);
  },[mobileLife,phone,bankOpen]);
  const [menu, setMenu] = useState(false);
  const [phoneApp,setPhoneApp]=useState<"home"|"nearby">("home");
  const [nearby,setNearby]=useState<NearbyPerson[]>([]);
  const refreshNearby=useCallback((people:NearbyPerson[])=>setNearby(previous=>retainNearbySnapshot(previous,people,phone)),[phone]);
  const [ventureOpen,setVentureOpen]=useState(false);
  useEffect(()=>{const open=()=>{setPhoneApp("nearby");setPhone(true);};window.addEventListener("illuminated:nearby",open);return()=>window.removeEventListener("illuminated:nearby",open);},[]);
  const [housing, setHousing] = useState(false);
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
  const [streetCustody, setStreetCustody] = useState<StreetCustody | null>(null);
  const [policeTransport, setPoliceTransport] = useState(false);
  const transportStars = useRef(4);
  /** Police custody: booked in at the station, then a holding cell, then the van to court. */
  const [custody, setCustody] = useState<{ stage: "van" | "booking" | "cell" | "transport"; until: number; solicitor: boolean } | null>(null);
  const [trialSolicitor, setTrialSolicitor] = useState(false);
  const [patrol, setPatrol] = useState(false);
  const { life, update: updateLife } = useLife(me.id,wantedResetToken);
  const { needs } = useNeeds();
  useEffect(()=>{setNeedsOutfit(me.avatar.top);return()=>setNeedsOutfit();},[me.avatar.top]);
  const [nearPerson, setNearPerson] = useState(false);
  const [creatorChannel,setCreatorChannel]=useState<"tiktok"|"youtube"|"instagram"|null>(null);
  const [studioFloating,setStudioFloating]=useState(false);
  const [conversation,setConversation]=useState<{id:string;name:string;heading?:string}|null>(null);
  const [safety, setSafety] = useState(false);
  const [rescue, setRescue] = useState(false);
  const [panic, setPanic] = useState<string | null>(null);
  const [medicalCustody,setMedicalCustody]=useState(false);
  const {passage,begin:beginTransition,pending:transitionPending}=useSceneTransition();
  const pendingStreetCase = useRef<StreetAssessment | null>(null);
  const { prison, run: runPrison } = usePrisonLife(me.id, life.jailUntil > 0);
  const prisonRef = useRef(prison); prisonRef.current = prison;
  const [prisonPanel, setPrisonPanel] = useState<"desk" | "trader" | "jobs" | null>(null);
  const [prisonHere, setPrisonHere] = useState("your cell");
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => { if (!prison) return; const t = setInterval(() => setNowTick(Date.now()), 1000); return () => clearInterval(t); }, [prison]);
  const say = useCallback((text: string, big = false) => {
    setToast({ text, big });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), big ? 3200 : 2200);
  }, []);
  const jailed = life.jailUntil > 0;
  const cards = cardsLeft(homeworkDone, life);
  const [journey, setJourney] = useState<{ to: string; line?: string; go: () => void } | null>(null);
  const fineKey=`illuminated:court-fines:${me.id}`;
  useEffect(() => {try{setWallet(Math.max(0,clout-courtFineTotal(JSON.parse(localStorage.getItem(fineKey)??"null"))));}catch{setWallet(clout);}}, [clout,fineKey]);
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
  const map = useMemo(() => mapId === "home" ? homeMap(home.style, home.layout, home.room) : loadMap(mapId, offices, me.id) ?? CITY, [mapId, offices, me.id, home.style, home.layout, home.room]);
  // From the main menu: /games/world?goto=maths-racing walks you to that place with a marker.
  const gotoDone = useRef(false);
  useEffect(() => {
    if (gotoDone.current || typeof window === "undefined") return;
    const go = new URLSearchParams(window.location.search).get("goto");
    const gate = go ? map.portals.find((p) => p.id === go) : undefined;
    if (!gate) return;
    gotoDone.current = true;
    const timer = window.setTimeout(() => {
      setWaypoint({ id: gate.id, name: gate.label.split(":")[0], kind: "games", x: gate.rect.x + gate.rect.w / 2, y: gate.rect.y + gate.rect.h / 2 });
      announceGameMoment({ kind: "arrival", title: gate.label.split(":")[0], message: "Follow the marker to get there. Free roam anywhere on the way." });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [map]);
  const navigation=useNavigation(map,waypoint,Boolean(driving),arrived);
  const inOffice = mapId.startsWith("office-");
  const outdoors = mapId === "city" || mapId === "highlands" || isUKScene(mapId);
  // IllumED World sandbox: a player world's rules, re-checked every few seconds
  // so visitors see the owner's changes. The Open World uses the defaults.
  const [rules, setRules] = useState<WorldRules>(DEFAULT_RULES);
  const [worldOwner, setWorldOwner] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [networking, setNetworking] = useState<string | null>(null);
  const [soaring, setSoaring] = useState(false);
  const playerWorld = server?.startsWith("pw-") ? server : null;
  useEffect(() => {
    if (!playerWorld) { setRules(DEFAULT_RULES); setWorldOwner(null); return; }
    if (worldInfo?.code === playerWorld) { setRules({ ...DEFAULT_RULES, ...worldInfo.settings }); setWorldOwner(worldInfo.owner); }
    let live = true;
    const load = () => void worldRules(playerWorld).then((w) => { if (live && w) { setRules({ ...DEFAULT_RULES, ...w.settings }); setWorldOwner(w.owner); setWorldInfo((i) => i ?? { owner: w.owner, code: playerWorld, name: w.name, icon: "castle", settings: w.settings }); } }).catch(() => {});
    load();
    const t = window.setInterval(load, 8000);
    return () => { live = false; window.clearInterval(t); };
  }, [playerWorld, worldInfo]);
  const isOwner = Boolean(playerWorld && worldOwner === me.id);
  const canFly = rules.flight === "everyone" || (rules.flight === "owner" && isOwner);
  const policeStars = rules.police === "strict" ? 2 : rules.police === "relaxed" ? 5 : POLICE_STARS;
  useEffect(() => {
    Object.assign(WORLD_RULES, { police: rules.police, flight: rules.flight, time: rules.time, weather: rules.weather, owner: isOwner, fly: soaring && canFly && outdoors });
    if (soaring && !canFly) setSoaring(false);
  }, [rules, isOwner, soaring, canFly, outdoors]);
  useEffect(() => () => { Object.assign(WORLD_RULES, { police: "normal", flight: "off", time: "auto", weather: "auto", owner: false, fly: false }); }, []);
  // Police switched off: nobody is wanted here.
  useEffect(() => { if (rules.police === "off" && life.stars > 0 && !jailed) updateLife(clearWanted); }, [rules.police, life.stars, jailed, updateLife]);

  const drivingOffence = useCallback((offence: RoadViolation) => {
    const now = Date.now();
    if (rules.police === "off" || !driving || jailed || arrest || life.hearing || pursuit?.stage === "challenge" || now - drivingOffenceAt.current < 3000) return;
    const charges: Record<RoadViolation["reason"], string> = {
      "red-light": "Driving through a red light",
      "wrong-way": "Driving against the flow of traffic",
      collision: "Causing a road collision",
      crossing: "Failing to give way at a pedestrian crossing",
    };
    drivingOffenceAt.current = now;
    updateLife(l => addStar(l, now, charges[offence.reason]));
    say(`${offence.message} +1 wanted star. ${warningFor({ ...life, stars: Math.min(5, life.stars + 1) })}`, true);
  }, [driving, jailed, arrest, life, pursuit?.stage, updateLife, say, rules.police]);
  /** Commit an offence from the rulebook and tell the player where it leaves them. */
  const offend = useCallback((offence: Offence, lead = "") => {
    if (jailed) return;
    if (WORLD_RULES.police === "off") { if (lead) say(`${lead} The police are switched off in this world.`); return; }
    updateLife(l => commit(l, Date.now(), offence));
    const next = Math.min(5, life.stars + (offence === "shoplifting" || offence === "trespass" ? 2 : offence === "car-theft" ? 3 : 1));
    say(`${lead ? lead + " " : ""}${warningFor({ ...life, stars: next })}`, true);
  }, [jailed, life, updateLife, say]);
  const driveCar = (car: string | null) => {
    if (!outdoors) { say("Head outside to take a car from your garage."); return; }
    if (car) {
      const spot = motorwayCarArrival(map, nearestDrivingSpot(map, PLAYER, TRAFFIC_BOXES.filter((vehicle): vehicle is NonNullable<typeof vehicle> => Boolean(vehicle))));
      if (!spot) { say("Move closer to a clear road before taking your car out."); return; }
      setArrive(spot);
      setDriving(car);
      setBike(null);
      setDealer(false);
      say("Car ready. Keep left, stop at red lights and give way at crossings. Road offences add wanted stars.", true);
    } else {
      if (mapId === "m25") { say("Leave the motorway at a signed exit before parking."); return; }
      const spot = nearestParkingSpot(map, PLAYER);
      if (!spot) { say("Pull up beside a pavement before getting out."); return; }
      setDriving(null);
      setArrive(spot);
      setDealer(false);
    }
  };
  // Hop-on bus: choose anywhere on the map and the bus drives you there.
  const [busPick, setBusPick] = useState(false);
  const [coachTrip, setCoachTrip] = useState(false);
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
    if (process.env.NODE_ENV === "development") (window as unknown as { __game?: unknown }).__game = { PLAYER, PLAYER_WORK, AUTOPILOT, interview: (stars = 2, charge = "Shoplifting from a high-street shop") => setInterview({ stars, charge, area: "Fountain Square" }), wipe: (label: string) => { setSceneName(label); setFading(true); window.setTimeout(() => setFading(false), 1500); }, work: (id: string) => setWork(id), network: (venue = "town-hall") => setNetworking(venue) };
  }, []);
  useEffect(() => {
    // Local debugging only: start a hop-on bus trip from an automated walkthrough.
    if (process.env.NODE_ENV === "development") {
      const w = window as unknown as { __hop?: unknown; __coach?: unknown; __busTrip?: unknown; __talk?: unknown };
      w.__hop = (x: number, y: number) => hopOn({ id: "dev", name: "Test stop", kind: "landmark", x: x * TILE, y: y * TILE } as Place);
      w.__coach = () => setCoachTrip(true);
      w.__busTrip = () => setBusJourney({ t: { kind: "stop", id: BUS_STOPS[3].id, name: BUS_STOPS[3].name } as BusTrip, revised: false, from: BUS_STOPS[0].name });
      w.__talk = () => setConversation({ id: "city:resident:dev-1", name: "Amara B." });
    }
  }, [hopOn]);
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
  const lobby = useLobby(server && map.kind !== "home" ? { map: mapId, server } : null, me.id);

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
    // Play World goes straight into the game: join the busiest server in your region.
    // The server list is still one tap away from "Change server".
    setServer((current) => current ?? SERVERS.find((x) => x.region === r)?.id ?? SERVERS[0]?.id ?? null);
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
  const goTo = useCallback(async(dest: string, label: string, spot?: { x: number; y: number }) => {
    if(transitionPending())return;
    const next = loadMap(dest, offices, me.id);
    if (!next) return;
    if (life.hearing?.streetCase && !canHearStreetCase(life.hearing.streetCase,life.hearing.custody) && streetCustody?.stage !== "transport" && map.kind !== "court" && dest !== "hospital") { say("The officers need to complete the street incident first."); return; }
    const motorwayCar = dest === "m25" ? driving ?? cars.find(id => carById(id)) : null;
    if (dest === "m25" && !motorwayCar) { say("Take a car from your garage before joining the motorway."); return; }
    const arrival = motorwayCar ? motorwayCarArrival(next, nearestDrivingSpot(next, spot ?? next.spawn)) : spot ?? next.spawn;
    if (!arrival) return;
    setBike(null);
    setDriving(motorwayCar ?? null);
    setGames(false); setPhone(false); setHousing(false); setStudy(false); setInmate(null); setLearning(false); setAwardsOpen(false);
    setShop(null); setWork(null); setTube(null); setBus(null); setMapOpen(false); setUKRoadsOpen(false);
    setDealer(false); setDock(false); setDesk(false); setBankOpen(false); setRoom(null);
    if(!await beginTransition(dest,label,false,motorwayCar||driving?"car":undefined))return;
    setSceneName(label);setFading(false);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setArrive(arrival);setMapId(dest);setTrip(n=>n+1);
  }, [offices, me.id, cars, driving, say, life.hearing, streetCustody?.stage, map.kind, beginTransition, transitionPending]);
  useEffect(() => { if (process.env.NODE_ENV === "development") (window as unknown as { __tp?: unknown }).__tp = (x: number, y: number) => void goTo("city", "Dev", { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }); }, [goTo]);

  useEffect(() => {
    if (!roadDestination) return;
    if (mapId === roadDestination) {
      setRoadDestination(null); setWaypoint(null);
      say(`Welcome to ${ukSceneName(mapId)}. Explore the neighbourhood or plan a return route.`, true);
      return;
    }
    const gate = nextUKPortal(map, roadDestination);
    if (gate) setWaypoint({ id: gate.id, name: gate.label, kind: "view", x: gate.rect.x + gate.rect.w / 2, y: gate.rect.y + gate.rect.h / 2 });
  }, [map, mapId, roadDestination, say]);

  const guideUKRoad = (destination: string) => {
    if (jailed || life.stars >= POLICE_STARS) { say("Finish your current law activity first."); return; }
    const gate = nextUKPortal(map, destination);
    if (!gate) { say("Return to a city street to start this route."); return; }
    setUKRoadsOpen(false); setRoadDestination(destination);
    setWaypoint({ id: gate.id, name: gate.label, kind: "view", x: gate.rect.x + gate.rect.w / 2, y: gate.rect.y + gate.rect.h / 2 });
    say(`Route to ${ukSceneName(destination)} ready. Follow the marker, then interact at the exit.`, true);
  };

  const streetCase = useCallback((assessment:StreetAssessment) => {
    if (jailed) { if(assessment.kind === "aggression") { updateLife(l=>({...l,jailUntil:l.jailUntil+15000})); say("A guard witnessed the scuffle. Fifteen seconds added. Use the study desk or walk away.", true); } return; }
    if (assessment.caseFile) {
      pendingStreetCase.current=assessment;
      updateLife(l=>({...l,hearing:{stars:assessment.caseFile!.stars,charge:assessment.caseFile!.charge,streetCase:assessment.caseFile!}}));
    }
    say(assessment.message,true);
  },[updateLife,say,jailed]);
  const street = useStreetEncounters(map.kind !== "home" && (!creatorChannel||studioFloating) && !conversation && !missionScene && !dailyBusy && !mobileWork && !ukRoadsOpen && mapId !== "m25" && mapId !== "rotherhithe" && !panic && !custody && !menu && !housing && !eventGame && !networking && !interview && !flightModal && !flying && !rescue && !driving && !tutorial && !phone && !fading && !life.hearing && !arrest && !journey && !policeTransport && !liveTransfer && !mapOpen && !safety && !work && !study && !learning && !games && !dealer && !bankOpen && !ventureOpen, streetCase, () => {
    setBike(null);setDriving(null);setRescue(true);setPhone(false);setSafety(false);
  });
  useEffect(()=>{if(process.env.NODE_ENV!=="production")(window as unknown as {__panic?:(id:string)=>void}).__panic=(id)=>setPanic(id);},[]);
  // Outdoors, the rescue plays live on the road beside you (and everyone in the room sees it).
  const [liveRescue,setLiveRescue]=useState<string|null>(null);
  const arriveFromRescue=useCallback(()=>{setMedicalCustody(jailed);doActivity("hospital");updateLife(l=>({...l,sick:false}));setRescue(false);setLiveRescue(null);RESCUES.delete("me");goTo("hospital","Ambulance arrival · St Tomas’ Hospital");},[jailed,updateLife,goTo]);
  // A crash in the last few seconds means the rescue starts with the impact and the wreck stays on the road.
  const lastCrash=useRef<{at:number;car:string|null;x?:number;y?:number;heading?:number|null}>({at:0,car:null});
  const drivingNow=useRef(driving);drivingNow.current=driving;
  useEffect(()=>{if(process.env.NODE_ENV!=="production"){const w=window as unknown as {__rescue?:(car?:string)=>void;__arrest?:()=>void};w.__rescue=(car)=>{if(car)lastCrash.current={at:Date.now(),car};setBike(null);setDriving(null);setRescue(true);};w.__arrest=()=>{transportStars.current=4;setDriving(null);setPoliceTransport(true);};}},[]);
  const [rescueCause,setRescueCause]=useState<{kind:"crash"|"collapse";key:number}|null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const liveRoad=useMemo(()=>rescue&&outdoors?rescuePlan(map,PLAYER.x,PLAYER.y,(a,b)=>roadRoute(map,a,b)):null,[rescue]);
  useEffect(()=>{
    const road=liveRoad;
    if(!road)return;
    const crashed=Date.now()-lastCrash.current.at<8000;
    const wreck=crashed&&lastCrash.current.car&&!lastCrash.current.car.startsWith("bus:")?lastCrash.current.car:null;
    setRescueCause({kind:crashed?"crash":"collapse",key:Date.now()});
    const at=lastCrash.current;
    const plan={...road,wreck,...(wreck&&Number.isFinite(at.x)&&Number.isFinite(at.y)?{wreckX:at.x,wreckY:at.y,wreckHeading:Number.isFinite(at.heading)?at.heading:null}:{})};
    RESCUES.set("me",{startedAt:performance.now(),...plan});
    window.dispatchEvent(new CustomEvent("illumed:rescue-start",{detail:{...plan,elapsed:0}}));
    const hospital=road.toHospital?"St Tomas' Hospital":"hospital";
    const steps:[number,string][]=[[0,crashed?"You crashed! Stay still. Someone has called 999.":"You collapsed. Someone has called 999."],[2500,"Blue lights: the ambulance is racing to you."],[10000,"Paramedics are lifting you onto the stretcher."],[14000,`Sirens on: heading to ${hospital}.`]];
    const timers=steps.map(([at,text])=>window.setTimeout(()=>setLiveRescue(text),at));
    const done=window.setTimeout(arriveFromRescue,LIVE_RESCUE_MS+200);
    const clearCause=window.setTimeout(()=>setRescueCause(null),4500);
    return()=>{timers.forEach(clearTimeout);clearTimeout(done);clearTimeout(clearCause);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[liveRoad]);
  // Indoors there's no street for the ambulance: the paramedics carry you out and you wake up in hospital.
  useEffect(()=>{if(!rescue||liveRoad)return;setLiveRescue("Paramedics are carrying you out to the ambulance.");const t=window.setTimeout(arriveFromRescue,1600);return()=>clearTimeout(t);},[rescue,liveRoad,arriveFromRescue]);
  useEffect(()=>{if(needs && needs.energy<=12 && !rescue && map.kind !== "hospital" && !fading){setRescue(true);setBike(null);setDriving(null);}},[needs,map.kind,rescue,fading]);
  useEffect(() => {
    let last = 0;
    const crash = (event: Event) => {
      const now = Date.now(); if (now - last < 2500 || rescue) return; last = now;
      const damage = (event as CustomEvent<{ damage: number }>).detail?.damage;
      if (!Number.isFinite(damage) || damage <= 0) return;
      const onBike = Boolean((event as CustomEvent<{ bike?: string }>).detail?.bike);
      // Remember exactly where and which way the vehicle came to rest, so the wreck stays put.
      lastCrash.current = PLAYER_VEHICLE.active
        ? { at: now, car: onBike ? "bike" : drivingNow.current, x: PLAYER_VEHICLE.x, y: PLAYER_VEHICLE.y, heading: PLAYER_VEHICLE.heading }
        : { at: now, car: onBike ? "bike" : drivingNow.current, x: PLAYER.x, y: PLAYER.y, heading: null };
      damageEnergy(Math.min(55, damage));
      if (onBike) { setBike(null); setRescue(true); return; }
      say("Collision · check on others, stop safely and exchange details. Your condition has dropped.", true);
    };
    window.addEventListener("illuminated:vehicle-crash", crash);
    return () => window.removeEventListener("illuminated:vehicle-crash", crash);
  }, [rescue, say]);
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
      ...CITY.portals.flatMap(portal=>portal.to.kind==="map"&&portal.to.mapId.startsWith("university-")?[{id:portal.id,label:portal.label,mapId:"city",x:portal.rect.x/TILE,y:portal.rect.y/TILE}]:[]),
      { id: "study", label: "Study Quarter", mapId: "study-lobby", x: 10, y: 10 },
      { id: "home", label: "Your home", mapId: "home", x: 10, y: 10 },
      { id: "hospital-front", label: "London · Hospital entrance", mapId: "city", x: 61, y: 34 },
      { id: "hospital", label: "St Tomas’ Hospital", mapId: "hospital", x: 13, y: 8 },
      { id: "court", label: "Crown Court", mapId: "court", x: 11, y: 8 },
      { id: "prison", label: "HMP Thames", mapId: "prison", x: 15, y: 12 },
      ...UK_SCENES.map(id => { const scene = ukWorldMap(id)!; return { id: `uk-${id}`, label: ukSceneName(id), mapId: id, x: scene.spawn.x / TILE, y: scene.spawn.y / TILE }; }),
      ...offices.map(office => ({ id: `office-${office.slug}`, label: `${office.name} · Office`, mapId: `office-${office.slug}`, x: 10, y: 10 })),
      ...WORKPLACES.map(workplace => ({ id: `workplace-${workplace.id}`, label: `${workplace.name} · Workplace`, mapId: `workplace-${workplace.id}`, x: 10, y: 10 })),
      ...CITY.portals.filter(portal => portal.to.kind === "map" && portal.to.mapId.startsWith("station-")).map(portal => portal.to.kind === "map" ? ({ id: portal.to.mapId, label: `${portal.label} · Station`, mapId: portal.to.mapId, x: 14, y: 3 }) : null).filter((place): place is TeleportDestination => place !== null),
    ];
    return places;
  }, [offices]);

  useEffect(() => {
    if (!life.hearing || rescue || fading || custody) return;
    if (life.hearing.streetCase && !canHearStreetCase(life.hearing.streetCase,life.hearing.custody)) {
      if (mapId === "court") goTo("city","Police response pending");
      return;
    }
    if (mapId !== "court") goTo("court", "Crown Court");
  }, [life.hearing, rescue, mapId, fading, goTo, custody]);

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

  // Out of your room onto the hotel gallery, at your door.
  const leaveHotelRoom = useCallback((hotel: string, room: string) => {
    const door = roomInfo(room)?.door.x ?? 11;
    ARRIVE_LEVEL.level = 1;
    play("door", soundOn());
    void goTo(hotel, "Hotel gallery", { x: (door + 0.5) * TILE, y: 2.4 * TILE });
  }, [goTo]);
  // When a stay ends, the key card stops working: you're shown back out to the corridor.
  useEffect(() => {
    const stay = parseRoomMap(mapId);
    if (!stay) return;
    const check = () => {
      // Preview builds can look round a room without a booking.
      if (process.env.NODE_ENV !== "production" && (() => { try { return localStorage.getItem("illuminated:dev-hotel") === "1"; } catch { return false; } })()) return;
      if (hotelBooking && hotelBooking.hotel === stay.hotel && hotelBooking.room === stay.room && Date.parse(hotelBooking.check_out) > Date.now()) return;
      say("Your stay has ended. Thanks for staying with us!");
      leaveHotelRoom(stay.hotel, stay.room);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [mapId, hotelBooking, leaveHotelRoom, say]);
  useEffect(()=>{const on=(e:Event)=>{const t=(e as CustomEvent<string>).detail;if(t)say(t,true);};window.addEventListener("illumed:say",on);return()=>window.removeEventListener("illumed:say",on);},[say]);
  /** Everything you can do around the prison. */
  const prisonAction = useCallback((action: string, to: { desk?: string; loot?: string; job?: string }) => {
    const now = Date.now();
    const show = (o: { message: string; ok: boolean; escape?: string } | null) => { if (o?.message) say(o.message, !o.ok); return o; };
    let out: ReturnType<typeof runPrison> = null;
    if (action === "craft") { setPrisonPanel("desk"); return; }
    if (action === "shop") { setPrisonPanel("trader"); return; }
    if (action === "jobs") { setPrisonPanel("jobs"); return; }
    if (action === "search") out = runPrison(s => searchDesk(s, now, to.desk ?? "desk", (to.loot ?? "inmate") as "inmate", Math.random));
    else if (action === "gym" || action === "library") out = runPrison(s => trainStat(s, now, action));
    else if (action === "work") out = prisonRef.current?.job === to.job ? runPrison(s => doJob(s, now, Math.random)) : (say(`This is the ${to.job} job. Apply on the job board in the library.`), null);
    else if (action === "dig") out = runPrison(s => dig(s, now, Math.random));
    else if (action === "cover") out = runPrison(s => coverHole(s));
    else if (action === "vent") out = runPrison(s => vent(s, now));
    else if (action === "fence") out = runPrison(s => cutFence(s, now, Math.random));
    else if (action === "key") out = runPrison(s => takeKeyImpression(s, now, Math.random));
    else if (action === "gate" || action === "escape") out = runPrison(s => frontGate(s));
    show(out);
    if (out?.escape) { releaseReason.current = "escaped"; updateLife(l => escapeFromPrison(l, Date.now())); }
  }, [runPrison, say, updateLife]);
  const onPortal = useCallback(
    async(portal: Portal) => {
      if(transitionPending())return;
      const to = portal.to;
      if (portal.id === "patrol-desk") {
        if (life.stars > 0 || jailed) { say("You can't sign on for patrol while you're wanted."); return; }
        setPatrol(true); say("Signed on as a Special Constable. Uniform on: head out and respond to incidents.", true); return;
      }
      if (life.hearing?.streetCase && !canHearStreetCase(life.hearing.streetCase,life.hearing.custody) && map.kind !== "hospital") { say("Wait for the officers to finish responding to the incident."); return; }
      if (to.kind === "home-use") {
        const placed = map.layout?.find(item => item.key === to.key);
        // A computer at home: open the web browser.
        if (placed?.item === "pc-desk") { setBrowser("start"); return; }
        const furniture = placed && furnitureById(placed.item);
        if (placed && furniture) {
          const use = homeUse(placed.item);
          const sofa = use.animation === "watch" ? map.layout?.find(p => (furnitureById(p.item)?.design ?? p.item) === "sofa") : undefined;
          const sofaSize = sofa && furnitureById(sofa.item);
          setHomeAction({ ...use, item: placed.item, x: placed.x, y: placed.y, w: furniture.w, h: furniture.h, started: performance.now(), seat: sofa && sofaSize ? { x: sofa.x, y: sofa.y, w: sofaSize.w, h: sofaSize.h } : undefined });
        }
        return;
      }
      if(jailed&&medicalCustody&&mapId==="hospital"&&to.kind==="map"){setMedicalCustody(false);goTo("prison","Medical discharge · return to your cell");return;}
      if (jailed && to.kind !== "prison" && !(medicalCustody&&mapId==="hospital"&&to.kind==="doctor")) { say("Find the study desk or explore the prison first."); return; }
      if (to.kind === "guide") {
        if (to.guide === "study") setLearning(true);
        else if (to.guide === "transport") setTube(map.id.slice("station-".length));
        else router.push("/games/careers");
        return;
      }
      if (to.kind === "venture") {setVentureOpen(true);return;}
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
        else prisonAction(to.action, to);
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
        const params = new URLSearchParams({ returnTo: `${developerTeleport ? "/games/city-showcase" : "/games/world"}?${returnParams}` });
        // Played right here on the floor (musical colours), not on a separate page.
        void params;
        setPanic(to.companyId);
      }
      else if (to.kind === "link") {
        if (to.href === "/learn") doActivity("study");
        // Games open as a pop-up right here instead of leaving the world.
        if (to.href === "/games" || to.href === "/games/hub" || to.href === "/games/arcade") setGames(true);
        else if (to.href.startsWith("/games/hub?game=")) { setGamesStart(to.href.split("=")[1]); setGames(true); }
        else if (to.href === "/coach") setCoachTrip(true);
        else if (to.href === "/games/racing") setEventGame("racing");
        else if (to.href === "/games/championship") setEventGame("championship");
        else if (to.href === "/games/what-if") setEventGame("what-if");
        else router.push(to.href);
      } else if (to.kind === "lift") setLift(to.floors);
      else if (to.kind === "hotel-desk") setHotelDesk(to.hotel);
      else if (to.kind === "hotel-leave") leaveHotelRoom(to.hotel, to.room);
      else if (to.kind === "hotel-room") {
        const mine = hotelBooking && hotelBooking.hotel === to.hotel && hotelBooking.room === to.room && Date.parse(hotelBooking.check_out) > Date.now();
        if (mine) { play("door", soundOn()); void goTo(roomMapId(to.hotel, to.room), `Room ${to.room}`); }
        else say(hotelBooking && hotelBooking.hotel === to.hotel ? `That's not your room. Yours is ${hotelBooking.room}.` : `Room ${to.room} is locked. Book a room at reception for a key card.`);
      }
      else if (to.kind === "bus") setBus(to.stop);
      else if (to.kind === "act") {
        play("door", soundOn());
        doActivity(to.activity);
        void gainXp(to.activity);
        say({sleep:"Rested and recharged",eat:"Meal enjoyed",study:"Focus restored",hike:"Fresh air break complete"}[to.activity]);
      }
      else if (to.kind === "desk") {setDesk(true);}
      else if (to.kind === "tube") {
        if (map.kind === "station") {
          if (!RIDE.active && !canBoardTrain(performance.now() - TRAIN_CALL.at, map.cols, PLAYER.x / TILE, PLAYER.y / TILE)) return;
          boardedStation.current = map.id;
          // You're on board: you stay in the carriage, free to walk about, until you get off.
          if (!RIDE.active) Object.assign(RIDE, { active: true, phase: "boarded", at: performance.now(), rel: PLAYER.x / TILE - trainStop(map.cols), dest: "" });
        }
        setTube(to.station);
      }
      else if (to.kind === "university") setUniversity({id:to.university,topic:to.topic});
      else if (to.kind === "networking") setNetworking(to.venue);
      else if (to.kind === "work") {goTo(`workplace-${to.workplace}`, workplaceById(to.workplace)?.name ?? "Workplace");}
      else if (to.kind === "workstation" && map.id === `workplace-${to.workplace}`) {setWorkStation(to.station);setWork(to.workplace);}
      else if (to.kind === "bike") {setDock(true);}
      else if (to.kind === "games") {setGames(true);}
      else if (to.kind === "dealer") setBrowser("autohub");
      else if (to.kind === "shop") setShop(to.shop);
      else if (to.kind === "doctor") {
        play("door", soundOn());
        doActivity("hospital");
        updateLife((l) => ({ ...l, sick: false }));
        say("The doctor sorted you out. Feeling much better.", true);
      } else if (to.kind === "map") {
        if (to.mapId === "m25" && !driving) { say("Take a car from your garage on AutoHub before joining the motorway.", true); setBrowser("autohub"); return; }
        const next = loadMap(to.mapId, offices, me.id);
        if (!next) return;
        const roadLink = isUKScene(mapId) || isUKScene(to.mapId) || mapId.startsWith("uk-home-") || to.mapId.startsWith("uk-home-");
        const keepCar = Boolean(driving) && (to.mapId === "city" || isUKScene(to.mapId));
        const roadArrival = roadLink ? roadTransitionArrival(next, mapId, portal.id, keepCar) : null;
        if (keepCar && roadLink && !roadArrival) { say("This exit needs a clear road. Park your car first."); return; }
        if (to.mapId !== "city" && !isUKScene(to.mapId)) setBike(null);
        if (next.kind !== "city") setDriving(null);
        // Arrive outside the door that leads back to where you came from.
        const back = next.portals.find((p) => p.to.kind === "map" && p.to.mapId === mapId);
        const spot = roadArrival ?? (back
          ? safeSpot(next, back.rect.x + back.rect.w / 2, back.rect.y + (back.rect.y + back.rect.h >= next.height - 4 ? -24 : back.rect.y > next.height / 2 ? -50 : back.rect.h + 50))
          : next.spawn);
        if(!await beginTransition(to.mapId,to.label,map.kind!=="city"||next.kind!=="city"))return;
        if(map.kind!=="city"||next.kind!=="city")play("door",soundOn());
        setSceneName(to.label);setFading(false);setDesk(false);
        if(fadeTimer.current)clearTimeout(fadeTimer.current);
        setArrive({...spot,speed:keepCar?Math.min(Math.abs(PLAYER_VEHICLE.speed),isMotorway(to.mapId)?660:220):0});setMapId(to.mapId);setTrip(n=>n+1);
      }
    },
    [router, offices, mapId, map, me.id, updateLife, say, jailed, prisonAction, gainXp, goTo, server, flight, driving, developerTeleport, life.hearing, life.stars, medicalCustody, beginTransition, transitionPending, hotelBooking, leaveHotelRoom],
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
  // Station to court, and court to prison: you're walked out in cuffs and driven there live.
  const stationSteps = useMemo(() => {
    const p = CITY.portals.find((q) => q.id === "police-station");
    return p ? safeSpot(CITY, p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h + 40) : undefined;
  }, []);
  useEffect(() => {
    if (!liveTransfer || liveTransfer.ready || mapId !== "city") return;
    // Give the world a moment to place you on the steps before the car is sent.
    const t = window.setTimeout(() => setLiveTransfer((l) => (l ? { ...l, ready: true } : l)), 900);
    return () => clearTimeout(t);
  }, [liveTransfer, mapId]);
  const takeIntoCustody = useCallback(() => { setTrialSolicitor(false); setCustody({ stage: "van", until: 0, solicitor: false }); }, []);
  // Tell the room your wanted stars and whether you're on patrol (and keep newcomers up to date).
  useEffect(() => {
    const send = () => window.dispatchEvent(new CustomEvent("illumed:law", { detail: { stars: life.stars, police: patrol } }));
    send();
    const t = setInterval(send, 12_000);
    return () => clearInterval(t);
  }, [life.stars, patrol, mapId]);
  useEffect(() => { if (patrol && life.stars > 0) { setPatrol(false); say("You can't stay on patrol after breaking the law. You've been signed off.", true); } }, [patrol, life.stars, say]);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __law?: unknown };
    w.__law = { patrol: () => setPatrol(true), custody: (charge = "Shoplifting from a high-street shop") => { updateLife((l) => ({ ...l, hearing: { stars: 3, charge } })); takeIntoCustody(); }, trial: (charge = "Shoplifting from a high-street shop") => { updateLife((l) => ({ ...l, hearing: { stars: 3, charge } })); goTo("court", "Crown Court"); } };
  }, [updateLife, takeIntoCustody, goTo]);
  // Another player on patrol has arrested you.
  useEffect(() => {
    const on = (e: Event) => {
      const by = (e as CustomEvent<{ by: string }>).detail.by;
      if (life.stars < POLICE_STARS || jailed || custody || arrest || life.hearing) return;
      say(`Officer @${by} has arrested you.`, true);
      pursuitRef.current = null; setPursuit(null);
      setArrest(true);
      arrestTimer.current = setTimeout(() => {
        setArrest(false);
        updateLife((l) => ({ ...clearWanted(l), hearing: { stars: l.stars, charge: wantedCharge(l) } }));
        takeIntoCustody();
      }, 1700);
    };
    window.addEventListener("illumed:arrested", on);
    return () => window.removeEventListener("illumed:arrested", on);
  }, [life, jailed, custody, arrest, say, updateLife, takeIntoCustody]);
  // Handcuffed while arrested, in the van and being booked in.
  useEffect(() => {
    const cuffed = arrest || policeTransport || custody?.stage === "van" || custody?.stage === "booking" || custody?.stage === "transport" || streetCustody?.stage === "arresting" || streetCustody?.stage === "transport";
    PLAYER_WORK.activity = cuffed ? "cuffed" : PLAYER_WORK.activity === "cuffed" ? null : PLAYER_WORK.activity;
  }, [arrest, policeTransport, custody?.stage, streetCustody?.stage]);
  // The holding cell timer, then the van to court.
  useEffect(() => {
    if (custody?.stage !== "cell") return;
    const t = window.setTimeout(() => setCustody((c) => (c ? { ...c, stage: "transport" } : c)), Math.max(0, custody.until - Date.now()));
    return () => clearTimeout(t);
  }, [custody]);

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

  // A street allegation stays on the street until real officers have reached the participants.
  useEffect(() => {
    const file = life.hearing?.streetCase;
    if (!file || canHearStreetCase(file,life.hearing?.custody)) { setStreetCustody(null); return; }
    if (rescue || jailed) return;
    setStreetCustody(current => current?.caseId === file.id ? current : beginStreetCustody(file,Date.now()));
  }, [life.hearing,outdoors,rescue,jailed]);
  useEffect(() => {
    STREET_CUSTODY.npcId = streetCustody?.npcId ?? null;
    STREET_CUSTODY.stage = streetCustody?.stage ?? null;
    STREET_CUSTODY.both = Boolean(streetCustody?.participants.includes("civilian"));
    return () => { STREET_CUSTODY.npcId=null; STREET_CUSTODY.stage=null; STREET_CUSTODY.both=false; };
  }, [streetCustody]);
  useEffect(() => {
    if (!streetCustody || rescue || jailed) return;
    if (streetCustody.stage === "arresting") {
      const timer = setTimeout(() => setStreetCustody(current => current ? advanceStreetCustody(current,Date.now(),true) : current),Math.max(0,3000-(Date.now()-(streetCustody.arrestedAt??Date.now()))));
      return () => clearTimeout(timer);
    }
    if (streetCustody.stage !== "responding") return;
    const timer = setInterval(() => {
      let current = pursuitRef.current ?? startPursuit(map,PLAYER);
      if (current.escaped) current=startPursuit(map,PLAYER);
      const traffic=TRAFFIC_BOXES.filter((box):box is NonNullable<typeof box>=>Boolean(box));
      const next=tickPursuit(current,map,PLAYER,Date.now(),.2,traffic,false);
      const contact=next.stage === "tased" || next.officers.some(officer=>Math.hypot(officer.x-PLAYER.x,officer.y-PLAYER.y)<TILE*.8);
      const displayed=contact?{...next,stage:"challenge" as const}:next;
      pursuitRef.current=displayed;setPursuit(displayed);
      if(contact)setStreetCustody(state=>state?advanceStreetCustody(state,Date.now(),true):state);
    },200);
    return () => clearInterval(timer);
  }, [streetCustody,rescue,outdoors,jailed,map]);

  // Re-route responders from the new entrance when a suspect changes scene.
  useEffect(()=>{pursuitRef.current=null;setPursuit(null);},[mapId]);

  // Police catch the player with a brief taser stop before the challenge or escort.
  useEffect(() => {
    if (life.hearing?.streetCase) return;
    if (life.stars < policeStars || jailed || life.hearing) {
      pursuitRef.current = null; setPursuit(null); return;
    }
    if (arrest || policeTransport || rescue || liveTransfer) return;
    const timer = setInterval(() => {
      const current = pursuitRef.current ?? startPursuit(map, PLAYER);
      const traffic = TRAFFIC_BOXES.filter((box): box is NonNullable<typeof box> => Boolean(box));
      if (PLAYER_VEHICLE.active) { const horizontal = Math.abs(Math.cos(PLAYER_VEHICLE.heading)) >= Math.abs(Math.sin(PLAYER_VEHICLE.heading)); traffic.push({ id: "player", x: PLAYER_VEHICLE.x, y: PLAYER_VEHICLE.y, hw: TILE * (horizontal ? PLAYER_VEHICLE.length : PLAYER_VEHICLE.width) / 2, hh: TILE * (horizontal ? PLAYER_VEHICLE.width : PLAYER_VEHICLE.length) / 2, dx: 0, dy: 0 }); }
      const next = tickPursuit(current, map, PLAYER, Date.now(), 0.2, traffic, PLAYER_VEHICLE.active);
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
  }, [life.stars, life.hearing, jailed, outdoors, mapId, map, arrest, policeTransport, rescue, updateLife, say, policeStars, liveTransfer]);

  useEffect(() => {
    if (jailed && (life.prisonWork >= 3 || Date.now() >= life.jailUntil)) {
      updateLife(l=>releaseFromPrison(l)); return;
    }
    if (jailed && mapId === "court" && !liveTransfer) { setLiveTransfer({ destination: "prison", ready: false }); void goTo("city", "Taken down in cuffs", courtSteps); return; }
    if (jailed && mapId !== "prison" && !rescue && !liveTransfer && !(medicalCustody && mapId === "hospital")) goTo("prison", "HMP Thames");
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
  }, [jailed, life, mapId, goTo, say, courtSteps, updateLife, rescue, medicalCustody, liveTransfer]);

  useEffect(() => {
    if (!jailed || mapId !== "prison" || study || inmate) return;
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - guardCaughtAt.current > 6000 && !(prisonRef.current && hasItem(prisonRef.current, "guard-uniform")) && caughtByPrisonGuard(map, PLAYER, now/1000)) {
        guardCaughtAt.current = now;
        updateLife(l=>({...l,jailUntil:Math.max(l.jailUntil,now)+45000}));
        runPrison(s => ({ ...s, heat: Math.min(100, s.heat + 30) }));
        say("A guard caught you in a staff area. 45 seconds added and your heat went up.", true);
        goTo("prison", "Back to your cell");
      }
    }, 250);
    return () => clearInterval(timer);
  }, [jailed, mapId, map, study, inmate, updateLife, say, goTo, runPrison]);

  // The prison routine: attendance, missed periods, lockdowns, cell searches, the detector, solitary.
  useEffect(() => {
    if (!jailed || mapId !== "prison") return;
    let lastPeriod = "", inDetector = false, last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(), s = prisonRef.current;
      if (!s) return;
      const here = prisonRoomAt(PLAYER.x / TILE, PLAYER.y / TILE, s.job);
      setPrisonHere(here.name);
      const { period } = prisonClock(now);
      // Solitary: you stay in the solitary block until it's over.
      if (s.solitaryUntil > now) {
        if (here.id !== "solitary") void goTo("prison", "Solitary confinement", { x: 31.5 * TILE, y: 15 * TILE });
        return;
      }
      runPrison(p => coolHeat(attend(p, now, here.room).state, now - last));
      last = now;
      const judged = runPrison(p => { const j = judgePrevious(p, now); return { state: j.state, message: j.missed ? `${j.missed.name} missed` : "", ok: !j.lockdown }; });
      if (judged && !judged.ok) { say("LOCKDOWN! You missed a roll call. Off to solitary.", true); runPrison(p => sendToSolitary(p, now)); return; }
      if (judged?.message) say(`You skipped ${judged.message.replace(" missed", "").toLowerCase()}. Heat went up.`);
      if ((prisonRef.current?.heat ?? 0) >= 100) { say("Your heat hit the maximum. The guards put you in solitary.", true); runPrison(p => sendToSolitary(p, now)); return; }
      // A cell search can happen when roll call starts and your heat is high.
      if (period.id !== lastPeriod) {
        if (lastPeriod && period.strict) { const found = runPrison(p => cellSearch(p, Math.random) ?? p); if (found?.message) say(found.message, true); }
        lastPeriod = period.id;
      }
      // The metal detector on the way to the yard.
      const nowIn = here.id === "detector";
      if (nowIn && !inDetector) { const d = runPrison(p => detector(p)); if (d?.message) say(d.message, !d.ok); }
      inDetector = nowIn;
    }, 500);
    return () => clearInterval(timer);
  }, [jailed, mapId, runPrison, say, goTo]);

  // Someone near you on the street (for the Shove button).
  useEffect(() => {
    if (map.kind === "home") return setNearPerson(false);
    const t = setInterval(() => setNearPerson(NPC_SPOTS.some((n) => /:resident:/.test(n.id??"") && Math.hypot(n.x - PLAYER.x, n.y - PLAYER.y) < 52)), 300);
    return () => clearInterval(t);
  }, [map.kind]);
  const fight = useCallback(() => {
    if (rescue) return;
    if (!street.defend()) setSafety(true);
  }, [rescue,street]);
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
        if (RIDE.active && map.kind === "station") {
          // The real thing: the doors close, the train pulls out with you on it, through the
          // tunnel and into the next station, where the doors open and you walk off.
          void gainXp("train");
          Object.assign(RIDE, { phase: "departing", at: performance.now(), dest: t.id });
          play("train", soundOn());
          say(`This is a Revision line train to ${st.name}. Stand clear of the closing doors.`);
          window.setTimeout(() => {
            if (!RIDE.active || RIDE.dest !== t.id) return;
            Object.assign(RIDE, { phase: "arriving", at: performance.now() });
            setTunnelBlink(Date.now());
            setArrive({ x: (trainStop(inside.cols) + arriveFrame(0).offset + RIDE.rel) * TILE, y: PLAYER.y });
            setMapId(`station-${t.id}`);
            setTrip((n) => n + 1);
            window.setTimeout(() => say(`${st.name}. Mind the gap between the train and the platform.`), 5000);
            window.setTimeout(() => { if (RIDE.active && RIDE.phase === "arriving") RIDE.phase = "docked"; }, (ARRIVE_DOCK_S + 1) * 1000);
          }, RIDE_SWAP_S * 1000);
          return;
        }
        // The player has already walked into a stopped train before choosing a destination.
        void gainXp("train"); setJourney({
          to: st.name,
          go: async() => {
            if(!await beginTransition(`station-${t.id}`,`Arriving at ${st.name}`,false,"train"))return;
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
        RIDE.active = false;
        dest = t.mapId;
        const next = loadMap(dest, offices, me.id);
        if (!next) return;
        spot = next.spawn;
        setBike(null);
        const arrival=spot;
        setJourney({to:t.label,line:dest==="highlands"?"National Rail":"Revision",go:async()=>{
          if(!await beginTransition(dest,t.label))return;
          setJourney(null);setArrive(arrival);setMapId(dest);setTrip(n=>n+1);
        }});
        play("train",soundOn());
      }
    },
    [offices, me.id, gainXp, map.kind, map.id, beginTransition, say],
  );

  // Preview builds: hop on the train at this station and ride to another one.
  useEffect(()=>{if(process.env.NODE_ENV==="production")return;(window as unknown as {__ride?:(id:string)=>void}).__ride=(id)=>{if(map.kind!=="station")return;Object.assign(RIDE,{active:true,phase:"boarded",at:performance.now(),rel:7.4,dest:""});boardedStation.current=map.id;window.setTimeout(()=>ride({kind:"station",id}),1500);};},[ride,map.kind,map.id]);
  // Riding the bus: to another stop in London, home, or the Careers Campus.
  // Bus trips are shown: board, ride the see-through bus through the streets, step off.
  const [busJourney, setBusJourney] = useState<{ t: BusTrip; revised: boolean; from: string } | null>(null);
  const busRide = useCallback(
    (t: BusTrip, revised: boolean) => {
      setBus(null);
      setBusJourney({ t, revised, from: BUS_STOPS.find((s) => s.id === bus)?.name ?? "Your stop" });
    },
    [bus],
  );
  const busArrive = useCallback(
    (t: BusTrip, revised: boolean) => {
      setBusJourney(null);
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
  const busy = Boolean((passage&&!passage.ready) || (custody && custody.stage !== "cell") || (creatorChannel&&!studioFloating) || conversation || missionScene || mobileWork || ukRoadsOpen || rescue || ventureOpen || housing || eventGame || networking || interview || safety || dailyBusy || Boolean(flightModal) || flying || busPick || coachTrip || Boolean(university) || Boolean(bus || tube || games || tutorial || mapOpen || desk || work || dock || dealer || journey || fading || phone || study || learning || awardsOpen || inmate || shop || homeAction || bankOpen || (life.hearing && !life.hearing.streetCase)) || (streetCustody && streetCustody.stage !== "responding") || arrest || policeTransport || Boolean(liveTransfer) || (!streetCustody && pursuit?.stage === "challenge") || pursuit?.stage === "tased");
  const busyRef = useRef(busy);
  busyRef.current = busy || mobileLife;
  const resumable = !inTutorial && !jailed && !flying && map.kind !== "prison" && map.kind !== "court";
  const remember = useCallback(() => {
    if (!mobileLife && phoneLayout !== null && resumable && Number.isFinite(PLAYER.x) && Number.isFinite(PLAYER.y) && PLAYER.x >= 0 && PLAYER.y >= 0) saveResume(me.id, { map: mapId, name: map.name, x: PLAYER.x, y: PLAYER.y });
  }, [mobileLife, phoneLayout, resumable, me.id, mapId, map.name]);
  useEffect(() => {
    const tick = setInterval(remember, 5000);
    window.addEventListener("pagehide", remember);
    return () => { clearInterval(tick); window.removeEventListener("pagehide", remember); remember(); };
  }, [remember]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // Esc or Backspace opens and closes the pause menu (Backspace only when not typing).
      if ((e.key !== "Escape" && e.key !== "Backspace") || e.defaultPrevented) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]")) return;
      if (busyRef.current) return;
      if (e.key === "Backspace") e.preventDefault();
      setMenu(open => !open);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const leaveGame = () => { remember(); setMenu(false); router.push("/games"); };
  const mobileAction = (action: () => void) => {
    if (jailed || life.stars >= POLICE_STARS || life.hearing || pursuit) {
      say("Finish your current law activity in Explore first.", true);
      return;
    }
    action();
  };
  const returnToLife = () => {
    // A new WorldView starts at this exact position when Explore is reopened.
    setArrive({ x: PLAYER.x, y: PLAYER.y, heading: driving ? PLAYER_VEHICLE.heading : undefined });
    remember();
    setMobileExplore(false);
  };

  if (phoneLayout === null) return <div className="grid h-dvh place-items-center bg-[#f3f4f8] text-[#18202d]" role="status">Opening your world…</div>;

  if (!server && !inTutorial && !mobileLife) {
    return (
      <div className={phoneLayout ? "fixed inset-0 z-[60] h-dvh" : "illumed-pixel-world relative h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh"}>
        <WorldMenu region={region} onRegion={chooseRegion} countFor={(id) => countFor(mapId, id)} username={me.username}
          onJoin={(id, world) => { setWorldInfo(world ?? null); setServer(id); }} />
        {phoneLayout && <button type="button" onClick={() => setMobileExplore(false)} className="absolute top-4 left-4 z-[100003] min-h-11 rounded-full bg-white px-5 font-semibold text-[#0766ed] shadow-lg">← My life</button>}
      </div>
    );
  }

  return (
    <div data-phone-platform={phoneLayout ? "" : undefined} className={phoneLayout ? `${mobileStyles.platform} fixed inset-0 z-[60] h-dvh bg-[#f3f4f8]` : "illumed-pixel-world relative h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh"}>
    {mobileLife && <div inert={busy || menu} aria-hidden={busy || menu ? true : undefined}>
      <MobileLife me={me} job={job} clout={wallet} xp={xpNow} needs={needs}
        currentHome={home.current} ownedHomes={home.owned} quests={quests} courses={studyCourses}
        entries={lifeEntries} time={gameDate} onRecord={recordLife}
        onExplore={() => setMobileExplore(true)}
        onStudy={() => mobileAction(() => setLearning(true))}
        onWork={id => mobileAction(() => setMobileWork(id))}
        onHouses={() => mobileAction(() => { setMobileExplore(true); setBrowser("homefinder"); })}
        onHome={() => mobileAction(() => { setMobileExplore(true); goTo("home", "Your house"); })}
        onAwards={() => setAwardsOpen(true)}
        onArcade={() => mobileAction(() => setGames(true))}
        onGarage={() => mobileAction(() => { setMobileExplore(true); setBrowser("autohub"); })}
        onStudio={()=>{setMobileExplore(true);setStudioFloating(false);setCreatorChannel("tiktok");}} onParty={()=>{setMobileExplore(true);setMapOpen(true);say("Look for Community social on your city map.",true);}}
        onLeave={leaveGame}
      />
    </div>}
    <HudLayout hidden={mobileLife}>
      <GameFeedback playerId={me.id} avatar={me.avatar} floating={mobileLife} onSceneChange={setMissionScene}/>
      {driving && !bus && <CarRadio station={radio} onChange={setRadio} />}
      <SceneMusic station={driving && !bus ? radio : null} scene={
        journey || bus ? "journey"
          : games || eventGame === "racing" || eventGame === "championship" ? "arcade"
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
      {!mobileLife && needs !== null && needs.energy > 0 && !(building && mapId === "home") && <WorldView
        offlinePreview={developerTeleport}
        key={`${mapId}:${server}:${trip}`}
        onNearby={refreshNearby}
        paused={busy || menu || rescue || ventureOpen}
        transitioning={Boolean(passage&&!passage.ready)}
        homeAction={homeAction}
        navigation={navigation}
        police={pursuit}
        map={map}
        serverId={map.kind === "home" || inTutorial || !server ? "solo" : server}
        arriveAt={arrive}
        onPortal={onPortal}
        onRoom={setRoom}
        onChangeServer={() => { if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity before changing servers."); else setServer(null); }}
        onDrivingOffence={drivingOffence}
        ads={events}
        me={jailed || mapId === "prison" ? { ...me, avatar: { ...me.avatar, ...PRISON_LOOK } } : patrol ? { ...me, avatar: { ...me.avatar, top: "top-blocky-police-navy", bottom: "bottom-blocky-police-navy", shoes: "shoes-blocky-police-navy", hat: "hat-cap", held: "held-none" } } : roleShift && ROLE_UNIFORMS[roleShift.role.id] ? {...me,avatar:{...me.avatar,...(ROLE_UNIFORMS[roleShift.role.id] as Partial<typeof me.avatar>)}} : dailyJob ? {...me,avatar:{...me.avatar,...roleOf(dailyJob.workplace,dailyJob.role)?.uniform,...(dailyJob.workplace==="pizzazz"?{top:"top-apron",topColor:"topcol-red",hat:"hat-cap"}:{})}} : gear ? {...me,avatar:{...me.avatar,...gear}} : me}
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
      {building && mapId === "home" && <HomeEditor embedded room={home.room} onClose={() => setBuilding(false)} claimed={home.claimed} avatar={me.avatar} owned={home.owned} current={home.current} layout={home.layout} bought={home.furniture} clout={wallet} />}
      {housing && <HomeMarket claimed={home.claimed} owned={home.owned} current={home.current} clout={wallet}
        onClose={() => setHousing(false)}
        onPurchased={(id, balance) => {
          setHomeChoice(id);
          setNewlyOwnedHomes(homes => [...new Set([...homes, id])]);
          if (balance !== null) setWallet(balance);
          recordLife(`You made the ${homeById(id)?.name ?? "house"} in ${homeById(id)?.area ?? "London"} your home.`);
          router.refresh();
        }}
        onEnterHome={() => { setHousing(false); setMobileExplore(true); goTo("home", "Your house"); }}
      />}
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
      {eventGame && <EventArcade userId={me.id} initial={eventGame} onClose={closeEventGame} onStudyReward={reward=>{
        setWallet(value=>value+reward.clout);
        recordLife(`You completed a study quest and earned ${reward.xp} XP and ${reward.clout} Clout.`);
        router.refresh();
      }} />}
      {games && <GamesHub serverId={server} me={{ id: me.id, username: me.username }} initialGame={gamesStart} onClose={() => { setGames(false); setGamesStart(null); }} onIsland={mapId === "games-island" ? undefined : () => { setGames(false); void goTo("games-island", "Ferry · Games Island"); }} onPlay={(id) => { if (id === "racing" || id === "championship" || id === "what-if") { setGames(false); setEventGame(id); } }} />}
      {learning && <StudyRoom courses={studyCourses} onClose={() => { setLearning(false); router.refresh(); }} onReward={reward => {
        setWallet(value=>value+reward.clout);
        doActivity("study");
        recordLife(`You completed a study session and earned ${reward.xp} XP and ${reward.clout} Clout.`);
        router.refresh();
      }} />}
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
      {driving && outdoors && mapId !== "m25" && (
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
      <HudSlot area="br-nav" order={1}><button type="button" onClick={() => setBrowser("start")} aria-label="Browser: shopping, jobs, hotels, pets and more" title="Browser" className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#15987f] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Globe className="size-4" aria-hidden /> <span className="hidden 2xl:inline">Browser</span>
      </button></HudSlot>
      <HudSlot area="br-nav" order={2}><button type="button" onClick={() => { if(jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setBrowser("worknet"); }} aria-label="Jobs" className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#e4572e] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Briefcase className="size-4" aria-hidden /> <span className="hidden sm:inline">{roleShift ? roleShift.role.title : "Jobs"}</span>
      </button></HudSlot>
      <HudSlot area="br-nav" order={3}><button type="button" onClick={() => { if(jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setGames(true); }} aria-label="Games" title="Games" className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#7a5ce6] px-3 py-1.5 text-xs font-black text-white shadow-lg">
        <Gamepad2 className="size-4" aria-hidden /> <span className="hidden 2xl:inline">Games</span>
      </button></HudSlot>
      <WantedStars stars={life.stars} />
      {street.warning && !rescue && <HudSlot area="tc" order={40}><div role="alert" className="max-w-sm rounded-2xl bg-[#7b342b] px-4 py-3 text-sm font-bold text-white">{street.warning}</div></HudSlot>}

      {liveRescue && <HudSlot area="bc" order={0}><p role="status" className="rounded-full bg-[#c8322d] px-5 py-2.5 text-sm font-black text-white shadow-lg">{liveRescue}</p></HudSlot>}
      {safety && <div className="absolute inset-0 z-[100010] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Choose kindness" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]">
        <h2 className="text-2xl font-black">Pause. Choose kindness.</h2>
        <p className="mt-3">Hitting or pushing can hurt someone and make them feel unsafe. In real life, step back, use calm words and ask a trusted adult for help. Everyone deserves to feel safe.</p>
        <p className="mt-3 text-sm">In this fictional game, choosing to shove brings the police. There is no reward for hurting others.</p>
        <button type="button" className="jelly mt-5 w-full rounded-full bg-[#2b5fd9] px-4 py-3 font-bold text-white" onClick={()=>{setSafety(false);say("Good choice. Give people space and keep the city friendly.",true);}}>Walk away</button>
        <button type="button" className="mt-3 w-full rounded-full border border-[#13203a]/20 px-4 py-2 text-sm" onClick={()=>{setSafety(false);window.dispatchEvent(new Event("illuminated:fight"));}}>Continue with consequences</button>
      </section></div>}
      {outdoors && !jailed && <HudSlot area="tr" order={50} className="hidden sm:block"><EventBanner onOpen={() => setEventGame("events")} className="flex max-w-[220px]" /></HudSlot>}
      {life.sick && <HudSlot area="tc" order={30} className="pointer-events-none"><p className="rounded-full bg-[#c8322d] px-3 py-1 text-xs font-black text-white">Unwell: get medicine or see a doctor</p></HudSlot>}
      {dispute && !disputeOpen && !jailed && !driving && <HudSlot area="br-act" order={0}><button type="button" onClick={()=>setDisputeOpen(dispute)} className="jelly flex min-h-11 items-center gap-2 rounded-full bg-[#15987f] px-4 py-2 text-sm font-bold text-white shadow-lg"><HeartHandshake className="size-4"/>Help calm it down</button></HudSlot>}
      {disputeOpen && <DisputeHelp index={disputeOpen.index} id={disputeOpen.id} onClose={()=>setDisputeOpen(null)} onDone={(firstTry)=>{
        window.dispatchEvent(new CustomEvent("illumed:dispute-help",{detail:{index:disputeOpen.index}}));
        const reward = firstTry ? 25 : 15;
        setWallet(w=>w+reward);
        recordLife(`You calmed down an argument in the street and earned ${reward} Clout.`);
        say(`You helped them sort it out. +${reward} Clout`, true);
        setDisputeOpen(null);
        setDispute(null);
      }}/>}
      {!!nearby.length && !jailed && !driving && <HudSlot area="br-act" order={0}><button type="button" onClick={()=>{setPhoneApp("nearby");setPhone(true);}} className="jelly flex min-h-11 items-center gap-2 rounded-full bg-[#42745e] px-4 py-2 text-sm font-bold text-white shadow-lg"><Users className="size-4"/>Say hello · {nearby.length}</button></HudSlot>}
      {ventureOpen && <div className="absolute inset-0 z-[100008] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6"><div role="dialog" aria-modal="true" aria-label="Venture business" className="my-auto w-full max-w-4xl"><VenturePanel meId={me.id} onClose={()=>setVentureOpen(false)}/></div></div>}
      {creatorChannel&&<CreatorStudio owner={me.id} avatar={me.avatar} channel={creatorChannel} onMinimisedChange={setStudioFloating} onClose={()=>{setStudioFloating(false);setCreatorChannel(null);}}/>}
      <TunnelFlash/>
      <RewardToasts/>
      {tunnelBlink > 0 && <div key={tunnelBlink} aria-hidden className="pointer-events-none fixed inset-0 z-[100003] bg-[#07060b]" style={{ animation: "tunnel-blink 1.4s ease-out forwards" }}><style>{"@keyframes tunnel-blink{0%,45%{opacity:1}100%{opacity:0;visibility:hidden}}"}</style></div>}
      {hotelDesk && <HotelDesk hotel={hotelDesk} booking={hotelBooking} wallet={wallet} onClose={() => setHotelDesk(null)}
        onBooking={(b, change) => { setHotelBooking(b); setWallet((w) => Math.max(0, w + change)); }}
        onGoToRoom={(b) => { setHotelDesk(null); play("door", soundOn()); void goTo(roomMapId(b.hotel, b.room), `Room ${b.room}`); }} />}
      <CrewInvites busy={dailyBusy || !!lift} onJoin={(id) => { const role = ROLES.find((r) => r.id === id); if (role) startRole(role, 1); }} />
      {lift && <LiftPanel floors={lift} onClose={() => setLift(null)} onArrive={(f) => {
        setLift(null);
        // Same building: the lift just takes you to the other floor. Otherwise it's another map.
        if (f.mapId === mapId && f.level !== undefined) Object.assign(LEVEL_JUMP, { pending: true, level: f.level, x: (f.x ?? 13) * TILE, y: (f.y ?? 3.6) * TILE });
        else void goTo(f.mapId, f.label, { x: (f.x ?? 13) * TILE, y: (f.y ?? 3.6) * TILE });
      }} />}
      {petsOpen && <PetPanel onClose={() => setPetsOpen(false)} onClout={(n) => setWallet((w) => w + n)} />}
      {browser && <WebBrowser start={browser} wallet={wallet} onCompany={(w, name) => { setBrowser(null); void goTo(`workplace-${w}`, name); }}
        renderCars={(back) => <Dealership clout={wallet} owned={garage} driving={driving} onClose={back} onDrive={(c) => { setBrowser(null); driveCar(c); }}
          onBought={(c, left) => { setWallet(left); setGarage((g) => g.includes(c) ? g : [...g, c]); setBrowser(null); driveCar(c); router.refresh(); }} />}
        renderHouses={(back) => <HomeMarket claimed={home.claimed} owned={home.owned} current={home.current} clout={wallet} onClose={back}
          onPurchased={(id, balance) => { setHomeChoice(id); setNewlyOwnedHomes(homes => [...new Set([...homes, id])]); if (balance !== null) setWallet(balance); recordLife(`You made the ${homeById(id)?.name ?? "house"} in ${homeById(id)?.area ?? "London"} your home.`); router.refresh(); }}
          onEnterHome={() => { setBrowser(null); setMobileExplore(true); goTo("home", "Your house"); }} />} mapId={mapId} activeRole={roleShift?.role.id ?? null} hotelBooking={hotelBooking}
        onClose={() => setBrowser(null)} onWallet={(n) => setWallet((w) => Math.max(0, w + n))} onHotelBooking={setHotelBooking}
        onGoToRoom={(b) => { setBrowser(null); play("door", soundOn()); void goTo(roomMapId(b.hotel, b.room), `Room ${b.room}`); }}
        onStartJob={(role, level) => { setBrowser(null); startRole(role, level); }}
        onTravelJob={(role) => { setBrowser(null); if (role.place.mapId) void goTo(role.place.mapId, role.place.label); }}
        onOpen={(app) => {
          setBrowser(null);
          if (app === "bank") setBankOpen(true); else if (app === "games") setGames(true); else if (app === "map") setMapOpen(true);
          else if (app === "fashion") router.push("/games/locker");
          else if (mapId === "home") { setArrive({ x: PLAYER.x, y: PLAYER.y }); setBuilding(true); }
          else { say("Opening HomeStyle at your house: arrange and buy furniture there.", true); void goTo("home", "Your house"); }
        }} />}
      {jobsOpen && <JobsPanel onCompany={(w, name) => { setJobsOpen(false); void goTo(`workplace-${w}`, name); }} mapId={mapId} activeRole={roleShift?.role.id ?? null} onClose={() => setJobsOpen(false)}
        onStart={(role, level) => { setJobsOpen(false); startRole(role, level); }}
        onTravel={(role) => { setJobsOpen(false); if (role.place.mapId) void goTo(role.place.mapId, role.place.label); }}/>}
      {hiring && <HiringFlow key={hiring.role.id} spec={roleSpec(hiring.role)} stage={hiring.stage} playerName={hiring.name} here={!hiring.role.place.mapId || hiring.role.place.mapId === mapId}
        start={async () => { const r = await startRoleInterview(hiring.role.id); if (!r.ok) return r; interviewClaim.current = r.claim; return { ok: true, seed: r.seed }; }}
        submit={(seed, answers) => finishRoleInterview(hiring.role.id, interviewClaim.current, seed, answers)}
        accept={async () => { const r = await acceptRoleOffer(interviewClaim.current); if (r.ok) addLocalHire(hiring.role.id); return r; }}
        onTravel={(name) => { const role = hiring.role; setHiring(null); setInterviewAt({ role, name }); say(`Interview booked. Head to ${role.place.label} and sign in at reception.`, true); if (role.place.mapId) void goTo(role.place.mapId, role.place.label); }}
        onHired={() => { const role = hiring.role; setHiring(null); setDailyJob(null); setRoleShift({ role, level: 1 }); say(`You're hired! Welcome to your first shift as a ${role.title.toLowerCase()}.`, true); }}
        onClose={() => setHiring(null)} />}
      {roleShift && <RoleShift key={roleShift.role.id} onTravel={(id, label) => void goTo(id, label)} role={roleShift.role} level={roleShift.level} map={map} onTarget={setWaypoint} onBusy={setDailyBusy} onPaid={(n) => setWallet((w) => w + n)} onEnd={() => { setRoleShift(null); setDailyBusy(false); setWaypoint(null); CREW.id = null; CREW.role = null; }}/>}
      {rescueCause && <CrashImpact key={rescueCause.key} kind={rescueCause.kind}/>}
      {patrol && outdoors && <PolicePatrol map={map} onTarget={setWaypoint} onEnd={() => { setPatrol(false); setWaypoint(null); }} say={say}/>}
      {panic && <PanicFloor companyId={panic} map={map} onExit={() => setPanic(null)}/>}
      <NpcVisits enabled={outdoors&&!panic&&!busy&&!menu&&!driving&&!bike&&!jailed&&!soaring&&life.stars<POLICE_STARS&&!pursuit} map={map} job={job} playerName={me.username} say={say}
        onReward={()=>{void gainXp("study");}}
        onWaypoint={(portal,label)=>setWaypoint({id:portal.id,name:label,kind:"job",x:portal.rect.x+portal.rect.w/2,y:portal.rect.y+portal.rect.h/2})}/>
      {conversation&&<NpcTalk key={conversation.id} person={conversation} onClose={()=>setConversation(null)}/>}
      {nearPerson&&!driving&&!conversation&&<HudSlot area="bc" order={12}><button type="button" className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-[#13203a] shadow" onClick={()=>{const person=NPC_SPOTS.filter(n=>n.id&&n.name&&/:resident:/.test(n.id)).sort((a,b)=>Math.hypot(a.x-PLAYER.x,a.y-PLAYER.y)-Math.hypot(b.x-PLAYER.x,b.y-PLAYER.y))[0];if(person&&Math.hypot(person.x-PLAYER.x,person.y-PLAYER.y)<70)setConversation({id:person.id!,name:person.name!,heading:person.heading});}}>Talk to someone</button></HudSlot>}
      {mapId.startsWith("party-")&&<HudSlot area="bc" order={13}><button type="button" className="min-h-11 rounded-full bg-violet-600 px-4 text-sm font-bold text-white shadow" onClick={()=>window.dispatchEvent(new Event("illuminated:dance"))}>Dance</button></HudSlot>}
      {nearPerson && !driving && (
        <HudSlot area="br-act" order={1}><button type="button" onClick={fight} className="jelly min-h-11 rounded-full bg-[#c8322d] px-4 py-2 text-sm font-black text-white shadow-lg">
          {street.attacked ? "Defend yourself (F)" : "Shove (F)"}
        </button></HudSlot>
      )}
      {!streetCustody && pursuit && pursuit.stage !== "challenge" && pursuit.stage !== "tased" && <HudSlot area="tc" order={15} className="pointer-events-none"><div role="status" className="rounded-2xl bg-[#13203a]/95 px-4 py-2 text-center text-sm font-bold text-white">{pursuit.stage === "arriving" ? "Police car responding" : "Officers are searching"}<p className="text-xs text-white/80">Leave the red search circle for 6 seconds to clear your stars.{pursuit.outsideSince !== null ? ` ${Math.max(0,6-Math.floor((Date.now()-pursuit.outsideSince)/1000))}s left` : ""}</p></div></HudSlot>}
      {!streetCustody && pursuit?.stage === "challenge" && <PoliceChallenge onResult={correct=>{
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
              takeIntoCustody();
            }
          },2600);
        }
      }}/ >}
      {streetCustody && streetCustody.stage !== "transport" && !rescue && <HudSlot area="tc" order={5}><section role="status" aria-live="polite" className="pixel-panel max-w-md p-4 text-center"><p className="font-black">{streetCustody.stage === "responding" ? "Police responding to the incident" : streetCustody.participants.includes("civilian") ? `You and ${streetCustody.npcName} are under arrest` : "You are under arrest"}</p><p className="mt-2 text-xs">{streetCustody.stage === "responding" ? "Officers are approaching to stop the people involved. The hearing has not started." : "Officers are completing the arrest before escorting the detained participants to court. Arrest does not decide the case."}</p></section></HudSlot>}
      {streetCustody?.stage === "transport" && !rescue && <LivePolicePickup map={map} destination="court" people={streetCustody.participants.includes("civilian") ? `You and ${streetCustody.npcName}` : "You"} onArrive={() => {
        const proof=finishStreetTransport(streetCustody,Date.now());if(!proof)return;
        updateLife(current=>current.hearing?.streetCase?.id===proof.caseId?{...current,hearing:{...current.hearing,custody:proof}}:current);
        pursuitRef.current=null;setPursuit(null);setStreetCustody(null);
        goTo("court","Police escort · Crown Court");
      }}/>}
      {arrest && <ArrestOverlay />}
      <Deliveries atHome={mapId === "home"} busy={busy || building || mobileLife} onGoHome={() => { if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else goTo("home", "Your house"); }} />
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
      <HudSlot area="br-nav" order={0}><button type="button" onClick={() => setMenu(true)} aria-label="Game menu" title="Menu (Esc or Backspace)" className="jelly grid size-11 place-items-center rounded-2xl bg-[#13203a] text-white shadow-lg"><Menu className="size-5" aria-hidden /></button></HudSlot>
      {menu && <GameMenu place={playerWorld ? `${worldInfo?.name ?? "Player world"} · ${map.name}` : map.name} onContinue={() => setMenu(false)} onLeave={leaveGame} onSave={remember} onEvents={() => { setMenu(false); setEventGame("events"); }}
        onSwitch={() => { remember(); setMenu(false); setSoaring(false); setWorldInfo(null); setServer(null); }} />}
      {isOwner && <HudSlot area="br-nav" order={2}><button type="button" onClick={() => setAdminOpen(true)} aria-label="World admin" title="World admin" className="jelly grid size-11 place-items-center rounded-2xl bg-[#7a5ce6] text-white shadow-lg"><Crown className="size-5" aria-hidden /></button></HudSlot>}
      {canFly && !driving && outdoors && <HudSlot area="br-nav" order={3}><button type="button" aria-pressed={soaring} onClick={() => { setSoaring((f) => !f); say(soaring ? "Landing." : "You're soaring! Glide anywhere, then press again to land.", true); }} aria-label={soaring ? "Land" : "Fly"} title={soaring ? "Land" : "Fly"} className={`jelly grid size-11 place-items-center rounded-2xl text-white shadow-lg ${soaring ? "bg-[#1aa3c4]" : "bg-[#13203a]"}`}><Feather className="size-5" aria-hidden /></button></HudSlot>}
      {networking && <NetworkingEvent venue={networking} meId={me.id} onClose={() => setNetworking(null)} onDone={(xp) => say(xp ? `Networking event complete: +${xp} XP. Great conversations!` : "Networking event complete. Great conversations!", true)} />}
      {adminOpen && isOwner && <WorldAdmin name={worldInfo?.name ?? "Your world"} rules={rules} onClose={() => setAdminOpen(false)}
        onSaved={(r) => { setRules(r); say("World rules saved.", true); }}
        commands={[
          { label: "Teleport to Fountain Square", run: () => { setAdminOpen(false); goTo("city", "Fountain Square"); } },
          { label: "Clear my wanted stars", run: () => { updateLife(clearWanted); say("Wanted stars cleared.", true); } },
          { label: soaring ? "Land now" : "Start flying", run: () => { setAdminOpen(false); setSoaring((f) => !f); } },
          { label: "Go home", run: () => { setAdminOpen(false); goTo("home", "Your house"); } },
        ]} />}
      <HudSlot area="br-nav" order={1}><button type="button" onClick={()=>{setPhoneApp("home");setPhone(true);}} aria-label="Open your game phone" className="jelly grid size-11 place-items-center rounded-2xl bg-[#13203a] text-white shadow-lg"><Smartphone className="size-5"/></button></HudSlot>
      {phone && <GamePhone onUKRoads={() => { setPhone(false); setUKRoadsOpen(true); }} mapId={mapId} initialApp={phoneApp} meId={me.id} username={me.username} nearby={nearby} onNearbyRequest={async name=>{if(!nearby.some(p=>p.kind==="player"&&p.name===name&&p.distance<=64))return "Walk closer to this player before sending a request.";const r=await cityAction("city_friend_action",{p_username:name,p_action:"request"});return r.error;}} onVenture={()=>{setPhone(false);goTo("venture-hub","Venture Yard");}} onBank={()=>{setPhone(false);setBankOpen(true);}}
        onHouses={() => { setPhone(false); if(jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setBrowser("homefinder"); }}
        onStudio={channel=>{setPhone(false);setStudioFloating(false);setCreatorChannel(channel);}} onParty={()=>{setPhone(false);const place=map.portals.find(p=>p.to.kind==="map"&&p.to.mapId.startsWith("party-"));if(place){setWaypoint({id:place.id,name:"Community social",kind:"view",x:place.rect.x+place.rect.w/2,y:place.rect.y+place.rect.h/2});say("Follow the marker to the community social.",true);}else setMapOpen(true);}}
        onEvents={() => { setPhone(false); setEventGame("events"); }} time={gameDate} clout={wallet} onBus={() => { setPhone(false); if (mapId !== "city" || jailed) say("Buses run on London streets. Head outside first."); else setBusPick(true); }} onGarage={() => { setPhone(false); if (outdoors && !jailed) setBrowser("autohub"); else say("Head outside to open your garage."); }} onStudy={() => { setPhone(false); if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setLearning(true); }} onAwards={() => { setPhone(false); setAwardsOpen(true); }} onUniversities={()=>{setPhone(false);if(outdoors&&!jailed&&life.stars<POLICE_STARS){setCoachTrip(true);return;}const gate=map.portals.find(p=>p.to.kind==="map"&&p.to.mapId.startsWith("university-"));if(gate){setWaypoint({id:gate.id,name:"University open day",kind:"university",x:gate.rect.x+gate.rect.w/2,y:gate.rect.y+gate.rect.h/2});say("Follow the marker to the university in this city.",true);}else setMapOpen(true);}} onClose={()=>setPhone(false)} onMap={()=>{setPhone(false);setMapOpen(true);}} onHome={()=>{setPhone(false);if(jailed||life.stars>=POLICE_STARS)say("Finish your current law activity first.");else goTo("home","Your house");}} onLocker={()=>{if(!jailed&&life.stars<POLICE_STARS)router.push("/games/locker");else say("Finish your current law activity first.");}} onCall={id=>{
        setPhone(false);
        if(jailed||life.stars>=POLICE_STARS){say("Finish your current law activity before calling companies.");return;}
        const workplace=id.startsWith("work:") ? workplaceById(id.slice(5)) : WORKPLACES.find(w=>w.companyId===id);
        if(workplace){goTo(`workplace-${workplace.id}`,workplace.name);say("Walk to reception to apply, or use a computer or counter to clock in.",true);}
        else { const company=COMPANIES.find(c=>c.id===id); setInmate(`Call: ${company?.name??id}`); }
      }}/ >}
      {study && <PrisonStudy progress={life.prisonWork} onCorrect={()=>updateLife(l=>({...l,prisonWork:Math.min(3,l.prisonWork+1)}))} onClose={()=>setStudy(false)}/>}
      {inmate && <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/60 p-4"><section role="dialog" aria-label={inmate} className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]"><h2 className="text-2xl font-black">{inmate}</h2><p className="mt-3 leading-relaxed">{inmate.startsWith("Call:")?"Thanks for calling. Visit our headquarters in the city to start your revision shift. Look for our company sign and walk to the glowing door.":inmate==="Sam"?"The cell doors are open. The study desk is in the south-west corner. Three correct revision answers count towards your release, or use a completed homework card.":"The service corridor starts through the eastern wall. The gaps alternate north and south. Watch the patrolling guards; getting caught adds time."}</p><p className="mt-3 text-xs text-[#5a6272]">Scripted character dialogue — no live chat.</p><button type="button" onClick={()=>setInmate(null)} className="jelly mt-5 rounded-full bg-[#2b5fd9] px-5 py-2 font-black text-white">End conversation</button></section></div>}
      {mapId === "court" && life.hearing?.streetCase && canHearStreetCase(life.hearing.streetCase,life.hearing.custody) && <StreetHearingDialog key={life.hearing.streetCase.id} caseFile={life.hearing.streetCase} balance={wallet} onResolved={result=>{setWallet(result.balance);if(result.finePaid>0){try{localStorage.setItem(fineKey,JSON.stringify(recordCourtFine(JSON.parse(localStorage.getItem(fineKey)??"null"),result.caseId,result.finePaid)));}catch{/* The current session still keeps the paid balance. */}}pendingStreetCase.current=null;updateLife(l=>({...l,hearing:null,jailUntil:result.jailUntil,prisonWork:0}));if(result.outcome!=="jailed")goTo("city","London",courtSteps);}}/>}
      {mapId === "court" && life.hearing && !life.hearing.streetCase && (
        <CourtTrial
          key={`${life.hearing.charge}:${life.hearing.stars}`}
          charge={life.hearing.charge}
          stars={life.hearing.stars}
          cards={cards}
          solicitor={trialSolicitor}
          onVerdict={(v) => {
            const h = life.hearing!;
            if (v === "guilty" || v === "caught") {
              updateLife((l) => ({ ...l, hearing: null, jailUntil: Date.now() + sentenceMs(h.stars) + (v === "caught" ? 45_000 : 0), prisonWork: 0 }));
            } else if (v === "escaped") {
              updateLife((l) => ({ ...l, hearing: null, stars: 5, heatAt: Date.now(), lastOffence: "Escaping from court custody" }));
              say("You're out of the court and on the run. Lose the police to clear your record!", true);
              goTo("city", "On the run", courtSteps);
            } else {
              updateLife((l) => ({ ...l, hearing: null, cardsUsed: l.cardsUsed + (v === "dismissed" ? 1 : 0) }));
              say(v === "dismissed" ? "Case dismissed: your homework got you off!" : "Not guilty. You're free to go.", true);
              goTo("city", "London", courtSteps);
            }
          }}
        />
      )}
      {custody?.stage === "van" && <LivePolicePickup map={map} destination="police-station" onArrive={() => { setCustody({ stage: "booking", until: 0, solicitor: false }); goTo("police-station", "Police custody", { x: (POLICE_CELLS[0].x + 1.5) * TILE, y: (POLICE_CELLS[0].y + 2.5) * TILE }); }} />}
      {custody?.stage === "booking" && mapId === "police-station" && <BookingIn charge={life.hearing?.charge ?? "an offence"} onDone={() => setCustody((c) => (c && c.stage === "booking" ? { ...c, stage: "cell", until: Date.now() + 25_000 } : c))} />}
      {custody?.stage === "cell" && mapId === "police-station" && <HoldingCellHud until={custody.until} solicitor={custody.solicitor} onSolicitor={() => { setTrialSolicitor(true); setCustody((c) => (c ? { ...c, solicitor: true, until: Math.max(Date.now() + 6000, c.until - 8000) } : c)); say("The duty solicitor visits your cell and goes through the evidence with you.", true); }} />}
      {custody?.stage === "transport" && !liveTransfer && <LiveTransferStart onStart={() => { setLiveTransfer({ destination: "court", ready: false }); void goTo("city", "Walked out in cuffs", stationSteps); }} />}
      {liveTransfer?.ready && mapId === "city" && <LivePolicePickup key={liveTransfer.destination} map={CITY} destination={liveTransfer.destination} onArrive={() => {
        const to = liveTransfer.destination;
        setLiveTransfer(null);
        if (to === "court") { setCustody(null); void goTo("court", "Police escort · Crown Court"); }
        else void goTo("prison", "HMP Thames");
      }} />}
      {jailed && mapId === "prison" && prison && <PrisonRoutineHud prison={prison} now={nowTick} here={prisonHere} onOpen={() => setPrisonPanel("desk")} />}
      {jailed && prison && prisonPanel === "desk" && <PrisonWorkbench prison={prison} onClose={() => setPrisonPanel(null)} onRun={(fn) => { const o = runPrison(fn); if (o?.message) say(o.message, !o.ok); }} />}
      {jailed && prison && prisonPanel === "trader" && <PrisonTrader prison={prison} onClose={() => setPrisonPanel(null)} onRun={(fn) => { const o = runPrison(fn); if (o?.message) say(o.message, !o.ok); }} />}
      {jailed && prison && prisonPanel === "jobs" && <PrisonJobBoard prison={prison} onClose={() => setPrisonPanel(null)} onRun={(fn) => { const o = runPrison(fn); if (o?.message) say(o.message, !o.ok); }} />}
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
      {journey && <TrainCutscene onStudy={()=>setLearning(true)} to={journey.to} line={journey.line??"Revision"} avatar={me.avatar} onArrive={journey.go} />}
      {policeTransport && <LivePolicePickup map={map} destination="police-station" onArrive={() => {
        const stars = transportStars.current;
        updateLife(life => ({ ...clearWanted(life), hearing: { stars, charge: wantedCharge(life) }, prisonWork: 0 }));
        setPoliceTransport(false); setArrest(false);
        setCustody({ stage: "booking", until: 0, solicitor: false });
        goTo("police-station", "Police custody", { x: (POLICE_CELLS[0].x + 1.5) * TILE, y: (POLICE_CELLS[0].y + 2.5) * TILE });
      }} />}
{!mobileLife && inTutorial && flight !== null && !flying && <FlightSchoolGuide step={flight} onNext={() => setFlight(n => n === null ? n : n + 1)} onSkip={() => setFlying(true)} />}
      {flightModal === "desk" && <FlightSchoolDesk onClose={() => { setFlightModal(null); setFlight(n => n === null ? n : n + 1); }} />}
      {flightModal === "quiz" && <FlightSchoolQuiz onClose={() => setFlightModal(null)} onDone={() => { setFlightModal(null); setFlight(n => n === null ? n : n + 1); }} />}
      {flying && <PlaneCutscene onArrive={landInLondon} />}
      {passage&&<div className={continuityStyles.frame} data-ready={passage.ready} aria-label={passage.label}>
        <div className={continuityStyles.image} ref={node=>{if(node&&passage.image&&node.firstChild!==passage.image)node.replaceChildren(passage.image);}}/>
        <div className={continuityStyles.panel}/>
        <div className={continuityStyles.panel}/>
        <div className={continuityStyles.card} aria-hidden>
          <p className={continuityStyles.kicker}>{passage.mode==="car"?"Driving to":passage.mode==="train"?"Travelling to":passage.mode==="door"?"Stepping into":"Heading to"}</p>
          <p className={continuityStyles.title}>{passage.label.split(" · ").at(-1)}</p>
          <div className={continuityStyles.route}>
            <span className={continuityStyles.dot}/>
            <span className={continuityStyles.mover}>{passage.mode==="car"?<CarFront className="size-5"/>:passage.mode==="train"?<TrainFront className="size-5"/>:passage.mode==="door"?<DoorOpen className="size-5"/>:<Footprints className="size-5"/>}</span>
            <span className={continuityStyles.pin}/>
          </div>
          <p className={continuityStyles.status}>{passage.label.split(" · ").slice(0,-1).join(" · ")||(passage.mode==="door"?"Going inside":"Arriving soon")}</p>
        </div>
        <span role="status" className={continuityStyles.label}>{passage.label}{!passage.ready&&" · Preparing scene"}</span>
      </div>}
      <SceneWipe show={fading} label={sceneName} />
      <HudSlot area="br-nav" order={4}><button
        type="button"
        onClick={() => setTutorial(true)}
        aria-label="How to play"
        title="How to play"
        className="jelly flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#f6f2e8] px-3 py-1.5 text-xs font-black text-[#13203a] shadow-lg"
      >
        <CircleHelp className="size-4 2xl:hidden" aria-hidden /><span className="hidden 2xl:inline">How to play</span>
      </button></HudSlot>
      {tutorial && <Tutorial onClose={() => {
        try { localStorage.setItem(`${TUTORIAL_KEY}:${me.id}`, "seen"); } catch { /* Show again when storage is unavailable. */ }
        setTutorial(false);
      }} />}
      {atHome && (
        <HudSlot area="br-act" order={3}><Link href="/games/home" className="jelly rounded-full bg-[#f2d9a6] px-4 py-2 text-sm font-black text-[#0d1726] shadow-lg">
          Decorate
        </Link></HudSlot>
      )}
      {coachTrip&&<CoachTrip from={map.kind==="home"?"city":mapId} onClose={()=>setCoachTrip(false)} onGo={(city,uni)=>{
        setCoachTrip(false);
        const dest=loadMap(city,offices,me.id);
        const gate=dest?.portals.find(p=>p.id===`university-site-${uni}`);
        const spot=gate?{x:gate.rect.x+gate.rect.w/2,y:gate.rect.y+gate.rect.h+TILE*1.5}:undefined;
        const label=universityById(uni)?.fullName??"University";
        const arrive=()=>{if(gate)setWaypoint({id:gate.id,name:label,kind:"university",x:gate.rect.x+gate.rect.w/2,y:gate.rect.y+gate.rect.h/2});say(`Welcome to ${label}. Walk in through the front entrance.`,true);};
        if(city===mapId&&spot){setArrive(spot);setTrip(n=>n+1);arrive();}
        else void goTo(city,label,spot).then(arrive);
      }}/>}
      {university&&<UniversityGuide id={university.id} topic={university.topic} onClose={()=>setUniversity(null)}/>}
      {dailyJob&&<DailyShift key={dailyJob.workplace} active={map.id===(dailyJob.workplace==="tescow"?"supermarket":dailyJob.workplace==="pizzazz"?"city":`workplace-${dailyJob.workplace}`)} job={dailyJob} map={dailyJob.workplace==="tescow"?SUPERMARKET:dailyJob.workplace==="pizzazz"?CITY:(workplaceMap(dailyJob.workplace)??CITY)} onTarget={setWaypoint} onBusy={setDailyBusy} onPaid={pay=>setWallet(n=>n+pay)} onClose={()=>{setDailyJob(null);setDailyBusy(false);setWaypoint(null);}}/>}
      {work && mapId === `workplace-${work}` && workplaceById(work) && <WorkplaceDoor station={workStation} workplace={workplaceById(work)!} job={job} avatar={me.avatar} onClose={() => setWork(null)} onPracticalShift={next=>{setWork(null);if(next.workplace==="tescow"){setDailyJob(next);goTo("supermarket","Tescow practice store");}else if(next.workplace==="pizzazz"){setDailyJob(next);goTo("city","Pizza delivery route");say("Delivery route ready. Follow your work markers.");}else{setDailyJob(next);say("Your shift has started. Walk to each work point and do the job.");}}} />}
      {busJourney && <VehicleJourney kind="bus" route={["24", "38", "73", "159"][busJourney.from.length % 4]} from={busJourney.from} to={busJourney.t.kind === "stop" ? busJourney.t.name : busJourney.t.label} miles={3 + (busJourney.from.length % 4)} seconds={10} onArrive={() => busArrive(busJourney.t, busJourney.revised)} />}
      {bus && <BusStop here={bus} stops={BUS_STOPS} homework={homework} onGo={busRide} onClose={() => setBus(null)} onPickOnMap={() => { setBus(null); setBusPick(true); }} />}
      {!mobileLife && <LifeHud avatar={me.avatar} name={me.username} clout={wallet}
        quests={quests}
        onLocate={(q) => {
          if (q.tag === "Study") {
            if (jailed || life.stars >= POLICE_STARS) say("Finish your current law activity first."); else setLearning(true);
            return true;
          }
          const kind = placeForTask(q.tag, q.title);
          if (!kind) return false;
          if (mapId !== "city") return false;
          setWaypoint(nearest(kind));
          return true;
        }}
      />}
      {!mobileLife && !atHome && <MiniMap map={map} searchArea={pursuit} waypoint={waypoint} navigation={navigation} onOpen={() => setMapOpen(true)} onArrive={() => {}} />}
      {mapOpen && <CityMap map={map} searchArea={pursuit} waypoint={waypoint} onPick={setWaypoint} onClose={() => setMapOpen(false)} />}
      {/* The UK road atlas opens from the phone (UK roads app), keeping the HUD clear. */}
      {ukRoadsOpen && <UKRoadMap map={map} onClose={closeUKRoads} onGuide={guideUKRoad} />}
      {roadDestination && <HudSlot area="tc" order={35}><div className="flex max-w-[min(90vw,28rem)] items-center gap-3 rounded-2xl border border-white/20 bg-[#143f35]/95 px-4 py-2 text-white shadow-lg"><MapPinned className="size-4 shrink-0"/><button type="button" onClick={() => setUKRoadsOpen(true)} className="truncate text-left text-xs font-bold">Route to {ukSceneName(roadDestination)}<span className="block text-[10px] font-medium text-[#c0dac8]">Follow the marker · interact at the next junction</span></button><button type="button" aria-label="Cancel UK route" onClick={() => { setRoadDestination(null); setWaypoint(null); }} className="ml-auto rounded-full p-1"><X size={16}/></button></div></HudSlot>}
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
    {mobileWork && workplaceById(mobileWork) && <WorkplaceDoor workplace={workplaceById(mobileWork)!} job={job} avatar={me.avatar}
      station={job?.workplace === mobileWork ? "terminal" : "reception"}
      onClose={() => { setMobileWork(null); router.refresh(); }} />}
    {phoneLayout && !mobileLife && !busy && !menu && <button type="button" onClick={returnToLife} className="absolute top-[max(12px,env(safe-area-inset-top))] left-1/2 z-[100003] min-h-11 -translate-x-1/2 rounded-full border border-white/60 bg-white/90 px-4 text-sm font-semibold text-[#0766ed] shadow-lg backdrop-blur-xl">← My life</button>}
    </div>
  );
}
