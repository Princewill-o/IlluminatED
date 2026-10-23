import { CITY_CENTRE } from "./city-centre";
import { buildLondon } from "./london";
import { LONDON_DISTRICTS } from "./london-districts";
import { OUTSKIRTS } from "./london-outskirts";
import { venueById } from "./venues";
import { TILE, safeSpot, blocked, type Portal, type WorldMap } from "./world";

/** Group nearby screen pins without moving their actual navigation targets. */
export function mapPinGroups(places: Place[], scale: number, selectedId?: string) {
  const groups: { places: Place[]; x: number; y: number }[] = [];
  for (const place of places) {
    const x = place.x / TILE * scale, y = place.y / TILE * scale;
    const group = place.id === selectedId ? undefined : groups.find(g =>
      !g.places.some(p => p.id === selectedId) && Math.hypot(g.x-x,g.y-y)<40);
    if (group) {
      const count=group.places.length;
      group.x=(group.x*count+x)/(count+1); group.y=(group.y*count+y)/(count+1);
      group.places.push(place);
    } else groups.push({places:[place],x,y});
  }
  return groups;
}
export const LANDMARK_NAMES: Record<string, string> = {
  "big-ben": "Big Ben",
  parliament: "Houses of Parliament",
  eye: "London Eye",
  "st-pauls": "St Paul's Cathedral",
  shard: "The Shard",
  gherkin: "The Gherkin",
  "tower-bridge": "Tower Bridge",
  tower: "Tower of London",
  battersea: "Battersea Power Station",
  tate: "Tate Modern",
  palace: "Buckingham Palace",
  canary: "Canary Wharf",
  "town-hall": "Town Hall, Fountain Square",
  fountain: "Fountain Square (city centre)",
};

/** Four-way walking route over the actual collision grid, never through buildings/water. */
export function walkingRoute(
  map: WorldMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return [];
  const start = safeSpot(map, from.x, from.y),
    end = safeSpot(map, to.x, to.y);
  const index = (p: { x: number; y: number }) => {
    let best = -1,
      distance = Infinity;
    for (let y = 0; y < map.rows; y++)
      for (let x = 0; x < map.cols; x++) {
        const d = (p.x - (x + 0.5) * TILE) ** 2 + (p.y - (y + 0.5) * TILE) ** 2;
        if (d < distance && !blocked(map, (x + 0.5) * TILE, (y + 0.5) * TILE)) {
          best = y * map.cols + x;
          distance = d;
        }
      }
    return best;
  };
  const first = index(start),
    last = index(end);
  if (first < 0 || last < 0) return [];
  const previous = new Int32Array(map.cols * map.rows).fill(-1);
  const queue = new Int32Array(previous.length);
  let head = 0,
    tail = 0;
  previous[first] = first;
  queue[tail++] = first;
  while (head < tail && previous[last] === -1) {
    const at = queue[head++],
      x = at % map.cols,
      y = Math.floor(at / map.cols);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
      const next = ny * map.cols + nx;
      if (
        previous[next] !== -1 ||
        blocked(map, (nx + 0.5) * TILE, (ny + 0.5) * TILE)
      )
        continue;
      previous[next] = at;
      queue[tail++] = next;
    }
  }
  if (previous[last] === -1) return [];
  const path = [];
  for (let at = last; ; at = previous[at]) {
    path.push({
      x: ((at % map.cols) + 0.5) * TILE,
      y: (Math.floor(at / map.cols) + 0.5) * TILE,
    });
    if (at === first) break;
  }
  return path.reverse();
}
export type PlaceKind =
  | "university"
  | "station"
  | "bus"
  | "bike"
  | "job"
  | "games"
  | "home"
  | "view"
  | "food"
  | "dealer"
  | "hospital"
  | "court"
  | "study"
  | "landmark"
  | "hotel";
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  x: number;
  y: number;
}

