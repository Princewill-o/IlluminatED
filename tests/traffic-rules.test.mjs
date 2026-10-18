import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const R = projectData("src/game/core/traffic-rules.ts");
const { TILE, CITY } = projectData("src/game/core/world.ts");
const { CAR_LENGTH, CAR_WIDTH } = projectData("src/game/core/vehicles.ts");
const { driveStep, nearestDrivingSpot } = projectData("src/game/core/driving.ts");
const layout = R.trafficLayout(), junction = layout.junctions[0];
const time = phase => phase - junction.offsetMs;
const pose = (x, y, heading = 0, speed = 100) => ({ x: x * TILE, y: y * TILE, heading, speed });
const eastLine = R.stopLine(junction, "east");

test("junctions and zebras are derived from the current four-tile road grid", () => {
  assert.equal(layout.junctions.length, 16);
  assert.equal(layout.crossings.length, 64);
  assert.ok(layout.junctions.some(j => j.x === 89 && j.y === 21));
  assert.equal(layout.junctions.some(j => j.x === 89 && j.y === 61), false);
  for (const c of layout.crossings) {
    assert.ok("=:".includes(CITY.tiles[Math.floor(c.y)][Math.floor(c.x)]));
    assert.equal(c.axis === "horizontal" ? c.h : c.w, 4);
  }
});

test("signals never give conflicting green lights and all-red phases let pedestrians cross", () => {
  const phases = [[0, "green", "red", "wait"], [14000, "amber", "red", "wait"], [16000, "red", "red", "walk"], [20000, "red", "green", "wait"], [34000, "red", "amber", "wait"], [36000, "red", "red", "walk"], [40000, "green", "red", "wait"]];
  for (const [ms, horizontal, vertical, pedestrian] of phases) {
    const signal = R.signalAt(junction, time(ms));
    assert.equal(signal.horizontal, horizontal);
    assert.equal(signal.vertical, vertical);
    assert.equal(signal.pedestrian, pedestrian);
  }
  for (const j of layout.junctions) for (let ms = 0; ms < 80000; ms += 137)
    assert.equal(R.signalAt(j, ms).horizontal === "green" && R.signalAt(j, ms).vertical === "green", false);
});

test("direction helpers put cars in the UK left lane in all four directions", () => {
  for (const [dx, dy, x, y] of [[1, 0, 20, 20], [-1, 0, 20, 22], [0, 1, 21, 21], [0, -1, 19, 21]]) {
    const point = R.leftLanePoint(20, 21, dx, dy);
    assert.equal(point.x, x);
    assert.equal(point.y, y);
  }
});

test("AI cars stop their noses before red and amber, then resume on green", () => {
  const car = { x: eastLine.x - CAR_LENGTH / 2 - 0.4, y: eastLine.y, heading: 0 };
  assert.ok(R.trafficMoveDistance(car, 1, time(20000)) <= 0.4);
  assert.ok(R.trafficMoveDistance(car, 1, time(14000)) <= 0.4);
  assert.equal(R.trafficMoveDistance(car, 1, time(0)), 1);
  const stopped = { ...car, x: eastLine.x - CAR_LENGTH / 2 - 0.1 };
  assert.equal(R.trafficShouldStop(stopped, time(20000)), true);
  const clearing = { ...car, x: junction.x - 1 };
  assert.equal(R.trafficMoveDistance(clearing, 0.2, time(20000)), 0.2);
});

test("AI follows lead cars, respects cross traffic already in its path and ignores cars behind", () => {
  const car = { id: "car", x: 25, y: 20, heading: 0 };
  const lead = { id: "lead", x: 29, y: 20, heading: 0 };
  assert.ok(R.trafficMoveDistance(car, 1, time(0), [lead]) < 0.2);
  assert.equal(R.trafficMoveDistance(car, 1, time(0), [{ ...lead, x: 20 }]), 1);
  assert.equal(R.trafficMoveDistance(car, 1, time(0), [{ ...lead, y: 22, heading: Math.PI }]), 1);
  assert.equal(R.trafficMoveDistance(car, 1, time(0), [{ ...lead, x: 28, heading: Math.PI / 2 }]), 0);
});

test("AI yields at an occupied zebra even on green and moves once it is clear", () => {
  const crossing = layout.crossings.find(c => c.junctionId === junction.id && c.axis === "horizontal" && c.x < junction.x);
  const car = { x: crossing.x - crossing.w / 2 - CAR_LENGTH / 2 - 0.2, y: junction.y - 1, heading: 0 };
  assert.ok(R.trafficMoveDistance(car, 1, time(0), [], [{ x: crossing.x, y: crossing.y }]) < 0.2);
  assert.equal(R.trafficMoveDistance(car, 1, time(0), [], [{ x: crossing.x, y: crossing.y + 4 }]), 1);
});

