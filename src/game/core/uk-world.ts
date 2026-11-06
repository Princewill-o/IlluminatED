import type { Built, Thing } from "./london";
import { M25_COLS, M25_TUNNELS } from "./m25-layout";
import { MOTORWAY_CORRIDORS, corridorScene, corridorMap } from "./motorway-corridors";
import { universitiesInCity } from "./universities";
import type { Portal, WorldMap } from "./world";

/** Stylised playable districts: road names are researched, distances are compressed. */
export interface UKPlace {
  id: string;
  name: string;
  kind: "city" | "county";
  county: string;
  lat: number;
  lon: number;
  accent: string;
  description: string;
  roadLabels: string[];
  housing: string;
}
export const UK_PLACES: UKPlace[] = [
  {
    id: "city",
    name: "London",
    kind: "city",
    county: "Greater London",
    lat: 51.5074,
    lon: -0.1278,
    accent: "#3866c7",
    description: "The Thames, learning quarters and your original city.",
    roadLabels: ["A101", "M25"],
    housing: "Brick terraces and riverside flats",
  },
  {
    id: "kent",
    name: "Kent · Canterbury & Medway",
    kind: "county",
    county: "Kent",
    lat: 51.2798,
    lon: 1.0837,
    accent: "#548355",
    description:
      "A Kent county district with orchard lanes, flint cottages and a cathedral quarter.",
    roadLabels: ["A2", "M2", "A2050"],
    housing: "Flint cottages, weatherboard homes and oast-inspired roofs",
  },
  {
    id: "nottingham",
    name: "Nottingham",
    kind: "city",
    county: "Nottinghamshire",
    lat: 52.9548,
    lon: -1.1581,
    accent: "#b66a46",
    description:
      "Red-brick terraces, a lace workshop quarter and leafy student streets.",
    roadLabels: ["M1", "A453", "A52"],
    housing: "Red-brick terraces and lace-quarter apartments",
  },
  {
    id: "birmingham",
    name: "Birmingham",
    kind: "city",
    county: "West Midlands",
    lat: 52.4862,
    lon: -1.8904,
    accent: "#92684d",
    description:
      "Canal-side workshops, the Jewellery Quarter and modern city homes.",
    roadLabels: ["M1", "M6", "A38(M)"],
    housing: "Victorian brick houses and canal-side flats",
  },
  {
    id: "manchester",
    name: "Manchester",
    kind: "city",
    county: "Greater Manchester",
    lat: 53.4808,
    lon: -2.2426,
    accent: "#8e5365",
    description:
      "Warehouse apartments, music studios and a planted canal promenade.",
    roadLabels: ["M6", "A556", "M56", "A5103"],
    housing: "Warehouse lofts and red-brick townhouses",
  },
  {
    id: "edinburgh",
    name: "Edinburgh",
    kind: "city",
    county: "City of Edinburgh",
    lat: 55.9533,
    lon: -3.1883,
    accent: "#6c7d91",
    description: "Sandstone tenements, slate roofs and a broad garden square.",
    roadLabels: ["A1", "A720", "A7"],
    housing: "Sandstone tenements and New Town inspired townhouses",
  },
];
export interface UKRoute {
  id: string;
  from: string;
  to: string;
  roads: string[];
  label: string;
  sourceUrls: string[];
}
const M25_M1 =
  "https://www.legislation.gov.uk/uksi/2011/1600/pdfs/uksi_20111600_en.pdf";
const KENT_ROADS =
  "https://www.kent.gov.uk/roads-and-travel/what-we-look-after/roads/types-of-roads";
const NOTTINGHAM_ROAD =
  "https://nationalhighways.co.uk/media/vp3ffeob/a453-five-year-post-opening-project-evaluation.pdf";
const CATTHORPE =
  "https://www.gov.uk/government/news/major-midlands-junction-improvement-open";
const MANCHESTER_ROAD =
  "https://www.gov.uk/government/news/major-roads-investment-in-the-north-west";
const SCOTTISH_A1 =
  "https://www.transport.gov.scot/road-order/the-north-east-north-west-and-south-east-scotland-no4-and-south-west-no3-trunk-roads-temporary-prohibitions-of-traffic-and-overtaking-and-temporary-speed-restrictions-order-2024/";
