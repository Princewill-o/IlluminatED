import { createHash } from "node:crypto";

export const OAK_ATTRIBUTION = "Oak National Academy · Open Government Licence v3.0";
export const OAK_LICENCE = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
export function oakUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.thenational.academy" ? url.href : null;
  } catch { return null; }
}
/** Preserve publisher restrictions even when another sequence repeats the same lesson. */
export function mergeOakLesson(previous, incoming) {
  if (!previous) return incoming;
  const restricted = previous.restricted || incoming.restricted;
  const content = JSON.stringify(incoming.content).length > JSON.stringify(previous.content).length ? incoming.content : previous.content;
  return { ...previous, years: [...new Set([...previous.years, ...incoming.years])].sort((a,b) => a-b), restricted,
    content: restricted ? {} : content };
}
export function normaliseOakCollection(data, version) {
  if (!/^[a-z0-9-]+-(primary|secondary)$/.test(data.sequenceSlug) || !Array.isArray(data.sequence) || !Array.isArray(data.lessons)) throw Error("Invalid Oak collection");
  const years = new Map();
  const units = data.sequence.map((unit, index) => {
    if (!/^ks[1-4]$/.test(unit.keyStageSlug)) throw Error("Invalid Oak unit");
    for (const lesson of unit.unitLessons) {
      if (lesson.state !== "published") continue;
      const set = years.get(lesson.lessonSlug) ?? new Set();
      if (Number.isInteger(unit.year)) set.add(unit.year);
      if (unit.year === "All years" && data.sequenceSlug.endsWith("-primary")) for(let year=1;year<=6;year++)set.add(year);
      years.set(lesson.lessonSlug, set);
    }
    return { unit_id: createHash("sha256").update(oakUrl(unit.canonicalUrl) ?? `${data.sequenceSlug}/${unit.unitSlug}`).digest("hex"), sequence_slug: data.sequenceSlug,
      unit_slug: unit.unitSlug, title: unit.unitTitle, subject: unit.subjectSlug, subject_title: data.subjectTitle,
      key_stage: unit.keyStageSlug, year: Number.isInteger(unit.year) ? unit.year : null,
      position: index, source_url: oakUrl(unit.canonicalUrl) ?? "https://www.thenational.academy/", content: unit, import_version: version };
  });
  const lessons = data.lessons.map(lesson => {
    if (!/^[a-z0-9-]+$/.test(lesson.lessonSlug) || !oakUrl(lesson.canonicalUrl) || !/^ks[1-4]$/.test(lesson.keyStageSlug)) throw Error("Invalid Oak lesson");
    const restricted = lesson.restricted === true;
    return { slug: lesson.lessonSlug, title: lesson.lessonTitle, unit_slug: lesson.unitSlug, unit_title: lesson.unitTitle,
      subject: lesson.subjectSlug, subject_title: lesson.subjectTitle, key_stage: lesson.keyStageSlug,
      phase: data.sequenceSlug.endsWith("-primary") ? "primary" : "secondary", years: [...(years.get(lesson.lessonSlug) ?? [])].sort((a,b) => a-b),
      restricted, source_url: lesson.canonicalUrl, content: restricted ? {} : lesson, import_version: version };
  });
  return { units, lessons };
}
