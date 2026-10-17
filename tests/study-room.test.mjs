import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const questions = Array.from({ length: 5 }, (_, index) => ({
  key: `question-${index}`,
  prompt: `Recall question ${index + 1}`,
  options: [`Option A${index + 1}`, `Option B${index + 1}`],
}));
const result = {
  correct: 3,
  total: 5,
  xp: 25,
  clout: 15,
  answers: questions.map((_, index) => ({
    answer: index % 2,
    explain: `Explanation for question ${index + 1}`,
  })),
};

// Exercise the real component's rendered controls with the lightweight hook
// harness used for bus commutes. Browser QA covers effects, focus and layout.
function mountStudy({ start, submit, onReward } = {}) {
  const slots = [];
  let cursor = 0;
  const calls = { start: [], submit: [], rewards: [] };
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
    useId() {
      return `study-${cursor++}`;
    },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/components/game/study/study-room.tsx", "utf8"),
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
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/link") return { default: "a" };
      if (name === "lucide-react") return {};
      if (name === "@/components/app/app-shell") return { notifyPlayerChanged() {} };
      if (name === "@/app/games/study/actions")
        return {
          async startStudy(courseId) {
            calls.start.push(courseId);
            return start
              ? start(courseId)
              : { ok: true, session: { id: "session-1", courseId, questions } };
          },
          async submitStudy(sessionId, answers) {
            calls.submit.push({ sessionId, answers: Array.from(answers) });
            return submit ? submit(sessionId, answers) : { ok: true, result };
          },
        };
      throw new Error(name);
    },
  });
  return {
    calls,
    render() {
      cursor = 0;
      return exports.StudyRoom({
        courses: [
          { id: "gcse-maths", title: "GCSE Mathematics", level: "Level 1/2" },
        ],
        onReward(value) {
          calls.rewards.push({ ...value });
          onReward?.(value);
        },
      });
    },
  };
}

function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return text(node.props?.children);
}
function controls(node, inheritedDisabled = false) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node))
    return node.flatMap((child) => controls(child, inheritedDisabled));
  const disabled = inheritedDisabled || Boolean(node.props?.disabled);
  return [{ node, disabled }, ...controls(node.props?.children, disabled)];
}
function button(game, label) {
  const control = controls(game.render()).find(
    ({ node }) => node.type === "button" && text(node).includes(label),
  );
  assert.ok(control, `Button ${label} should be visible`);
  return control;
}
function click(game, label) {
  const control = button(game, label);
  assert.equal(control.disabled, false, `${label} should be enabled`);
  control.node.props.onClick();
}
function radios(game) {
  return controls(game.render()).filter(
    ({ node }) => node.type === "input" && node.props.type === "radio",
  );
}
const settle = () => new Promise(setImmediate);
async function begin(game) {
  click(game, "Start study session");
  await settle();
}
async function answerAll(game) {
  await begin(game);
  for (let index = 0; index < 5; index++) {
    const choices = radios(game);
    assert.equal(choices.length, 2);
    assert.equal(choices[0].disabled, false);
    choices[0].node.props.onChange();
    if (index < 4) click(game, "Next question");
  }
}

test("five-question study navigation preserves answers and reveals explanations only after submit", async () => {
  const game = mountStudy();
  await begin(game);
  assert.equal(button(game, "Next question").disabled, true);
  assert.equal(text(game.render()).includes("Explanation for question"), false);
  radios(game)[0].node.props.onChange();
  click(game, "Next question");
  click(game, "Back");
  assert.equal(radios(game)[0].node.props.checked, true);
  click(game, "Next question");
  for (let index = 1; index < 5; index++) {
    radios(game)[0].node.props.onChange();
    if (index < 4) click(game, "Next question");
  }
  click(game, "Finish & review");
  await settle();
  assert.deepEqual(game.calls.submit, [
    { sessionId: "session-1", answers: [0, 0, 0, 0, 0] },
  ]);
  assert.deepEqual(game.calls.rewards, [{ xp: 25, clout: 15 }]);
  assert.match(text(game.render()), /3 of 5 correct/);
  for (let index = 1; index <= 5; index++)
    assert.ok(
      text(game.render()).includes(`Explanation for question ${index}`),
    );
});

test("a lost submit response locks answers and retries the same saved session", async () => {
  let attempts = 0;
  const game = mountStudy({
    submit: async () => {
      if (++attempts === 1) throw new Error("Response lost after saving.");
      return { ok: true, result };
    },
  });
  await answerAll(game);
  click(game, "Finish & review");
  await settle();
  assert.equal(game.calls.rewards.length, 0);
  assert.ok(radios(game).every(({ disabled }) => disabled));
  assert.match(text(game.render()), /submitted answers are locked/);
  click(game, "Try submitting again");
  await settle();
  assert.deepEqual(game.calls.submit, [
    { sessionId: "session-1", answers: [0, 0, 0, 0, 0] },
    { sessionId: "session-1", answers: [0, 0, 0, 0, 0] },
  ]);
  assert.equal(game.calls.rewards.length, 1);
  assert.match(text(game.render()), /Session saved/);
});

test("duplicate finish taps cannot submit twice while the server is checking", async () => {
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const game = mountStudy({ submit: () => pending });
  await answerAll(game);
  const finish = button(game, "Finish & review").node.props.onClick;
  finish();
  finish();
  assert.equal(game.calls.submit.length, 1);
  assert.ok(radios(game).every(({ disabled }) => disabled));
  resolve({ ok: true, result });
  await settle();
  assert.equal(game.calls.rewards.length, 1);
});

test("a city HUD callback error leaves the saved score and review intact", async () => {
  const game = mountStudy({
    onReward() {
      throw new Error("HUD unavailable");
    },
  });
  await answerAll(game);
  click(game, "Finish & review");
  await settle();
  assert.equal(game.calls.rewards.length, 1);
  assert.match(text(game.render()), /Session saved/);
  assert.match(text(game.render()), /Your session and rewards are saved/);
  assert.match(text(game.render()), /Explanation for question 5/);
  assert.equal(
    controls(game.render()).some(({ node }) => node.props?.role === "alert"),
    false,
  );
});

test("a failed session start can recover without losing subject selection", async () => {
  let attempts = 0;
  const game = mountStudy({
    start: async (courseId) =>
      ++attempts === 1
        ? { ok: false, error: "Opening failed." }
        : { ok: true, session: { id: "session-2", courseId, questions } },
  });
  click(game, "Start study session");
  await settle();
  assert.match(text(game.render()), /Opening failed/);
  click(game, "Try opening session again");
  await settle();
  assert.deepEqual(game.calls.start, ["gcse-maths", "gcse-maths"]);
  assert.match(text(game.render()), /Recall question 1/);
  assert.equal(radios(game).length, 2);
});
