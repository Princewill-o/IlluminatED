export type RouteId = "gcse" | "alevel" | "btec" | "tlevel" | "level23";

export type BoardId =
  | "aqa"
  | "pearson"
  | "ocr"
  | "wjec"
  | "ccea"
  | "ncfe"
  | "cityguilds"
  | "aat"
  | "cilex"
  | "dfe";

export interface Board {
  id: BoardId;
  name: string;
  short: string;
  home: string;
  pastPapers?: string;
  note?: string;
}

export interface QualificationRoute {
  id: RouteId;
  name: string;
  href: string;
  years: string;
  level: string;
  tag: string;
  tone: string;
  description: string;
  studyAdvice: string;
}

export interface RegisterQuery {
  title: string;
  qualificationTypes?: string;
}

export interface Course {
  id: string;
  route: RouteId;
  subject: string;
  title: string;
  years: string;
  level: string;
  /** e.g. sector for BTEC / occupational route for T Levels */
  group?: string;
  boards: BoardId[];
  /** true when the awarding organisation is fixed for this qualification (e.g. T Levels, BTEC) */
  boardFixed?: boolean;
  summary: string;
  assessment: string;
  /** Broad areas common to most specifications. Not a syllabus. */
  commonAreas: string[];
  studySequence: string[];
  topicIds: string[];
  officialLinks: { label: string; url: string }[];
  register: RegisterQuery;
  lastChecked: string;
  statusNote?: string;
  /** Specification codes by awarding organisation, e.g. AQA 8300. */
  specCodes?: { board: string; code: string }[];
}

export interface QuizQuestion {
  id: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface SpecRef {
  board: string;
  code: string;
  section: string;
  url?: string;
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  objectives: string[];
  explanation: string[];
  workedExample?: { question: string; steps: string[]; answer: string };
  keyTerms: { term: string; definition: string }[];
  misconceptions: { wrong: string; right: string }[];
  retrieval: { q: string; a: string }[];
  quiz: QuizQuestion[];
  /** Where this topic sits in awarding-organisation specifications (checked against the boards' own documents). */
  specRefs?: SpecRef[];
  reviewed: string;
  version: string;
}

export type ResourceKind =
  | "Past papers & mark schemes"
  | "Specifications"
  | "Examiner reports"
  | "Sample assessments"
  | "T Level outlines"
  | "Guidance"
  | "Careers & next steps";

export interface OfficialResource {
  id: string;
  title: string;
  provider: string;
  board: BoardId | "gov";
  routes: RouteId[];
  subjects: string[];
  kind: ResourceKind;
  url: string;
  host: "Official board" | "GOV.UK / DfE" | "Ofqual";
  description: string;
  restricted?: boolean;
  added: string;
}

export interface LibraryResource {
  name: string;
  url: string;
  description: string;
  category: string;
  subjects: string[];
  ukRelevant?: boolean;
}
