import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import * as THREE from "three";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";
const coaches = projectData("src/game/core/coaches.ts");
const exports = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync("src/components/game/world/coach3d.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  { exports, require: (name) => (name === "three" ? THREE : coaches) },
);
test("all three referenced coach brands have independent 3D models, six wheels and logos on both sides/front", () => {
  assert.deepEqual(
    Array.from(coaches.COACHES, (c) => c.id),
    ["airline", "national-express", "flixbus"],
  );
  for (const brand of coaches.COACHES) {
    const model = exports.coachModel(brand.id);
    model.updateMatrixWorld(true);
    let wheels = 0,
      logos = 0;
    model.traverse((o) => {
      if (o.name === "wheel") wheels++;
      if (o.name === `logo-${brand.id}`) {
        logos++;
        assert.equal(o.userData.brand, brand.name);
      }
    });
    assert.equal(wheels, 6);
    assert.equal(logos, 3);
    assert.equal(model.userData.length, coaches.COACH_LENGTH);
    const size = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    assert.ok(
      size.x >= 6 && size.x < 7 && size.y > 2 && size.y < 3 && size.z < 2.5,
    );
    model.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
      }
    });
  }
});
test("coaches use road-loop routes and obey the shared signal/spacing rules at their full length", () => {
  const { trafficMoveDistance, trafficLayout, stopLine } = projectData(
    "src/game/core/traffic-rules.ts",
  );
  for (const coach of coaches.COACHES) {
    assert.ok(coach.route >= 0 && coach.route < 3);
    assert.ok(coach.at >= 0 && coach.at < 1);
  }
  const junction = trafficLayout().junctions[0],
    line = stopLine(junction, "east");
  const waiting = {
    x: line.x - coaches.COACH_LENGTH / 2 - 0.3,
    y: line.y,
    heading: 0,
    length: coaches.COACH_LENGTH,
    width: coaches.COACH_WIDTH,
  };
  assert.ok(
    trafficMoveDistance(waiting, 1, 20000 - junction.offsetMs) <= 0.3,
    "coach nose stays before red line",
  );
  assert.equal(
    trafficMoveDistance(waiting, 1, -junction.offsetMs),
    1,
    "coach resumes on green",
  );
  const own = {
    id: "coach",
    x: 20,
    y: 20,
    heading: 0,
    length: coaches.COACH_LENGTH,
    width: coaches.COACH_WIDTH,
  };
  const lead = { ...own, id: "lead", x: 23 };
  assert.equal(
    trafficMoveDistance(own, 1, Date.now(), [lead], []),
    0,
    "coach cannot move through a leading vehicle",
  );
});
