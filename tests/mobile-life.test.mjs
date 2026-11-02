import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const require = createRequire(import.meta.url);
const mobile = projectData("src/game/core/mobile-life.ts");

test("phone layouts handle narrow screens and landscape phones without changing desktop or large tablets", () => {
  assert.equal(mobile.phoneLayout(true, "desktop", 0), true);
  assert.equal(mobile.phoneLayout(false, "Mozilla iPhone", 5), true);
  assert.equal(mobile.phoneLayout(false, "Mozilla Android 16 Mobile", 5), true);
  assert.equal(
    mobile.phoneLayout(false, "Mozilla Android 16 Tablet", 5),
    false,
  );
  assert.equal(mobile.phoneLayout(false, "Windows Chrome", 0), false);
  assert.equal(mobile.phoneLayout(false, "iPhone", 0), false);
});

test("the diary handles malformed storage, rejects invalid timestamps and caps history", () => {
  for (const raw of [null, "not json", "{}", '[null,4,{"text":"bad"}]'])
    assert.equal(mobile.readJournal(raw).length, 0);
  const mixed = [
    { id: "valid", text: "Completed a session", at: 1000 },
    { id: "invalid", text: "bad date", at: 1e30 },
  ];
  assert.equal(mobile.readJournal(JSON.stringify(mixed)).length, 1);
  let entries = [];
  for (let n = 0; n < 45; n++)
    entries = mobile.appendJournal(entries, `Action ${n}`, n);
  assert.equal(entries.length, 30);
  assert.equal(entries[0].text, "Action 44");
  assert.equal(entries.at(-1).text, "Action 15");
  assert.equal(
    mobile.appendJournal([], "x".repeat(400), 1)[0].text.length,
    300,
  );
  assert.notEqual(mobile.journalKey("player-a"), mobile.journalKey("player-b"));
});

function loadUi() {
  const exports = {};
  const imports = {
    "next/link": {
      __esModule: true,
      default: ({ href, children, prefetch: _prefetch, ...props }) =>
        React.createElement("a", { href, ...props }, children),
    },
    "./mobile-life.module.css": {
      __esModule: true,
      default: new Proxy({}, { get: (_, key) => key }),
    },
    "./use-needs": {
      doActivity: () => assert.fail("rendering must not award activities"),
    },
    "@/components/game/avatar": {
      AvatarFigure: () => React.createElement("span", null, "Avatar"),
    },
    "@/game/core/careers": projectData("src/game/core/careers.ts"),
    "@/game/core/homes": projectData("src/game/core/homes.ts"),
    "@/game/core/needs": projectData("src/game/core/needs.ts"),
    "@/game/core/progression": projectData("src/game/core/progression.ts"),
  };
  const js = ts.transpileModule(
    fs.readFileSync("src/components/game/world/mobile-life.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (name) => imports[name] ?? require(name),
  });
  return exports.MobileLife;
}

test("the life dashboard uses actual occupation and balances, exposes touch navigation, and renders journal text safely", () => {
  const MobileLife = loadUi();
  const noop = () => {};
  const props = {
    me: { username: "Test player", avatar: {} },
    job: null,
    clout: 1800,
    xp: 1200,
    needs: null,
    currentHome: "studio",
    ownedHomes: ["studio"],
    quests: [],
    courses: [],
    entries: [{ id: "one", text: "<script>unsafe()</script>", at: 1000 }],
    time: new Date("2026-10-25T12:00:00Z"),
    onExplore: noop,
    onStudy: noop,
    onWork: noop,
    onHouses: noop,
    onHome: noop,
    onAwards: noop,
    onArcade: noop,
    onGarage: noop,
    onRecord: noop,
    onLeave: noop,
  };
  const unemployed = renderToStaticMarkup(
    React.createElement(MobileLife, props),
  );
  assert.match(unemployed, /Studying · Unemployed/);
  assert.match(unemployed, /1,800/);
  assert.match(unemployed, /Life navigation/);
  assert.match(unemployed, /Explore the 3D city/);
  assert.match(unemployed, /&lt;script&gt;/);
  assert.ok(!unemployed.includes("<canvas"));
  const employed = renderToStaticMarkup(
    React.createElement(MobileLife, {
      ...props,
      job: {
        workplace: "goggle",
        role: projectData("src/game/core/careers.ts").workplaceById("goggle")
          .roles[0].id,
        shifts: 2,
      },
    }),
  );
  assert.ok(!employed.includes("Studying · Unemployed"));
  assert.match(employed, /Work a shift/);
  assert.match(employed, /Google/);
  assert.match(employed, /Junior Developer/);
});
