import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";

const world = projectData("src/game/core/world.ts");
const uk = projectData("src/game/core/uk-world.ts");
const nav = projectData("src/game/core/uk-navigation.ts");
const corridors = projectData("src/game/core/motorway-corridors.ts");
const driving = projectData("src/game/core/driving.ts");
const life = projectData("src/game/core/living-world.ts");
const { UNIVERSITIES } = projectData("src/game/core/universities.ts");
const { partyMap } = projectData("src/game/core/party.ts");
const { walkRoute, startPursuit, tickPursuit } = projectData(
  "src/game/core/pursuit.ts",
);
const { TILE, blocked } = world;
const centre = (portal) => ({
  x: portal.rect.x + portal.rect.w / 2,
  y: portal.rect.y + portal.rect.h / 2,
});

test("every regional journey includes a long driven corridor with a reachable diverging slip road", () => {
  for (const route of corridors.MOTORWAY_CORRIDORS) {
    const id = `road-${route.city}`,
      map = uk.ukWorldMap(id),
      scene = uk.buildUKScene(id);
    assert.ok(map.cols >= 700);
    assert.equal(scene.routes.length, 6);
    assert.equal(life.isMotorway(id), true);
    const path = Array.from(nav.planUKJourney("city", route.city).maps);
    assert.deepEqual(path, ["city", "m25", id, route.city]);
    const slip = map.portals.find((p) => p.id === "city-slip");
    assert.equal(slip.to.mapId, route.city);
    assert.ok(slip.rect.x > map.width * 0.9);
    assert.ok(walkRoute(map, map.spawn, centre(slip)).length > 650);
    assert.ok(scene.things.some((t) => t.label?.includes("exit")));
    const arrival = nav.roadTransitionArrival(map, "m25", undefined, true);
    assert.ok(driving.vehicleFits(map, arrival, true));
    assert.equal(arrival.heading, 0);
    const back = nav.roadTransitionArrival(map, route.city, undefined, true);
    assert.ok(driving.vehicleFits(map, back, true));
    assert.equal(back.heading, Math.PI);
    const orbital = nav.roadTransitionArrival(
      uk.ukWorldMap("m25"),
      id,
      undefined,
      true,
    );
    assert.ok(driving.vehicleFits(uk.ukWorldMap("m25"), orbital, true));
    assert.equal(orbital.heading, Math.PI);
    assert.equal(
      blocked(map, 300 * TILE, 35 * TILE),
      true,
      "central reservation blocks cross-traffic",
    );
    // The car must physically fit along the taper, rather than pass through roadside scenery.
    for (let x = 552; x < 690; x += 8) {
      const y = 30 - (16 * (x - 550)) / 146;
      assert.equal(
        driving.vehicleFits(
          map,
          { x: x * TILE, y: y * TILE, heading: Math.atan2(-16, 146) },
          true,
        ),
        true,
        `${id} slip ${x}`,
      );
    }
  }
});

test("motorway acceleration reaches a higher cruise speed while swept collision stops the whole car", () => {
  const map = uk.ukWorldMap("road-kent");
  let car = { x: 40 * TILE, y: 30 * TILE, heading: 0, speed: 0 };
  const max = life.roadCruiseSpeed(map.id, 3.6);
  assert.ok(max > life.roadCruiseSpeed("city", 3.6) * 2);
  for (let i = 0; i < 480; i++)
    car = driving.driveStep(
      map,
      car,
      { throttle: 1, steer: 0, maxSpeed: max },
      1 / 60,
    );
  assert.ok(car.speed >= max * 0.99);
  const barrier = {
    x: car.x + 100,
    y: car.y,
    hw: 32,
    hh: 24,
    id: "stopped-car",
  };
  let hit;
  const stopped = driving.driveStep(
    map,
    car,
    { throttle: 1, steer: 0, maxSpeed: max },
    0.1,
    [barrier],
    (impact) => {
      hit = impact;
    },
  );
  assert.ok(hit);
  assert.equal(stopped.speed, 0);
  assert.ok(stopped.x < barrier.x - barrier.hw);
  assert.ok(life.crashImpact(hit.speed).damage > 0);
  assert.equal(life.crashImpact(0).damage, 0);
});

