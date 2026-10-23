import type { Built, Thing } from "./london";

/**
 * Fountain Square: London's new city centre, in the middle of the map where the
 * two central avenues cross. A gothic town hall with a clock tower fronts a
 * paved square, with a tiered fountain at its heart, blossom beds in the four
 * corners and a ring of Victorian double lamps. Everyone arrives here.
 *
 * The square sits in the block bounded by the x = 132 avenue (west), the
 * x = 160 avenue (east) and the y = 104 cross-town road (south). Tiles.
 */
export const CITY_CENTRE = { x: 136, y: 76, w: 22, h: 26 } as const;
export const TOWN_HALL = { x: 138, y: 76, w: 18, h: 8 } as const;
export const FOUNTAIN = { x: 145, y: 90, w: 5, h: 5 } as const;
/** Where every player appears: on the square, just south of the fountain. */
export const CITY_CENTRE_SPAWN = { x: 147 * 32 + 16, y: 97 * 32 + 16 };

export function buildCityCentre(core: Built): Built {
  const grid = core.tiles.map((row) => row.split(""));
  const { x: X, y: Y, w: W, h: H } = CITY_CENTRE;
  const inside = (x: number, y: number) => x >= X && x < X + W && y >= Y && y < Y + H;
  const set = (x: number, y: number, ch: string) => { if (inside(x, y)) grid[y][x] = ch; };
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, ch);
  };
  // Clear the old garden furniture out of the block, keep everything else.
  const things: Thing[] = core.things.filter((t) => {
    if (!inside(t.x, t.y)) return true;
    if (t.kind === "building" || t.kind === "station" || t.kind === "landmark")
      throw new Error(`City centre overlaps ${t.id}`);
    return false;
  });
  fill(X, Y, W, H, "-");
  let n = 0;
  const add = (thing: Thing, tile: string) => {
    things.push(thing);
    if ("w" in thing) fill(thing.x, thing.y, thing.w, thing.h, tile);
    else set(thing.x, thing.y, tile);
  };

  // Town hall with its clock tower on the north side; its doors face the square.
  add({ kind: "landmark", id: "town-hall", name: "town-hall", ...TOWN_HALL }, "X");
  // The fountain in the middle of the square.
  add({ kind: "landmark", id: "fountain", name: "fountain", ...FOUNTAIN }, "X");

  // Four blossom beds in the corners of the plaza, each with a tree and two benches.
  for (const [bx, by] of [[138, 86], [153, 86], [138, 96], [153, 96]] as const) {
    fill(bx, by, 3, 3, "f");
    add({ kind: "blossom", id: `square-blossom-${n++}`, x: bx + 1, y: by + 1 }, "T");
  }
  // Benches face the fountain from the four sides.
  for (const [x, y] of [[143, 88], [151, 88], [143, 96], [151, 96]] as const)
    add({ kind: "bench", id: `square-bench-${n++}`, x, y }, "B");
  // A ring of Victorian double lamps around the fountain and along the edges.
  for (const [x, y] of [[144, 86], [150, 86], [142, 92], [152, 92], [136, 85], [157, 85], [136, 100], [157, 100], [141, 100], [153, 100]] as const)
    add({ kind: "lamp", id: `square-lamp-${n++}`, x, y }, "L");
  // A red phone box and a post box on the south pavement.
  add({ kind: "phonebox", id: `square-phonebox-${n++}`, x: 137, y: 99 }, "X");
  add({ kind: "postbox", id: `square-postbox-${n++}`, x: 156, y: 99 }, "X");
  // Keep the town hall's front steps and the approach to the doors clear.
  fill(TOWN_HALL.x, TOWN_HALL.y + TOWN_HALL.h, TOWN_HALL.w, 1, "-");

  return { ...core, tiles: grid.map((row) => row.join("")), things, spawn: CITY_CENTRE_SPAWN };
}
