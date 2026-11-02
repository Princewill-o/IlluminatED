import type { WorldMap } from "./world";

export function partyMap(city: string): WorldMap {
  const cols = 36,
    rows = 28,
    tiles: string[][] = Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? "#" : ".",
      ),
    );
  const fill = (x: number, y: number, w: number, h: number, t: string) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = t;
  };
  fill(10, 5, 16, 13, "l");
  fill(13, 3, 10, 1, "d");
  fill(3, 5, 4, 1, "k");
  fill(3, 6, 4, 1, "c");
  fill(3, 19, 6, 1, "s");
  fill(28, 19, 5, 1, "s");
  fill(28, 5, 4, 1, "t");
  return {
    id: `party-${city}`,
    kind: "office",
    name: `${city === "city" ? "London" : city} · community social`,
    cols,
    rows,
    width: cols * 32,
    height: rows * 32,
    tiles: tiles.map((r) => r.join("")),
    structures: [],
    spawn: { x: 18 * 32, y: 25 * 32 },
    accent: "#7659d6",
    rooms: [
      {
        name: "Dance floor",
        rect: { x: 10 * 32, y: 5 * 32, w: 16 * 32, h: 13 * 32 },
      },
      {
        name: "Quiet corner",
        rect: { x: 2 * 32, y: 18 * 32, w: 8 * 32, h: 5 * 32 },
      },
    ],
    portals: [
      {
        id: "exit",
        rect: { x: 17 * 32, y: 26 * 32, w: 2 * 32, h: 32 },
        label: "Return to the city",
        to: {
          kind: "map",
          mapId: city,
          label: city === "city" ? "London" : city,
        },
      },
      {
        id: "refreshments",
        rect: { x: 3 * 32, y: 7 * 32, w: 4 * 32, h: 32 },
        label: "Refreshments · recharge",
        to: { kind: "act", activity: "eat" },
      },
      {
        id: "team-challenge",
        rect: { x: 28 * 32, y: 7 * 32, w: 4 * 32, h: 32 },
        label: "Study challenge · play a round",
        to: { kind: "study-room" },
      },
    ],
    sign: { x: 18, y: 2, text: "Community social · dance, chat, create" },
  };
}
