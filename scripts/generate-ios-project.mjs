import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// A deterministic, dependency-free Xcode project. All paths stay inside ios/.
const root = "ios";
const objects = {};
const id = (value) =>
  crypto
    .createHash("sha256")
    .update(`IlluminatED:${value}`)
    .digest("hex")
    .slice(0, 24)
    .toUpperCase();
function object(name, isa, fields) {
  const key = id(name);
  objects[key] = { isa, ...fields };
  return key;
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name).replaceAll("\\", "/")],
    );
}
const appFiles = walk(`${root}/IlluminatED`)
  .filter((file) => file.endsWith(".swift"))
  .sort();
const tests = walk(`${root}/Tests`)
  .filter((file) => file.endsWith(".swift"))
  .sort();
const uiTests = walk(`${root}/UITests`)
  .filter((file) => file.endsWith(".swift"))
  .sort();
const productRefs = {};
for (const [name, type, ext] of [
  ["IlluminatED", "wrapper.application", "app"],
  ["IlluminatEDTests", "wrapper.cfbundle", "xctest"],
  ["IlluminatEDUITests", "wrapper.cfbundle", "xctest"],
]) {
  productRefs[name] = object(`product:${name}`, "PBXFileReference", {
    explicitFileType: type,
    includeInIndex: 0,
    path: `${name}.${ext}`,
    sourceTree: "BUILT_PRODUCTS_DIR",
  });
}
const groups = {};
function sourceGroup(name, base, files) {
  const refs = files.map((file) =>
    object(`file:${file}`, "PBXFileReference", {
      lastKnownFileType: "sourcecode.swift",
      path: path.posix.relative(base, file),
      sourceTree: "<group>",
    }),
  );
  groups[name] = object(`group:${name}`, "PBXGroup", {
    children: refs,
    path: path.posix.relative(root, base),
    sourceTree: "<group>",
  });
  return refs;
}
const appRefs = sourceGroup("App", `${root}/IlluminatED`, appFiles);
const testRefs = sourceGroup("Tests", `${root}/Tests`, tests);
const uiRefs = sourceGroup("UITests", `${root}/UITests`, uiTests);
const resources = [
  ["Assets.xcassets", "folder.assetcatalog"],
  ["Resources/RevisionPack.json", "text.json"],
  ["Resources/PrivacyInfo.xcprivacy", "text.xml"],
  ["Resources/LaunchScreen.storyboard", "file.storyboard"],
];
const resourceRefs = resources.map(([file, type]) =>
  object(`resource:${file}`, "PBXFileReference", {
    lastKnownFileType: type,
    path: file,
    sourceTree: "<group>",
  }),
);
objects[groups.App].children.push(...resourceRefs);
objects[groups.App].children.push(
  object("info", "PBXFileReference", {
    lastKnownFileType: "text.plist.xml",
    path: "Info.plist",
    sourceTree: "<group>",
  }),
);
const configRef = object("app-config", "PBXFileReference", {
  lastKnownFileType: "text.xcconfig",
  path: "Configuration/App.xcconfig",
  sourceTree: "<group>",
});
const products = object("products", "PBXGroup", {
  children: Object.values(productRefs),
  name: "Products",
  sourceTree: "<group>",
});
const mainGroup = object("root-group", "PBXGroup", {
  children: [groups.App, groups.Tests, groups.UITests, configRef, products],
  sourceTree: "<group>",
});

function configurationList(name, settings, config) {
  const buildConfigurations = ["Debug", "Release"].map((variant) =>
    object(`config:${name}:${variant}`, "XCBuildConfiguration", {
      ...(config ? { baseConfigurationReference: config } : {}),
      name: variant,
      buildSettings: {
        ...settings,
        ...(variant === "Debug"
          ? {
              SWIFT_OPTIMIZATION_LEVEL: "-Onone",
              SWIFT_ACTIVE_COMPILATION_CONDITIONS: "$(inherited) DEBUG",
              ENABLE_TESTABILITY: "YES",
            }
          : {
              SWIFT_COMPILATION_MODE: "wholemodule",
              SWIFT_OPTIMIZATION_LEVEL: "-O",
            }),
      },
    }),
  );
  return object(`configs:${name}`, "XCConfigurationList", {
    buildConfigurations,
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  });
}
const projectConfigs = configurationList("project", {
  SDKROOT: "iphoneos",
  CLANG_ENABLE_MODULES: "YES",
  CLANG_ENABLE_OBJC_ARC: "YES",
  SWIFT_VERSION: "5.0",
  IPHONEOS_DEPLOYMENT_TARGET: "17.0",
  ALWAYS_SEARCH_USER_PATHS: "NO",
  ENABLE_USER_SCRIPT_SANDBOXING: "YES",
});
const appConfigs = configurationList(
  "app",
  { ENABLE_PREVIEWS: "YES", SWIFT_VERSION: "5.0" },
  configRef,
);

