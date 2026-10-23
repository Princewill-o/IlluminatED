import test from "node:test";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const W = projectData("src/game/core/world.ts");
const P = projectData("src/game/core/pursuit.ts");
const L = projectData("src/game/core/law.ts");

test("A real responding car follows road tiles and officers can catch a stationary player", () => {
  const map = W.londonMap(),
    player = map.spawn;
  let s = P.startPursuit(map, player);
  assert.ok(s.route.length >= 8);
  for (const p of s.route)
    assert.ok(
      "=:".includes(
        map.tiles[Math.floor(p.y / W.TILE)][Math.floor(p.x / W.TILE)],
      ),
    );
  for (let t = 0; t < 90000 && s.stage !== "tased" && s.stage !== "challenge"; t += 200) {
    s = P.tickPursuit(s, map, player, t, 0.2);
    for (const o of s.officers) assert.equal(W.blocked(map, o.x, o.y), false);
  }
  // Caught: officers taser the player; the game then opens the knowledge challenge.
  assert.equal(s.stage, "tased");
});
test("Leaving the search field clears stars only after six uninterrupted seconds", () => {
  const map = W.londonMap(),
    start = P.startPursuit(map, map.spawn);
  const far = { x: start.origin.x + start.radius + W.TILE, y: start.origin.y };
  let s = P.tickPursuit(start, map, far, 100, 0.2);
  assert.equal(s.outsideSince, 100);
  assert.equal(s.escaped, false);
  s = P.tickPursuit(s, map, map.spawn, 2000, 0.2);
  assert.equal(s.outsideSince, null);
  s = P.tickPursuit(s, map, far, 3000, 0.2);
  assert.equal(P.tickPursuit(s, map, far, 8999, 0.2).escaped, false);
  assert.equal(P.tickPursuit(s, map, far, 9000, 0.2).escaped, true);
  const wanted = { ...L.freshLife(), stars: 3, heatAt: 100 };
  assert.equal(
    L.cooled(wanted, 200000).stars,
    3,
    "high wanted levels need a spatial escape",
  );
});
test("The prison cell, study desk, inmate conversations and maze exit are connected", () => {
  const map = W.prisonMap();
  assert.ok(map.cols >= 48 && map.rows >= 34);
  for (const portal of map.portals) {
    const end = {
      x: portal.rect.x + portal.rect.w / 2,
      y: portal.rect.y + portal.rect.h / 2,
    };
    assert.equal(W.blocked(map, end.x, end.y), false, portal.id);
    assert.ok(
      P.walkRoute(map, map.spawn, end).length > 0,
      `${portal.id} reachable from an open cell`,
    );
  }
  for (let seconds = 0; seconds < 120; seconds++)
    for (const guard of P.prisonGuardPositions(seconds))
      assert.equal(W.blocked(map, guard.x, guard.y), false);
  assert.equal(
    P.caughtByPrisonGuard(map, map.spawn, 1),
    false,
    "you cannot be caught inside the safe cell block",
  );
  const guard = P.prisonGuardPositions(10)[0];
  assert.equal(P.caughtByPrisonGuard(map, guard, 10), true);
});
test("New Study Quarter destinations are reachable, with a working station and a larger world", () => {
  const map = W.londonMap();
  assert.ok(map.cols >= 112, `world is ${map.cols} tiles wide`);
  assert.ok(map.rows >= 88, `world is ${map.rows} tiles tall`);
  for (const id of ["makerspace", "study-club", "reading-garden"]) {
    const p = map.portals.find((p) => p.id === id);
    assert.ok(p, id);
    assert.ok(
      P.walkRoute(map, map.spawn, {
        x: p.rect.x + p.rect.w / 2,
        y: p.rect.y + p.rect.h / 2,
      }).length > 0,
      `${id} reachable`,
    );
  }
  assert.ok(W.tubeStations().some((s) => s.id === "study-quarter"));
});

 test("Every prison release clears all wanted state and preserves rewards", () => {
  const jailed = {...L.freshLife(), stars:5, heatAt:100, jailUntil:9999, hearing:{stars:5,charge:"test"}, cardsUsed:2, prisonWork:3};
  const released = L.releaseFromPrison(jailed);
  assert.equal(released.stars,0); assert.equal(released.heatAt,0);
  assert.equal(released.jailUntil,0); assert.equal(released.hearing,null);
  assert.equal(released.cardsUsed,2); assert.equal(released.prisonWork,3);
});

test("Escaping through the service exit frees you at maximum wanted level, so the police chase", () => {
  const jailed = { ...L.freshLife(), jailUntil: 5_000_000, prisonWork: 2, hearing: { stars: 3, charge: "x" } };
  const out = L.escapeFromPrison(jailed, 1000);
  assert.equal(out.jailUntil, 0);
  assert.equal(out.hearing, null);
  assert.equal(out.prisonWork, 0);
  assert.equal(out.stars, L.MAX_STARS);
  assert.ok(out.stars >= L.POLICE_STARS, "police respond");
  assert.equal(out.lastOffence, "Escaping from lawful custody");
  // High-star wanted levels never fade on their own: you have to lose the police.
  assert.equal(L.cooled(out, 1000 + 10 * L.STAR_FADE_MS).stars, L.MAX_STARS);
  // Getting caught means a longer sentence than a one-star offence.
  assert.ok(L.sentenceMs(out.stars) > L.sentenceMs(1));
});

test("the police car can't drive through other vehicles, and officers run when it's boxed in", () => {
  const pursuitModule = projectData("src/game/core/pursuit.ts");
  const { startPursuit: start, tickPursuit: tick, policeCarBox, BLOCKED_SECONDS } = pursuitModule;
  const city = W.londonMap();
  const player = { ...city.spawn };
  let state = start(city, player);
  assert.ok(state.route.length > 4, "the car has a road route to drive");
  // Park another car three tiles along the police car's route.
  const blocker = state.route[Math.min(5, state.route.length - 1)];
  const traffic = [{ id: "parked", x: blocker.x, y: blocker.y, hw: 16, hh: 16 }];
  const overlap = (a, b) => Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
  let now = 1_000_000;
  for (let i = 0; i < 20; i++) {
    const before = state.car;
    state = tick(state, city, player, (now += 200), 0.2, traffic);
    const dir = { x: state.car.x - before.x, y: state.car.y - before.y };
    assert.ok(!overlap(policeCarBox(state.car, dir.x || dir.y ? dir : { x: 1, y: 0 }), traffic[0]), "never inside the parked car");
    if (state.stage !== "arriving") break;
  }
  assert.ok(Math.hypot(state.car.x - blocker.x, state.car.y - blocker.y) > 16, "stopped short of the blocker");
  // Boxed in for longer than the limit: officers get out and chase on foot.
  for (let i = 0; i < (BLOCKED_SECONDS + 1) * 5 && state.stage === "arriving"; i++) state = tick(state, city, player, (now += 200), 0.2, traffic);
  assert.equal(state.stage, "chasing");
  assert.equal(state.officers.length, 2);
});

test("the police interview only happens when they aren't sure, and honesty lightens the charge", () => {
  assert.equal(L.policeUnsure(2, "Shoplifting from a high-street shop"), true);
  assert.equal(L.policeUnsure(3, "Causing a scuffle in the street"), true);
  assert.equal(L.policeUnsure(4, "Causing a scuffle in the street"), false);
  assert.equal(L.policeUnsure(3, "Taking a car without the owner's consent"), false);
  assert.equal(L.policeUnsure(2, "Escaping from lawful custody"), false);
  assert.equal(L.honestStars(3), 2);
  assert.equal(L.honestStars(1), 1);
});
