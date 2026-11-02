import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

function store() {
  const rows = new Map();
  let opens = 0,
    closes = 0,
    created = false,
    fail = false;
  const db = {
    createObjectStore() {
      created = true;
    },
    close() {
      closes++;
    },
    transaction() {
      const tx = { error: new Error("storage unavailable") };
      tx.objectStore = () => ({
        getAll() {
          const request = { result: [...rows.values()] };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
        put(clip) {
          queueMicrotask(() => {
            if (fail) tx.onerror?.();
            else {
              rows.set(clip.id, clip);
              tx.oncomplete?.();
            }
          });
        },
        delete(id) {
          queueMicrotask(() => {
            if (fail) tx.onerror?.();
            else {
              rows.delete(id);
              tx.oncomplete?.();
            }
          });
        },
      });
      return tx;
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("src/components/game/world/clip-store.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      indexedDB: {
        open() {
          opens++;
          const request = { result: db };
          queueMicrotask(() => {
            if (!created) request.onupgradeneeded?.();
            request.onsuccess?.();
          });
          return request;
        },
      },
      require: () => projectData("src/game/core/creator-clips.ts"),
    },
  );
  return {
    ...exports,
    rows,
    fail: () => {
      fail = true;
    },
    opens: () => opens,
    closes: () => closes,
  };
}
const clip = (id, owner, createdAt) => ({
  id,
  owner,
  createdAt,
  channel: "tiktok",
  caption: "A learning reflection",
  blob: new Blob(["video"], { type: "video/webm" }),
  liked: false,
  plays: 0,
});
test("saved channels stay separated by account and reopen in newest-first order", async () => {
  const db = store();
  await db.saveClip(clip("one", "alice", 10));
  await db.saveClip(clip("two", "bob", 30));
  await db.saveClip(clip("three", "alice", 20));
  assert.deepEqual(
    Array.from(await db.localClips("alice"), (c) => c.id),
    ["three", "one"],
  );
  assert.deepEqual(
    Array.from(await db.localClips("bob"), (c) => c.id),
    ["two"],
  );
  assert.equal((await db.localClips("visitor")).length, 0);
  assert.equal(db.opens(), db.closes());
});
test("deletion verifies the owner and failed writes reject without leaving a database open", async () => {
  const db = store();
  await db.saveClip(clip("one", "alice", 10));
  await db.deleteClip("one", "bob");
  assert.ok(db.rows.has("one"));
  await db.deleteClip("one", "alice");
  assert.equal(db.rows.has("one"), false);
  db.fail();
  await assert.rejects(
    db.saveClip(clip("two", "alice", 20)),
    /storage unavailable/,
  );
  assert.equal(db.rows.has("two"), false);
  assert.equal(db.opens(), db.closes());
});
test("invalid media and missing owners are rejected before opening storage", async () => {
  const db = store();
  await assert.rejects(db.saveClip(clip("one", "", 10)), /valid video/);
  await assert.rejects(
    db.saveClip({
      ...clip("two", "alice", 20),
      blob: new Blob(["html"], { type: "text/html" }),
    }),
    /valid video/,
  );
  assert.equal(db.opens(), 0);
});
