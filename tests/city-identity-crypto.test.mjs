import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

function moduleIn(file, extras = {}) {
  const exports = {};
  const require = name => name === "server-only" ? {} : name === "node:crypto" ? crypto : projectData(name.replace("@/", "src/") + ".ts");
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require, crypto: crypto.webcrypto, TextEncoder, TextDecoder, btoa, atob, Buffer, process: { env: { BILLING_CALLBACK_SECRET: "disposable-test-signing-secret" } }, ...extras }, { filename: file });
  return exports;
}
const { affiliationFor, readAffiliation } = projectData("src/game/core/affiliation.ts");
const { WORKPLACES, uniformFor } = projectData("src/game/core/careers.ts");
const { DEFAULT_AVATAR } = projectData("src/game/core/cosmetics.ts");
const { logoFor } = projectData("src/game/core/logos.ts");
test("every workplace has a logo, uniform and workplace icon; subject icons are used without a job", () => {
  for (const w of WORKPLACES) for (const role of w.roles) {
    const job = { workplace: w.id, role: role.id }; const affiliation = affiliationFor(job, "Biology");
    assert.equal(affiliation.kind, "work"); assert.ok(logoFor(affiliation.logo));
    const dressed = uniformFor(job, DEFAULT_AVATAR);
    for (const key of Object.keys(role.uniform)) assert.equal(dressed[key], role.uniform[key]);
  }
  assert.equal(affiliationFor(null, "Biology").icon, "science");
  assert.equal(affiliationFor(null, "Mathematics").icon, "maths");
  assert.equal(affiliationFor(null, null), null);
  assert.equal(readAffiliation({ kind: "admin", label: "Staff", icon: "work" }), null);
});
test("workplace identity is signed and forged or differently signed passes are refused", async () => {
  const { worldPass } = moduleIn("src/lib/game/world-pass.ts");
  const { verifyPass } = moduleIn("src/components/game/world/verify-pass.ts");
  const occupation = { workplace: "goggle", role: "junior-dev" };
  const signed = worldPass({ id: "demo", username: "Test", org: null, badge: "goggle", occupation, affiliation: affiliationFor(occupation, null) });
  const who = await verifyPass(signed.pass, signed.publicKey);
  assert.equal(who.occupation.workplace, "goggle"); assert.equal(who.affiliation.kind, "work");
  const [body, signature] = signed.pass.split("."); const payload = JSON.parse(Buffer.from(body, "base64url")); payload.occupation.workplace = "barklays";
  assert.equal(await verifyPass(Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + signature, signed.publicKey), null);
  const different = crypto.generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64url");
  assert.equal(await verifyPass(signed.pass, different), null);
});
test("friend messages round-trip and reject tampering, other keys, another thread or sender", async () => {
  const { encrypt, decrypt, sharedKey, securityCode } = moduleIn("src/lib/e2ee.ts");
  const pair = () => crypto.webcrypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
  const [alice, bob, eve] = await Promise.all([pair(), pair(), pair()]);
  const pub = key => crypto.webcrypto.subtle.exportKey("jwk", key);
  const [a, b] = await Promise.all([pub(alice.publicKey), pub(bob.publicKey)]);
  const aliceKey = await sharedKey(alice.privateKey, b), bobKey = await sharedKey(bob.privateKey, a);
  const packet = await encrypt(aliceKey, "Let's study 🧪", "friendship:alice");
  assert.equal(await decrypt(bobKey, packet.ciphertext, packet.iv, "friendship:alice"), "Let's study 🧪");
  assert.notEqual(packet.iv, (await encrypt(aliceKey, "again", "friendship:alice")).iv);
  await assert.rejects(decrypt(bobKey, packet.ciphertext, packet.iv, "another-thread:alice"));
  await assert.rejects(decrypt(bobKey, packet.ciphertext, packet.iv, "friendship:bob"));
  await assert.rejects(decrypt(await sharedKey(eve.privateKey, a), packet.ciphertext, packet.iv, "friendship:alice"));
  const bytes = Buffer.from(packet.ciphertext, "base64"); bytes[0] ^= 1;
  await assert.rejects(decrypt(bobKey, bytes.toString("base64"), packet.iv, "friendship:alice"));
  assert.equal(await securityCode(a, b), await securityCode(b, a));
});
