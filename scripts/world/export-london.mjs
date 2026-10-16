// Writes the London and home layouts as JSON for Blender:
//   node scripts/world/export-london.mjs london.json home.json
import fs from "node:fs";
import { projectData } from "../lib/project-data.mjs";

const london = projectData("src/game/core/london.ts");
fs.writeFileSync(process.argv[2], JSON.stringify(london.londonScene()));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(london.buildHome()));
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(projectData("src/game/core/homes.ts").catalogueScene()));
