import * as THREE from "three";

import { universityLandmark } from "./university3d";

import type { Built, Thing } from "@/game/core/london";
import type { TrafficVehicle } from "@/game/core/traffic-rules";
import type { WorldMap } from "@/game/core/world";

type Building = Extract<Thing, { kind: "building" }>;
type Drawing = {
  box: (
    g: THREE.Group,
    c: string,
    x: number,
    y: number,
    z: number,
    x1: number,
    y1: number,
    z1: number,
  ) => THREE.Mesh;
  roof: (
    g: THREE.Group,
    c: string,
    x: number,
    z: number,
    x1: number,
    z1: number,
    y: number,
    h: number,
  ) => unknown;
  sign: (
    text: string,
    options: { bg: string; fg: string; w: number; h: number },
  ) => THREE.Object3D;
  mat: (colour: string) => THREE.Material;
  /** Draws a university by id into its plot (the Blender model, when the game supplies one). */
  landmark?: (g: THREE.Group, id: string, t: { x: number; y: number; w: number; h: number; height?: number }) => void;
};

export function addUKGateways(
  parent: THREE.Group,
  gateways: readonly {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }[],
  d: Drawing,
) {
  for (const gate of gateways) {
    const x = gate.x + gate.w / 2,
      z = gate.y + gate.h / 2;
    // Floating game wayfinding stays above existing clear roads, so it cannot
    // obstruct a destination's frontage or introduce invisible collision posts.
    const board = d.sign(gate.label, {
      bg: gate.id.includes("tunnel") ? "#e8dfca" : "#235591",
      fg: gate.id.includes("tunnel") ? "#2c4650" : "#ffffff",
      w: 3.4,
      h: 0.42,
    });
    // Low and compact: a floating full-width banner blocked the view from Fountain Square.
    board.position.set(x, 2.5, z);
    parent.add(board);
    for (const side of [-1, 1])
      d.box(parent, "#5d6670", x + side * 1.6 - 0.05, 0, z - 0.05, x + side * 1.6 + 0.05, 2.3, z + 0.05);
    for (const side of [-1, 1])
      d.box(
        parent,
        "#d3ad5e",
        x + side * 0.65 - 0.07,
        0.035,
        z - 0.25,
        x + side * 0.65 + 0.07,
        0.055,
        z + 0.25,
      );
  }
}

/** Facades retain the authored plot and height instead of rescaling a London prefab. */
export function ukBuildingPlan(id: string, t: Building) {
  return {
    x: t.x + 0.1,
    z: t.y + 0.1,
    width: t.w - 0.2,
    depth: t.h - 0.2,
    height: Math.max(5, t.height),
    wall: t.colour,
    roof: t.roof,
    trim:
      id === "edinburgh" ? "#e6dec9" : id === "kent" ? "#f4ead7" : "#ddc7a6",
    detail:
      id === "kent"
        ? "weatherboard-oast"
        : id === "nottingham"
          ? "lace-brick"
          : id === "birmingham"
            ? "workshop-canal"
            : id === "manchester"
              ? "warehouse-loft"
              : "sandstone-tenement",
  };
}

/** Cut away the part of the tunnel near play; keep distant roofs opaque. */
export const tunnelRoofVisible = (
  sectionX: number,
  playerX: number,
  playerZ: number,
  overview = false,
) =>
  overview || Math.abs(sectionX - playerX) > 20 || playerZ < 5 || playerZ > 34;

