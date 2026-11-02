import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const require = createRequire(import.meta.url);
const native = projectData("src/lib/native-ios.ts");
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    {
      exports,
      require: (name) => (name in imports ? imports[name] : require(name)),
      URL,
      process: { env: { NODE_ENV: "test" } },
    },
  );
  return exports;
}

test("native detection is a presentation flag and restricts only digital checkout routes", () => {
  assert.equal(native.isNativeIOS("Mozilla iPhone IlluminatED-iOS/1"), true);
  assert.equal(native.isNativeIOS("Mozilla iPhone Safari"), false);
  assert.equal(native.isNativeIOS(null), false);
  for (const path of [
    "/pricing",
    "/pricing/",
    "/premium/success",
    "/%70remium",
    "/games/expansions/pack",
    "/billing",
  ])
    assert.equal(native.nativeMembershipPath(path), true, path);
  for (const path of [
    "/me",
    "/dashboard/settings",
    "/ios/membership",
    "/games/world",
    "/games/home",
    "/premium-content",
    "/bad%escape",
  ])
    assert.equal(native.nativeMembershipPath(path), false, path);
});

test("middleware blocks iOS checkout before any auth request, including client navigation", async () => {
  const middleware = load("src/middleware.ts", {
    "next/server": {
      NextResponse: {
        redirect: (url, status) => ({ url: url.href, status }),
        next: () => ({ next: true }),
      },
    },
    "@supabase/ssr": {
      createServerClient: () =>
        assert.fail("checkout guard must run before authentication"),
    },
    "@/lib/native-ios": native,
    "@/lib/social/config": { socialConfigured: true },
  }).middleware;
  const makeRequest = (path, agent) => ({
    url: `https://www.illumed.co.uk${path}`,
    nextUrl: new URL(`https://www.illumed.co.uk${path}`),
    headers: { get: (name) => (name === "user-agent" ? agent : null) },
    cookies: { getAll: () => [] },
  });
  const ios = await middleware(
    makeRequest("/pricing?plan=plus", "IlluminatED-iOS/1"),
  );
  assert.equal(ios.status, 303);
  assert.equal(ios.url, "https://www.illumed.co.uk/ios/membership");
  assert.equal(
    (await middleware(makeRequest("/pricing", "Safari"))).next,
    true,
  );
  assert.equal(
    (await middleware(makeRequest("/ios/membership", "IlluminatED-iOS/1")))
      .next,
    true,
  );
});

test("checkout actions stop before touching accounts, Stripe or the database in iOS", async () => {
  let nativeAgent = true;
  const { requireWebCheckout } = load("src/lib/native-ios-server.ts", {
    "server-only": {},
    "next/headers": {
      headers: async () => ({
        get: () => (nativeAgent ? "IlluminatED-iOS/1" : "Safari"),
      }),
    },
    "next/navigation": {
      redirect: (path) => {
        throw Error(`redirect:${path}`);
      },
    },
    "./native-ios": native,
  });
  const actions = load("src/lib/premium-actions.ts", {
    "next/navigation": {},
    "@/lib/native-ios-server": { requireWebCheckout },
    "@/lib/account/server": {
      getAccount: () => assert.fail("must not read an account"),
    },
    "@/lib/social/server": {
      getSupabase: () => assert.fail("must not connect to database"),
    },
    "@/lib/stripe": {
      getStripe: () => assert.fail("must not create a checkout"),
    },
    "@/lib/campaign": {},
    "@/lib/site": {},
  });
  for (const name of [
    "startSubscriptionCheckout",
    "startPremiumCheckout",
    "openBillingPortal",
  ]) {
    await assert.rejects(
      actions[name](new FormData()),
      /redirect:\/ios\/membership/,
    );
  }
  nativeAgent = false;
  await assert.doesNotReject(requireWebCheckout());
});

test("offline pack uses reviewed original questions, valid answer indices and distinct IDs", () => {
  const pack = JSON.parse(
    fs.readFileSync("ios/IlluminatED/Resources/RevisionPack.json", "utf8"),
  );
  const source = projectData("src/lib/data/topics/index.ts").QUESTION_BANK;
  assert.equal(pack.version, 1);
  assert.equal(pack.questions.length, source.length);
  assert.ok(pack.questions.length >= 100);
  assert.equal(
    new Set(pack.questions.map((q) => q.id)).size,
    pack.questions.length,
  );
  for (const question of pack.questions) {
    const original = source.find((q) => q.key === question.id);
    assert.equal(question.prompt, original.q);
    assert.equal(question.explanation, original.explain);
    assert.equal(question.answer, original.answer);
    assert.ok(question.options[question.answer]);
    assert.ok(question.course && question.subject && question.topic);
  }
});

test("native assets have an opaque 1024 icon and every Swift source belongs to the project", () => {
  const icon = fs.readFileSync(
    "ios/IlluminatED/Assets.xcassets/AppIcon.appiconset/AppIcon.png",
  );
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
  assert.equal(
    icon[25],
    2,
    "App Store icon must be RGB without an alpha channel",
  );
  const project = fs.readFileSync(
    "ios/IlluminatED.xcodeproj/project.pbxproj",
    "utf8",
  );
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
      );
  for (const file of walk("ios/IlluminatED").filter((file) =>
    file.endsWith(".swift"),
  )) {
    assert.ok(project.includes(file.replace("ios/IlluminatED/", "")), file);
  }
  assert.ok(project.includes("PrivacyInfo.xcprivacy"));
  assert.ok(project.includes("RevisionPack.json"));
  assert.ok(project.includes("LaunchScreen.storyboard"));
});
