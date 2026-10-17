import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const { CAR_LENGTH, CAR_WIDTH } = projectData("src/game/core/vehicles.ts");
const { driveStep, vehicleFits, nearestDrivingSpot, nearestParkingSpot } = projectData("src/game/core/driving.ts");
const TILE = 32;
const street = () => {
  const tiles = Array.from({ length: 24 }, (_, y) => Array.from({ length: 32 }, (_, x) =>
    y >= 9 && y <= 12 || x >= 14 && x <= 17 ? "=" : y === 8 || y === 13 || x === 13 || x === 18 ? "-" : "X").join(""));
  return { tiles, cols: 32, rows: 24, width: 32 * TILE, height: 24 * TILE, spawn: { x: 8 * TILE, y: 8.5 * TILE } };
};
const simulate = (map, state, input, seconds) => {
  for (let i = 0; i < seconds * 60; i++) state = driveStep(map, state, input, 1 / 60);
  return state;
};

test("cars are several times wider and longer than a walking avatar", () => {
  assert.ok(CAR_LENGTH >= 3.8);
  assert.ok(CAR_WIDTH >= 1.65);
});

test("accelerating builds speed and releasing the pedal coasts to a stop", () => {
  const map = street();
  const initial = { x: 5 * TILE, y: 11 * TILE, heading: 0, speed: 0 };
  const moving = simulate(map, initial, { throttle: 1, steer: 0 }, 1);
  assert.ok(moving.x > initial.x + TILE);
  assert.ok(moving.speed > 0);
  const coasting = simulate(map, moving, { throttle: 0, steer: 0 }, 3);
  assert.ok(coasting.speed < moving.speed);
});

test("braking stops before reverse engages and steering follows the car heading", () => {
  const map = street();
  const state = { x: 12 * TILE, y: 11 * TILE, heading: 0, speed: 90 };
  const braking = driveStep(map, state, { throttle: -1, steer: 0 }, 1 / 60);
  assert.ok(braking.speed >= 0 && braking.speed < state.speed);
  const reverse = simulate(map, { ...state, speed: 0 }, { throttle: -1, steer: 0 }, 0.5);
  assert.ok(reverse.speed < 0 && reverse.x < state.x);
  const turning = simulate(map, { ...state, x: 16 * TILE, speed: 35 }, { throttle: 0, steer: 1 }, 0.2);
  assert.ok(turning.heading > state.heading);
});

test("road spawns require the entire rotated car on the road and buildings block its nose", () => {
  const map = street();
  assert.ok(vehicleFits(map, { x: 7 * TILE, y: 11 * TILE, heading: 0 }));
  assert.equal(vehicleFits(map, { x: 7 * TILE, y: 9.3 * TILE, heading: 0 }), false);
  assert.equal(vehicleFits(map, { x: TILE, y: 11 * TILE, heading: 0 }), false);
  const blocked = simulate(map, { x: 8 * TILE, y: 11 * TILE, heading: -Math.PI / 2, speed: 200 }, { throttle: 1, steer: 0 }, 1);
  assert.ok(blocked.y >= 8 * TILE + CAR_LENGTH / 2 * TILE - 0.02);
  assert.equal(blocked.speed, 0);
});

test("a car can make a tight junction turn while keeping its centre on-road", () => {
  const map = street();
  let state = { x: 14 * TILE, y: 10 * TILE, heading: 0, speed: 65 };
  for (let i = 0; i < 90 && state.heading < Math.PI / 2 - 0.02; i++)
    state = driveStep(map, state, { throttle: 0.2, steer: 1 }, 1 / 60);
  assert.ok(state.heading > Math.PI / 2 - 0.04);
  assert.equal(map.tiles[Math.floor(state.y / TILE)][Math.floor(state.x / TILE)], "=");
});

test("large timesteps cannot tunnel through buildings or cross the pavement", () => {
  const map = street();
  const state = { x: 9 * TILE, y: 11 * TILE, heading: 0, speed: 260 };
  map.tiles[10] = map.tiles[10].slice(0, 11) + "X" + map.tiles[10].slice(12);
  map.tiles[11] = map.tiles[11].slice(0, 11) + "X" + map.tiles[11].slice(12);
  const next = driveStep(map, state, { throttle: 1, steer: 0 }, 20);
  assert.ok(next.x + CAR_LENGTH / 2 * TILE <= 11 * TILE);
});

test("a driving car stops at traffic using its full footprint", () => {
  const map = street();
  const traffic = [{ x: 13 * TILE, y: 11 * TILE, hw: CAR_LENGTH * TILE / 2, hh: CAR_WIDTH * TILE / 2 }];
  let state = { x: 8 * TILE, y: 11 * TILE, heading: 0, speed: 180 };
  for (let i = 0; i < 60; i++) state = driveStep(map, state, { throttle: 1, steer: 0 }, 1 / 60, traffic);
  assert.ok(state.x + CAR_LENGTH * TILE / 2 <= traffic[0].x - traffic[0].hw + 0.02);
  assert.equal(state.speed, 0);
});

test("road spawn fits the whole car and parking returns a clear pavement spot", () => {
  const map = street();
  const spot = nearestDrivingSpot(map, map.spawn);
  assert.ok(spot && vehicleFits(map, spot));
  assert.equal(spot.speed, 0);
  const parking = nearestParkingSpot(map, spot);
  assert.ok(parking);
  assert.equal(map.tiles[Math.floor(parking.y / TILE)][Math.floor(parking.x / TILE)], "-");
  assert.ok(Math.hypot(parking.x - spot.x, parking.y - spot.y) < 8 * TILE);
});

test("roads across water are not valid spawns and maps without roads cannot summon a car", () => {
  const map = street();
  map.tiles = map.tiles.map(row => row.split("").map((ch, x) => x === 10 ? "w" : ch).join(""));
  const spot = nearestDrivingSpot(map, { x: 7 * TILE, y: 8.5 * TILE });
  assert.ok(spot && spot.x < 10 * TILE);
  const noRoad = { ...map, tiles: Array.from({ length: 24 }, () => "-".repeat(32)) };
  assert.equal(nearestDrivingSpot(noRoad, map.spawn), null);
});

test("the real city supports safe car collection and nearby parking at its arrival point", () => {
  const { CITY } = projectData("src/game/core/world.ts");
  const spot = nearestDrivingSpot(CITY, CITY.spawn);
  assert.ok(spot && vehicleFits(CITY, spot));
  const parked = nearestParkingSpot(CITY, spot);
  assert.ok(parked);
  assert.ok(["-", "_"].includes(CITY.tiles[Math.floor(parked.y / TILE)][Math.floor(parked.x / TILE)]));
});

test("every city traffic route uses lanes that support a moving full-sized car", () => {
  const { CITY } = projectData("src/game/core/world.ts");
  const { buildLondon } = projectData("src/game/core/london.ts");
  for (const [r, route] of buildLondon().routes.entries()) {
    for (let i = 1; i < route.length; i++) {
      const [ax, ay] = route[i - 1], [bx, by] = route[i];
      const length = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / length, dy = (by - ay) / length;
      const state = { x: ((ax + bx) / 2 + dy) * TILE, y: ((ay + by) / 2 - dx) * TILE, heading: Math.atan2(dy, dx), speed: 0 };
      assert.ok(vehicleFits(CITY, state), `route ${r} segment ${i}: lane fits`);
      const driven = simulate(CITY, state, { throttle: 1, steer: 0 }, 0.5);
      assert.ok(Math.hypot(driven.x - state.x, driven.y - state.y) > TILE / 2, `route ${r} segment ${i}: moves`);
    }
  }
});