/** Local lane clearance. Regional roads have no invisible London traffic lights. */
export function regionalTrafficClearance(
  vehicle: TrafficVehicle,
  desired: number,
  others: readonly TrafficVehicle[],
  people: readonly { x: number; y: number }[],
) {
  if (!Number.isFinite(desired) || desired <= 0) return 0;
  let allowed = desired;
  const dx = Math.cos(vehicle.heading),
    dy = Math.sin(vehicle.heading),
    length = vehicle.length ?? 3.3,
    width = vehicle.width ?? 1.4;
  for (const other of others) {
    if (other === vehicle || (other.id && other.id === vehicle.id)) continue;
    const angle = other.heading - vehicle.heading;
    const front = (other.x - vehicle.x) * dx + (other.y - vehicle.y) * dy;
    const side = Math.abs(
      (other.x - vehicle.x) * -dy + (other.y - vehicle.y) * dx,
    );
    const otherLong =
      (Math.abs(Math.cos(angle)) * (other.length ?? 3.3)) / 2 +
      (Math.abs(Math.sin(angle)) * (other.width ?? 1.4)) / 2;
    const otherWide =
      (Math.abs(Math.cos(angle)) * (other.width ?? 1.4)) / 2 +
      (Math.abs(Math.sin(angle)) * (other.length ?? 3.3)) / 2;
    if (front <= 0 || side >= width / 2 + otherWide + 0.1) continue;
    const gap = front - length / 2 - otherLong - 0.3;
    // If perpendicular vehicles touch at a corner, deterministic priority lets one clear.
    if (
      gap < 0 &&
      Math.abs(Math.cos(angle)) < 0.2 &&
      (vehicle.id ?? "") < (other.id ?? "")
    )
      continue;
    allowed = Math.min(allowed, Math.max(0, gap));
  }
  for (const person of people) {
    const front = (person.x - vehicle.x) * dx + (person.y - vehicle.y) * dy;
    const side = Math.abs(
      (person.x - vehicle.x) * -dy + (person.y - vehicle.y) * dx,
    );
    if (front > 0 && side < width / 2 + 0.3)
      allowed = Math.min(allowed, Math.max(0, front - length / 2 - 0.4));
  }
  return allowed;
}

