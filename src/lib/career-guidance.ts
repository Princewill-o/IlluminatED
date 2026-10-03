import { safeHttpsUrl } from "@/lib/opportunities";
export interface JobAdvert {
  id: string;
  title: string;
  employer: string;
  location: string;
  url: string;
  summary: string;
}
export function normaliseJobs(input: unknown): JobAdvert[] {
  if (
    !input ||
    typeof input !== "object" ||
    !Array.isArray((input as { results?: unknown }).results)
  )
    throw new Error("Invalid jobs response");
  const text = (v: unknown, max: number) =>
    typeof v === "string"
      ? v
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, max)
      : "";
  return (input as { results: Record<string, unknown>[] }).results
    .slice(0, 50)
    .flatMap((r) => {
      if (!r || typeof r !== "object") return [];
      const url = safeHttpsUrl(r.jobUrl, ["www.reed.co.uk", "reed.co.uk"]);
      const title = text(r.jobTitle, 200);
      if (
        !url ||
        !title ||
        !Number.isSafeInteger(r.jobId) ||
        Number(r.jobId) <= 0
      )
        return [];
      return [
        {
          id: `reed:${r.jobId}`,
          title,
          url,
          employer: text(r.employerName, 150),
          location: text(r.locationName, 150),
          summary: text(r.jobDescription, 500),
        },
      ];
    });
}
export const INTERESTS = [
  "computing",
  "business",
  "psychology",
  "engineering",
  "other",
] as const;
export type Interest = (typeof INTERESTS)[number];
export const UNIVERSITIES = [
  {
    name: "University of Manchester",
    course: "Computer science courses",
    interest: "computing",
    region: "north",
    mode: "campus",
    url: "https://www.cs.manchester.ac.uk/study/undergraduate/courses/index.htm",
  },
  {
    name: "University of Portsmouth",
    course: "BSc Computing",
    interest: "computing",
    region: "south",
    mode: "campus",
    url: "https://www.port.ac.uk/study/courses/undergraduate/bsc-hons-computing",
  },
  {
    name: "University of Birmingham",
    course: "BSc Business Management",
    interest: "business",
    region: "midlands",
    mode: "campus",
    url: "https://www.birmingham.ac.uk/study/undergraduate/subjects/business-and-management-courses/business-management-bsc",
  },
  {
    name: "University of York",
    course: "BSc Psychology",
    interest: "psychology",
    region: "north",
    mode: "campus",
    url: "https://www.york.ac.uk/study/undergraduate/courses/bsc-psychology/",
  },
  {
    name: "The Open University",
    course: "Computing & IT and Business",
    interest: "computing",
    region: "distance",
    mode: "distance",
    url: "https://www.open.ac.uk/courses/computing-it/degrees/bsc-computing-it-business-q67-citb/",
  },
  {
    name: "The Open University",
    course: "Computing & IT and Business",
    interest: "business",
    region: "distance",
    mode: "distance",
    url: "https://www.open.ac.uk/courses/computing-it/degrees/bsc-computing-it-business-q67-citb/",
  },
  {
    name: "The Open University",
    course: "Computing with Electronic Engineering",
    interest: "engineering",
    region: "distance",
    mode: "distance",
    url: "https://www.open.ac.uk/courses/engineering/degrees/bsc-computing-and-electronic-engineering-r62/",
  },
];
export function universityMatches(
  interest: string,
  region: string,
  mode: string,
) {
  return UNIVERSITIES.filter(
    (u) =>
      u.interest === interest &&
      (region === "any" || u.region === region) &&
      (mode === "either" || u.mode === mode),
  );
}
export function inferInterest(subjects: string[]): Interest {
  const s = subjects.join(" ");
  if (/computer|digital|btec-it/.test(s)) return "computing";
  if (/business|economics|accounting/.test(s)) return "business";
  if (/psychology/.test(s)) return "psychology";
  if (/engineering|physics/.test(s)) return "engineering";
  return "other";
}
