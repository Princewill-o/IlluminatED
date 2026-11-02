import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("recordings keep one video canvas across scene changes and only read the active scene", () => {
  let now = 0,
    stops = 0;
  const draws = [],
    dimensions = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      fillRect() {},
      drawImage(source) {
        draws.push(source.id);
        dimensions.push([canvas.width, canvas.height]);
      },
    }),
    captureStream: () => ({
      getTracks: () => [
        {
          stop() {
            stops++;
          },
        },
      ],
    }),
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/components/game/world/scene-continuity.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      document: { createElement: () => canvas },
      window: { innerWidth: 390, innerHeight: 844 },
      performance: { now: () => now },
    },
  );
  assert.throws(() => exports.recordSceneCapture(), /Open Explore/);
  const city = exports.registerSceneCapture(() => "city");
  const recording = exports.recordSceneCapture();
  city.frame({ id: "city", width: 1200, height: 800 });
  assert.deepEqual(draws, ["city"]);
  const train = exports.registerSceneCapture(() => "train");
  now += 50;
  city.frame({ id: "stale-city", width: 1200, height: 800 });
  train.frame({ id: "train", width: 800, height: 1200 });
  assert.deepEqual(draws, ["city", "train"]);
  assert.deepEqual(dimensions, [
    [720, 1280],
    [720, 1280],
  ]);
  city();
  assert.equal(exports.captureScene(), "train");
  recording.dispose();
  recording.dispose();
  now += 50;
  train.frame({ id: "unused", width: 800, height: 1200 });
  assert.equal(stops, 1);
  assert.deepEqual(draws, ["city", "train"]);
  train();
});
