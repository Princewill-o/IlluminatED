// Reproducible seed for the original reviewed study-room question bank.
// Future content changes should use a new migration after this one is deployed.
import fs from "node:fs";
import { projectData } from "./lib/project-data.mjs";

const { QUESTION_BANK } = projectData("src/lib/data/topics/index.ts");
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const rows = QUESTION_BANK.map((q) =>
  `  (${[q.key, q.courseId, q.q, JSON.stringify(q.options)].map(quote).join(",")},${q.answer},${quote(q.explain)})`,
);
const seed = `insert into private.study_question_bank (key,course_id,prompt,options,answer,explain) values\n${rows.join(",\n")};`;
const path = "supabase/migrations/20261017134206_learning_study_room.sql";
const source = fs.readFileSync(path, "utf8");
const next = source.replace(/-- BEGIN STUDY BANK[\s\S]*?-- END STUDY BANK/, `-- BEGIN STUDY BANK\n${seed}\n-- END STUDY BANK`);
if (process.argv.includes("--check")) {
  if (source !== next) throw new Error("Study bank seed does not match the reviewed question bank");
} else fs.writeFileSync(path, next);
console.log(`${QUESTION_BANK.length} study questions ${process.argv.includes("--check") ? "verified" : "seeded"}.`);
