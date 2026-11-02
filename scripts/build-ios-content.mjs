import fs from "node:fs";
import { projectData } from "./lib/project-data.mjs";

const { QUESTION_BANK } = projectData("src/lib/data/topics/index.ts");
const { COURSES } = projectData("src/lib/data/courses.ts");
const target = "ios/IlluminatED/Resources/RevisionPack.json";
const pack = {
  version: 1,
  source:
    "Original IlluminatED questions. Offline practice does not award account XP or Clout.",
  questions: QUESTION_BANK.map((q) => ({
    id: q.key,
    subject: q.subject,
    course:
      COURSES.find((course) => course.id === q.courseId)?.level ?? q.route,
    topic: q.topicTitle,
    prompt: q.q,
    options: q.options,
    answer: q.answer,
    explanation: q.explain,
  })),
};
if (
  !pack.questions.length ||
  pack.questions.some(
    (q) => !q.prompt || !q.explanation || !q.options[q.answer],
  )
)
  throw Error("Invalid offline question pack");
if (new Set(pack.questions.map((q) => q.id)).size !== pack.questions.length)
  throw Error("Duplicate question ids");
const content = JSON.stringify(pack, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== content)
    throw Error(
      "iOS revision pack is stale. Run node scripts/build-ios-content.mjs",
    );
} else {
  fs.mkdirSync("ios/IlluminatED/Resources", { recursive: true });
  fs.writeFileSync(target, content);
}
console.log(
  `iOS revision pack: ${pack.questions.length} questions, ${new Set(pack.questions.map((q) => q.subject)).size} subjects.`,
);
