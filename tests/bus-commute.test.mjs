import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

// Exercise the real commute component with a deterministic hook clock.
function mountCommute() {
  const slots = [];
  let cursor = 0;
  let timer = null;
  const react = {
    useState(initial) {
      const at = cursor++;
      if (!(at in slots))
        slots[at] = typeof initial === "function" ? initial() : initial;
      return [
        slots[at],
        (next) => {
          slots[at] = typeof next === "function" ? next(slots[at]) : next;
        },
      ];
    },
    useRef(initial) {
      const at = cursor++;
      return (slots[at] ??= { current: initial });
    },
    useMemo(make) {
      const at = cursor++;
      return (slots[at] ??= make());
    },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/components/game/world/bus-stop.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    setTimeout(fn) {
      timer = fn;
      return 1;
    },
    clearTimeout() {
      timer = null;
    },
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "lucide-react" || name === "./transport") return {};
      if (name === "@/lib/utils")
        return { cn: (...v) => v.filter(Boolean).join(" ") };
      if (name === "@/game/core/rng")
        return { createRng: () => () => 0.5, newSeed: () => 123 };
      // The question bank is a server call; offline in tests, so the quick cards stay.
      if (name === "@/app/games/world/actions") return { gameQuiz: () => Promise.resolve([]) };
      if (name === "@/game/core/arcade")
        return projectData("src/game/core/arcade.ts");
      throw new Error(name);
    },
  });
  const arrivals = [];
  return {
    render() {
      cursor = 0;
      return exports.Commute({
        trip: { kind: "stop", id: "library", name: "Library" },
        homework: [],
        onArrive: (ok) => arrivals.push(ok),
      });
    },
    advance() {
      const fn = timer;
      timer = null;
      fn?.();
    },
    arrivals,
  };
}
function buttons(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(buttons);
  return [
    ...(node.type === "button" ? [node] : []),
    ...buttons(node.props?.children),
  ];
}
test("Bus revision completes three cards and arrives; duplicate taps cannot skip a card", () => {
  const game = mountCommute();
  for (let i = 0; i < 3; i++) {
    const answers = buttons(game.render()).filter(
      (b) => b.props.disabled === false,
    );
    assert.ok(answers.length >= 2);
    answers[0].props.onClick();
    answers[0].props.onClick();
    assert.equal(
      buttons(game.render()).filter((b) => b.props.disabled === true).length,
      answers.length,
    );
    game.advance();
  }
  const arrive = buttons(game.render()).find(
    (b) =>
      Array.isArray(b.props.children) && b.props.children[0] === "Get off at ",
  );
  assert.ok(arrive);
  arrive.props.onClick();
  assert.deepEqual(game.arrivals, [true]);
});
test("Skipping bus revision arrives without claiming a revision reward", () => {
  const game = mountCommute();
  buttons(game.render())[0].props.onClick();
  assert.deepEqual(game.arrivals, [false]);
});
