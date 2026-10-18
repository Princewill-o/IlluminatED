import * as THREE from "three";

/** A compact, instanced observation wheel. All coordinates stay inside its plot. */
export function londonEye(x: number, z: number, width: number, depth: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "London Eye";
  root.position.set(x + width / 2, 0, z + depth / 2);
  const radius = Math.max(0.3, width * 0.425);
  const scale = radius / 2.55;
  const hubHeight = radius + 0.6 * scale;
  const orbit = radius * 1.04;
  const capsuleCount = 32;
  const wheel = new THREE.Group();
  wheel.name = "observation-wheel";
  wheel.position.y = hubHeight;
  root.add(wheel);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const material = (colour: string, roughness = 0.56, metalness = 0.2) => {
    const result = new THREE.MeshStandardMaterial({ color: colour, roughness, metalness });
    materials.add(result);
    return result;
  };
  const steel = material("#e4e7e4", 0.45, 0.38);
  const cable = material("#9daeb5", 0.65, 0.2);
  const darkSteel = material("#526a73", 0.55, 0.35);
  const glass = material("#75a7bc", 0.2, 0.38);
  const stone = material("#d1c5ac", 0.95, 0);
  const deck = material("#56636a", 0.9, 0.05);
  const accent = material("#b7483b", 0.65, 0.1);
  const boxGeometry = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
  const beamGeometry = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 6));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const size = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();

  const boxes = (name: string, parent: THREE.Group, surface: THREE.Material, parts: number[][]) => {
    const mesh = new THREE.InstancedMesh(boxGeometry, surface, parts.length);
    mesh.name = name;
    parts.forEach(([px, py, pz, sx, sy, sz], index) => {
      matrix.compose(position.set(px, py, pz), quaternion.identity(), size.set(sx, sy, sz));
      mesh.setMatrixAt(index, matrix);
    });
    parent.add(mesh);
    return mesh;
  };
  const beams = (name: string, parent: THREE.Group, surface: THREE.Material, parts: number[][]) => {
    const mesh = new THREE.InstancedMesh(beamGeometry, surface, parts.length);
    mesh.name = name;
    parts.forEach(([ax, ay, az, bx, by, bz, thickness], index) => {
      direction.set(bx - ax, by - ay, bz - az);
      const length = direction.length();
      quaternion.setFromUnitVectors(up, direction.normalize());
      position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      matrix.compose(position, quaternion, size.set(thickness, length, thickness));
      mesh.setMatrixAt(index, matrix);
    });
    parent.add(mesh);
    return mesh;
  };

  // Twin tubular rims, with diagonal cross bracing between the two planes.
  const rimDepth = Math.min(depth * 0.11, 0.2 * scale);
  const rimGeometry = ownGeometry(new THREE.TorusGeometry(radius, 0.045 * scale, 5, 64));
  for (const offset of [-rimDepth, rimDepth]) {
    const rim = new THREE.Mesh(rimGeometry, steel);
    rim.name = "twin-wheel-rim";
    rim.position.z = offset;
    wheel.add(rim);
  }
  const spokeParts: number[][] = [];
  const braceParts: number[][] = [];
  const hangerParts: number[][] = [];
  for (let i = 0; i < capsuleCount; i++) {
    const angle = i * Math.PI * 2 / capsuleCount;
    const next = (i + 0.5) * Math.PI * 2 / capsuleCount;
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
    const nx = Math.cos(next) * radius, ny = Math.sin(next) * radius;
    for (const side of [-1, 1]) {
      spokeParts.push([0, 0, side * rimDepth * 0.6, px, py, side * rimDepth, 0.011 * scale]);
      braceParts.push([px, py, side * rimDepth, nx, ny, -side * rimDepth, 0.015 * scale]);
    }
    hangerParts.push([px, py, 0, Math.cos(angle) * orbit, Math.sin(angle) * orbit, 0, 0.035 * scale]);
  }
  beams("tension-spokes", wheel, cable, spokeParts);
  beams("rim-cross-bracing", wheel, steel, braceParts);
  beams("capsule-mounts", wheel, steel, hangerParts);

  const axleGeometry = ownGeometry(new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, rimDepth * 3.7, 12));
  const axle = new THREE.Mesh(axleGeometry, darkSteel);
  axle.name = "central-axle";
  axle.rotation.x = Math.PI / 2;
  wheel.add(axle);
  const hubGeometry = ownGeometry(new THREE.SphereGeometry(0.23 * scale, 12, 6));
  const hub = new THREE.Mesh(hubGeometry, steel);
  hub.name = "hub-cover";
  hub.scale.z = 1.65;
  wheel.add(hub);

  // Four angled legs form a pair of A frames; they remain fixed while the rim turns.
  const footZ = Math.min(depth * 0.34, 0.62 * scale);
  const footX = radius * 0.58;
  const supportParts: number[][] = [];
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) supportParts.push([
      end * footX, 0.19 * scale, side * footZ,
      0, hubHeight, side * rimDepth * 1.45, 0.085 * scale,
    ]);
    supportParts.push([-footX * 0.62, hubHeight * 0.38, side * footZ * 0.76,
      footX * 0.62, hubHeight * 0.38, side * footZ * 0.76, 0.042 * scale]);
  }
  beams("fixed-a-frame-supports", root, steel, supportParts);
  boxes("support-footings", root, stone, [-1, 1].flatMap(side => [-1, 1].map(end => [
    end * footX, 0.12 * scale, side * footZ, 0.48 * scale, 0.24 * scale, 0.4 * scale,
  ])));
  boxes("boarding-plinth", root, stone, [[0, 0.045 * scale, 0, width * 0.92, 0.09 * scale, depth * 0.9]]);
  boxes("boarding-deck", root, deck, [[0, 0.11 * scale, 0, width * 0.53, 0.055 * scale, depth * 0.6]]);
  boxes("boarding-edge-stripe", root, accent, [[0, 0.15 * scale, depth * 0.31, width * 0.53, 0.04 * scale, 0.045 * scale]]);

  // Opaque tinted glass avoids transparency sorting and overdraw. Three shared
  // instance batches provide 32 outlined pods rather than 96 separate draw calls.
  const capsuleGeometry = ownGeometry(new THREE.SphereGeometry(1, 10, 6));
  const hoopGeometry = ownGeometry(new THREE.TorusGeometry(1, 0.075, 3, 10));
  const glassPods = new THREE.InstancedMesh(capsuleGeometry, glass, capsuleCount);
  glassPods.name = "capsule-glass";
  const podFrames = new THREE.InstancedMesh(hoopGeometry, steel, capsuleCount * 2);
  podFrames.name = "capsule-end-frames";
  const podBases = new THREE.InstancedMesh(boxGeometry, darkSteel, capsuleCount);
  podBases.name = "capsule-floor";
  for (const mesh of [glassPods, podFrames, podBases]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // The wheel bounds remain constant even as instance matrices change.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), orbit + radius * 0.16);
    wheel.add(mesh);
  }
  const glassLocal = new THREE.Matrix4().makeScale(radius * 0.09, radius * 0.06, radius * 0.07);
  const floorLocal = new THREE.Matrix4().compose(
    new THREE.Vector3(0, -radius * 0.054, 0), new THREE.Quaternion(),
    new THREE.Vector3(radius * 0.139, radius * 0.018, radius * 0.1),
  );
  const frameLocals = [-1, 1].map(side => new THREE.Matrix4().compose(
    new THREE.Vector3(side * radius * 0.047, 0, 0),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
    new THREE.Vector3(radius * 0.063, radius * 0.055, radius * 0.063),
  ));
  const capsuleMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const turnAxis = new THREE.Vector3(0, 0, 1);
  const unitScale = new THREE.Vector3(1, 1, 1);
  const update = (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const turn = (seconds * 0.018) % (Math.PI * 2);
    wheel.rotation.z = turn;
    quaternion.setFromAxisAngle(turnAxis, -turn);
    for (let i = 0; i < capsuleCount; i++) {
      const angle = i * Math.PI * 2 / capsuleCount;
      capsuleMatrix.compose(position.set(Math.cos(angle) * orbit, Math.sin(angle) * orbit, 0), quaternion, unitScale);
      glassPods.setMatrixAt(i, localMatrix.multiplyMatrices(capsuleMatrix, glassLocal));
      podBases.setMatrixAt(i, localMatrix.multiplyMatrices(capsuleMatrix, floorLocal));
      for (let end = 0; end < 2; end++) podFrames.setMatrixAt(i * 2 + end, localMatrix.multiplyMatrices(capsuleMatrix, frameLocals[end]));
    }
    for (const mesh of [glassPods, podFrames, podBases]) mesh.instanceMatrix.needsUpdate = true;
  };
  let disposed = false;
  root.userData = {
    spin: true,
    capsuleCount,
    wheelRadius: radius,
    footprint: { x, z, width, depth },
    update,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(surface => surface.dispose());
    },
  };
  update(0);
  return root;
}