export const KIND: Record<PlaceKind, { label: string; colour: string }> = {
  hotel: { label: "Hotels", colour: "#456c60" },
  landmark: { label: "Landmarks", colour: "#9b496a" },
  university: { label: "Universities", colour: "#7153b9" },
  station: { label: "Underground", colour: "#2b5fd9" },
  bus: { label: "Bus stops", colour: "#d4241f" },
  bike: { label: "Bike docks", colour: "#6cc04a" },
  job: { label: "Jobs", colour: "#e0a100" },
  games: { label: "Games Hall", colour: "#7a5ce6" },
  home: { label: "Home", colour: "#13203a" },
  view: { label: "Viewpoints", colour: "#15987f" },
  food: { label: "Food", colour: "#e98a1f" },
  dealer: { label: "Car dealership", colour: "#d72a22" },
  hospital: { label: "Hospital and pharmacy", colour: "#15987f" },
  study: { label: "Study spaces", colour: "#1f4fbf" },
  court: { label: "Crown Court", colour: "#7a4f32" },
};

function kindOf(p: Portal): PlaceKind | null {
  const t = p.to;
  if (t.kind === "map" && t.mapId.startsWith("venue-")) {
    const venue = venueById(t.mapId.slice(6).replace(/-up$/, ""));
    return venue?.theme === "pharmacy" ? "hospital" : venue?.theme === "hall" ? "landmark" : "food";
  }
  if (t.kind === "map" && t.mapId.startsWith("hotel-")) return "hotel";
  if ((t.kind === "map" && t.mapId.startsWith("station-")) || t.kind === "tube")
    return "station";
  if (t.kind === "act" && t.activity === "hike") return "view";
  if (
    (t.kind === "act" && t.activity === "eat") ||
    (t.kind === "map" && t.mapId === "supermarket")
  )
    return "food";
  if (t.kind === "map" && t.mapId === "home") return "home";
  if (
    t.kind === "university" ||
    (t.kind === "map" &&
      (t.mapId === "universities" || t.mapId.startsWith("university-")))
  )
    return "university";
  if (t.kind === "bus") return "bus";
  if (t.kind === "bike") return "bike";
  if (
    t.kind === "work" ||
    t.kind === "game" ||
    t.kind === "workstation" ||
    (t.kind === "map" && t.mapId.startsWith("workplace-"))
  )
    return "job";
  if (
    t.kind === "study-room" ||
    t.kind === "awards" ||
    (t.kind === "map" && t.mapId === "study-lobby")
  )
    return "study";
  if (t.kind === "games") return "games";
  if (
    (t.kind === "act" && t.activity === "study") ||
    (t.kind === "link" && t.href === "/learn")
  )
    return "study";
  if (t.kind === "dealer") return "dealer";
  if (t.kind === "shop") return t.shop === "bootz" ? "hospital" : "food";
  if (t.kind === "doctor" || (t.kind === "map" && t.mapId === "hospital"))
    return "hospital";
  if (t.kind === "map" && t.mapId === "court") return "court";
  if (t.kind === "desk") return "job";
  if (t.kind === "map" || t.kind === "prison") return "view";
  return null;
}

export const placesFor = (map: WorldMap): Place[] => {
  const portals = map.portals.flatMap((p): Place[] => {
    const kind = kindOf(p);
    if (!kind) return [];
    const name = p.label.replace(/^Bus stop: /, "");
    return [
      {
        id: p.id,
        name: kind === "bus" ? `Bus stop, ${name}` : name,
        kind,
        x: p.rect.x + p.rect.w / 2,
        y: p.rect.y + p.rect.h / 2,
      },
    ];
  });
  if (map.id !== "city") return portals;
  const extra: Place[] = buildLondon().things.flatMap((t) => {
    if (t.kind !== "landmark" && !(t.kind === "building" && t.label)) return [];
    const name = t.kind === "landmark" ? LANDMARK_NAMES[t.name] : t.label!;
    if (portals.some((p) => p.name.toLowerCase().includes(name.toLowerCase())))
      return [];
    const spot = safeSpot(
      map,
      (t.x + t.w / 2) * TILE,
      (t.y + t.h + 0.5) * TILE,
    );
    return [{ id: `landmark-${t.id}`, name, kind: "landmark", ...spot }];
  });
  return [...portals, ...extra];
};