export function addUKScenery(
  parent: THREE.Group,
  map: WorldMap,
  data: Built,
  d: Drawing,
) {
  const buildings: THREE.Group[] = [],
    lamps: THREE.Vector3[] = [],
    roofs: { x: number; mesh: THREE.Object3D }[] = [];
  const { box, roof, sign, mat } = d;
  for (const t of data.things) {
    const g = new THREE.Group();
    parent.add(g);
    if (t.kind === "building" && t.id.startsWith("university-site-")) {
      buildings.push(g);
      if (d.landmark) d.landmark(g, t.id.slice(16), t);
      else universityLandmark(g, t.id.slice(16), t, box as never, mat as never);
      continue;
    }
    if (t.kind === "building") {
      const p = ukBuildingPlan(map.id, t),
        x = p.x,
        z = p.z,
        w = p.width,
        depth = p.depth,
        front = z + depth,
        top = p.height;
      buildings.push(g);
      box(g, p.wall, x, 0.12, z, x + w, top, front);
      box(g, p.trim, x, 0.08, z, x + w, 0.32, front + 0.015);
      const flats = t.style === "office" || map.id === "edinburgh",
        levels = Math.max(2, Math.floor(top / 2.5)),
        bays = Math.max(2, Math.floor(w / 2.2));
      for (let level = 0; level < levels; level++)
        for (let bay = 0; bay < bays; bay++) {
          if (level === 0 && bay === Math.floor(bays / 2)) continue;
          const wx = x + ((bay + 0.5) * w) / bays - 0.4,
            wy = 0.85 + (level * (top - 0.9)) / levels,
            ww = map.id === "manchester" ? 1.15 : 0.78;
          box(
            g,
            p.trim,
            wx - 0.07,
            wy - 0.07,
            front,
            wx + ww + 0.07,
            wy + 1.25,
            front + 0.055,
          );
          box(
            g,
            level % 2 ? "#8ab5bc" : "#3d666f",
            wx,
            wy,
            front + 0.06,
            wx + ww,
            wy + 1.17,
            front + 0.09,
          );
          box(
            g,
            p.trim,
            wx + ww * 0.47,
            wy,
            front + 0.1,
            wx + ww * 0.53,
            wy + 1.17,
            front + 0.12,
          );
        }
      // Individual palettes, cornices, chimneys and roof profiles distinguish each region.
      for (let level = 1; level < levels; level++)
        box(
          g,
          p.trim,
          x,
          (level * top) / levels - 0.12,
          front,
          x + w,
          (level * top) / levels - 0.04,
          front + 0.08,
        );
      const door = x + w / 2;
      box(g, p.trim, door - 0.67, 0.1, front, door + 0.67, 2.35, front + 0.1);
      box(
        g,
        t.accent ?? "#355f59",
        door - 0.52,
        0.1,
        front + 0.11,
        door + 0.52,
        2.2,
        front + 0.15,
      );
      box(
        g,
        "#d9b873",
        door + 0.3,
        1.05,
        front + 0.155,
        door + 0.36,
        1.13,
        front + 0.19,
      );
      if (flats) {
        box(
          g,
          p.roof,
          x - 0.04,
          top,
          z - 0.02,
          x + w + 0.04,
          top + 0.22,
          front + 0.04,
        );
        box(
          g,
          p.trim,
          x - 0.03,
          top - 0.15,
          front,
          x + w + 0.03,
          top + 0.09,
          front + 0.08,
        );
      } else {
        roof(
          g,
          p.roof,
          x - 0.03,
          z - 0.03,
          x + w + 0.03,
          front + 0.03,
          top,
          0.8 + (t.x % 3) * 0.2,
        );
        box(
          g,
          p.wall,
          x + w * 0.2,
          top - 0.1,
          z + depth * 0.28,
          x + w * 0.2 + 0.45,
          top + 1.15,
          z + depth * 0.28 + 0.6,
        );
      }
      if (map.id === "kent") {
        for (let level = 1; level < Math.ceil(top / 0.48); level++)
          box(
            g,
            "#c3b9a2",
            x,
            0.48 * level,
            front + 0.02,
            x + w,
            0.48 * level + 0.035,
            front + 0.07,
          );
        if (t.x % 3 === 0) {
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 1.8, 8),
            mat(p.roof),
          );
          cap.position.set(x + w * 0.75, top + 0.9, z + depth * 0.35);
          cap.castShadow = true;
          g.add(cap);
        }
      } else if (map.id === "nottingham") {
        for (let i = 0; i < 4; i++)
          box(
            g,
            p.trim,
            x + (i * w) / 4 + 0.08,
            top - 0.5,
            front + 0.03,
            x + ((i + 1) * w) / 4 - 0.08,
            top - 0.29,
            front + 0.1,
          );
      } else if (map.id === "birmingham") {
        box(
          g,
          "#374e54",
          door - 0.95,
          2.4,
          front,
          door + 0.95,
          2.62,
          front + 0.13,
        );
      } else if (map.id === "manchester") {
        for (const side of [x + 0.22, x + w - 0.42])
          box(
            g,
            "#754c47",
            side,
            0.2,
            front + 0.03,
            side + 0.2,
            top,
            front + 0.15,
          );
      } else if (map.id === "edinburgh") {
        for (let level = 1; level < levels; level++)
          box(
            g,
            "#867f73",
            x,
            0.3 + level * 2,
            front + 0.025,
            x + w,
            0.35 + level * 2,
            front + 0.055,
          );
      }
      const board = sign(t.label ?? map.name, {
        bg: t.accent ?? map.accent,
        fg: "#fff4da",
        w: Math.min(w - 0.4, 5.8),
        h: 0.35,
      });
      board.position.set(door, 2.85, front + 0.18);
      g.add(board);
    } else if (t.kind === "tree" || t.kind === "blossom") {
      box(g, "#795b43", t.x + 0.38, 0, t.y + 0.38, t.x + 0.62, 2.5, t.y + 0.62);
      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.35, 1),
        mat(t.kind === "blossom" ? "#d7aca9" : "#5d8460"),
      );
      canopy.scale.set(1, 1.12, 1);
      canopy.position.set(t.x + 0.5, 3, t.y + 0.5);
      canopy.castShadow = true;
      g.add(canopy);
    } else if (t.kind === "lamp") {
      box(g, "#3d5356", t.x + 0.45, 0, t.y + 0.45, t.x + 0.55, 3.6, t.y + 0.55);
      box(g, "#f9e1aa", t.x + 0.2, 3.55, t.y + 0.2, t.x + 0.8, 3.8, t.y + 0.8);
      lamps.push(new THREE.Vector3(t.x + 0.5, 3.7, t.y + 0.5));
    }
  }
  if (map.id === "rotherhithe") {
    const tunnel = new THREE.Group();
    parent.add(tunnel);
    // The lower lane stays open; the covered north carriageway has stone portals.
    for (const z of [11.5, 16.3]) {
      box(tunnel, "#afa796", 22, 0, z, 90, z > 14 ? 1.1 : 4.2, z + 0.25);
      box(tunnel, "#455f66", 22, 0.5, z + 0.26, 90, 0.62, z + 0.3);
    }
    for (let x = 24; x <= 88; x += 8) {
      const segment = new THREE.Group();
      segment.userData.spin = true;
      tunnel.add(segment);
      const mesh = box(
        segment,
        "#92968e",
        x - 4,
        4.15,
        11.5,
        x + 4,
        4.45,
        16.6,
      );
      roofs.push({ x, mesh: segment });
      const strip = box(
        tunnel,
        "#f3dfaa",
        x - 0.8,
        3.7,
        11.84,
        x + 0.8,
        3.82,
        12,
      );
      strip.castShadow = false;
      lamps.push(new THREE.Vector3(x, 3.75, 12));
      // A dark arch frames the vault without covering the playable camera.
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.35, 0.16, 6, 18, Math.PI),
        mat("#c8c0ac"),
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x, 1.7, 14.05);
      arch.castShadow = true;
      tunnel.add(arch);
      mesh.userData.tunnelRoof = true;
    }
    for (const x of [21.7, 89.7]) {
      for (const z of [10.5, 16.5])
        box(tunnel, "#bdad91", x, 0, z, x + 0.65, 5.2, z + 1.2);
      const board = sign("A101  ·  ROTHERHITHE TUNNEL", {
        bg: "#f1ead7",
        fg: "#233b43",
        w: 7.8,
        h: 0.55,
      });
      board.position.set(x + 0.3, 5.2, 17.8);
      tunnel.add(board);
    }
  }
  // Road furniture follows the map's authored route. Centre lines and verge strips
  // belong to this district; London-only zebras and signal posts are not copied.
  for (const route of data.routes)
    for (let i = 1; i < route.length; i++) {
      const [a, b] = [route[i - 1], route[i]],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]),
        dx = (b[0] - a[0]) / length,
        dz = (b[1] - a[1]) / length;
      for (let at = 1; at < length - 1; at += 3.5) {
        const x = a[0] + dx * at,
          z = a[1] + dz * at;
        box(
          parent,
          "#e5d9a8",
          x - 0.04,
          0.025,
          z - 0.04,
          x + (Math.abs(dx) > 0.1 ? 1.6 : 0.04),
          0.035,
          z + (Math.abs(dz) > 0.1 ? 1.6 : 0.04),
        );
      }
    }
  if (map.id === "m25") {
    // The motorway is a long six-lane carriageway, with a physical median and no urban street furniture.
    for (const z of [29, 31, 41, 43])
      for (let x = 1; x < map.cols - 1; x += 4.5)
        box(parent, "#f5f0df", x, 0.035, z - 0.035, x + 2.3, 0.045, z + 0.035);
    for (const z of [26.1, 33.8, 38.1, 45.8])
      box(parent, "#eee9d9", 0, 0.035, z, map.cols, 0.045, z + 0.075);
    for (const z of [34.25, 37.55]) {
      box(parent, "#b0b4ae", 24, 0, z, 336, 0.35, z + 0.22);
      box(parent, "#a6b7bc", 24, 0.66, z, 336, 0.86, z + 0.16);
      for (let x = 26; x < 335; x += 5) {
        box(parent, "#7e9098", x, 0.15, z + 0.04, x + 0.12, 0.8, z + 0.16);
        box(parent, "#e1bc57", x, 0.87, z - 0.02, x + 0.16, 0.98, z + 0.2);
      }
    }
    const boards = map.portals.filter((portal) => portal.rect.y / 32 < 36);
    for (const portal of boards) {
      const x = portal.rect.x / 32 + portal.rect.w / 64,
        z = 24.2;
      const g = new THREE.Group();
      parent.add(g);
      for (const side of [24.2, 47.5])
        box(g, "#8a9b9c", x, 0, side, x + 0.2, 7.5, side + 0.2);
      box(g, "#8a9b9c", x, 7.3, 24.2, x + 0.2, 7.5, 47.7);
      const panel = sign(portal.label, {
        bg: "#245593",
        fg: "#ffffff",
        w: 11,
        h: 1.1,
      });
      panel.position.set(x, 6.75, z + 5.8);
      g.add(panel);
    }
  }
  return {
    buildings,
    lamps,
    update: (playerX: number, playerZ: number, overview = false) => {
      for (const roof of roofs)
        roof.mesh.visible = tunnelRoofVisible(
          roof.x,
          playerX,
          playerZ,
          overview,
        );
    },
  };
}
