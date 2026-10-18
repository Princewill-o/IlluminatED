import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function admission() {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/lib/game/world-admission.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    { exports, setTimeout, clearTimeout, AbortController },
  );
  return exports;
}
const cid = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, "0")}`;
const lease = () => ({
  accepted: true,
  topic: "world:room:city:lse-1:123",
  expiresAt: Date.now() + 90000,
  rotateAt: Date.now() + 30000,
});
test("client admission validates authorization data and fails closed on missing API/foreign topics/expiry", async () => {
  for (const data of [
    null,
    { ...lease(), topic: "world:room:office-acme:lse-1:123" },
    { ...lease(), expiresAt: 1 },
  ]) {
    const m = admission(),
      sb = { rpc: () => ({ abortSignal: async () => ({ data }) }) };
    await assert.rejects(
      m.claimWorld(sb, "city", "lse-1", cid(1)),
      /admission_unavailable|invalid_lease/,
    );
  }
  const m = admission();
  await assert.rejects(
    m.claimWorld(
      {
        rpc: () => ({
          abortSignal: async () => ({ error: { code: "PGRST202" } }),
        }),
      },
      "city",
      "lse-1",
      cid(1),
    ),
    /admission_unavailable/,
  );
});
test("overlapping map claims are serialized and pass the last successful handoff token", async () => {
  const m = admission(),
    calls = [];
  const sb = {
    rpc: (_name, args) => ({
      abortSignal: async () => {
        calls.push(args);
        await new Promise((resolve) => setImmediate(resolve));
        return { data: lease() };
      },
    }),
  };
  await Promise.all([
    m.claimWorld(sb, "city", "lse-1", cid(1)),
    m.claimWorld(sb, "city", "lse-1", cid(2)),
  ]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].p_previous, null);
  assert.equal(calls[1].p_previous, cid(1));
});
