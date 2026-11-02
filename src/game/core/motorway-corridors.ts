import type { Built, Thing } from "./london";
import type { Portal, WorldMap } from "./world";

export const MOTORWAY_CORRIDORS = [
  {
    city: "kent",
    name: "Kent · Canterbury",
    roads: ["A2", "M2", "A2 / A2050"],
    junction: "M25 J2",
  },
  {
    city: "nottingham",
    name: "Nottingham",
    roads: ["M1", "M1 J24", "A453 / A52"],
    junction: "M25 J21",
  },
  {
    city: "birmingham",
    name: "Birmingham",
    roads: ["M1", "M6", "A38(M)"],
    junction: "M25 J21",
  },
  {
    city: "manchester",
    name: "Manchester",
    roads: ["M1 / M6", "M6", "A556 / M56 / A5103"],
    junction: "M25 J21",
  },
  {
    city: "edinburgh",
    name: "Edinburgh",
    roads: ["A1(M)", "A1", "A720 / A7"],
    junction: "M25 J23",
  },
] as const;
export const motorwayCorridor = (id: string) =>
  MOTORWAY_CORRIDORS.find((route) => id === `road-${route.city}`);
const TILE = 32,
  COLS = 720,
  ROWS = 72;

/** A driven, compressed corridor: motorway lanes continue while the signed city slip diverges. */
export function corridorScene(id: string): Built | null {
  const route = motorwayCorridor(id);
  if (!route) return null;
  const tiles = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => "g"),
  );
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (tiles[yy]?.[xx] !== undefined) tiles[yy][xx] = ch;
  };
  fill(0, 24, COLS, 24, "-");
  fill(0, 26, COLS, 8, "=");
  fill(0, 38, COLS, 8, "=");
  for (const lane of [28, 30, 32, 40, 42, 44]) fill(0, lane, COLS, 1, ":");
  fill(16, 34, COLS - 32, 4, "X");
  fill(0, 26, 16, 20, "=");
  fill(COLS - 16, 26, 16, 20, "=");
  // A long taper peels into the city, leaving the through carriageway intact.
  for (let x = COLS - 170; x < COLS - 24; x++) {
    const k = (x - (COLS - 170)) / 146;
    fill(x, Math.round(30 - 16 * k) - 3, 1, 7, "=");
    fill(x, Math.round(42 + 16 * k) - 3, 1, 7, "=");
  }
  fill(COLS - 28, 10, 28, 8, "=");
  fill(COLS - 28, 54, 28, 8, "=");
  const things: Thing[] = [];
  for (let i = 0; i < 8; i++)
    things.push({
      kind: "building",
      id: `${id}-route-board-${i}`,
      x: 45 + i * 83,
      y: 14,
      w: 10,
      h: 2,
      height: 4,
      colour: "#09559a",
      roof: "#09559a",
      style: "office",
      label: `${route.roads[Math.min(2, Math.floor(i / 3))]} · ${i >= 6 ? `${route.name} exit ↗` : route.name}`,
      accent: "#fff",
    });
  for (let i = 0; i < 48; i++)
    things.push({
      kind: "tree",
      id: `${id}-verge-${i}`,
      x: 12 + i * 14,
      y: i % 2 ? 6 : 62,
    });
  return {
    tiles: tiles.map((row) => row.join("")),
    things,
    stations: [],
    river: [],
    spawn: { x: 20 * TILE, y: 30 * TILE },
    routes: [28, 30, 32, 40, 42, 44].map((y, i) =>
      i < 3
        ? [
            [18, y],
            [COLS - 10, y],
            [COLS - 10, y + 12],
            [10, y + 12],
            [10, y],
            [18, y],
          ]
        : [
            [COLS - 18, y],
            [10, y],
            [10, y - 12],
            [COLS - 10, y - 12],
            [COLS - 10, y],
            [COLS - 18, y],
          ],
    ),
  };
}
export function corridorMap(id: string): WorldMap | null {
  const route = motorwayCorridor(id),
    scene = corridorScene(id);
  if (!route || !scene) return null;
  const gate = (
    name: string,
    x: number,
    y: number,
    to: string,
    label: string,
  ): Portal => ({
    id: name,
    rect: { x: x * TILE, y: y * TILE, w: 5 * TILE, h: 6 * TILE },
    label,
    to: { kind: "map", mapId: to, label },
  });
  return {
    id,
    kind: "city",
    name: `${route.roads.join(" → ")} · ${route.name}`,
    cols: COLS,
    rows: ROWS,
    width: COLS * TILE,
    height: ROWS * TILE,
    tiles: scene.tiles,
    structures: [],
    rooms: [],
    accent: "#09559a",
    spawn: scene.spawn,
    portals: [
      gate(
        "orbital-return",
        14,
        39,
        "m25",
        `${route.junction} · London orbital`,
      ),
      gate("city-slip", COLS - 24, 11, route.city, `${route.name} · city exit`),
      gate(
        "city-return",
        COLS - 24,
        55,
        route.city,
        `${route.name} · local road`,
      ),
    ],
    sign: {
      x: COLS - 110,
      y: 20,
      text: `${route.name} · exit left · through lanes continue`,
    },
  };
}
