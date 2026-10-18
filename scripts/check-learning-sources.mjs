// Fixed publisher URLs only. Records reachability separately from curriculum review.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { projectData } from "./lib/project-data.mjs";
const { LEARNING_SOURCES } = projectData(
  "src/lib/education/source-registry.ts",
);
const file = "src/lib/data/education/source-health.json";
const previous = JSON.parse(await fs.readFile(file, "utf8"));
const now = new Date().toISOString();
const results = await Promise.all(
  LEARNING_SOURCES.map(async (source) => {
    const old = previous.sources.find((s) => s.id === source.id);
    try {
      const r = await fetch(source.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
        headers: { "User-Agent": "IlluminatED learning source link checker" },
      });
      await r.body?.cancel();
      return {
        id: source.id,
        url: source.url,
        attemptedAt: now,
        lastReachableAt: r.ok ? now : (old?.lastReachableAt ?? null),
        status: r.status,
        available: r.ok,
      };
    } catch {
      return {
        id: source.id,
        url: source.url,
        attemptedAt: now,
        lastReachableAt: old?.lastReachableAt ?? null,
        status: null,
        available: false,
      };
    }
  }),
);
if (previous.generatedAt) {
  const backup = JSON.stringify(previous, null, 2) + "\n";
  await fs.mkdir("src/lib/data/education/backups", { recursive: true });
  await fs.writeFile(
    "src/lib/data/education/backups/source-health.previous.json",
    backup,
  );
  await fs.writeFile(
    "src/lib/data/education/backups/source-health.previous.sha256",
    crypto.createHash("sha256").update(backup).digest("hex") + "\n",
  );
}
await fs.writeFile(
  file,
  JSON.stringify({ generatedAt: now, sources: results }, null, 2) + "\n",
);
console.log(
  `Checked ${results.length} sources: ${results.filter((s) => s.available).length} reachable. Link checks do not certify content accuracy.`,
);
