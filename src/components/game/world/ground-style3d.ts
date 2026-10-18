import * as THREE from "three";

import { buildLondon, LONDON_COLS, LONDON_ROWS } from "@/game/core/london";

const ATLAS_SIZE = 512;
const CELL = ATLAS_SIZE / 2;
const GUTTER = 4;
type Surface = "stone" | "road" | "grass" | "plain";
const CELLS: Record<Surface, [number, number]> = {
  stone: [0, 0], road: [CELL, 0], grass: [0, CELL], plain: [CELL, CELL],
};

/** One small, local atlas; the existing vertex colours supply the surface tint. */
function groundAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  let seed = 23981;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const surface of ["stone", "road", "grass"] as const) {
    const [x, y] = CELLS[surface];
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, CELL, CELL); ctx.clip();
    ctx.fillStyle = surface === "stone" ? "#f4f1eb" : surface === "road" ? "#eeefec" : "#f4f3ed";
    ctx.fillRect(x, y, CELL, CELL);
    // Fine aggregate and mineral specks remain subtle when viewed from above.
    for (let i = 0; i < (surface === "road" ? 5400 : 2600); i++) {
      const light = random() > .48;
      ctx.fillStyle = light ? `rgba(255,255,255,${.1 + random() * .2})` : `rgba(44,42,35,${.025 + random() * .07})`;
      const size = surface === "stone" ? 1 + random() * 2.2 : 1 + random();
      ctx.fillRect(x + random() * CELL, y + random() * CELL, size, size);
    }
    if (surface === "stone") {
      // A shallow dressed edge, with no white outline or additional geometry.
      ctx.strokeStyle = "rgba(68,53,35,.10)"; ctx.lineWidth = 2;
      ctx.strokeRect(x + GUTTER + 1, y + GUTTER + 1, CELL - GUTTER * 2 - 2, CELL - GUTTER * 2 - 2);
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = "rgba(91,72,47,.025)"; ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        const fy = y + random() * CELL;
        ctx.moveTo(x, fy); ctx.bezierCurveTo(x + 90, fy - 10, x + 160, fy + 13, x + CELL, fy + 4);
        ctx.stroke();
      }
    } else if (surface === "grass") {
      for (let i = 0; i < 620; i++) {
        const px = x + random() * CELL, py = y + random() * CELL;
        ctx.strokeStyle = i % 2 ? "rgba(49,70,32,.08)" : "rgba(255,255,226,.16)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + random() * 3 - 1.5, py - 2 - random() * 4); ctx.stroke();
      }
    }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.name = "London ground: sandstone, aggregate and turf";
  return texture;
}

/** Adds detail to the existing ground batch; the caller owns the returned texture cleanup. */
export function applyGroundStyle(mesh: THREE.Mesh): () => void {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute("position");
  const colours = geometry.getAttribute("color");
  if (!positions || !colours || geometry.index) return () => undefined;
  const texture = groundAtlas();
  if (!texture) return () => undefined;
  const uv = new Float32Array(positions.count * 2);
  const palette = {
    stone: new THREE.Color("#d9c8a9"), road: new THREE.Color("#525b60"),
    grass: new THREE.Color("#83a975"), plain: new THREE.Color("#cabb9f"),
  };
  const seam = new THREE.Color("#b8aa93");
  const sourceStone = new THREE.Color("#e9e1d0").r;
  const sourceGrass = new THREE.Color("#8fd16f").g;
  // Soft baked contact shade gives buildings weight without a shadow map.
  const shadows=new Float32Array(LONDON_COLS*LONDON_ROWS).fill(1);
  for(const thing of buildLondon().things) {
    if(thing.kind!=="building"&&thing.kind!=="tree") continue;
    const w=thing.kind==="building"?thing.w:1,h=thing.kind==="building"?thing.h:1;
    const front=thing.y+h;
    for(let z=front;z<Math.min(LONDON_ROWS,front+2);z++) for(let x=thing.x;x<Math.min(LONDON_COLS,thing.x+w);x++)
      shadows[z*LONDON_COLS+x]=Math.min(shadows[z*LONDON_COLS+x],z===front ? .86 : .96);
  }
  // groundMesh emits six vertices per quad, including kerb sides and stone joints.
  for (let start = 0; start < positions.count; start += 6) {
    const end = Math.min(start + 6, positions.count);
    let minX = Infinity, minZ = Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = start; i < end; i++) {
      minX = Math.min(minX, positions.getX(i)); minZ = Math.min(minZ, positions.getZ(i));
      minY = Math.min(minY, positions.getY(i)); maxY = Math.max(maxY, positions.getY(i));
    }
    const r = colours.getX(start), g = colours.getY(start), b = colours.getZ(start);
    const flat = maxY - minY < .0001;
    const surface: Surface = !flat ? "plain" : Math.abs(minY) < .0001 ? "road"
      : g > r * 1.15 && g > b * 1.3 ? "grass" : Math.abs(minY - .12) < .0001 ? "stone" : "plain";
    const tint = surface === "plain" && minY > .121 && minY < .125 ? seam : palette[surface];
    const shade = surface === "stone" ? THREE.MathUtils.clamp(r / sourceStone, .92, 1.03)
      : surface === "grass" ? THREE.MathUtils.clamp(g / sourceGrass, .94, 1.05) : 1;
    const [cellX, cellY] = CELLS[surface];
    const originX = Math.floor(minX + .00001), originZ = Math.floor(minZ + .00001);
    for (let i = start; i < end; i++) {
      const shadeX=Math.max(0,Math.min(LONDON_COLS-1,Math.floor(positions.getX(i)-.0001)));
      const shadeZ=Math.max(0,Math.min(LONDON_ROWS-1,Math.floor(positions.getZ(i)-.0001)));
      const contact=shadows[shadeZ*LONDON_COLS+shadeX];
      colours.setXYZ(i, tint.r * shade * contact, tint.g * shade * contact, tint.b * shade * contact);
      const tx = surface === "plain" ? .5 : THREE.MathUtils.clamp(positions.getX(i) - originX, 0, 1);
      const tz = surface === "plain" ? .5 : THREE.MathUtils.clamp(positions.getZ(i) - originZ, 0, 1);
      uv[i * 2] = (cellX + GUTTER + tx * (CELL - GUTTER * 2)) / ATLAS_SIZE;
      uv[i * 2 + 1] = 1 - (cellY + GUTTER + tz * (CELL - GUTTER * 2)) / ATLAS_SIZE;
    }
  }
  colours.needsUpdate = true;
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    if (material instanceof THREE.MeshLambertMaterial) {
      material.map = texture;
      material.needsUpdate = true;
    }
  }
  return () => texture.dispose();
}