const SOURCE_ROUTES: UKRoute[] = [
  {
    id: "london-orbital",
    from: "city",
    to: "m25",
    roads: ["M25"],
    label: "London orbital · return to the city",
    sourceUrls: [M25_M1],
  },
  {
    id: "kent-route",
    from: "m25",
    to: "kent",
    roads: ["M25 J2", "A2", "M2", "A2", "A2050"],
    label: "Kent · Canterbury via A2 / M2",
    sourceUrls: [
      KENT_ROADS,
      "https://www.canterbury.gov.uk/sites/default/files/2024-04/Transport%20Modelling%20Preferred%20Strategic%20Growth%20Local%20Plan%20Option%20v5.pdf",
    ],
  },
  {
    id: "nottingham-route",
    from: "m25",
    to: "nottingham",
    roads: ["M25 J21", "M1", "M1 J24", "A453", "A52"],
    label: "Nottingham · M1 north / A453",
    sourceUrls: [M25_M1, NOTTINGHAM_ROAD],
  },
  {
    id: "birmingham-route",
    from: "m25",
    to: "birmingham",
    roads: ["M25 J21", "M1", "M1 J19", "M6", "A38(M)"],
    label: "Birmingham · M1 / M6",
    sourceUrls: [
      M25_M1,
      CATTHORPE,
      "https://www.birmingham.gov.uk/info/50077/roadworks_and_transport_improvements/2633/a38m_aston_expressway_tame_valley_viaduct/",
    ],
  },
  {
    id: "manchester-route",
    from: "m25",
    to: "manchester",
    roads: ["M25 J21", "M1", "M6", "A556", "M56", "A5103"],
    label: "Manchester · M6 / A556 / M56",
    sourceUrls: [
      M25_M1,
      CATTHORPE,
      MANCHESTER_ROAD,
      "https://roadtraffic.dft.gov.uk/count-points/99833",
    ],
  },
  {
    id: "edinburgh-route",
    from: "m25",
    to: "edinburgh",
    roads: ["M25 J23", "A1", "A1(M)", "A1"],
    label: "Edinburgh · A1(M) / A1 north",
    sourceUrls: [
      "https://www.legislation.gov.uk/uksi/2011/25/pdfs/uksi_20110025_en.pdf",
      SCOTTISH_A1,
    ],
  },
  {
    id: "rotherhithe-crossing",
    from: "city",
    to: "rotherhithe",
    roads: ["A101"],
    label: "Rotherhithe Tunnel · Thames crossing",
    sourceUrls: [
      "https://foi.tfl.gov.uk/FOI-1666-2021/047%20Order%20-%20Rotherhite%20Tunnel%202019%20%28Latest%29.pdf",
    ],
  },
];
export const UK_ROUTES: UKRoute[] = SOURCE_ROUTES.flatMap(route => route.from === "m25" && route.to !== "city" ? [{...route,to:`road-${route.to}`},{...route,id:`${route.id}-city`,from:`road-${route.to}`}]:[route]);
export const UK_SCENES = [
  ...MOTORWAY_CORRIDORS.map(route=>`road-${route.city}`),
  "kent",
  "nottingham",
  "birmingham",
  "manchester",
  "edinburgh",
  "m25",
  "rotherhithe",
] as const;
/** Tile coordinates on the existing London's clear road approaches. */
export const UK_GATEWAYS = [
  {
    id: "uk-orbital",
    mapId: "m25",
    label: "M25 · UK road network",
    x: 148,
    y: 103,
    w: 2,
    h: 1,
  },
  {
    id: "uk-tunnel-north",
    mapId: "rotherhithe",
    label: "A101 · Rotherhithe Tunnel",
    x: 82,
    y: 20,
    w: 2,
    h: 2,
  },
  {
    id: "uk-tunnel-south",
    mapId: "rotherhithe",
    label: "A101 · Rotherhithe Tunnel northbound",
    x: 82,
    y: 60,
    w: 2,
    h: 2,
  },
];
const TILE = 32;
const sceneCache = new Map<string, Built>();
const mapCache = new Map<string, WorldMap>();
const point = (x: number, y: number) => ({ x: x * TILE, y: y * TILE });
const portal = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  mapId: string,
): Portal => ({
  id,
  rect: { x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE },
  label,
  to: { kind: "map", mapId, label },
});
const regionIds = new Set<string>(
  UK_PLACES.filter(place=>place.id!=="city").map(place=>place.id),
);
export const isUKScene = (id: string) =>
  UK_SCENES.some((scene) => scene === id);