test("all nine universities sit in their named cities and each room returns to that city", () => {
  assert.equal(UNIVERSITIES.length, 9);
  const seen = new Set();
  for (const university of UNIVERSITIES) {
    const city =
      university.city === "city" ? world.CITY : uk.ukWorldMap(university.city);
    const gate = city.portals.find(
      (p) =>
        p.to.kind === "map" && p.to.mapId === `university-${university.id}`,
    );
    assert.ok(gate, university.id);
    assert.ok(walkRoute(city, city.spawn, centre(gate)).length, university.id);
    assert.ok(!blocked(city, centre(gate).x, centre(gate).y));
    const key = `${city.id}:${gate.rect.x}:${gate.rect.y}`;
    assert.ok(!seen.has(key));
    seen.add(key);
    const inside = world.universityInteriorMap(university.id);
    assert.equal(
      inside.portals.find((p) => p.id === "exit").to.mapId,
      university.city,
    );
    assert.equal(nav.ukRegionOf(inside.id), university.city);
    assert.equal(new URL(university.events).protocol, "https:");
    for (const desk of inside.portals)
      assert.ok(walkRoute(inside, inside.spawn, centre(desk)).length);
  }
  assert.equal(
    world.CITY.portals.some(
      (p) => p.to.kind === "map" && p.to.mapId === "universities",
    ),
    false,
  );
});

test("party venues have accessible refreshments, a learning challenge and an exact city return", () => {
  for (const id of [
    "city",
    "kent",
    "nottingham",
    "birmingham",
    "manchester",
    "edinburgh",
  ]) {
    const city = id === "city" ? world.CITY : uk.ukWorldMap(id),
      map = partyMap(id);
    assert.ok(
      city.portals.some((p) => p.to.kind === "map" && p.to.mapId === map.id),
      id,
    );
    for (const portal of map.portals)
      assert.ok(
        walkRoute(map, map.spawn, centre(portal)).length,
        `${id}:${portal.id}`,
      );
    assert.equal(map.portals.find((p) => p.id === "exit").to.mapId, id);
    assert.equal(nav.ukRegionOf(map.id), id);
  }
});

test("officers can enter offices, homes, universities and social venues through accessible entrances", () => {
  for (const map of [
    world.homeMap(0),
    world.universityInteriorMap("ntu"),
    partyMap("kent"),
    world.hospitalMap(),
  ]) {
    const goal = map.portals[0],
      player = centre(goal);
    let state = startPursuit(map, player);
    const entrance = world.safeSpot(map, map.spawn.x, map.spawn.y);
    assert.equal(state.car.x, entrance.x);
    assert.equal(state.car.y, entrance.y);
    for (let ms = 0; ms < 60000 && state.stage !== "tased"; ms += 200) {
      state = tickPursuit(state, map, player, ms, 0.2);
      for (const officer of state.officers)
        assert.equal(blocked(map, officer.x, officer.y), false, map.id);
    }
    assert.equal(state.stage, "tased", map.id);
  }
});

test("two-minute journey clocks complete after suspension and resident schedules remain varied", () => {
  assert.equal(life.TRAIN_JOURNEY_MS, 120000);
  for (const elapsed of [0, 30000, 119999, 120000, 180000]) {
    const clock = life.journeyClock(1000, 1000 + elapsed);
    assert.equal(clock.remaining, Math.max(0, 120000 - elapsed));
    assert.ok(clock.progress >= 0 && clock.progress <= 1);
  }
  assert.equal(life.journeyClock(1000, 0).remaining, 120000);
  assert.equal(
    life.residentMotionSeconds(0, 50000),
    life.residentMotionSeconds(0, 70000),
    "stationary activity cannot advance the route",
  );
  assert.equal(
    life.residentMotionSeconds(0, 75000) - life.residentMotionSeconds(0, 74000),
    1,
  );
  const now = 1800000123456;
  const activities = Array.from({ length: 64 }, (_, i) =>
    life.residentActivity(i, now),
  );
  assert.ok(activities.filter((a) => a === "walk").length >= 24);
  assert.ok(new Set(activities).size >= 5);
  for (let i = 0; i < 64; i++)
    assert.equal(
      life.residentActivity(i, now),
      life.residentActivity(i, now + 74000),
    );
});

