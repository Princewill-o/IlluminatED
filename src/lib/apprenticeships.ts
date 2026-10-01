/** Shapes shared by the careers explorer and its route handlers. */

export interface StandardSummary {
  ref: string;
  title: string;
  level: number | null;
  route: string;
  /** Typical duration in months. */
  duration: number | null;
  maxFunding: number | null;
  status: string;
  /** Approved for delivery and not paused for new starts. */
  open: boolean;
  jobTitles: string[];
}

export interface StandardSearch {
  results: StandardSummary[];
  total: number;
  routes: string[];
  levels: number[];
}

export interface StandardDetail extends StandardSummary {
  version: string;
  overview: string;
  summary: string;
  entryRequirements: string;
  englishAndMaths: string;
  duties: string[];
  knowledge: string[];
  skills: string[];
  behaviours: string[];
  counts: {
    duties: number;
    knowledge: number;
    skills: number;
    behaviours: number;
  };
  pageUrl: string;
}

export const STANDARD_REF = /^ST\d{4}$/i;

export const levelLabel = (level: number | null) =>
  level === null
    ? "Level not stated"
    : `Level ${level}${level >= 6 ? " (degree)" : level >= 4 ? " (higher)" : level === 3 ? " (advanced)" : " (intermediate)"}`;

export const OGL_URL =
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
