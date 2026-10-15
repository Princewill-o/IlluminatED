import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectData } from "../scripts/lib/project-data.mjs";

const { COMPANIES } = projectData("src/game/core/companies.ts");
const { GENERATOR_KINDS, generate } = projectData(
  "src/game/core/generators.ts",
);
const { createRng } = projectData("src/game/core/rng.ts");
const { buildDeck, sourcesFor } = projectData("src/game/core/deck.ts");
const shift = projectData("src/game/core/shift.ts");
const { levelForXp, xpForLevel, rewardsFor } = projectData(
  "src/game/core/progression.ts",
);
const { COSMETICS, cosmeticById, sanitiseAvatar, DEFAULT_AVATAR } = projectData(
  "src/game/core/cosmetics.ts",
);
const { COURSES } = projectData("src/lib/data/courses.ts");
const { QUESTION_BANK, FLASHCARDS } = projectData(
  "src/lib/data/topics/index.ts",
);

const MIGRATION = fs.readFileSync(
  "supabase/migrations/20261015130925_games_promotion_panic.sql",
  "utf8",
);
const CHARACTERS = fs.readFileSync(
  "supabase/migrations/20261015150000_games_characters_v2.sql",
  "utf8",
);
const ALL = {
  bank: QUESTION_BANK,
  terms: FLASHCARDS.filter((f) => f.kind === "Key term"),
};

const validQuestion = (q, label) => {
  assert.ok(q.prompt && q.explain, `${label}: prompt and explanation`);
  assert.ok(q.options.length >= 2, `${label}: at least two options`);
  assert.equal(
    new Set(q.options).size,
    q.options.length,
    `${label}: options unique (${q.options})`,
  );
  assert.ok(
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
    `${label}: answer index`,
  );
};

test("Every generator makes valid questions across many seeds", () => {
  for (const kind of GENERATOR_KINDS) {
    const rng = createRng(42);
    for (let i = 0; i < 300; i++)
      validQuestion(generate(kind, rng), `${kind}#${i}`);
  }
});

test("Generators give the right answers", () => {
  const rng = createRng(7);
  for (let i = 0; i < 200; i++) {
    const b = generate("binary", rng);
    const bits = b.prompt.match(/[01]{8}/)[0];
    assert.equal(b.options[b.answer], String(parseInt(bits, 2)));
    const h = generate("hex", rng);
    const hex = h.prompt.match(/number ([0-9A-F]{2})/)[1];
    assert.equal(h.options[h.answer], String(parseInt(hex, 16)));
    const t = generate("times", rng);
    const m = t.prompt.match(/(\d+) ([×÷]) (\d+)/);
    const want =
      m[2] === "×" ? Number(m[1]) * Number(m[3]) : Number(m[1]) / Number(m[3]);
    assert.equal(t.options[t.answer], String(want));
    const s = generate("speed", rng);
    const [, d, sec] = s.prompt.match(/travels (\d+) m in (\d+) s/);
    assert.equal(s.options[s.answer], `${Number(d) / Number(sec)} m/s`);
  }
});

test("Companies are complete and point at real courses", () => {
  const ids = new Set(COURSES.map((c) => c.id));
  assert.equal(new Set(COMPANIES.map((c) => c.id)).size, COMPANIES.length);
  for (const c of COMPANIES) {
    assert.match(c.id, /^[a-z0-9-]{2,40}$/);
    for (const id of c.courseIds)
      assert.ok(ids.has(id), `${c.id}: unknown course ${id}`);
    for (const g of c.generators)
      assert.ok(GENERATOR_KINDS.includes(g), `${c.id}: ${g}`);
    assert.ok(
      c.wins.length >= 3 && c.fails.length >= 3,
      `${c.id}: needs jokes`,
    );
    const reward = cosmeticById(c.ceoReward);
    assert.ok(reward, `${c.id}: CEO reward exists`);
    assert.equal(reward.unlock, `ceo:${c.id}`, `${c.id}: CEO reward unlock`);
  }
});

