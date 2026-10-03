import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectData } from "../scripts/lib/project-data.mjs";
const { COURSES } = projectData("src/lib/data/courses.ts");
const { TOPICS, QUESTION_BANK } = projectData("src/lib/data/topics/index.ts");
const { normaliseVacancies, parseUniversityCalendar, isUpcoming, londonDate } =
  projectData("src/lib/opportunities.ts");
const { normaliseOakQuiz, oakAnswerCorrect } = projectData(
  "src/lib/oak-quiz.ts",
);
test("All course/topic links and answer keys are valid and unique", () => {
  assert.equal(new Set(COURSES.map((c) => c.id)).size, COURSES.length);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length);
  assert.equal(
    new Set(QUESTION_BANK.map((q) => q.key)).size,
    QUESTION_BANK.length,
  );
  for (const c of COURSES)
    for (const id of c.topicIds)
      assert.ok(
        TOPICS.some((t) => t.id === id),
        `${c.id}: ${id}`,
      );
  for (const t of TOPICS) {
    assert.ok(COURSES.some((c) => c.id === t.courseId));
    for (const q of t.quiz) {
      assert.ok(q.options.length >= 2);
      assert.ok(
        Number.isInteger(q.answer) &&
          q.answer >= 0 &&
          q.answer < q.options.length,
      );
      assert.ok(q.explain.trim());
    }
  }
});
test("Imported syllabus codes belong to the displayed course; unrelated GCSE references cannot label an A level", () => {
  const specs = JSON.parse(
    fs.readFileSync("src/lib/data/education/specifications.json", "utf8"),
  ).items;
  for (const s of specs) {
    const c = COURSES.find((c) => c.id === s.courseId);
    assert.ok(
      c?.specCodes?.some(
        (ref) =>
          ref.board === s.board &&
          ref.code.match(/^\d+/)?.[0] === s.code.match(/^\d+/)?.[0],
      ),
      `${s.courseId} ${s.code}`,
    );
    assert.ok(s.sections.length > 0);
    assert.ok(
      s.sections.every((section) =>
        section.url.startsWith("https://www.aqa.org.uk/"),
      ),
    );
  }
});
test("All imported lessons link to the approved publisher and courses", () => {
  const programmes = JSON.parse(
    fs.readFileSync("src/lib/data/education/oak-catalogue.json", "utf8"),
  ).items;
  for (const p of programmes) {
    assert.ok([10, 11].includes(p.year));
    assert.ok(p.courseIds.every((id) => COURSES.some((c) => c.id === id)));
    for (const u of p.units) {
      assert.ok(u.url.startsWith("https://www.thenational.academy/pupils/"));
      for (const l of u.lessons)
        assert.ok(
          l.url.startsWith("https://www.thenational.academy/pupils/lessons/"),
        );
    }
  }
});
const event = (extra = "", url = "https://www.buckingham.ac.uk/event/test/") =>
  `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Computing Taster\r\nDTSTART;TZID=Europe/London:20261010T110000\r\nURL:${url}\r\nLOCATION:Online\r\n${extra}END:VEVENT\r\nEND:VCALENDAR`;
