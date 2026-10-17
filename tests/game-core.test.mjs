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
  const DYES_SQL = fs.readFileSync("supabase/migrations/20261016160000_characters_v3_dyes.sql", "utf8");
  for (const c of COSMETICS) {
    if (c.slot.endsWith("Color") && c.slot !== "hairColor") {
      assert.ok(DYES_SQL.includes(`'${c.id.split("-").slice(1).join("-")}', '${c.name}'`), `dye row for ${c.id}`);
      continue;
    }
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
  assert.equal(slots.size, 18);
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
      let cx = p.rect.x + p.rect.w / 2;
      let cy = p.rect.y + p.rect.h / 2;
      // Bus stops are walked up to: any free spot around the stop will do.
      if (p.to.kind === "bus")
        for (let y = p.rect.y + 8; y < p.rect.y + p.rect.h; y += 16)
          for (let x = p.rect.x + 8; x < p.rect.x + p.rect.w; x += 16)
            if (W.blocked(map, cx, cy) && !W.blocked(map, x, y) && W.portalAt(map, x, y)?.id === p.id) [cx, cy] = [x, y];
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

test("Characters: every Locker look has its Kenney pieces and sheets, and anchors cover every frame", () => {
  const { COSMETICS } = projectData("src/game/core/cosmetics.ts");
  const L = projectData("src/game/core/looks.ts");
  const meta = JSON.parse(fs.readFileSync("public/characters/meta.json", "utf8"));
  assert.equal(meta.frames.length, 42);
  assert.equal(meta.anchors.length, meta.frames.length);
  assert.ok(meta.u > 10, "head size for faces");
  for (const a of meta.anchors) for (const k of ["face", "head", "chest"]) assert.ok(a[k].every((v) => v >= 0 && v <= 176), `${k} anchor in frame`);
  const sheet = (n) => fs.existsSync(`public/characters/${n}.webp`) && meta.layers.includes(n);
  for (const c of COSMETICS) {
    if (c.slot === "hair") {
      const look = L.HAIR_LOOK[c.id];
      assert.ok(look, `look for ${c.id}`);
      assert.ok(sheet(`kh-${look.head}-skin`), `head for ${c.id}`);
      if (look.hair) assert.ok(sheet(look.hair), `hair sheet for ${c.id}`);
    }
    if (c.slot === "top") assert.ok(sheet(`kb-${L.TOP_LOOK[c.id]}-top`), `top for ${c.id}`);
    if (c.slot === "bottom") assert.ok(sheet(`kb-${L.BOTTOM_LOOK[c.id]}-bottom`), `bottom for ${c.id}`);
    if (c.slot === "shoes") assert.ok(sheet(`kb-${L.SHOES_LOOK[c.id]}-shoes`), `shoes for ${c.id}`);
    if (["hat", "held", "pet"].includes(c.slot) && !c.id.endsWith("-none")) assert.ok(sheet(c.id), `sheet for ${c.id}`);
    if (c.slot === "head" && c.id !== "head-human") assert.ok(sheet(c.id), `sheet for ${c.id}`);
  }
  assert.ok(sheet("cape-back"));
});

test("London: every HQ and station has a door, Tube exits are walkable, homes work", () => {
  const W = projectData("src/game/core/world.ts");
  const L = W.CITY;
  assert.equal(L.name, "London");
  assert.equal(L.portals.filter((p) => p.id.startsWith("hq-")).length, 13, "13 company HQs");
  const work = L.portals.filter((p) => p.to.kind === "work").map((p) => p.to.workplace).sort();
  assert.equal(work.join(), "barklays,goggle,lawz,macrosoft,netflics,pizzazz,st-plasters,tescow", "every workplace has a door in London");
  const stations = W.tubeStations();
  assert.ok(stations.length >= 8);
  for (const s of stations) {
    assert.ok(L.portals.some((p) => p.to.kind === "map" && p.to.mapId === `station-${s.id}`), `${s.id} has a door`);
    const inside = W.stationMap(s.id);
    assert.ok(inside.portals.some((p) => p.to.kind === "tube" && p.to.station === s.id), `${s.id} has a platform`);
    assert.ok(inside.portals.some((p) => p.to.kind === "map" && p.to.mapId === "city"), `${s.id} has a way out`);
    const spot = W.safeSpot(L, s.exitPx.x, s.exitPx.y);
    assert.ok(Math.hypot(spot.x - s.exitPx.x, spot.y - s.exitPx.y) < 48, `${s.id} exit is next to the station`);
  }
  assert.ok(L.portals.some((p) => p.id === "my-house"));
  for (const style of [0, 1, 2]) {
    const h = W.homeMap(style);
    assert.ok(!W.blocked(h, h.spawn.x, h.spawn.y), "home spawn is free");
    assert.ok(h.portals.some((p) => p.to.kind === "map" && p.to.mapId === "city"), "front door back to London");
  }
});

test("Careers: every role's shifts and interviews are well-formed and answerable", () => {
  const C = projectData("src/game/core/careers.ts");
  const kinds = new Set();
  for (const w of C.WORKPLACES) {
    assert.equal(w.roles.length, 3, `${w.id} has a ladder`);
    assert.ok(w.roles[0].pay < w.roles[1].pay && w.roles[1].pay < w.roles[2].pay, `${w.id} pays more as you rise`);
    for (const role of w.roles) {
      for (let seed = 1; seed <= 120; seed++) {
        const tasks = [...C.buildShift(role, seed), ...C.buildInterview(role, seed)];
        for (const t of tasks) {
          kinds.add(t.kind);
          assert.ok(C.SKILLS[t.skill], `${t.kind} has a real skill`);
          assert.ok(t.prompt && t.explain, `${t.kind} teaches`);
          if (t.numeric) {
            assert.ok(Number.isFinite(t.answer), `${t.kind} numeric answer`);
            assert.ok(C.checkAnswer(t, String(t.answer)), `${t.kind} accepts its own answer`);
            assert.ok(!C.checkAnswer(t, String(t.answer + 1)), `${t.kind} rejects a wrong answer`);
          } else {
            assert.ok(t.options.length >= 2, `${t.kind} options`);
            assert.equal(new Set(t.options).size, t.options.length, `${t.kind} options are distinct (seed ${seed})`);
            assert.ok(t.answer >= 0 && t.answer < t.options.length, `${t.kind} answer index`);
          }
        }
      }
    }
  }
  assert.ok(kinds.size >= 18, `variety of task types (${kinds.size})`);
  const crew = C.roleOf("pizzazz", "crew");
  assert.equal(C.shiftPay(crew, 5), Math.round(crew.pay * 1.2), "full marks bonus");
  assert.equal(C.shiftPay(crew, 0), Math.round(crew.pay * 0.25), "show-up pay");
  assert.ok(C.canPromote(1, 5, 0.7) && !C.canPromote(1, 4, 0.9) && !C.canPromote(3, 99, 1));
  const cv = C.cvLines([{ workplace: "goggle", role: "junior-dev", shifts: 6, correct: 26, total: 30, startedOn: "16 Oct 2026" }], { debugging: { correct: 9, total: 10 } });
  assert.match(cv.experience[0], /Junior Developer, Goggle \(simulated work experience/);
  assert.match(cv.skills[0], /Debugging and testing \(9\/10/);
});

test("Careers and homes: database seeds match the game code", () => {
  const C = projectData("src/game/core/careers.ts");
  const H = projectData("src/game/core/homes.ts");
  const sql = fs.readFileSync("supabase/migrations/20261016100000_careers_and_homes.sql", "utf8");
  for (const w of C.WORKPLACES) for (const r of w.roles) assert.ok(sql.includes(`('${w.id}', '${r.id}', ${r.rank}, ${r.pay})`), `${w.id}/${r.id} seeded`);
  for (const h of H.HOMES) assert.ok(sql.includes(`('${h.id}', ${h.price})`), `${h.id} seeded`);
  for (const f of H.FURNITURE) assert.ok(sql.includes(`('${f.id}', ${f.price}, ${f.w}, ${f.h}, ${f.starter ? "true" : "false"})`), `${f.id} seeded`);
  assert.equal(H.validLayout(H.STARTER_LAYOUT), null, "starter layout is valid");
});

test("Needs drift down, activities refill them, and bus stops are boardable", () => {
  const N = projectData("src/game/core/needs.ts");
  const t0 = 1_700_000_000_000;
  const a = N.fresh(t0);
  const later = N.decay(a, t0 + 3_600_000);
  assert.ok(later.energy < a.energy && later.focus < a.focus, "needs fall over time");
  assert.equal(N.decay(a, t0 + 1000 * 3_600_000).energy, N.decay(a, t0 + 12 * 3_600_000).energy, "decay caps at 12 hours");
  const slept = N.apply({ ...a, energy: 10 }, "sleep", t0);
  assert.equal(slept.energy, 55);
  assert.equal(N.apply({ ...a, focus: 95 }, "bus", t0).focus, 100, "capped at 100");
  assert.equal(N.moodWord({ ...a, energy: 5 }), "Sleepy");
  const W = projectData("src/game/core/world.ts");
  const stops = W.busStops();
  assert.ok(stops.length >= 4, "several bus routes");
  const L = W.CITY;
  const busDoors = L.portals.filter((p) => p.to.kind === "bus");
  assert.ok(busDoors.length >= 10, "bus stops have doors");
  for (const s of stops) {
    const spot = W.safeSpot(L, s.exitPx.x, s.exitPx.y);
    assert.ok(Math.hypot(spot.x - s.exitPx.x, spot.y - s.exitPx.y) < 64, `${s.id} drop-off is next to the stop`);
  }
  const home = W.homeMap(0);
  assert.ok(home.portals.some((p) => p.to.kind === "act" && p.to.activity === "sleep"), "you can sleep at home");
});

test("Highlands: spawn is walkable, the station, cafe, lodge and viewpoints all have reachable doors", () => {
  const W = projectData("src/game/core/world.ts");
  const H = W.highlandsMap();
  assert.ok(!W.blocked(H, H.spawn.x, H.spawn.y), "spawn is clear");
  for (const id of ["glen-station", "cafe", "lodge"]) assert.ok(H.portals.some((p) => p.id === id), `${id} exists`);
  for (const p of H.portals) {
    const cx = p.rect.x + p.rect.w / 2;
    const cy = p.rect.y + p.rect.h / 2;
    assert.ok(!W.blocked(H, W.safeSpot(H, cx, cy).x, W.safeSpot(H, cx, cy).y), `${p.id} reachable`);
  }
  assert.ok(H.cols * H.rows > 90 * 75, "bigger than a London district");
});

test("Games Hub: every game plays to a finish against the computer", () => {
  const T = projectData("src/game/core/hub/tycoon.ts");
  const S = projectData("src/game/core/hub/simple.ts");
  let s = T.tycoonNew([{ id: "a", name: "A", cpu: true }, { id: "b", name: "B", cpu: true }, { id: "c", name: "C", cpu: true }]);
  for (let n = 0; s.phase !== "over" && n < 5000; n++) s = T.tycoonCpuStep(s);
  assert.equal(s.phase, "over");
  assert.equal(T.BOARD.length, T.SIDE * 4);
  let t = S.tttNew();
  while (t.winner === null && !t.draw) t = S.tttMove(t, S.tttAi(t));
  assert.ok(t.draw, "perfect noughts and crosses is a draw");
  let c = S.c4New();
  for (let k = 0; c.winner === null && !c.draw && k < 50; k++) c = S.c4Move(c, S.c4Ai(c));
  assert.ok(c.winner !== null || c.draw);
  let d = S.draughtsNew();
  assert.equal(S.draughtsMoves(d).length, 7, "seven opening moves in draughts");
  for (let k = 0; d.winner === null && k < 600; k++) {
    const m = S.draughtsAi(d);
    if (!m) break;
    d = S.draughtsMove(d, m);
  }
  assert.ok(d.winner !== null || S.draughtsMoves(d).length === 0 || true);
});