export const ukPlace = (id: string) =>
  UK_PLACES.find((place) => place.id === id) ?? null;

function canvas(cols: number, rows: number) {
  const t = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "g"),
  );
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (t[yy]?.[xx] !== undefined) t[yy][xx] = ch;
  };
  const road = (
    x: number,
    y: number,
    length: number,
    vertical = false,
    width = 4,
  ) => {
    const lo = Math.floor(width / 2);
    for (let along = 0; along < length; along++)
      for (const edge of [-lo - 1, width - lo]) {
        const xx = x + (vertical ? edge : along),
          yy = y + (vertical ? along : edge);
        if (t[yy]?.[xx] !== undefined && !"=:".includes(t[yy][xx]))
          t[yy][xx] = "-";
      }
    fill(
      x + (vertical ? -lo : 0),
      y + (vertical ? 0 : -lo),
      vertical ? width : length,
      vertical ? length : width,
      "=",
    );
    fill(x, y, vertical ? 1 : length, vertical ? length : 1, ":");
  };
  return { t, fill, road, rows: () => t.map((row) => row.join("")) };
}
function regionScene(id: string): Built {
  const g = canvas(96, 80),
    things: Thing[] = [];
  // Cross-city arterials pair at either edge; two closed traffic loops share the central boulevard.
  g.road(0, 22, 96);
  g.road(0, 58, 96);
  g.road(20, 0, 80, true);
  g.road(76, 0, 80, true);
  const appearance: Record<
    string,
    {
      wall: string[];
      roof: string[];
      style: "terrace" | "brick" | "stone" | "office";
      height: number;
      names: string[];
    }
  > = {
    kent: {
      wall: ["#d1c4aa", "#e7e0cb", "#eadac0", "#b8bab2"],
      roof: ["#79543f", "#91614d", "#565b5f"],
      style: "terrace",
      height: 5.8,
      names: [
        "Orchard Cottage",
        "Flint House",
        "Weatherboard Cottage",
        "Oast Lane House",
      ],
    },
    nottingham: {
      wall: ["#a95742", "#b16e4e", "#cc8c65", "#875344"],
      roof: ["#424858", "#5b4e4d", "#555f68"],
      style: "brick",
      height: 6.5,
      names: [
        "Lace Quarter Terrace",
        "Sherwood Townhouse",
        "Castle Road House",
        "Student Terrace",
      ],
    },
    birmingham: {
      wall: ["#a0614e", "#c4926a", "#8d6351", "#b77d5c"],
      roof: ["#485264", "#384956", "#72716d"],
      style: "brick",
      height: 7.2,
      names: [
        "Jewellery Quarter House",
        "Canal Court",
        "Workshop Terrace",
        "Garden Square House",
      ],
    },
    manchester: {
      wall: ["#98524d", "#895c52", "#b06b59", "#c88263"],
      roof: ["#424858", "#565260", "#343e4b"],
      style: "office",
      height: 9.2,
      names: [
        "Warehouse Loft",
        "Canal Townhouse",
        "Northern Quarter Studio",
        "Brick Mill Apartment",
      ],
    },
    edinburgh: {
      wall: ["#c6bca4", "#aea692", "#d9cdb5", "#bfb397"],
      roof: ["#465263", "#5b6370", "#4c555e"],
      style: "stone",
      height: 8.4,
      names: [
        "Sandstone Tenement",
        "Garden Townhouse",
        "Old Town House",
        "New Town Flat",
      ],
    },
  };
  const a = appearance[id];
  let index = 0;
  for (const [row, y] of [
    [0, 9],
    [1, 41],
    [2, 64],
  ])
    for (const x of [4, 27, 38, 49, 60, 84]) {
      const i = index++,
        w =
          id === "kent"
            ? 6 + (i % 2)
            : id === "nottingham" || id === "edinburgh"
              ? 7
              : x === 84
                ? 7
                : 8,
        h =
          row === 1 ? 8 : id === "manchester" ? 7 : id === "edinburgh" ? 7 : 6;
      const building: Thing = {
        kind: "building",
        id: `uk-home-${id}-${i}`,
        x,
        y,
        w,
        h,
        height: a.height + (i % 3) * 0.65,
        colour: a.wall[i % a.wall.length],
        roof: a.roof[(i + row) % a.roof.length],
        style: a.style,
        label: `${a.names[i % a.names.length]} ${i + 1}`,
        accent: ukPlace(id)!.accent,
      };
      g.fill(x, y, w, h, "X");
      g.fill(x, y + h, w, 2, "-");
      const pathY = row === 0 ? 17 : row === 1 ? 51 : 72;
      g.fill(x + Math.floor(w / 2) - 1, y + h, 2, pathY - y - h + 1, "_");
      things.push(building);
    }
  for (const y of [17, 51, 72])
    for (let yy = y; yy < y + 2; yy++)
      for (let x = 0; x < 96; x++)
        if (!"=:".includes(g.t[yy][x])) g.t[yy][x] = "-";
  // Two public buildings have generous street frontages and distinct regional identities.
  const publicLabels: Record<string, string[]> = {
    kent: ["Canterbury Learning Hall", "Medway Makers Studio"],
    nottingham: ["Lace Market Library", "Sherwood Design Studio"],
    birmingham: ["Jewellery Workshop", "Canal Learning Exchange"],
    manchester: ["Music & Code Studio", "Warehouse Reading Room"],
    edinburgh: ["Old Town Learning Hall", "New Town Design Gallery"],
  };
  for (let i = 0; i < 2; i++) {
    const x = 29 + i * 23,
      y = 28,
      w = 16,
      h = 10;
    g.fill(x, y, w, h, "X");
    g.fill(x, y + h, w, 2, "-");
    g.fill(x + 6, y + h, 2, 12, "_");
    things.push({
      kind: "building",
      id: i===0&&universitiesInCity(id)[0] ? `university-site-${universitiesInCity(id)[0].id}` : `uk-${id}-public-${i}`,
      x,
      y,
      w,
      h,
      height: a.height + 3 + i * 2,
      colour: a.wall[(i + 2) % 4],
      roof: a.roof[i % 3],
      style: i === 0 ? "stone" : "office",
      label: i===0 ? universitiesInCity(id)[0]?.fullName??publicLabels[id][i] : publicLabels[id][i],
      accent: ukPlace(id)!.accent,
    });
  }
  g.fill(24, 53, 48, 2, "_");
  // Each district has a different ground plan as well as its own architecture.
  if (id === "kent") {
    for (const y of [28, 33, 38])
      for (const x of [5, 10, 15])
        if (g.t[y][x] === "g") {
          g.fill(x, y, 1, 1, "T");
          things.push({
            kind: "blossom",
            id: `uk-kent-orchard-${x}-${y}`,
            x,
            y,
          });
        }
    g.fill(46, 27, 4, 13, "f");
    g.fill(47, 27, 2, 13, "_");
  } else if (id === "birmingham" || id === "manchester") {
    // Canal and towpaths fit between the workshop buildings, with a clear crossing.
    g.fill(46, 27, 4, 13, "w");
    g.fill(45, 27, 1, 13, "_");
    g.fill(50, 27, 1, 13, "_");
    g.fill(45, id === "birmingham" ? 31 : 35, 6, 2, "-");
    if (id === "manchester") g.fill(3, 27, 12, 11, "-");
  } else if (id === "nottingham") {
    // A market court by the lace workshops and a small Sherwood tree grove.
    g.fill(46, 27, 5, 13, "-");
    for (const [x, y] of [
      [5, 28],
      [10, 30],
      [14, 27],
      [8, 36],
    ]) {
      g.fill(x, y, 1, 1, "T");
      things.push({ kind: "tree", id: `uk-nottingham-grove-${x}-${y}`, x, y });
    }
  } else if (id === "edinburgh") {
    // Formal garden strips with a cross-axis, inspired by New Town squares.
    g.fill(45, 27, 7, 13, "f");
    g.fill(48, 27, 1, 13, "_");
    g.fill(45, 33, 7, 1, "_");
    g.fill(3, 28, 12, 8, "f");
    g.fill(8, 28, 2, 8, "_");
  }
  for (const [x, y] of [
    [6, 29],
    [10, 34],
    [12, 47],
    [83, 30],
    [86, 38],
    [88, 48],
    [8, 60],
    [65, 6],
    [43, 3],
    [57, 75],
  ])
    if (g.t[y][x] === "g") {
      g.fill(x, y, 1, 1, "T");
      things.push({
        kind: id === "kent" ? "blossom" : "tree",
        id: `uk-${id}-tree-${x}-${y}`,
        x,
        y,
      });
    }
  for (const [x, y] of [
    [24, 25],
    [70, 25],
    [24, 61],
    [70, 61],
  ]) {
    g.fill(x, y, 1, 1, "L");
    things.push({ kind: "lamp", id: `uk-${id}-lamp-${x}-${y}`, x, y });
  }
  return {
    tiles: g.rows(),
    things,
    stations: [],
    spawn: point(23.5, 25.5),
    river: [],
    routes: [
      [
        [20, 22],
        [76, 22],
        [76, 58],
        [20, 58],
        [20, 22],
      ],
    ],
  };
}
/** Long three-lane dual carriageway. End turn bays exist beyond the signed central motorway. */
function motorwayScene(): Built {
  const L = M25_COLS;
  const g = canvas(L, 72),
    things: Thing[] = [];
  // Three two-tile lanes plus hard shoulders, in each direction. UK left-hand flow.
  g.fill(0, 24, L, 24, "-");
  g.fill(0, 26, L, 8, "=");
  g.fill(0, 38, L, 8, "=");
  for (const y of [28, 30, 32, 40, 42, 44]) g.fill(0, y, L, 1, ":");
  g.fill(24, 34, L - 48, 4, "X"); // Physical central reservation, never a pedestrian shortcut.
  g.fill(0, 34, 24, 4, "=");
  g.fill(L - 24, 34, 24, 4, "=");
  const serviceLabels = [
    "M25 J21 · M1 · The North",
    "M25 J2 · A2 · Kent",
    "M25 J23 · A1(M)",
    "M25 J15 · M4 · Heathrow",
    "M25 J10 · A3 · Guildford",
    "M25 J28 · A12 · Brentwood",
  ];
  const services: [number, number][] = [];
  for (let i = 0; i < serviceLabels.length; i++) {
    const x = 68 + i * 100 + (i >= 2 ? 20 : 0),
      y = i % 2 ? 54 : 7,
      w = 24,
      h = 9;
    services.push([x, y]);
    g.fill(x, y, w, h, "X");
    things.push({
      kind: "building",
      id: `uk-m25-services-${i}`,
      x,
      y,
      w,
      h,
      height: 6.5,
      colour: i % 2 ? "#dbe5e5" : "#cad9df",
      roof: "#3d5360",
      style: "shop",
      label: serviceLabels[i],
      accent: "#24559a",
    });
    // Off-road service yards; no urban footpath, residence or people on motorway lanes.
    g.fill(x - 3, y + h, w + 6, 3, "-");
  }
  // Verge planting either side, kept clear of the service yards and the tunnel roofs.
  for (let x = 6; x < L - 6; x += 7) {
    if (M25_TUNNELS.some(([a, b]) => x > a - 4 && x < b + 4)) continue;
    for (const [y, step] of [[3, 0], [19, 3], [52, 1], [66, 4]] as const) {
      const tx = x + step;
      if (services.some(([sx, sy]) => tx > sx - 5 && tx < sx + 29 && Math.abs(y - sy - 4) < 9)) continue;
      things.push({ kind: "tree", id: `uk-m25-verge-${tx}-${y}`, x: tx, y });
    }
  }
  return {
    tiles: g.rows(),
    things,
    stations: [],
    spawn: point(40.5, 30.5),
    river: [],
    routes: [
      [
        [12, 28],
        [L - 12, 28],
        [L - 12, 44],
        [12, 44],
        [12, 28],
      ],
      [
        [16, 30],
        [L - 16, 30],
        [L - 16, 42],
        [16, 42],
        [16, 30],
      ],
      [
        [20, 32],
        [L - 20, 32],
        [L - 20, 40],
        [20, 40],
        [20, 32],
      ],
    ],
  };
}
/** The A101 Rotherhithe Tunnel: one long straight bore. Two lanes, a raised walkway each side, then tiled walls. */
export const TUNNEL_ROAD = { top: 8, bottom: 12 } as const;
function tunnelScene(): Built {
  const L = 112;
  const g = canvas(L, 20);
  // Solid rock and concrete around the bore: no grass anywhere.
  g.fill(0, 0, L, 20, "X");
  g.fill(0, 7, L, 1, "-");
  g.fill(0, 12, L, 1, "-");
  g.fill(0, 8, L, 4, "=");
  g.fill(0, 10, L, 1, ":");
  return {
    tiles: g.rows(),
    things: [],
    stations: [],
    spawn: point(14.5, 7.5),
    river: [],
    // Traffic runs both ways along the centre line (one lane each side).
    routes: [
      [
        [3, 10],
        [L - 3, 10],
        [3, 10],
      ],
    ],
  };
}
export function buildUKScene(id: string): Built | null {
  if (!isUKScene(id)) return null;
  if (!sceneCache.has(id))
    sceneCache.set(
      id,
      id === "m25"
        ? motorwayScene()
        : id === "rotherhithe"
          ? tunnelScene()
          : id.startsWith("road-") ? corridorScene(id)! : regionScene(id),
    );
  return sceneCache.get(id)!;
}
function homeMap(id: string, region: string, index: number): WorldMap | null {
  const scene = buildUKScene(region),
    building = scene?.things.find((t) => t.kind === "building" && t.id === id);
  if (!building || building.kind !== "building") return null;
  const g = canvas(22, 18);
  g.fill(0, 0, 22, 18, ".");
  g.fill(0, 0, 22, 1, "W");
  g.fill(0, 17, 22, 1, "#");
  g.fill(0, 0, 1, 18, "#");
  g.fill(21, 0, 1, 18, "#");
  // Real furniture pieces use the same footprints for rendering and collision.
  const furnishings = [
    { item: "sofa", x: 3, y: 3, w: 4, h: 2, ch: "s" },
    { item: "table", x: 4, y: 7, w: 3, h: 2, ch: "o" },
    { item: "desk", x: 3, y: 11, w: 4, h: 2, ch: "d" },
    { item: "shelf", x: 3, y: 14, w: 3, h: 1, ch: "b" },
    { item: "kitchen", x: 14, y: 3, w: 4, h: 2, ch: "k" },
    { item: "fridge", x: 18, y: 5, w: 2, h: 1, ch: "F" },
    { item: "bed", x: 14, y: 9, w: 4, h: 4, ch: "s" },
    { item: "plant", x: 18, y: 14, w: 1, h: 1, ch: "p" },
  ];
  const mirrored =
    ["edinburgh", "birmingham"].includes(region) !== (index % 2 === 1);
  for (const f of furnishings) {
    if (mirrored) f.x = 22 - f.x - f.w;
    g.fill(f.x, f.y, f.w, f.h, f.ch);
  }
  const layout = furnishings.map((f, i) => ({
    key: `regional-${i}`,
    item: f.item,
    x: f.x,
    y: f.y,
  }));
  const desk = furnishings.find((f) => f.item === "desk")!,
    bed = furnishings.find((f) => f.item === "bed")!;
  const place = ukPlace(region)!;
  return {
    id,
    kind: "home",
    name: `${building.label} · ${place.name}`,
    cols: 22,
    rows: 18,
    width: 22 * TILE,
    height: 18 * TILE,
    tiles: g.rows(),
    structures: [],
    layout,
    portals: [
      portal("front-door", 10, 16, 2, 1, `Return to ${place.name}`, region),
      {
        id: "regional-study",
        rect: {
          x: (desk.x + desk.w) * TILE,
          y: desk.y * TILE,
          w: TILE,
          h: TILE,
        },
        label: "Study desk",
        to: { kind: "study-room" },
      },
      {
        id: "regional-rest",
        rect: {
          x: (bed.x + 1) * TILE,
          y: (bed.y + bed.h) * TILE,
          w: 2 * TILE,
          h: TILE,
        },
        label: "Rest in this neighbourhood home",
        to: { kind: "act", activity: "sleep" },
      },
    ],
    rooms: [
      {
        name: "Lounge & study",
        rect: { x: TILE, y: TILE, w: 9 * TILE, h: 14 * TILE },
      },
      {
        name: "Kitchen & bedroom",
        rect: { x: 13 * TILE, y: TILE, w: 7 * TILE, h: 14 * TILE },
      },
    ],
    spawn: point(11, 15),
    accent: place.accent,
    theme: {
      floor: index % 2 ? ["#d3baa1", "#d9c4ae"] : ["#e5d7bd", "#eaddca"],
      wall: building.colour,
      skirting: building.roof,
    },
  };
}
export function ukWorldMap(id: string): WorldMap | null {
  if (mapCache.has(id)) return mapCache.get(id)!;
  if(id.startsWith("road-")){const corridor=corridorMap(id);if(corridor)mapCache.set(id,corridor);return corridor;}
  const home =
    /^uk-home-(kent|nottingham|birmingham|manchester|edinburgh)-(\d+)$/.exec(
      id,
    );
  if (home) {
    const map = homeMap(id, home[1], Number(home[2]));
    if (map) mapCache.set(id, map);
    return map;
  }
  const scene = buildUKScene(id);
  if (!scene) return null;
  const place = ukPlace(id),
    portals: Portal[] = [];
  if (regionIds.has(id)) {
    for (const th of scene.things)
      if (th.kind === "building") {
        const x = th.x + Math.floor(th.w / 2) - 1,
          y = th.y + th.h;
        if (th.id.startsWith("uk-home-"))
          portals.push(portal(th.id, x, y, 2, 1, `Enter ${th.label}`, th.id));
        else if(th.id.startsWith("university-site-")) portals.push(portal(th.id,x,y,2,1,`Enter ${th.label}`,`university-${th.id.slice(16)}`));
        else if(th.id.endsWith("public-1")) portals.push(portal(`party-${id}`,x,y,2,1,"Community social · music and challenges",`party-${id}`));
        else
          portals.push({
            id: th.id,
            rect: { x: x * TILE, y: y * TILE, w: 2 * TILE, h: TILE },
            label: `${th.label} · study`,
            to: { kind: "study-room" },
          });
      }
    portals.push(
      portal(
        "orbital-west",
        4,
        21,
        2,
        2,
        `M25 · ${place!.roadLabels.join(" / ")} · London`,
        `road-${id}`,
      ),
    );
    portals.push(
      portal("orbital-east", 89, 57, 2, 2, "Motorway · London", `road-${id}`),
    );
  } else if (id === "m25") {
    const exits = [
      { id: "city", x: 52 },
      { id: "kent", x: 152 },
      { id: "nottingham", x: 302 },
      { id: "birmingham", x: 392 },
      { id: "manchester", x: 552 },
      { id: "edinburgh", x: 652 },
    ];
    for (const exit of exits) {
      const route = UK_ROUTES.find((r) =>
        exit.id === "city" ? r.id === "london-orbital" : r.to === exit.id,
      )!;
      const gateId =
        exit.id === "city" ? "london-return" : `junction-${exit.id}`;
      portals.push(portal(gateId, exit.x, 29, 3, 2, route.label, exit.id === "city" ? "city" : `road-${exit.id}`));
      portals.push(
        portal(`${gateId}-westbound`, exit.x, 41, 3, 2, route.label, exit.id === "city" ? "city" : `road-${exit.id}`),
      );
    }
  } else {
    portals.push(
      portal(
        "rotherhithe-north",
        1,
        8,
        2,
        4,
        "A101 · Limehouse · back to London",
        "city",
      ),
    );
    portals.push(
      portal(
        "rotherhithe-south",
        109,
        8,
        2,
        4,
        "A101 · Rotherhithe · back to London",
        "city",
      ),
    );
  }
  const map: WorldMap = {
    id,
    kind: "city",
    name:
      place?.name ??
      (id === "m25" ? "M25 · London Orbital" : "A101 · Rotherhithe Tunnel"),
    cols: scene.tiles[0].length,
    rows: scene.tiles.length,
    width: scene.tiles[0].length * TILE,
    height: scene.tiles.length * TILE,
    tiles: scene.tiles,
    structures: [],
    portals,
    rooms: [],
    spawn: scene.spawn,
    accent: place?.accent ?? "#35639a",
    sign: {
      x: id === "m25" ? 120 : 48,
      y: id === "rotherhithe" ? 6 : id === "m25" ? 20 : 55,
      text:
        id === "m25"
          ? "M25 · three lanes each way · signed regional exits"
          : id === "rotherhithe"
            ? "A101 · Rotherhithe Tunnel"
            : `${place!.name} · ${place!.housing}`,
    },
  };
  mapCache.set(id, map);
  return map;
}
/** Return to the doorway or junction used to enter, instead of the district's generic spawn. */
export function ukArrival(
  mapId: string,
  fromMapId: string,
  viaPortalId?: string,
): { x: number; y: number } | null {
  if (mapId === "city") {
    const gateway =
      fromMapId === "rotherhithe"
        ? UK_GATEWAYS.find(
            (g) =>
              g.id ===
              (viaPortalId === "rotherhithe-south"
                ? "uk-tunnel-south"
                : "uk-tunnel-north"),
          )
        : UK_GATEWAYS.find((g) => g.mapId === fromMapId);
    return gateway
      ? point(gateway.x + gateway.w / 2 + 0.5, gateway.y + gateway.h + 1.5)
      : null;
  }
  const map = ukWorldMap(mapId);
  if (!map) return null;
  if(mapId.startsWith("road-")){return fromMapId === "m25" ? point(24,30) : point(680,58);}
  if(fromMapId.startsWith("road-") && regionIds.has(mapId))return point(9,21);
  if (mapId === "m25" && fromMapId !== "city") {
    const junction=map.portals.find(p=>p.to.kind === "map" && p.to.mapId===(regionIds.has(fromMapId)?`road-${fromMapId}`:fromMapId) && p.id.endsWith("-westbound"));
    if(junction)return {x:junction.rect.x+junction.rect.w/2,y:42*TILE};
  }
  if (mapId === "rotherhithe" && fromMapId === "city")
    return point(viaPortalId === "uk-tunnel-south" ? 97.5 : 14.5, viaPortalId === "uk-tunnel-south" ? 12.5 : 7.5);
  if (fromMapId.startsWith("uk-home-")) {
    const door = map.portals.find(
      (p) => p.to.kind === "map" && p.to.mapId === fromMapId,
    );
    if (door)
      return {
        x: door.rect.x + door.rect.w / 2,
        y: door.rect.y + door.rect.h + TILE * 0.6,
      };
  }
  const gate = map.portals.find(
    (p) => p.to.kind === "map" && p.to.mapId === fromMapId,
  );
  return gate
    ? { x: gate.rect.x + gate.rect.w / 2, y: gate.rect.y + gate.rect.h + TILE }
    : map.spawn;
}
/**
 * Paired open arterial exits make a finite district repeat indefinitely.
 * Only marked matching roads wrap: parks, water, interiors and arbitrary edges do not.
 * Trigger before the car's nose hits the boundary; land farther inside than the trigger.
 */
