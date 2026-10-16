// Writes the Highlands layout as JSON for Blender:
//   node scripts/world/export-highlands.mjs highlands.json
import fs from "node:fs";
import { projectData } from "../lib/project-data.mjs";

fs.writeFileSync(process.argv[2], JSON.stringify(projectData("src/game/core/regions.ts").highlandsScene()));
