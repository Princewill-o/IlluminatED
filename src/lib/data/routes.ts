import type { Board, BoardId, QualificationRoute, RouteId } from "@/lib/types";

export const LAST_CHECKED = "2026-09-30";

export const ROUTES: QualificationRoute[] = [
  {
    id: "gcse",
    name: "GCSE",
    href: "/gcse",
    years: "Years 10–11",
    level: "Level 1/2",
    tag: "Year 11 focus",
    tone: "#e98a1f",
    description:
      "Core subjects, topic guides and links to your board's papers, with a focus on Year 11.",
    studyAdvice:
      "Your school decides the exam board, specification and (for some subjects) the tier you sit. Use that exact specification as your checklist, mix short retrieval quizzes with timed questions, and check answers against official mark schemes.",
  },
  {
    id: "alevel",
    name: "A level",
    href: "/a-level",
    years: "Years 12–13",
    level: "Level 3",
    tag: "Sixth form",
    tone: "#7a5ce6",
    description: "Subject guides and study methods for Years 12 and 13.",
    studyAdvice:
      "Break each subject into specification points. Use spaced retrieval for knowledge, worked examples for problem solving, and timed essays or papers to practise exam technique.",
  },
  {
    id: "btec",
    name: "BTEC",
    href: "/btec",
    years: "Level 2 and Level 3",
    level: "Level 2–3",
    tag: "Vocational",
    tone: "#15987f",
    description:
      "Unit planning, assignment checklists and Pearson's sample assessments.",
    studyAdvice:
      "Work from your programme's unit list. Plan evidence for internally assessed assignments, keep drafts and feedback organised, and prepare for externally assessed units with Pearson's sample assessment materials.",
  },
  {
    id: "tlevel",
    name: "T Levels",
    href: "/t-levels",
    years: "Post-16, two years",
    level: "Level 3",
    tag: "Technical",
    tone: "#2f6fc0",
    description:
      "Each T Level explained: the core, the specialism and the industry placement.",
    studyAdvice:
      "Use your awarding organisation's technical qualification specification. Revise core knowledge for the exams and employer-set project, practise your occupational specialism skills, and connect placement experience back to the course.",
  },
  {
    id: "level23",
    name: "Level 2 & 3",
    href: "/level-2-3",
    years: "Post-16 and adult",
    level: "Level 2–3",
    tag: "More routes",
    tone: "#d4536a",
    description:
      "Functional Skills, Core Maths, the EPQ, Cambridge Technicals and more.",
    studyAdvice:
      "Qualifications at the same level can be structured and assessed very differently. Check the awarding body's specification, assessment format and current availability before you plan.",
  },
];

export const routeById = (id: RouteId) => ROUTES.find((r) => r.id === id)!;

export const BOARDS: Record<BoardId, Board> = {
  aqa: {
    id: "aqa",
    name: "AQA",
    short: "AQA",
    home: "https://www.aqa.org.uk/",
    pastPapers: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
  },
  pearson: {
    id: "pearson",
    name: "Pearson (Edexcel and BTEC)",
    short: "Pearson",
    home: "https://qualifications.pearson.com/",
    pastPapers:
      "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html",
  },
  ocr: {
    id: "ocr",
    name: "OCR",
    short: "OCR",
    home: "https://www.ocr.org.uk/",
    pastPapers: "https://www.ocr.org.uk/qualifications/past-paper-finder/",
  },
  wjec: {
    id: "wjec",
    name: "WJEC / Eduqas",
    short: "WJEC/Eduqas",
    home: "https://www.eduqas.co.uk/",
    pastPapers: "https://www.wjec.co.uk/home/past-papers/",
    note: "WJEC qualifications are mainly taken in Wales; Eduqas is WJEC's brand for England.",
  },
  ccea: {
    id: "ccea",
    name: "CCEA",
    short: "CCEA",
    home: "https://ccea.org.uk/",
    pastPapers: "https://ccea.org.uk/past-papers-mark-schemes",
    note: "CCEA is the main awarding body in Northern Ireland.",
  },
  ncfe: {
    id: "ncfe",
    name: "NCFE",
    short: "NCFE",
    home: "https://www.ncfe.org.uk/",
  },
  cityguilds: {
    id: "cityguilds",
    name: "City & Guilds",
    short: "City & Guilds",
    home: "https://www.cityandguilds.com/",
  },
  aat: {
    id: "aat",
    name: "AAT",
    short: "AAT",
    home: "https://www.aat.org.uk/",
  },
  cilex: {
    id: "cilex",
    name: "CILEX",
    short: "CILEX",
    home: "https://www.cilex.org.uk/",
  },
  dfe: {
    id: "dfe",
    name: "Department for Education",
    short: "DfE",
    home: "https://www.gov.uk/government/organisations/department-for-education",
  },
};

export const GENERAL_BOARDS: BoardId[] = [
  "aqa",
  "pearson",
  "ocr",
  "wjec",
  "ccea",
];
