import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const { frameMapCamera, groundFootprint } = projectData("src/game/core/view-framing.ts");
const { residentPaths, residentPose, commuterPhase } = projectData("src/game/core/residents.ts");
const { homeMap, londonMap, officeMap, highlandsMap, stationMap, tubeStations, blocked, TILE } = projectData("src/game/core/world.ts");

test("locked outdoor camera follows exactly through all edges and zoom levels", () => {
  const map = londonMap();
  for (const aspect of [0.46, 1, 2.4, 3.5]) for (const zoom of [0.75, 1, 1.65])
    for (const x of [0, map.cols / 2, map.cols]) for (const z of [0, map.rows / 2, map.rows]) {
      const frame = frameMapCamera(30, 30, map.cols, map.rows, aspect, false, {x,z}, zoom, true);
      assert.equal(frame.x, x); assert.equal(frame.z, z);
      assert.ok(frame.height > 0 && frame.distance > 0);
    }
  for (const radius of [8, 20, 40]) {
    for (const [x,y] of [[-1, map.height/2], [map.width+1,map.height/2], [map.width/2,-1], [map.width/2,map.height+1]])
      assert.equal(blocked(map,x,y,radius),true);
  }
});

test("Camera keeps the entire ground footprint inside every map at all four edges and screen shapes", () => {
  const maps = [homeMap(0), londonMap(), highlandsMap(), officeMap({ slug: "demo", name: "Demo", sector: "Technology", accent: "#2457cb" }), stationMap(tubeStations()[0].id)];
  for (const map of maps) {
    const indoors = map.art !== "london" && map.art !== "highlands" && map.kind !== "campus";
    for (const aspect of [0.46, 0.75, 1, 1.5, 2.4, 3.5]) for (const x of [0, map.cols / 2, map.cols]) for (const z of [0, map.rows / 2, map.rows]) {
      const f = frameMapCamera(x, z, map.cols, map.rows, aspect, indoors);
      const footprint = groundFootprint(f.height, f.distance, f.target, aspect, indoors ? 0 : 0.0055, indoors ? 0 : 0.0012);
      assert.ok(f.x + footprint.minX >= -0.001, `${map.id} west`);
      assert.ok(f.x + footprint.maxX <= map.cols + 0.001, `${map.id} east`);
      assert.ok(f.z + footprint.minZ >= -0.001, `${map.id} north`);
      assert.ok(f.z + footprint.maxZ <= map.rows + 0.001, `${map.id} south`);
    }
  }
});
test("Residents stay on walkable public routes and never populate a private home", () => {
  assert.equal(residentPaths(homeMap(0), 24).length, 0);
  for (const map of [londonMap(), highlandsMap(), officeMap({ slug: "demo", name: "Demo", sector: "Technology", accent: "#2457cb" })]) {
    const paths = residentPaths(map, 24);
    assert.ok(paths.length > 0 && paths.length <= 24);
    for (const path of paths) for (let seconds = 0; seconds < 80; seconds += 0.25) {
      const p = residentPose(path, seconds, 0);
      assert.equal(blocked(map, p.x * TILE, p.z * TILE), false, `${map.id}: resident crosses an obstacle`);
    }
  }
});
test("Commuters park before leaving their car, return before driving and move continuously", () => {
  assert.equal(commuterPhase(10, 0).out, false);
  assert.equal(commuterPhase(29, 0).out, true);
  assert.equal(commuterPhase(29, 0).parked, true);
  assert.equal(commuterPhase(43, 0).out, false);
  for (let t = 0; t < 130; t += 0.1) {
    const a = commuterPhase(t, 0), b = commuterPhase(t + 0.1, 0);
    assert.ok(b.distance >= a.distance && b.distance - a.distance <= 0.101);
    assert.ok(a.pull >= 0 && a.pull <= 1 && a.stroll >= 0 && a.stroll <= 1);
    if (a.out) assert.equal(a.parked, true);
  }
});

test("Camera tracks walking and driving, snaps after travel, and never trails far behind", () => {
  const { followPlayerCamera } = projectData("src/game/core/view-framing.ts");
  for (const fps of [30, 60, 120])
    for (const speed of [3, 12]) {
      let camera = { x: 10, z: 10 };
      for (let i = 0; i < fps * 3; i++) {
        const player = { x: 10 + (speed * i) / fps, z: 10 + (speed * i) / fps };
        camera = followPlayerCamera(camera, player, 1 / fps);
        assert.ok(
          Math.hypot(camera.x - player.x, camera.z - player.z) <= 0.35001,
        );
      }
    }
  assert.deepEqual(
    { ...followPlayerCamera({ x: 0, z: 0 }, { x: 80, z: 60 }, 1 / 60) },
    { x: 80, z: 60 },
  );
  const still = followPlayerCamera({ x: 10, z: 10 }, { x: 10, z: 10 }, 1 / 60);
  assert.deepEqual({ ...still }, { x: 10, z: 10 });
});

test("Player remains visible near every map edge while the ground stays within bounds", () => {
  const { frameMapCamera, projectCameraGround } = projectData(
    "src/game/core/view-framing.ts",
  );
  for (const map of [londonMap(), highlandsMap(), homeMap(0)])
    for (const aspect of [0.46, 1, 1.5, 3.5]) {
      const indoors = map.kind === "home";
      for (const x of [1.5, map.cols / 2, map.cols - 1.5])
        for (const z of [1.5, map.rows / 2, map.rows - 1.5]) {
          const frame = frameMapCamera(
            x,
            z,
            map.cols,
            map.rows,
            aspect,
            indoors,
          );
          const p = projectCameraGround(frame, { x, z }, aspect, indoors);
          assert.ok(
            Math.abs(p.x) <= 0.941 && Math.abs(p.y) <= 0.881,
            `${map.id} ${aspect} ${x},${z}: ${JSON.stringify(p)}`,
          );
        }
    }
});

test("Camera keeps a moving driver visible while following into each boundary", () => {
  const C = projectData("src/game/core/view-framing.ts");
  for (const aspect of [0.46, 1.5, 3.5])
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      let camera = { x: 50, z: 50 };
      for (let i = 0; i < 300; i++) {
        const player = {
          x: Math.max(1.5, Math.min(98.5, 50 + dx * i * 0.2)),
          z: Math.max(1.5, Math.min(98.5, 50 + dz * i * 0.2)),
        };
        camera = C.followPlayerCamera(camera, player, 1 / 60);
        const f = C.frameMapCamera(
          camera.x,
          camera.z,
          100,
          100,
          aspect,
          false,
          player,
        );
        const p = C.projectCameraGround(f, player, aspect, false);
        assert.ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.89);
      }
    }
});