test("Every company builds a full, valid, repeatable 12-task shift", () => {
  for (const c of COMPANIES) {
    const src = sourcesFor(c, ALL);
    for (const seed of [1, 99, 123456]) {
      const deck = buildDeck(c, src, seed);
      assert.equal(deck.length, shift.SHIFT_LENGTH, `${c.id} seed ${seed}`);
      assert.equal(
        new Set(deck.map((q) => q.prompt)).size,
        deck.length,
        `${c.id}: no repeats`,
      );
      deck.forEach((q, i) => validQuestion(q, `${c.id}#${i}`));
      assert.deepEqual(
        buildDeck(c, src, seed),
        deck,
        `${c.id}: same seed, same deck`,
      );
    }
    assert.ok(
      buildDeck(c, src, 5).some((q) => q.kind !== "gen") ||
        src.bank.length + src.terms.length === 0,
      `${c.id}: uses real revision content`,
    );
  }
});

test("Shift scoring, streaks, promotions and strikes", () => {
  const q = {
    key: "k",
    prompt: "p",
    options: ["a", "b"],
    answer: 0,
    explain: "e",
    topic: "t",
    kind: "gen",
    timeLimit: 10,
  };
  let s = shift.startShift(Array.from({ length: 12 }, () => q));
  for (let i = 0; i < 12; i++) s = shift.next(shift.answer(s, 0, 1));
  assert.equal(s.phase, "over");
  assert.equal(s.correct, 12);
  assert.equal(s.score, 6600);
  assert.equal(s.rank, 7);
  assert.ok(s.score <= shift.maxScoreFor(s.correct));

  let f = shift.startShift(Array.from({ length: 12 }, () => q));
  f = shift.answer(f, 1, 1);
  assert.equal(f.last.correct, false);
  f = shift.next(f);
  f = shift.next(shift.answer(f, null, 0));
  f = shift.answer(f, 1, 0.5);
  assert.equal(f.fired, true);
  assert.equal(shift.next(f).phase, "over");

  let p = shift.startShift([{ ...q, options: ["a", "b", "c", "d"] }]);
  p = shift.applyPowerUp(p, "tiggy", 3);
  assert.equal(p.hidden.length, 2);
  assert.ok(!p.hidden.includes(0));
  assert.equal(shift.applyPowerUp(p, "tiggy").hidden, p.hidden, "single use");
  p = shift.applyPowerUp(p, "blame");
  assert.equal(p.last.skipped, true);
  assert.equal(p.strikes, 0);
});

test("Ranks and rewards match the database function", () => {
  for (const r of shift.RANKS.slice(1))
    assert.ok(MIGRATION.includes(`when score >= ${r.min} then`), r.title);
  for (let xp = 0; xp < 20000; xp += 37) {
    const level = levelForXp(xp);
    assert.ok(
      xpForLevel(level) <= xp && xp < xpForLevel(level + 1),
      `xp ${xp}`,
    );
  }
  assert.ok(
    MIGRATION.includes("floor((1 + sqrt(1 + 0.08 * (st.xp + v_xp))) / 2)"),
  );
  assert.ok(MIGRATION.includes("v_xp := 10 + p_correct * 20 + v_rank * 10;"));
  assert.ok(MIGRATION.includes("v_clout := (p_correct * 10 + v_rank * 15)"));
  assert.equal(
    JSON.stringify(rewardsFor({ correct: 11, rank: 6 }, true)),
    JSON.stringify({ xp: 290, clout: 400 }),
  );
});

test("Locker catalogue matches the migration and the default avatar is free", () => {
  assert.equal(new Set(COSMETICS.map((c) => c.id)).size, COSMETICS.length);
  for (const c of COSMETICS) {
    const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
    const row = `(${q(c.id)}, ${q(c.slot)}, ${q(c.name)}, ${c.price}, ${q(c.unlock)}, `;
    const tail = `, ${q(c.rarity)}, ${q(c.set)})`;
    const line = CHARACTERS.split("\n").find((l) => l.includes(row));
    assert.ok(line && line.includes(tail), `migration row for ${c.id}`);
  }
  for (const [slot, id] of Object.entries(DEFAULT_AVATAR)) {
    const item = cosmeticById(id);
    assert.equal(item.slot, slot);
    assert.equal(item.price, 0);
    assert.equal(item.unlock, undefined);
  }
  const clean = sanitiseAvatar(
    { hat: "hat-crown", pet: "pet-dog", skin: "skin-5", top: "nope" },
    new Set(["pet-dog"]),
  );
  assert.equal(clean.hat, "hat-none");
  assert.equal(clean.pet, "pet-dog");
  assert.equal(clean.skin, "skin-5");
  assert.equal(clean.top, DEFAULT_AVATAR.top);
});