test("only actually crossing a red stopline earns an offence, not waiting, green or parking", () => {
  const at = eastLine.x - CAR_LENGTH / 2;
  const prev = pose(at - 0.1, eastLine.y), next = pose(at + 0.1, eastLine.y);
  assert.equal(R.checkRoadViolation(prev, next, time(20000))?.reason, "red-light");
  assert.equal(R.checkRoadViolation(prev, next, time(0)), null);
  assert.equal(R.checkRoadViolation(prev, prev, time(20000)), null);
  assert.equal(R.checkRoadViolation({ ...next, speed: 0 }, { ...next, speed: 0 }, time(20000)), null);
});

test("creeping across a red line is still an offence at high frame rates, but pausing is safe", () => {
  const at = eastLine.x - CAR_LENGTH / 2;
  for (const speed of [10, 0.1]) {
    const halfStep = speed / 120 / 2 / TILE;
    const prev = pose(at - halfStep, eastLine.y, 0, speed), next = pose(at + halfStep, eastLine.y, 0, speed);
    assert.equal(R.checkRoadViolation(prev, next, time(20000))?.reason, "red-light", `${speed}px/s at120Hz`);
  }
  const prev = pose(at - 0.001, eastLine.y, 0, 20);
  assert.equal(R.checkRoadViolation(prev, prev, time(20000)), null);
  assert.equal(R.checkRoadViolation({ ...prev, speed: 0 }, { ...prev, speed: 0 }, time(20000)), null);
});

test("wrong-way offences require real driving outside junction and turning zones", () => {
  assert.equal(R.checkRoadViolation(pose(24.9, 22), pose(25.1, 22), 0)?.reason, "wrong-way");
  assert.equal(R.checkRoadViolation(pose(24.9, 20), pose(25.1, 20), 0), null);
  assert.equal(R.checkRoadViolation(pose(24.9, 22, 0, 0), pose(24.9, 22, 0, 0), 0), null);
  assert.equal(R.checkRoadViolation(pose(junction.x, junction.y + 1), pose(junction.x + 0.2, junction.y + 1), 0), null);
  assert.equal(R.checkRoadViolation(pose(24.9, 21.1), pose(25.1, 21.1), 0), null);
  assert.equal(R.checkRoadViolation(pose(25.1, 20, 0, -70), pose(24.9, 20, 0, -70), 0), null, "reversing to manoeuvre is not wrong-way driving");
});

test("driving through an occupied zebra is distinct from a red-light offence", () => {
  const crossing = layout.crossings.find(c => c.junctionId === junction.id && c.axis === "horizontal" && c.x < junction.x);
  const at = crossing.x - crossing.w / 2 - CAR_LENGTH / 2;
  const prev = pose(at - 0.1, junction.y - 1), next = pose(at + 0.1, junction.y - 1);
  assert.equal(R.checkRoadViolation(prev, next, time(0), { pedestrians: [{ x: crossing.x, y: crossing.y }] })?.reason, "crossing");
  assert.equal(R.checkRoadViolation(prev, next, time(0), { pedestrians: [] }), null);
});

test("creeping through an occupied zebra is penalised while stopped cars and slow parking are safe", () => {
  const crossing = layout.crossings.find(c => c.junctionId === junction.id && c.axis === "horizontal" && c.x < junction.x);
  const at = crossing.x - crossing.w / 2 - CAR_LENGTH / 2;
  const pedestrians = [{ x: crossing.x, y: crossing.y }];
  for (const speed of [10, 0.1]) {
    const halfStep = speed / 120 / 2 / TILE;
    const prev = pose(at - halfStep, junction.y - 1, 0, speed), next = pose(at + halfStep, junction.y - 1, 0, speed);
    assert.equal(R.checkRoadViolation(prev, next, time(0), { pedestrians })?.reason, "crossing", `${speed}px/s at120Hz`);
  }
  const prev = pose(at - 0.001, junction.y - 1, 0, 20);
  assert.equal(R.checkRoadViolation(prev, prev, time(0), { pedestrians }), null);
  assert.equal(R.checkRoadViolation(pose(24.9, 22, 0, 20), pose(25.1, 22, 0, 20), 0), null, "wrong-way still requires driving speed");
});

