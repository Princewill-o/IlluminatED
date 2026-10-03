/** Public metadata only. Learning assets require the authorised Oak API. */
import fs from "node:fs/promises";
import { projectData } from "./lib/project-data.mjs";
const { COURSES } = projectData("src/lib/data/courses.ts");
const { TOPICS } = projectData("src/lib/data/topics/index.ts");
const output = "src/lib/data/education";
const now = new Date().toISOString();
const plain = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const finalUrls = new Map();
async function get(url) {
  const originalUrl = url;
  const u = new URL(url);
  if (!["www.aqa.org.uk", "www.thenational.academy"].includes(u.hostname))
    throw new Error("Source not allowed");
  let r = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    redirect: "manual",
    headers: {
      "User-Agent":
        "IlluminatED curriculum metadata index; links to original publishers",
    },
  });
  for (let i = 0; r.status >= 300 && r.status < 400 && i < 4; i++) {
    const target = new URL(r.headers.get("location") ?? "", url);
    if (
      !["www.aqa.org.uk", "www.thenational.academy"].includes(
        target.hostname,
      ) ||
      target.protocol !== "https:"
    )
      throw new Error("Redirect source not allowed");
    url = target.href;
    r = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      redirect: "manual",
    });
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  finalUrls.set(originalUrl, url);
  return r.text();
}
async function pool(items, fn, concurrency = 3) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}
const failures = [];
async function loadNext(url) {
  const html = await get(url);
  const data = html.match(
    /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s,
  )?.[1];
  if (!data) throw new Error("Public curriculum metadata unavailable");
  const props = JSON.parse(data).props?.pageProps;
  if (!props || props.__N_REDIRECT || props.notFound)
    throw new Error("Unexpected curriculum page");
  return props;
}
const subjectCourses = {
  maths: ["gcse-maths"],
  english: ["gcse-english-language", "gcse-english-literature"],
  biology: ["gcse-biology"],
  chemistry: ["gcse-chemistry"],
  physics: ["gcse-physics"],
  "combined-science": ["gcse-combined-science"],
  computing: ["gcse-computer-science"],
  history: ["gcse-history"],
  geography: ["gcse-geography"],
};
const programmes = [];
for (const year of [10, 11]) {
  const url = `https://www.thenational.academy/pupils/years/year-${year}/subjects`;
  try {
    const p = await loadNext(url);
    for (const row of p.curriculumData ?? []) {
      const f = row.programmeFields;
      if (
        !f ||
        row.isLegacy ||
        !subjectCourses[f.subjectSlug] ||
        f.pathwaySlug === "core"
      )
        continue;
      programmes.push({
        slug: row.programmeSlug,
        year,
        subject: f.subject,
        courseIds: subjectCourses[f.subjectSlug],
        board: f.examboardDescription ?? f.examboardSlug ?? "",
        tier: f.tierDescription ?? f.tierSlug ?? "",
      });
    }
  } catch (e) {
    failures.push({ url, error: e.message });
  }
}
const oak = (
  await pool(programmes, async (p) => {
    const url = `https://www.thenational.academy/pupils/programmes/${p.slug}/units`;
    try {
      const data = await loadNext(url);
      const units = [];
      for (const section of data.unitSections ?? [])
        for (const group of section.units ?? [])
          for (const unit of group) {
            if (
              unit.expired ||
              unit.unitData?._deleted ||
              !unit.unitSlug ||
              !unit.unitData?.title
            )
              continue;
            units.push({
              slug: unit.unitSlug,
              title: unit.unitData.title,
              url: `${url}/${unit.unitSlug}/lessons`,
              lessons: (unit.supplementaryData?.staticLessonList ?? [])
                .filter((l) => l._state === "published")
                .map((l) => ({
                  slug: l.slug,
                  title: l.title,
                  url: `https://www.thenational.academy/pupils/lessons/${l.slug}`,
                })),
            });
          }
      if (!units.length) throw new Error("No units returned");
      console.log(`Oak ${p.slug}: ${units.length} units`);
      return { ...p, sourceUrl: url, checkedAt: now, units };
    } catch (e) {
      failures.push({ url, error: e.message });
      return null;
    }
  })
).filter(Boolean);
const specs = new Map();
for (const c of COURSES)
  for (const t of TOPICS.filter((t) => c.topicIds.includes(t.id)))
    for (const r of t.specRefs ?? []) {
      if (
        r.board !== "AQA" ||
        !r.url?.startsWith("https://www.aqa.org.uk/") ||
        !c.specCodes?.some(
          (s) =>
            s.board === "AQA" &&
            s.code.match(/^\d+/)?.[0] === r.code.match(/^\d+/)?.[0],
        )
      )
        continue;
      const base = r.url.split("/specification")[0] + "/specification";
      const key = `${c.id}:${r.code}`;
      specs.set(key, { courseId: c.id, board: "AQA", code: r.code, url: base });
    }
