import { TILE, blocked, type WorldMap } from "./world";

export interface ResidentPath {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
/** Short public pavement/floor walks. Never route residents through walls, furniture or roads. */
export function residentPaths(map: WorldMap, count: number): ResidentPath[] {
  if (map.kind === "home") return [];
  const allowed =
    map.art === "london"
      ? new Set(["-", "_"])
      : new Set(["-", "_", ".", "m", "g"]);
  const paths: ResidentPath[] = [];
  const open = (x: number, z: number) =>
    allowed.has(map.tiles[z]?.[x]) &&
    !blocked(map, (x + 0.5) * TILE, (z + 0.5) * TILE);
  for (const vertical of [false, true]) {
    const rows = vertical ? map.cols : map.rows;
    const cols = vertical ? map.rows : map.cols;
    for (let row = 1; row < rows - 1; row += 2) {
      let start = -1;
      for (let col = 1; col < cols; col++) {
        const ok =
          col < cols - 1 && open(vertical ? row : col, vertical ? col : row);
        if (ok && start === -1) start = col;
        if ((!ok || col - start >= 9) && start !== -1) {
          if (col - start >= 3)
            paths.push(
              vertical
                ? {
                    x0: row + 0.5,
                    z0: start + 0.5,
                    x1: row + 0.5,
                    z1: col - 0.5,
                  }
                : {
                    x0: start + 0.5,
                    z0: row + 0.5,
                    x1: col - 0.5,
                    z1: row + 0.5,
                  },
            );
          start = ok ? col : -1;
        }
      }
    }
  }
  const choices =
    map.id === "study-lobby"
      ? paths.filter(
          (p) => Math.hypot((p.x0 + p.x1) / 2 - 13, (p.z0 + p.z1) / 2 - 13) < 8,
        )
      : paths;
  return Array.from(
    { length: Math.min(count, choices.length) },
    (_, i) =>
      choices[
        Math.floor(
          ((i + 0.5) * choices.length) / Math.min(count, choices.length),
        )
      ],
  );
}
/** A relaxed walk, pause, turn and return; phase offsets keep the town unsynchronised. */
export function residentPose(
  path: ResidentPath,
  seconds: number,
  offset: number,
) {
  const length = Math.hypot(path.x1 - path.x0, path.z1 - path.z0);
  const travel = length / 0.85;
  const t = (seconds + offset) % (travel * 2 + 5);
  const returning = t > travel + 2.5;
  const progress = returning
    ? 1 - Math.min(1, (t - travel - 2.5) / travel)
    : Math.min(1, t / travel);
  return {
    x: path.x0 + (path.x1 - path.x0) * progress,
    z: path.z0 + (path.z1 - path.z0) * progress,
    walking: returning ? t < travel * 2 + 2.5 : t < travel,
    angle:
      Math.atan2(path.x1 - path.x0, path.z1 - path.z0) +
      (returning ? Math.PI : 0),
  };
}
/** A commuter drives, pulls over, gets out, stretches on the pavement and returns. */
export function commuterPhase(seconds: number, offset: number) {
  const clock = seconds + offset;
  const cycle = Math.floor(clock / 46);
  const t = clock % 46;
  const parked = t >= 20 && t < 42;
  const pull =
    t < 20
      ? 0
      : t < 23
        ? (t - 20) / 3
        : t < 39
          ? 1
          : t < 42
            ? 1 - (t - 39) / 3
            : 0;
  const stroll =
    t < 25
      ? 0
      : t < 28
        ? (t - 25) / 3
        : t < 34
          ? 1
          : t < 38
            ? 1 - (t - 34) / 4
            : 0;
  return {
    distance: cycle * 24 + Math.min(t, 20) + Math.max(0, t - 42),
    pull,
    out: t >= 24 && t < 38,
    stroll,
    walking: (t >= 24 && t < 28) || (t >= 34 && t < 38),
    parked,
  };
}