test("queued cars remain exactly stopped until the leader moves, without losing resumed movement", () => {
  const car = { id: "queued", x: 25, y: 20, heading: 0 };
  const lead = { id: "leader", x: 25 + CAR_LENGTH + 0.3, y: 20, heading: 0 };
  assert.equal(R.trafficMoveDistance(car, 0.04, time(0), [lead]), 0);
  const moved = R.trafficMoveDistance(car, 0.04, time(0), [{ ...lead, x: lead.x + 0.04 }]);
  assert.ok(moved > 0.039 && moved <= 0.04);
});

test("collision reports preserve impact speed and only moving vehicle/pedestrian impacts earn offences", () => {
  const hits = [];
  const state = pose(25, 20, 0, 200);
  driveStep(CITY, state, { throttle: 1, steer: 0 }, 0.1, [{ id: "lead", kind: "traffic", x: 28.9 * TILE, y: 20 * TILE, hw: CAR_LENGTH * TILE / 2, hh: CAR_WIDTH * TILE / 2 }], hit => hits.push(hit));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, "traffic");
  assert.ok(hits[0].speed >= 200);
  assert.equal(R.checkRoadViolation(state, state, 0, { collision: hits[0] })?.reason, "collision");
  assert.equal(R.checkRoadViolation(state, state, 0, { collision: { kind: "obstacle", speed: 200 } }), null);
  assert.equal(R.checkRoadViolation(state, state, 0, { collision: { kind: "traffic", speed: 39 } }), null);
});

test("offence cooldown permits exact boundaries without repeated stars while waiting", () => {
  const cooldown = R.createRoadCooldown();
  const a = { id: "red-a", reason: "red-light", message: "Red light" }, b = { ...a, id: "red-b" };
  assert.equal(R.acceptRoadViolation(cooldown, a, 0), true);
  assert.equal(R.acceptRoadViolation(cooldown, b, 7999), false);
  assert.equal(R.acceptRoadViolation(cooldown, b, 8000), true);
  assert.equal(R.acceptRoadViolation(cooldown, a, 19999), false);
  assert.equal(R.acceptRoadViolation(cooldown, a, 20000), true);
  assert.equal(R.acceptRoadViolation(cooldown, null, 100000), false);
});

test("taking out a car avoids occupied road footprints and fails safely when all nearby roads are occupied", () => {
  const original = nearestDrivingSpot(CITY, CITY.spawn);
  const horizontal = Math.abs(Math.cos(original.heading)) > 0.5;
  const occupied = { id: "parked-car", x: original.x, y: original.y, hw: (horizontal ? CAR_LENGTH : CAR_WIDTH) * TILE / 2, hh: (horizontal ? CAR_WIDTH : CAR_LENGTH) * TILE / 2 };
  const replacement = nearestDrivingSpot(CITY, CITY.spawn, [occupied]);
  assert.ok(replacement);
  assert.ok(Math.hypot(replacement.x - original.x, replacement.y - original.y) > TILE);
  assert.equal(nearestDrivingSpot(CITY, CITY.spawn, [{ x: CITY.width / 2, y: CITY.height / 2, hw: CITY.width, hh: CITY.height }]), null);
});

test("crossing residents walk only during pedestrian phases, clear before green and stay continuous", () => {
  assert.equal(R.crossingPedestrianPoses(0).length, 8);
  for (let ms = 0; ms < 80000; ms += 83) {
    const poses = R.crossingPedestrianPoses(ms);
    const next = R.crossingPedestrianPoses(ms + 1);
    for (const [i, p] of poses.entries()) {
      const crossing = layout.crossings.find(c => p.id === `pedestrian-${c.id}`);
      const j = layout.junctions.find(item => item.id === crossing.junctionId);
      if (p.walking) assert.equal(R.signalAt(j, ms).pedestrian, "walk");
      if (R.signalAt(j, ms).pedestrian === "wait") assert.ok(Math.abs(p.y - crossing.y) >= 2.59);
      assert.ok(Math.abs(p.x - crossing.x) < 0.001 && Math.abs(p.y - crossing.y) <= 2.601);
      assert.ok(Math.hypot(p.x - next[i].x, p.y - next[i].y) < 0.002, "no cycle-boundary teleport");
    }
  }
});