test("Every boss is a valid character from the catalogue", () => {
  const { SLOTS, RARITY, SETS } = projectData("src/game/core/cosmetics.ts");
  const slots = new Set(SLOTS.map((s) => s.slot));
  assert.equal(slots.size, 15);
  for (const c of COMPANIES) {
    for (const [slot, id] of Object.entries(c.boss.look)) {
      assert.ok(slots.has(slot), `${c.boss.name}: slot ${slot}`);
      const item = cosmeticById(id);
      assert.ok(item && item.slot === slot, `${c.boss.name}: ${slot}=${id}`);
    }
  }
  for (const item of COSMETICS) {
    assert.ok(RARITY[item.rarity], `${item.id} rarity`);
    if (item.set) assert.ok(SETS[item.set] || COMPANIES.some((c) => c.id === item.set), `${item.id} set ${item.set}`);
  }
  for (const { slot } of SLOTS) {
    assert.ok(COSMETICS.filter((i) => i.slot === slot).length >= 5, `${slot} has at least 5 options`);
  }
});

test("Worlds: every map is walkable, doors are reachable, servers fill sensibly", () => {
  const W = projectData("src/game/core/world.ts");
  const orgs = Array.from({ length: 30 }, (_, i) => ({ slug: `org-${i}`, name: `Org ${i}`, sector: "tech", accent: "#6bc6ff" }));
  const maps = [W.CITY, W.campusMap([]), W.campusMap(orgs), W.officeMap(orgs[0])];
  for (const map of maps) {
    assert.ok(!W.blocked(map, map.spawn.x, map.spawn.y), `${map.id}: spawn is free`);
    for (const p of map.portals) {
      const cx = p.rect.x + p.rect.w / 2;
      const cy = p.rect.y + p.rect.h / 2;
      assert.ok(!W.blocked(map, cx, cy), `${map.id}: portal ${p.id} is standable`);
      assert.equal(W.portalAt(map, cx, cy)?.id, p.id, `${map.id}: portal ${p.id} triggers`);
      // Breadth-first search over a 16px grid: is there a free path from spawn to the door?
      const G = 16;
      const key = (x, y) => `${x},${y}`;
      const start = [Math.round(map.spawn.x / G), Math.round(map.spawn.y / G)];
      const queue = [start];
      const seen = new Set([key(...start)]);
      let found = false;
      while (queue.length && !found) {
        const [gx, gy] = queue.shift();
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + ax;
          const ny = gy + ay;
          if (seen.has(key(nx, ny)) || W.blocked(map, nx * G, ny * G)) continue;
          seen.add(key(nx, ny));
          if (W.portalAt(map, nx * G, ny * G)?.id === p.id) found = true;
          queue.push([nx, ny]);
        }
      }
      assert.ok(found, `${map.id}: can walk to ${p.id}`);
    }
  }
  const office = W.officeMap(orgs[0]);
  assert.equal(office.rooms.length, 2, "two meeting rooms");
  for (const r of office.rooms) {
    assert.equal(W.roomAt(office, r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2), r.name);
  }
  assert.equal(W.roomAt(office, office.spawn.x, office.spawn.y), null, "reception is not a meeting room");
  assert.ok(W.blocked(W.CITY, -5, 10));
  const p0 = { ...W.CITY.spawn };
  const p1 = W.step(W.CITY, p0, 1, 0, 0.05);
  assert.ok(Math.abs(p1.x - p0.x - W.WALK_SPEED * 0.05) < 0.01, "moves at walking speed");

  const empty = {};
  assert.equal(W.pickServer("lse", empty).id, "lse-1");
  assert.equal(W.pickServer("lse", { "lse-1": 10, "lse-2": 20 }).id, "lse-2", "busiest with room");
  assert.equal(W.pickServer("lse", { "lse-1": 39, "lse-2": 38, "lse-3": 38 }).id, "sw-1", "falls back when region full");
  assert.equal(W.channelFor("city", "lse-1"), "world:city:lse-1");
  assert.equal(W.channelFor("office-acme", "lse-1"), "world:office-acme");
  assert.equal(W.guessRegion("Europe/London"), "lse");
  assert.equal(W.guessRegion("America/New_York"), "intl");
});