function phase(name, type, refs) {
  const files = refs.map((ref) =>
    object(`buildfile:${name}:${ref}`, "PBXBuildFile", { fileRef: ref }),
  );
  return object(`phase:${name}`, type, {
    buildActionMask: 2147483647,
    files,
    runOnlyForDeploymentPostprocessing: 0,
  });
}
const appPhases = [
  phase("app-sources", "PBXSourcesBuildPhase", appRefs),
  phase("app-frameworks", "PBXFrameworksBuildPhase", []),
  phase("app-resources", "PBXResourcesBuildPhase", resourceRefs),
];
const appTarget = object("target:app", "PBXNativeTarget", {
  buildConfigurationList: appConfigs,
  buildPhases: appPhases,
  buildRules: [],
  dependencies: [],
  name: "IlluminatED",
  productName: "IlluminatED",
  productReference: productRefs.IlluminatED,
  productType: "com.apple.product-type.application",
});
const testTargets = [];
for (const [name, refs, ui] of [
  ["IlluminatEDTests", testRefs, false],
  ["IlluminatEDUITests", uiRefs, true],
]) {
  const settings = {
    PRODUCT_BUNDLE_IDENTIFIER: `uk.co.illumed.app.${ui ? "uitests" : "tests"}`,
    PRODUCT_NAME: "$(TARGET_NAME)",
    GENERATE_INFOPLIST_FILE: "YES",
    CODE_SIGN_STYLE: "Automatic",
    TARGETED_DEVICE_FAMILY: "1",
    ...(ui
      ? { TEST_TARGET_NAME: "IlluminatED" }
      : {
          BUNDLE_LOADER: "$(TEST_HOST)",
          TEST_HOST: "$(BUILT_PRODUCTS_DIR)/IlluminatED.app/IlluminatED",
        }),
  };
  const proxy = object(`proxy:${name}`, "PBXContainerItemProxy", {
    containerPortal: id("project"),
    proxyType: 1,
    remoteGlobalIDString: appTarget,
    remoteInfo: "IlluminatED",
  });
  const dependency = object(`dependency:${name}`, "PBXTargetDependency", {
    target: appTarget,
    targetProxy: proxy,
  });
  testTargets.push(
    object(`target:${name}`, "PBXNativeTarget", {
      buildConfigurationList: configurationList(name, settings),
      buildPhases: [
        phase(`${name}-sources`, "PBXSourcesBuildPhase", refs),
        phase(`${name}-frameworks`, "PBXFrameworksBuildPhase", []),
      ],
      buildRules: [],
      dependencies: [dependency],
      name,
      productName: name,
      productReference: productRefs[name],
      productType: ui
        ? "com.apple.product-type.bundle.ui-testing"
        : "com.apple.product-type.bundle.unit-test",
    }),
  );
}
const project = object("project", "PBXProject", {
  attributes: {
    BuildIndependentTargetsInParallel: "YES",
    LastUpgradeCheck: "2600",
    TargetAttributes: Object.fromEntries(
      [appTarget, ...testTargets].map((target) => [
        target,
        {
          CreatedOnToolsVersion: "16.0",
          ...(target !== appTarget ? { TestTargetID: appTarget } : {}),
        },
      ]),
    ),
  },
  buildConfigurationList: projectConfigs,
  compatibilityVersion: "Xcode 14.0",
  developmentRegion: "en",
  hasScannedForEncodings: 0,
  knownRegions: ["en", "Base"],
  mainGroup,
  productRefGroup: products,
  projectDirPath: "",
  projectRoot: "",
  targets: [appTarget, ...testTargets],
});
function plist(value, depth = 0) {
  const indent = "\t".repeat(depth);
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return /^[A-Za-z0-9_./]+$/.test(value) ? value : JSON.stringify(value);
  if (Array.isArray(value))
    return value.length
      ? `(\n${value.map((entry) => `${indent}\t${plist(entry, depth + 1)},`).join("\n")}\n${indent})`
      : "()";
  return `{\n${Object.entries(value)
    .map(
      ([key, entry]) =>
        `${indent}\t${/^[A-Za-z0-9_]+$/.test(key) ? key : JSON.stringify(key)} = ${plist(entry, depth + 1)};`,
    )
    .join("\n")}\n${indent}}`;
}
const output = `// !$*UTF8*$!\n${plist({ archiveVersion: 1, classes: {}, objectVersion: 56, objects, rootObject: project })}\n`;
const projectPath = `${root}/IlluminatED.xcodeproj`;
fs.mkdirSync(`${projectPath}/xcshareddata/xcschemes`, { recursive: true });
const reference = (name, key) =>
  `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${key}" BuildableName="${name === "IlluminatED" ? "IlluminatED.app" : name + ".xctest"}" BlueprintName="${name}" ReferencedContainer="container:IlluminatED.xcodeproj"/>`;
const scheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.7">
  <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">${reference("IlluminatED", appTarget)}</BuildActionEntry></BuildActionEntries></BuildAction>
  <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables>${testTargets.map((key, i) => `<TestableReference skipped="NO" parallelizable="NO">${reference(i === 0 ? "IlluminatEDTests" : "IlluminatEDUITests", key)}</TestableReference>`).join("")}</Testables></TestAction>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${reference("IlluminatED", appTarget)}</BuildableProductRunnable></LaunchAction>
  <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">${reference("IlluminatED", appTarget)}</BuildableProductRunnable></ProfileAction>
  <AnalyzeAction buildConfiguration="Debug"/>
  <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`;
if (process.argv.includes("--check")) {
  for (const [file, value] of [
    [`${projectPath}/project.pbxproj`, output],
    [`${projectPath}/xcshareddata/xcschemes/IlluminatED.xcscheme`, scheme],
  ]) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== value)
      throw Error(
        `Stale Xcode file: ${file}. Run node scripts/generate-ios-project.mjs`,
      );
  }
} else {
  fs.writeFileSync(`${projectPath}/project.pbxproj`, output);
  fs.writeFileSync(
    `${projectPath}/xcshareddata/xcschemes/IlluminatED.xcscheme`,
    scheme,
  );
}
console.log(
  `Xcode project: ${appFiles.length} app Swift files, ${tests.length} unit test files, ${uiTests.length} UI test files.`,
);
