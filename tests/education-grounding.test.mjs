import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const { normaliseOakSummary, selectGroundingLessons } = projectData(
  "src/lib/education/oak-grounding.ts",
);
const { providersForBoard, EDUCATION_PROVIDERS } = projectData(
  "src/lib/education/providers.ts",
);
test("Oak summaries validate supported content, preserve evidence and construct trusted source links", () => {
  const raw = {
    lessonTitle: "<b>Coordinates</b>",
    keyStageSlug: "ks4",
    keyLearningPoints: [{ keyLearningPoint: "Use the x value first." }],
    misconceptionsAndCommonMistakes: [
      { misconception: "Read y first", response: "Read x, then y." },
    ],
    lessonKeywords: [{ keyword: "Origin", description: "The point (0, 0)." }],
    canonicalUrl: "https://evil.example/pretend",
  };
  const data = normaliseOakSummary(raw, "coordinates");
  assert.equal(data.title, "Coordinates");
  assert.equal(data.points[0], "Use the x value first.");
  assert.equal(data.misconceptions[0].response, "Read x, then y.");
  assert.equal(
    data.url,
    "https://www.thenational.academy/teachers/lessons/coordinates",
  );
  assert.match(data.attribution, /Open Government Licence/);
  for (const bad of [
    null,
    {},
    { ...raw, keyStageSlug: "ks5" },
    { ...raw, keyLearningPoints: [] },
  ])
    assert.throws(() => normaliseOakSummary(bad, "coordinates"));
});
const details = {
  yearGroup: "year-11",
  subjects: [{ courseId: "gcse-maths", board: "aqa" }],
};
const programme = (board = "aqa", year = 11, tier = "") => ({
  slug: `maths-${board}-${year}-${tier}`,
  board,
  year,
  tier,
  courseIds: ["gcse-maths"],
  units: [
    {
      title: "Coordinates",
      lessons: [
        { slug: `coordinates-${board}`, title: "Plotting coordinates" },
      ],
    },
  ],
});
test("retrieval respects course, board, year, tier and relevance; no cross-qualification substitution", () => {
  const bank = [
    programme(),
    programme("ocr"),
    programme("aqa", 10),
    programme("aqa", 11, "higher"),
  ];
  const selected = selectGroundingLessons("Explain coordinates", details, bank);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].slug, "coordinates-aqa");
  assert.equal(
    selectGroundingLessons("Photosynthesis", details, bank).length,
    0,
  );
  assert.equal(
    selectGroundingLessons(
      "Explain coordinates",
      { ...details, yearGroup: "year-12" },
      bank,
    ).length,
    0,
  );
  assert.equal(
    selectGroundingLessons(
      "Explain coordinates",
      { ...details, subjects: [{ courseId: "gcse-biology", board: "aqa" }] },
      bank,
    ).length,
    0,
  );
  assert.equal(
    selectGroundingLessons(
      "Explain coordinates",
      { ...details, subjects: [{ courseId: "gcse-maths", board: "unsure" }] },
      bank,
    ).length,
    0,
  );
});
test("the provider registry separates APIs from publisher access and includes UK national routes", () => {
  for (const board of [
    "aqa",
    "pearson",
    "ocr",
    "wjec",
    "ccea",
    "qualifications-scotland",
    "ncfe",
    "cityguilds",
    "aat",
    "cilex",
  ])
    assert.ok(providersForBoard(board).length > 0, board);
  assert.equal(EDUCATION_PROVIDERS.filter((p) => p.mode === "api").length, 1);
  assert.equal(providersForBoard("not-a-board").length, 0);
  for (const p of EDUCATION_PROVIDERS)
    for (const url of [p.url, p.resources, p.terms])
      assert.equal(new URL(url).protocol, "https:");
});
