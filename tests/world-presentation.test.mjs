import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const { frameMapCamera, groundFootprint } = projectData("src/game/core/view-framing.ts");
const { residentPaths, residentPose, commuterPhase } = projectData("src/game/core/residents.ts");
const { homeMap, londonMap, officeMap, highlandsMap, stationMap, tubeStations, blocked, TILE } = projectData("src/game/core/world.ts");

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