const conflict = projectData("src/game/core/civilian-conflict.ts");
const learning = projectData("src/game/core/hearing-learning.ts");
test("witness statements expose conflicting claims without rewriting recorded evidence or verdicts", () => {
  let encounter = conflict.beginStreetEncounter({
    npcId: "city:resident:test",
    npcName: "Taylor",
    at: 1000,
    witnesses: 3,
    seed: 123,
  });
  encounter = conflict.recordStreetHit(encounter, {
    attacker: "player",
    damage: 12,
    at: 1000,
  });
  const file = conflict.assessStreetEncounter(encounter).caseFile;
  const before = JSON.stringify(file),
    verdict = conflict.adjudicateStreetCase(file, "contest");
  const statements = learning.witnessStatements(file);
  assert.equal(statements.length, 3);
  assert.ok(statements.some((s) => s.agrees));
  assert.ok(statements.some((s) => !s.agrees));
  assert.equal(new Set(statements.map((s) => s.name)).size, 3);
  const questions = learning.hearingQuestions(file);
  assert.equal(questions.length, 5);
  assert.ok(questions.every((q) => q.options[q.answer] && q.explanation));
  assert.equal(JSON.stringify(file), before);
  assert.deepEqual(conflict.adjudicateStreetCase(file, "contest"), verdict);
  assert.equal(
    learning.witnessStatements({
      ...file,
      evidence: { ...file.evidence, witnesses: 0 },
    }).length,
    0,
  );
  assert.match(
    learning.hearingQuestions({
      ...file,
      evidence: { ...file.evidence, witnesses: 0 },
    })[1].prompt,
    /practice example/,
  );
});

const clips = projectData("src/game/core/creator-clips.ts");
test("creator timelines loop across bounded shots and video validation rejects empty or oversized media", () => {
  const shots = [
    { clip: "wave", seconds: 3, facing: "S" },
    { clip: "dance", seconds: 4, facing: "E" },
  ];
  for (const [second, index] of [
    [0, 0],
    [2.9, 0],
    [3, 1],
    [6.99, 1],
    [7, 0],
    [10, 1],
  ])
    assert.equal(clips.animationShotAt(shots, second), index);
  assert.equal(clips.animationShotAt([], 30), 0);
  for (const type of ["video/webm", "video/mp4", "video/webm;codecs=vp9"])
    assert.equal(clips.validClip(new Blob(["video"], { type })), true);
  assert.equal(clips.validClip(new Blob([], { type: "video/webm" })), false);
  assert.equal(
    clips.validClip(new Blob(["text"], { type: "text/html" })),
    false,
  );
  assert.equal(
    clips.validClip(
      new Blob([new Uint8Array(clips.MAX_CLIP_BYTES + 1)], {
        type: "video/webm",
      }),
    ),
    false,
  );
});

const continuity = projectData("src/components/game/world/scene-continuity.ts");
test("scene capture cleanup cannot remove the next scene provider and failed captures safely fall back", () => {
  const old = continuity.registerSceneCapture(() => "old");
  const next = continuity.registerSceneCapture(() => "next");
  old();
  assert.equal(continuity.captureScene(), "next");
  next();
  assert.equal(continuity.captureScene(), null);
  const failed = continuity.registerSceneCapture(() => {
    throw Error("context lost");
  });
  assert.equal(continuity.captureScene(), null);
  failed();
});

test('the actual prison roster includes aggressive inmates while staff cannot initiate fights',()=>{
  const {residentPaths}=projectData('src/game/core/residents.ts');
  const {residentIdentity}=projectData('src/game/core/city-social.ts');
  const inmates=residentPaths(world.prisonMap(),34).filter(path=>path.x0<25&&path.x1<25).map(path=>residentIdentity('prison',path));
  assert.ok(inmates.length>=8);
  assert.ok(inmates.some(person=>conflict.civilianDisposition(person.id).hostile));
  for(const person of inmates)assert.equal(conflict.civilianDisposition(person.id,0,'staff').hostile,false);
});