// Combined science has distinct specifications; do not treat separate sciences as its syllabus.
specs.delete("gcse-combined-science:8461");
specs.delete("gcse-combined-science:8462");
specs.delete("gcse-combined-science:8463");
specs.set("gcse-combined-science:8464", {
  courseId: "gcse-combined-science",
  board: "AQA",
  code: "8464",
  url: "https://www.aqa.org.uk/subjects/science/gcse/combined-science-trilogy-8464/specification",
});
specs.set("alevel-computer-science:7517", {
  courseId: "alevel-computer-science",
  board: "AQA",
  code: "7517",
  url: "https://www.aqa.org.uk/subjects/computer-science/a-level/computer-science-7517/specification",
});
specs.set("alevel-english-literature:7717", {
  courseId: "alevel-english-literature",
  board: "AQA",
  code: "7717",
  url: "https://www.aqa.org.uk/subjects/english/a-level/english-7717/specification",
});
specs.set("epq:7993", {
  courseId: "epq",
  board: "AQA",
  code: "7993",
  url: "https://www.aqa.org.uk/subjects/projects/level-three/projects-7993/specification",
});
const syllabuses = (
  await pool([...specs.values()], async (spec) => {
    let root = `${spec.url}/subject-content`;
    try {
      let html;
      try {
        html = await get(root);
      } catch (e) {
        if (spec.code === "7993") {
          root = spec.url;
          html = await get(root);
        } else throw e;
      }
      root = finalUrls.get(root) ?? root;
      spec.url = root.split("/specification")[0] + "/specification";
      const links = [
        ...new Set(
          [...html.matchAll(/href="([^"]+)"/g)]
            .map((m) => {
              try {
                return new URL(m[1], root).href.split("#")[0];
              } catch {
                return "";
              }
            })
            .filter(
              (u) =>
                u.startsWith(spec.url + "/") &&
                u.includes("subject-content") &&
                u !== root,
            ),
        ),
      ];
      const pages = [{ url: root, html }];
      for (const url of links) {
        try {
          pages.push({ url, html: await get(url) });
        } catch (e) {
          failures.push({ url, error: e.message });
        }
      }
      const sections = [];
      const seen = new Set();
      for (const page of pages)
        for (const h of page.html
          .slice(page.html.lastIndexOf("<h1"))
          .matchAll(/<h([2-6])\b[^>]*>(.*?)<\/h\1>/gs)) {
          // Some retired /subject-content URLs redirect to a general introduction.
          // Do not put marketing or administration headings in a revision checklist.
          if (
            !(finalUrls.get(page.url) ?? page.url).includes("subject-content")
          )
            continue;
          const title = plain(h[2]);
          const match = title.match(/^(\d+(?:\.\d+)+|\d+[A-Z])\s+(.+)/);
          const identity = `${page.url}:${title}`;
          if (
            /subject content|related resources|contact us|copyright|need help/i.test(
              title,
            ) ||
            title.length < 3 ||
            seen.has(identity)
          )
            continue;
          seen.add(identity);
          sections.push({
            ref: match?.[1] ?? "",
            title: match?.[2] ?? title,
            url: finalUrls.get(page.url) ?? page.url,
          });
        }
      if (!sections.length)
        throw new Error("No syllabus headings; manual mapping needed");
      console.log(`AQA ${spec.code}: ${sections.length} headings`);
      return {
        ...spec,
        checkedAt: now,
        pagesChecked: pages.length,
        sectionPagesExpected: links.length + 1,
        sections,
      };
    } catch (e) {
      failures.push({ url: root, error: e.message });
      return null;
    }
  })
).filter(Boolean);
await fs.mkdir(output, { recursive: true });
// A failed refresh must not destroy the last successful source snapshot.
async function mergePrevious(file, incoming, key) {
  let previous = [];
  try {
    previous =
      JSON.parse(await fs.readFile(`${output}/${file}`, "utf8")).items ?? [];
  } catch {}
  if (file === "specifications.json")
    previous = previous.filter((x) =>
      COURSES.find((c) => c.id === x.courseId)?.specCodes?.some(
        (s) =>
          s.board === x.board &&
          s.code.match(/^\d+/)?.[0] === x.code.match(/^\d+/)?.[0],
      ),
    );
  const map = new Map(previous.map((x) => [key(x), x]));
  for (const item of incoming) map.set(key(item), item);
  await fs.writeFile(
    `${output}/${file}`,
    JSON.stringify({ generatedAt: now, items: [...map.values()] }, null, 2) +
      "\n",
  );
}
await mergePrevious("oak-catalogue.json", oak, (x) => x.slug);
await mergePrevious(
  "specifications.json",
  syllabuses,
  (x) => `${x.courseId}:${x.code}`,
);
await fs.writeFile(
  `${output}/sync-report.json`,
  JSON.stringify(
    {
      attemptedAt: now,
      oakProgrammes: oak.length,
      syllabuses: syllabuses.length,
      failures,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${oak.length} programmes, ${syllabuses.length} syllabuses; ${failures.length} source failures.`,
);
if (!oak.length || !syllabuses.length) process.exitCode = 1;