test("Calendar handles folded lines and suppresses cancelled, recurring, malformed and unsafe events", () => {
  const a = parseUniversityCalendar(event(), "2026-10-03T10:00:00Z");
  assert.equal(a.length, 1);
  assert.equal(a[0].date, "2026-10-10");
  assert.equal(
    parseUniversityCalendar(event("STATUS:CANCELLED\r\n"), "now").length,
    0,
  );
  assert.equal(
    parseUniversityCalendar(event("RRULE:FREQ=WEEKLY\r\n"), "now").length,
    0,
  );
  assert.equal(
    parseUniversityCalendar(event("", "javascript:alert(1)"), "now").length,
    0,
  );
  assert.equal(
    parseUniversityCalendar(event().replace("20261010", "20260231"), "now")
      .length,
    0,
  );
  assert.equal(
    parseUniversityCalendar(
      event().replace("Computing Taster", "Computing\r\n Taster"),
      "now",
    )[0].title,
    "ComputingTaster",
  );
  assert.throws(() => parseUniversityCalendar("<html>Error</html>", "now"));
});
test("Expiry uses London dates, including midnight and daylight saving changes", () => {
  assert.equal(londonDate(new Date("2026-10-02T23:30:00Z")), "2026-10-03");
  assert.equal(
    isUpcoming(
      { date: "2026-10-02", closes: null },
      new Date("2026-10-02T23:30:00Z"),
    ),
    false,
  );
  assert.equal(
    isUpcoming(
      { date: null, closes: "2026-10-03T00:00:00Z" },
      new Date("2026-10-03T14:00:00Z"),
    ),
    true,
  );
  assert.equal(londonDate(new Date("2026-10-26T00:30:00Z")), "2026-10-26");
});
test("Vacancies reject broken responses, unsafe links and missing closing dates", () => {
  const raw = {
    vacancies: [
      {
        title: "Software apprentice",
        vacancyUrl:
          "https://www.findapprenticeship.service.gov.uk/apprenticeship/1000",
        vacancyReference: "1000",
        closingDate: "2026-12-01",
        employerName: "Example",
        course: { title: "Software", level: 4 },
        addresses: [{ postcode: "SW1A 1AA" }],
      },
    ],
  };
  const items = normaliseVacancies(raw, "now");
  assert.equal(items.length, 1);
  assert.equal(items[0].location, "SW1A 1AA");
  assert.equal(
    normaliseVacancies(
      {
        vacancies: [
          { ...raw.vacancies[0], vacancyUrl: "https://evil.example" },
        ],
      },
      "now",
    ).length,
    0,
  );
  assert.equal(
    normaliseVacancies(
      { vacancies: [{ ...raw.vacancies[0], closingDate: null }] },
      "now",
    ).length,
    0,
  );
  assert.throws(() => normaliseVacancies({}, "now"));
});
test("Oak supports multiple correct answers and skips image or malformed questions", () => {
  const raw = {
    starterQuiz: [],
    exitQuiz: [
      {
        question: "Select primes",
        questionType: "multiple-choice",
        answers: [
          { type: "text", content: "2", distractor: false },
          { type: "text", content: "3", distractor: false },
          { type: "text", content: "4", distractor: true },
        ],
      },
      {
        question: "Image question",
        questionType: "multiple-choice",
        questionImage: { url: "image" },
        answers: [],
      },
    ],
  };
  const quiz = normaliseOakQuiz(raw);
  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.skipped, 1);
  assert.equal(oakAnswerCorrect(quiz.questions[0], [0, 1]), true);
  assert.equal(oakAnswerCorrect(quiz.questions[0], [0]), false);
  assert.equal(oakAnswerCorrect(quiz.questions[0], [0, 1, 2]), false);
  assert.equal(oakAnswerCorrect(quiz.questions[0], [0, 1, 99]), false);
  assert.throws(() => normaliseOakQuiz({}));
});

test("Learner state validates namespaces, restricts choices and keeps false checkmarks", () => {
  const { validNamespace, validStateItem, normaliseState } = projectData(
    "src/lib/education/state.ts",
  );
  assert.equal(validNamespace("syllabus:gcse-biology"), true);
  assert.equal(validNamespace("another-user:career"), false);
  assert.equal(validStateItem("career", "role", "moderator"), false);
  assert.equal(validStateItem("career", "route", "invented"), false);
  assert.equal(validStateItem("career", "year", "year-12"), true);
  assert.equal(validStateItem("syllabus:gcse-biology", "topic", false), true);
  assert.equal(
    validStateItem("saved-opportunities", "event", "javascript:alert(1)"),
    false,
  );
  assert.deepEqual(
    {
      ...normaliseState("syllabus:gcse-biology", {
        a: true,
        b: false,
        c: "bad",
      }),
    },
    { a: true, b: false },
  );
});

test("Every listed broad topic and syllabus heading resolves to study support; unknown topics do not", () => {
  const { curriculumForCourse } = projectData("src/lib/education.ts");
  const { studyTopic, SUPPLEMENTARY_RESOURCES } = projectData(
    "src/lib/education/resources.ts",
  );
  for (const c of COURSES) {
    const data = curriculumForCourse(c.id);
    for (const area of c.commonAreas)
      assert.ok(studyTopic(data, area), `${c.id}:${area}`);
    for (const syllabus of data.syllabuses)
      for (const section of syllabus.sections)
        assert.ok(studyTopic(data, section.title, syllabus.code));
    assert.equal(studyTopic(data, "unlisted injected topic"), null);
    assert.equal(studyTopic(data, c.commonAreas[0], "unknown-code"), null);
  }
  for (const r of SUPPLEMENTARY_RESOURCES) {
    assert.equal(new URL(r.url).protocol, "https:");
    for (const id of r.courseIds) assert.ok(COURSES.some((c) => c.id === id));
  }
});