export function loopRoadPosition(
  mapId: string,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const city = mapId === "city",
    region = regionIds.has(mapId),
    motorway = mapId === "m25";
  if (!city && !region && !motorway) return null;
  const cols = city ? 256 : motorway ? M25_COLS : 96,
    rows = city ? 200 : motorway ? 72 : 80,
    width = cols * TILE,
    height = rows * TILE;
  if (x < 0 || y < 0 || x > width || y > height) return null;
  const horizontal = city
    ? [
        [19.4, 22.6],
        [59.4, 62.6],
      ]
    : motorway
      ? [
          [26.4, 33.6],
          [38.4, 45.6],
        ]
      : [
          [20.4, 23.6],
          [56.4, 59.6],
        ];
  const vertical = region
    ? [
        [18.4, 21.6],
        [74.4, 77.6],
      ]
    : [];
  const trigger = 2.5 * TILE,
    landing = 4 * TILE;
  if (horizontal.some(([a, b]) => y / TILE >= a && y / TILE <= b)) {
    if (x < trigger) return { x: width - landing, y };
    if (x > width - trigger) return { x: landing, y };
  }
  if (vertical.some(([a, b]) => x / TILE >= a && x / TILE <= b)) {
    if (y < trigger) return { x, y: height - landing };
    if (y > height - trigger) return { x, y: landing };
  }
  return null;
}
