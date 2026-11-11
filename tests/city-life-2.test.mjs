import assert from "node:assert/strict";
import test from "node:test";

import { projectData } from "../scripts/lib/project-data.mjs";

const W = projectData("src/game/core/world.ts");
const C = projectData("src/game/core/city-workers.ts");
const N = projectData("src/game/core/npc-talk.ts");
const T = W.TILE;

test("every workplace has its own building and door, well apart, and the police station isn't on a church", () => {
  const doors = W.CITY.portals.filter((p) => /^role-door-/.test(p.id) && !/doctor|nurse|police/.test(p.id));
  assert.equal(doors.length, W.ROLE_SITES.length);
  for (const d of doors) {
    assert.ok(!W.blocked(W.CITY, d.rect.x + T / 2, d.rect.y + T / 2), `${d.id} is reachable`);
    for (const o of doors) if (o !== d) assert.ok(Math.hypot(o.rect.x - d.rect.x, o.rect.y - d.rect.y) / T >= 6, `${d.id} and ${o.id} are apart`);
  }
  assert.equal(W.policeBuilding()?.label, "Police station");
  assert.ok(!/church/.test(W.policeBuilding()?.id ?? ""));
});

test("city workers stand and walk on walkable tiles", () => {
  const crew = C.cityWorkers(W.CITY, 40);
  assert.ok(crew.length >= 10);
  for (const w of crew) for (const p of [w, w.beat].filter(Boolean))
    assert.ok(!W.blocked(W.CITY, p.x * T, p.z * T), `${w.id} at ${p.x},${p.z}`);
});

test("people have stable personalities, every topic has a reply, and the chat rules are always in the brief", () => {
  const a = N.personaFor("city:resident:1", "Amara B."), b = N.personaFor("city:resident:1", "Amara B.");
  assert.deepEqual(a, b);
  for (const t of N.TALK_TOPICS) assert.ok(N.topicReply(a, t.id).length > 10, t.id);
  assert.ok(N.freeReply(a, "what music do you like?").includes(a.music));
  const brief = N.personaPrompt(a);
  for (const rule of [/personal details/, /meeting in real life/, /romance/, /Childline/, /character in the game/]) assert.match(brief, rule);
});

const D = projectData("src/game/core/street-disputes.ts");

test("street disagreements happen on open pavement, nobody touches anyone, and an officer settles them", () => {
  const spots = D.disputeSpots(W.CITY);
  assert.ok(spots.length >= 3, "a few places in the city");
  for (const s of spots) {
    for (let i = -6; i <= 6; i++) assert.ok(!W.blocked(W.CITY, (s.x + i) * T, s.z * T), "room to walk in and away");
    assert.ok(!W.blocked(W.CITY, s.x * T, s.officerZ * T), "officer can stand beside them");
  }
  for (const d of D.DISPUTES) {
    assert.equal(d.fixes.filter((f) => f.good).length, 1, `${d.id} has one fair fix`);
    for (let t = 0; t < D.T.cycle; t += 0.25) {
      const f = D.disputeFrame(t, spots[0], d);
      if (f.phase === "off") continue;
      assert.ok(Math.abs(f.a.x - f.b.x) >= 1.1, `${d.id} keeps a gap at ${t}s`);
      if (f.phase === "argue") { assert.equal(f.a.pose, "argue"); assert.ok(f.a.say || f.b.say); }
      if (f.phase === "mediate") { assert.ok(f.officer.visible); assert.equal(f.officer.pose, "calm"); }
    }
    assert.equal(D.disputeFrame(D.T.gone + 1, spots[0], d).phase, "off");
  }
  assert.equal(D.APPROACHES.filter((a) => a.good).length, 1);
  const helped = D.disputeFrame(D.T.mediate + 0.5, spots[0], D.DISPUTES[0], true);
  assert.match(helped.officer.say, /Thanks/);
});