test("existing perpendicular corner overlap lets one car clear while the other waits", () => {
  const west = { id: "ai-0", x: 70.94, y: 62, heading: Math.PI };
  const north = { id: "ai-1", x: 70, y: 62.16, heading: -Math.PI / 2 };
  assert.ok(R.trafficMoveDistance(west, 0.04, 120000, [north]) > 0);
  assert.equal(R.trafficMoveDistance(north, 0.04, 120000, [west]), 0);
  const clearNorth = { ...north, y: 64.82 };
  assert.ok(R.trafficMoveDistance(west, 0.04, 218000, [clearNorth]) > 0, "a physically clear crossing path does not deadlock on extra side padding");
  assert.equal(R.trafficMoveDistance(clearNorth, 0.04, 218000, [west]), 0);
  const queueFront = { id: "ambient-7", x: 70, y: 60.48, heading: -Math.PI / 2 };
  const queueRear = { id: "ambient-1", x: 70, y: 64.58, heading: -Math.PI / 2 };
  const turning = { id: "ambient-15", x: 70.94, y: 62, heading: Math.PI };
  assert.ok(R.trafficMoveDistance(turning, 0.04, 210000, [queueFront, queueRear]) > 0, "queue inherits its front car's priority");
  assert.equal(R.trafficMoveDistance(queueFront, 0.04, 210000, [turning, queueRear]), 0);
});

test("nineteen city vehicles keep progressing through turns and queues across several signal cycles", () => {
  for (const baseTime of [0, 30000, 38000]) {
    const { buildLondon } = projectData("src/game/core/london.ts");
    const { commuterPhase } = projectData("src/game/core/residents.ts");
    const {trafficAdvance}=projectData("src/game/core/traffic-flow.ts");
    const routes = buildLondon().routes.map(route => route[0][0] === route.at(-1)[0] && route[0][1] === route.at(-1)[1] ? route : [...route, route[0]]);
    const lengths = routes.map(route => route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0));
    const kinds = ["bus", "sedan", "taxi", "van", "bus", "suv", "delivery", "taxi", "bus", "police", "sedan", "hatchback-sports", "bus", "ambulance", "van", "taxi"];
    const cars = kinds.map((kind, i) => ({ id: `ambient-${i}`, route: i % 3, at: i * 0.173 % 1, speed: [2.6, 2.8, 2.5][i % 3], length: kind === "bus" ? 5.8 : CAR_LENGTH, width: kind === "bus" ? 1.8 : CAR_WIDTH, distance: 0 }));
    for (let i = 0; i < 3; i++) cars.push({ id: `ambient-${16 + i}`, route: i, at: 0.12 + i * 0.19, speed: 2.1, length: CAR_LENGTH, width: CAR_WIDTH, distance: 0, commuter: i * 13 });
    const position = car => {
      const route = routes[car.route];
      let t = (car.distance % lengths[car.route] + lengths[car.route]) % lengths[car.route];
      for (let i = 1; i < route.length; i++) {
        const [ax, ay] = route[i - 1], [bx, by] = route[i], length = Math.hypot(bx - ax, by - ay);
        if (t <= length) return { ...car, ...R.leftLanePoint(ax + (bx - ax) * t / length, ay + (by - ay) * t / length, bx - ax, by - ay), heading: Math.atan2(by - ay, bx - ax) };
        t -= length;
      }
      throw new Error("route sample missing");
    };
    const placed = [];
    for (const car of cars) {
      car.distance = car.at * lengths[car.route];
      for (let attempt = 0; attempt < 100; attempt++) {
        const p = position(car);
        if (!placed.some(other => Math.hypot(other.x - p.x, other.y - p.y) < (car.length + other.length) / 2 + 0.8)) { placed.push(p); break; }
        car.distance += 0.9;
      }
    }
    let checkpoint;
    const dt = 0.05;
    for (let tick = 0; tick < 180 / dt; tick++) {
      const seconds = tick * dt, timeMs = seconds * 1000 + baseTime;
      const poses = cars.map(position), pedestrians = R.crossingPedestrianPoses(timeMs);
      for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const parked = car.commuter !== undefined && commuterPhase(seconds, car.commuter).out;
        const clearance=parked ? 0 : R.trafficMoveDistance(poses[i], dt * car.speed, timeMs, poses.filter(other => other.id !== car.id), pedestrians);
        const move=trafficAdvance(car.velocity??0,car.speed,dt,clearance);
        car.velocity=move.speed;car.distance+=move.distance;
        Object.assign(poses[i], position(car));
      }
      if (tick === 120 / dt) checkpoint = cars.map(car => car.distance);
    }
    for (let i = 0; i < cars.length; i++) assert.ok(cars[i].distance - checkpoint[i] > 1, `${baseTime}ms ${cars[i].id} route${cars[i].route} must move during last60s (got${cars[i].distance - checkpoint[i]})`);
  }
});