/** Named areas for the map: the new city centre, the districts and the outskirts. */
export const MAP_AREAS: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: "Fountain Square", ...CITY_CENTRE },
  ...LONDON_DISTRICTS,
  ...OUTSKIRTS,
];
/** Central London's neighbourhoods run west to east along the river. */
const CORE_AREAS = [
  { until: 15, name: "Westminster" },
  { until: 35, name: "West End" },
  { until: 55, name: "St Paul's" },
  { until: 75, name: "The City" },
  { until: 96, name: "Tower Bridge" },
  { until: 112, name: "Study Quarter" },
];
const BUILDING_KINDS: Record<string, string> = {
  terrace: "Townhouses", shop: "Shops", office: "Offices", glass: "Office tower", brick: "Offices", stone: "Building", company: "Company HQ",
};

export type SpotInfo = {
  title: string;
  /** What kind of thing this is (a place category, "Building", "River"...). */
  detail: string;
  /** The neighbourhood it's in. */
  area: string | null;
  /** A destination you can set as your waypoint, when there is one. */
  place: Place | null;
};

/** The area a tile belongs to. */
export function areaAt(x: number, y: number) {
  const named = MAP_AREAS.find((a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
  if (named) return named.name;
  if (x < 112 && y < 88) return CORE_AREAS.find((a) => x < a.until)?.name ?? "Central London";
  return null;
}

/**
 * What's at a spot on the map (tile coordinates): the nearest destination,
 * else the building or landmark there, else the kind of ground (river, park,
 * road...). Used when you tap anywhere on the map.
 */
export function describeSpot(map: WorldMap, places: Place[], x: number, y: number): SpotInfo {
  const tx = Math.floor(x), ty = Math.floor(y);
  const area = map.id === "city" ? areaAt(tx, ty) : null;
  const near = places
    .map((p) => ({ p, d: Math.hypot(p.x / TILE - x, p.y / TILE - y) }))
    .filter((c) => c.d < 2.6)
    .sort((a, b) => a.d - b.d)[0]?.p;
  if (near) return { title: near.name, detail: KIND[near.kind].label.replace(/s$/, ""), area, place: near };
  if (map.id === "city") {
    for (const t of buildLondon().things) {
      if (!("w" in t) || tx < t.x || tx >= t.x + t.w || ty < t.y || ty >= t.y + t.h) continue;
      if (t.kind === "landmark") {
        const name = LANDMARK_NAMES[t.name] ?? "Landmark";
        const spot = safeSpot(map, (t.x + t.w / 2) * TILE, (t.y + t.h + 0.5) * TILE);
        return { title: name, detail: "Landmark", area, place: { id: `landmark-${t.id}`, name, kind: "landmark", ...spot } };
      }
      if (t.kind === "station") return { title: `${t.name} station`, detail: "Underground", area, place: null };
      if (t.kind === "building") {
        // A building with an entrance nearby is that destination.
        const door = places.find((p) => p.x / TILE >= t.x - 0.5 && p.x / TILE <= t.x + t.w + 0.5 && p.y / TILE >= t.y && p.y / TILE <= t.y + t.h + 1.5);
        if (door) return { title: door.name, detail: KIND[door.kind].label.replace(/s$/, ""), area, place: door };
        return { title: t.label ?? BUILDING_KINDS[t.style] ?? "Building", detail: t.label ? BUILDING_KINDS[t.style] ?? "Building" : "Private building", area, place: null };
      }
    }
  }
  const tile = map.tiles[ty]?.[tx] ?? "";
  const ground: Record<string, [string, string]> = {
    w: [map.id === "city" && ty > 30 && ty < 60 ? "River Thames" : "Water", "Water"],
    g: ["Park and gardens", "Green space"], f: ["Flower garden", "Green space"], T: ["Trees", "Green space"],
    "=": ["Road", "Watch for traffic"], ":": ["Road", "Watch for traffic"], "|": ["Bridge", "Crossing"],
    "-": ["Pavement", "Walkway"], _: ["Footpath", "Walkway"], B: ["Bench", "Take a seat"], L: ["Street lamp", "Street furniture"],
  };
  const [title, detail] = ground[tile] ?? ["Building", "Private building"];
  return { title, detail, area, place: null };
}
