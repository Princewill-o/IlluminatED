import * as THREE from "three";

/**
 * See-through vehicles: the body shell turns translucent and the glass almost
 * clear, so you can see who's inside (you, the driver, other passengers).
 * Wheels, lights and trim stay solid so the vehicle still reads clearly.
 */
const SOLID = /rubber|hub|tyre|tire|wheel|lamp|light|tail|amber|grille|chrome|plate|black|line|logo|mirror/i;
const GLASS = /glass|window|windscreen/i;

export function seeThrough(root: THREE.Object3D, body = 0.38, glass = 0.12) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.xray === false) return;
    const swap = (m: THREE.Material) => {
      const name = `${m.name} ${mesh.name}`;
      if (SOLID.test(name) && !GLASS.test(name)) return m;
      const next = m.clone();
      // Keep any shader hooks (the curved-world bend) that cloning would drop.
      next.onBeforeCompile = m.onBeforeCompile;
      next.customProgramCacheKey = m.customProgramCacheKey;
      next.transparent = true;
      next.opacity = GLASS.test(name) ? glass : body;
      next.depthWrite = false;
      next.userData = { ...m.userData, xray: true };
      return next;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    mesh.renderOrder = 3;
    mesh.castShadow = false;
  });
}

const SKINS = ["#f1c9a5", "#e0ac83", "#c68a5c", "#a0673f", "#7a4a2a", "#5a3520"];
const TOPS = ["#2b5fd9", "#d6452a", "#15987f", "#7a5ce6", "#e0a100", "#3b4a5c", "#e0457b", "#f4efe6"];
const HAIRS = ["#1d1512", "#4a2f1f", "#d9b06b", "#111111", "#8c5a2b", "#6b3a1e"];
const mats = new Map<string, THREE.MeshStandardMaterial>();
const solid = (c: string) => {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }); mats.set(c, m); }
  return m;
};
const UNIT = new THREE.BoxGeometry(1, 1, 1);
/** Passengers and seats stay solid when the shell around them goes see-through. */
const keep = <T extends THREE.Object3D>(o: T) => { o.userData.xray = false; return o; };

/**
 * Give a model its own copies of every material, without shader hooks. Used
 * outside the city (the journey scene), where the city's curved-world bend
 * would otherwise drag shared materials out of place.
 */
export function ownMaterials(root: THREE.Object3D) {
  const copies = new Map<THREE.Material, THREE.Material>();
  const copy = (m: THREE.Material) => {
    let c = copies.get(m);
    if (!c) { c = m.clone(); c.onBeforeCompile = () => {}; c.customProgramCacheKey = () => "plain"; copies.set(m, c); }
    return c;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
  });
}

/** A seated person seen through a vehicle's glass (in tiles; origin on the seat, facing +x). */
export function seatedPerson(seed: number, top?: string) {
  const g = new THREE.Group();
  const part = (c: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = keep(new THREE.Mesh(UNIT, solid(c))); m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m;
  };
  part(top ?? TOPS[seed % TOPS.length], 0.26, 0.42, 0.4, 0, 0.21, 0);
  part("#2a3346", 0.34, 0.12, 0.34, 0.14, 0.06, 0); // lap
  part(SKINS[(seed * 3) % SKINS.length], 0.3, 0.3, 0.3, 0.02, 0.6, 0);
  part(HAIRS[(seed * 5) % HAIRS.length], 0.32, 0.09, 0.32, 0.0, 0.78, 0);
  part("#111111", 0.02, 0.05, 0.05, 0.17, 0.62, -0.07); // eyes
  part("#111111", 0.02, 0.05, 0.05, 0.17, 0.62, 0.07);
  return g;
}

/** A row of simple seats with a few people in them (tiles; vehicle forward is +x). */
export function seatRows(opts: { x0: number; x1: number; y: number; sides: number[]; seatColour: string; seed: number; fill: number; skip?: (x: number, z: number) => boolean }) {
  const g = new THREE.Group();
  let k = opts.seed;
  for (let x = opts.x0; x <= opts.x1 + 1e-6; x += 0.75) {
    for (const z of opts.sides) {
      if (opts.skip?.(x, z)) continue;
      const seat = keep(new THREE.Mesh(UNIT, solid(opts.seatColour))); seat.scale.set(0.42, 0.12, 0.42); seat.position.set(x, opts.y + 0.42, z); g.add(seat);
      const back = keep(new THREE.Mesh(UNIT, solid(opts.seatColour))); back.scale.set(0.1, 0.5, 0.42); back.position.set(x - 0.2, opts.y + 0.7, z); g.add(back);
      k = (k * 1103515245 + 12345) >>> 0;
      if ((k >>> 8) % 100 < opts.fill * 100) {
        const p = seatedPerson(k >>> 4); p.position.set(x, opts.y + 0.48, z); g.add(p);
      }
    }
  }
  return g;
}

/** A touring coach's cabin (tiles; forward +x): high floor, rows of seats, the driver and passengers. */
export function coachInterior(length: number, width: number, seed: number, keepFree?: { x: number; z: number }) {
  const g = new THREE.Group();
  const floor = keep(new THREE.Mesh(UNIT, solid("#3b4250"))); floor.scale.set(length - 0.5, 0.06, width - 0.2); floor.position.set(0, 1.2, 0); g.add(floor);
  g.add(seatRows({ x0: -length / 2 + 0.6, x1: length / 2 - 1.3, y: 1.2, sides: [-0.5, 0.5], seatColour: "#30406e", seed, fill: 0.55,
    skip: keepFree ? (x, z) => Math.abs(x - keepFree.x) < 0.2 && Math.abs(z - keepFree.z) < 0.1 : undefined }));
  const driver = seatedPerson(seed + 7, "#233b65"); driver.position.set(length / 2 - 0.6, 1.68, 0.45); g.add(driver);
  return g;
}
