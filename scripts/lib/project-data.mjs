import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
const cache = new Map();
export function projectData(filename) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute);
  if (absolute.endsWith(".json")) {
    const data = JSON.parse(fs.readFileSync(absolute, "utf8"));
    cache.set(absolute, data);
    return data;
  }
  const exports = {};
  cache.set(absolute, exports);
  const require = (name) => {
    const base = name.startsWith("@/")
      ? path.resolve("src", name.slice(2))
      : path.resolve(path.dirname(absolute), name);
    const target = [base, base + ".ts", base + "/index.ts"].find(
      (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
    );
    if (!target) throw new Error(`Unsupported project import: ${name}`);
    return projectData(target);
  };
  const js = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(js, { exports, require, URL }, { filename: absolute });
  return exports;
}
