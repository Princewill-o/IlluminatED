import * as THREE from "three";

/**
 * Collision graphics: when anything hits something, a comic starburst pops,
 * sparks fly, bits of debris bounce and a ring of dust spreads. Scaled by how
 * hard the hit was; soft bumps (people) get dust only, no sparks.
 */
interface Bit { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number; max: number; bounce: boolean }
interface Ring { mesh: THREE.Mesh; life: number; max: number }

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const RING = new THREE.RingGeometry(0.6, 0.85, 24);
let burstTexture: THREE.CanvasTexture | null = null;
function burst() {
  if (burstTexture) return burstTexture;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const star = (r1: number, r2: number, fill: string) => {
    ctx.beginPath();
    for (let i = 0; i < 24; i++) { const r = i % 2 ? r2 : r1, a = (i * Math.PI) / 12; ctx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = "#111"; ctx.stroke();
  };
  star(120, 70, "#ffd23f"); star(78, 46, "#ff7a2f");
  burstTexture = new THREE.CanvasTexture(c); burstTexture.colorSpace = THREE.SRGBColorSpace;
  return burstTexture;
}

export function impactEffects(scene: THREE.Scene) {
  const bits: Bit[] = [], rings: Ring[] = [], flashes: { sprite: THREE.Sprite; life: number }[] = [];
  const sparkMat = [new THREE.MeshBasicMaterial({ color: "#ffd23f" }), new THREE.MeshBasicMaterial({ color: "#ff8a2a" })];
  const debrisMat = [new THREE.MeshStandardMaterial({ color: "#3b4250", flatShading: true }), new THREE.MeshStandardMaterial({ color: "#9aa1ad", flatShading: true }), new THREE.MeshStandardMaterial({ color: "#c8322d", flatShading: true })];
  const ringMat = new THREE.MeshBasicMaterial({ color: "#d9d2c3", transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });

  const spawn = (x: number, z: number, strength = 0.6, soft = false) => {
    const s = Math.max(0.25, Math.min(1, strength));
    if (bits.length > 160) return;
    if (!soft) {
      for (let i = 0; i < Math.round(8 + s * 14); i++) {
        const m = new THREE.Mesh(UNIT, sparkMat[i % 2]); m.scale.setScalar(0.06 + Math.random() * 0.05);
        m.position.set(x, 0.6, z); scene.add(m);
        const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 4) * s;
        bits.push({ mesh: m, v: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 3 * s, Math.sin(a) * sp), spin: new THREE.Vector3(), life: 0, max: 0.35 + Math.random() * 0.3, bounce: false });
      }
      for (let i = 0; i < Math.round(3 + s * 5); i++) {
        const m = new THREE.Mesh(UNIT, debrisMat[i % 3]); m.scale.set(0.12 + Math.random() * 0.12, 0.05, 0.1 + Math.random() * 0.1);
        m.position.set(x, 0.5, z); m.castShadow = true; scene.add(m);
        const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 2.5) * s;
        bits.push({ mesh: m, v: new THREE.Vector3(Math.cos(a) * sp, 2.5 + Math.random() * 2, Math.sin(a) * sp), spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), life: 0, max: 1.6, bounce: true });
      }
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: burst(), transparent: true, depthTest: false }));
      flash.position.set(x, 1.0, z); flash.renderOrder = 9; scene.add(flash);
      flashes.push({ sprite: flash, life: 0 });
    }
    const ring = new THREE.Mesh(RING, ringMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.15, z); scene.add(ring);
    rings.push({ mesh: ring, life: 0, max: 0.6 });
  };

  const update = (dt: number) => {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life += dt;
      b.v.y -= 12 * dt;
      b.mesh.position.addScaledVector(b.v, dt);
      b.mesh.rotation.x += b.spin.x * dt; b.mesh.rotation.y += b.spin.y * dt; b.mesh.rotation.z += b.spin.z * dt;
      if (b.mesh.position.y < 0.14) {
        b.mesh.position.y = 0.14;
        if (b.bounce && b.v.y < -1) { b.v.y *= -0.35; b.v.x *= 0.6; b.v.z *= 0.6; b.spin.multiplyScalar(0.5); }
        else { b.v.set(b.v.x * 0.8, 0, b.v.z * 0.8); b.spin.set(0, 0, 0); }
      }
      if (b.life > b.max) { b.mesh.removeFromParent(); bits.splice(i, 1); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.life += dt; const k = r.life / r.max;
      r.mesh.scale.setScalar(0.6 + k * 2.4); (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
      if (k >= 1) { r.mesh.removeFromParent(); (r.mesh.material as THREE.Material).dispose(); rings.splice(i, 1); }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life += dt; const k = f.life / 0.32;
      f.sprite.scale.setScalar(0.5 + Math.sin(Math.min(1, k) * Math.PI) * 1.8);
      f.sprite.material.opacity = 1 - Math.max(0, k - 0.6) / 0.4;
      if (k >= 1) { f.sprite.removeFromParent(); f.sprite.material.dispose(); flashes.splice(i, 1); }
    }
  };

  const dispose = () => {
    for (const b of bits) b.mesh.removeFromParent();
    for (const r of rings) { r.mesh.removeFromParent(); (r.mesh.material as THREE.Material).dispose(); }
    for (const f of flashes) { f.sprite.removeFromParent(); f.sprite.material.dispose(); }
    sparkMat.forEach((m) => m.dispose()); debrisMat.forEach((m) => m.dispose()); ringMat.dispose();
  };
  return { spawn, update, dispose };
}