test("Readiness requires repeated, recent evidence and counts unseen bank questions", () => {
  const { practiceReadiness } = projectData("src/lib/account/readiness.ts");
  const subject = { courseId: "gcse-maths", board: "aqa" };
  const now = Date.parse("2026-10-03T12:00:00Z");
  const bank = QUESTION_BANK.filter(
    (q) =>
      q.courseId === subject.courseId &&
      q.specRefs?.some((r) => r.board === "AQA"),
  );
  assert.ok(bank.length > 1);
  const row = {
    question_key: bank[0].key,
    seen: 1,
    correct: 1,
    last_at: new Date(now).toISOString(),
  };
  assert.equal(practiceReadiness(subject, [], now).score, null);
  assert.equal(practiceReadiness(subject, [row], now).secure, 0);
  const repeated = practiceReadiness(
    subject,
    [{ ...row, seen: 100, correct: 100 }],
    now,
  );
  assert.equal(repeated.secure, 1);
  assert.ok(repeated.score < 100);
  assert.equal(
    practiceReadiness(
      subject,
      [{ ...row, seen: 2, correct: 2, last_at: "2026-09-01" }],
      now,
    ).secure,
    0,
  );
  assert.equal(
    practiceReadiness(
      subject,
      [{ ...row, seen: 2, correct: 2, last_at: "invalid" }],
      now,
    ).secure,
    0,
  );
  assert.equal(
    practiceReadiness(subject, [{ ...row, seen: 2, correct: 1 }], now).secure,
    0,
  );
});

test("Personal practice respects board references and shared combined-science topics", () => {
  const { matchesSubject, practiceReadiness } = projectData(
    "src/lib/account/readiness.ts",
  );
  const q = QUESTION_BANK.find(
    (q) =>
      q.courseId === "gcse-maths" && q.specRefs?.some((r) => r.board === "AQA"),
  );
  assert.equal(
    matchesSubject(q, { courseId: "gcse-maths", board: "aqa" }),
    true,
  );
  assert.equal(
    matchesSubject(q, { courseId: "gcse-maths", board: "ocr" }),
    false,
  );
  assert.equal(
    matchesSubject(q, { courseId: "gcse-maths", board: "unsure" }),
    true,
  );
  assert.equal(
    practiceReadiness({ courseId: "missing", board: "aqa" }, []).score,
    null,
  );
  const shared = COURSES.find((c) => c.id.includes("combined"));
  assert.ok(shared);
  const question = QUESTION_BANK.find((q) =>
    shared.topicIds.includes(q.topicId),
  );
  assert.ok(matchesSubject(question, { courseId: shared.id, board: "unsure" }));
});

test("Job adverts reject unsafe links and malformed entries and strip markup", () => {
  const { normaliseJobs } = projectData("src/lib/career-guidance.ts");
  const valid = { jobId: 12, jobTitle: "<b>Trainee</b>", jobUrl: "https://www.reed.co.uk/jobs/trainee/12", jobDescription: "<p>Learn software</p>", employerName: "Employer", locationName: "London" };
  const jobs = normaliseJobs({ results: [valid, null, { ...valid, jobUrl: "javascript:alert(1)" }, { ...valid, jobUrl: "https://evil.example/jobs/12" }, { ...valid, jobId: -1 }] });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Trainee");
  assert.equal(jobs[0].summary, "Learn software");
  assert.throws(() => normaliseJobs({ results: "bad" }));
});

test("University suggestions respect explicit preferences and avoid invented matches", () => {
  const { universityMatches, inferInterest } = projectData("src/lib/career-guidance.ts");
  assert.equal(inferInterest(["alevel-computer-science"]), "computing");
  assert.equal(inferInterest([]), "other");
  assert.ok(universityMatches("computing", "south", "campus").every(u => u.name === "University of Portsmouth"));
  assert.equal(universityMatches("psychology", "south", "distance").length, 0);
  assert.equal(universityMatches("other", "any", "either").length, 0);
  const online = universityMatches("engineering", "any", "distance");
  assert.ok(online.length > 0);
  assert.ok(online.every(u => u.mode === "distance" && u.interest === "engineering"));
});
