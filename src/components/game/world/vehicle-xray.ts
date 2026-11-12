import * as THREE from "three";

/**
 * Vehicles with windows you can see through: the bodywork stays solid and only
 * the glass turns clear, so you can see who's inside (you, the driver, other
 * passengers) the way you would in real life.
 */
const GLASS = /glass|window|windscreen/i;
const NOT_GLASS = /pillar|frame|trim|seal/i;

export function seeThrough(root: THREE.Object3D, glass = 0.22) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.xray === false) return;
    let clear = false;
    const swap = (m: THREE.Material) => {
      const name = `${m.name} ${mesh.name}`;
      if (!GLASS.test(name) || NOT_GLASS.test(name)) return m;
      clear = true;
      const next = m.clone();
      // Keep any shader hooks (the curved-world bend) that cloning would drop.
      next.onBeforeCompile = m.onBeforeCompile;
      next.customProgramCacheKey = m.customProgramCacheKey;
      next.transparent = true;
      next.opacity = glass;
      next.depthWrite = false;
      // A faint blue-grey tint and a glossy finish so it still reads as glass.
      const standard = next as THREE.MeshStandardMaterial;
      if (standard.color) standard.color.lerp(new THREE.Color("#bfd8ea"), 0.6);
      if ("roughness" in standard) standard.roughness = 0.08;
      next.userData = { ...m.userData, xray: true };
      return next;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    if (clear) mesh.renderOrder = 3;
  });
}

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
/**
 * Someone sitting down (vehicle forward is +x): a resident from the character kit, posed seated
 * and then frozen, so a busy bus costs no animation work. `uniform` dresses them for work (the
 * driver); `onReady` lets the city bend them to its curve once they arrive.
 */
export function seatedPerson(seed: number, uniform?: string, onReady?: (o: THREE.Object3D) => void) {
  const g = new THREE.Group();
  g.name = "seated-person";
  void import("../char3d").then(async ({ buildCharacter, npcLook }) => {
    const avatar = npcLook(seed);
    const c = await buildCharacter(uniform ? { ...avatar, top: uniform, hat: "hat-none", held: "held-none" } : avatar, 0.92, null, { outfit: false });
    c.play("sit");
    for (let i = 0; i < 4; i++) c.update(1 / 30, true);
    c.object.rotation.y = Math.PI / 2;
    // The group sits on the seat cushion; the character's feet go to the floor below it.
    c.object.position.set(-0.06, -0.46, 0);
    c.object.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = false; mesh.userData.xray = false; } });
    g.add(c.object);
    onReady?.(c.object);
  }).catch(() => {});
  return g;
}

/** A row of simple seats with a few people in them (tiles; vehicle forward is +x). */
export function seatRows(opts: { x0: number; x1: number; y: number; sides: number[]; seatColour: string; seed: number; fill: number; skip?: (x: number, z: number) => boolean; onReady?: (o: THREE.Object3D) => void }) {
  const g = new THREE.Group();
  let k = opts.seed;
  for (let x = opts.x0; x <= opts.x1 + 1e-6; x += 0.75) {
    for (const z of opts.sides) {
      if (opts.skip?.(x, z)) continue;
      const seat = keep(new THREE.Mesh(UNIT, solid(opts.seatColour))); seat.scale.set(0.42, 0.12, 0.42); seat.position.set(x, opts.y + 0.42, z); g.add(seat);
      const back = keep(new THREE.Mesh(UNIT, solid(opts.seatColour))); back.scale.set(0.1, 0.5, 0.42); back.position.set(x - 0.2, opts.y + 0.7, z); g.add(back);
      k = (k * 1103515245 + 12345) >>> 0;
      if ((k >>> 8) % 100 < opts.fill * 100) {
        const p = seatedPerson(k >>> 4, undefined, opts.onReady); p.position.set(x, opts.y + 0.48, z); g.add(p);
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
  const driver = seatedPerson(seed + 7, "top-blocky-business-navy"); driver.position.set(length / 2 - 0.6, 1.68, 0.45); g.add(driver);
  return g;
}
