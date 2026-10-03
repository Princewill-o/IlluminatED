import fs from "node:fs/promises";
import { projectData } from "./lib/project-data.mjs";
const { COURSES } = projectData("src/lib/data/courses.ts");
const { TOPICS, QUESTION_BANK } = projectData("src/lib/data/topics/index.ts");
const oak = JSON.parse(
  await fs.readFile("src/lib/data/education/oak-catalogue.json", "utf8"),
);
const specs = JSON.parse(
  await fs.readFile("src/lib/data/education/specifications.json", "utf8"),
);
const lines = [
  "# Education coverage audit",
  "",
  `Generated ${new Date().toLocaleDateString("en-GB", { timeZone: "Europe/London" })}.`,
  "",
  `The current site has ${COURSES.length} course entries, ${TOPICS.length} original guides and ${QUESTION_BANK.length} original questions. All answer keys, question IDs and course/topic relationships pass automated structural checks. This is not certification of factual accuracy, full syllabus coverage, or future exam questions.`,
  "",
  `Stored metadata: ${oak.items.length} Oak programmes, ${oak.items.reduce((n, p) => n + p.units.length, 0)} unit entries, ${new Set(oak.items.flatMap((p) => p.units.flatMap((u) => u.lessons.map((l) => l.slug)))).size} unique lesson links, ${specs.items.length} AQA specification outlines. These are linked learning resources and syllabus headings, not a downloaded archive of videos or exam papers.`,
  "",
  "## Findings and corrections",
  "",
  "- Physics: constant speed was ambiguous. The question now specifies a straight line, so constant velocity implies zero resultant force.",
  "- Construction: the client appoints a principal contractor on a project involving more than one contractor. The question now specifies that condition.",
  "- A-level Psychology and Economics: corrected the source section references to the currently published 3.2.3 and 3.1.3 headings respectively.",
  "- Removed imports of a GCSE syllabus into unrelated course entries just because a guide cited it.",
  "- Board/tier-specific Oak programmes are selectable. English programmes contain both Language and Literature; students must select their school’s set texts.",
  "- Combined science has its own specification outline, rather than pretending separate-science outlines are interchangeable.",
  "",
  "## Remaining scope",
  "",
  "- Full assessed content, practical competencies, assessment objectives, tier restrictions and optional units must be checked against the exact board document and teaching/exam version.",
  "- AQA checklists index published headings, not every assessable sentence. History and Literature outlines can include alternative options: not every option is required.",
  "- GCSE lesson links cover the indexed Oak programmes. Oak does not provide the A-level, BTEC or T Level curriculum through this connection.",
  "- BTEC and T Level course entries are broad routes. Qualification size, optional units and start-year versions are not yet separate complete syllabus models.",
  "- Imported Oak quizzes need OAK_API_KEY. The player supports text multiple-choice questions, including multiple correct answers. Other formats remain on Oak.",
  "- Official apprenticeship adverts need APPRENTICESHIPS_API_KEY. Without it the UI links to the official current search and explicitly says the advert feed is not connected.",
  "- Current event feed: University of Buckingham. UCAS, Springpod and Futures for All are linked provider directories, not ingested feeds of every listing.",
  "- Weekly GitHub refresh is prepared in the repository but does not run until the workflow is pushed and enabled. Live event data refreshes hourly on access; an open page checks every 15 minutes.",
  "- No live account was created, no applications were submitted, and no production deployment was made during this work.",
  "",
  "## Course-by-course coverage",
  "",
  "| Course | Original guides | Original questions | Imported specification outlines | Oak programmes |",
  "|---|---:|---:|---|---:|",
];
for (const c of COURSES) {
  const t = TOPICS.filter((t) => c.topicIds.includes(t.id));
  lines.push(
    `| ${c.title} | ${t.length} | ${t.reduce((n, t) => n + t.quiz.length, 0)} | ${
      specs.items
        .filter((s) => s.courseId === c.id)
        .map((s) => `${s.board} ${s.code}`)
        .join(", ") || "Not imported"
    } | ${oak.items.filter((p) => p.courseIds.includes(c.id)).length} |`,
  );
}
await fs.mkdir("docs", { recursive: true });
await fs.writeFile("docs/education-audit.md", lines.join("\n") + "\n");
console.log("Wrote docs/education-audit.md");
