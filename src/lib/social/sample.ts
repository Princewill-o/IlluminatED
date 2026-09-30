/**
 * Example threads shown ONLY when Social isn't connected to Supabase, so the
 * layout can be previewed. Every page labels them as examples. They are
 * written as questions and general advice, not as reviews of real places.
 */
import type { CategorySlug } from "./config";

type Author = { username: string; role: "member" | "moderator" };

export interface SampleThread {
  id: number;
  category: CategorySlug;
  university: string | null;
  title: string;
  body: string;
  excerpt: string;
  author: Author | null;
  replyCount: number;
  createdAt: string;
  lastActivityAt: string;
  hidden: boolean;
  locked: boolean;
}

const ex = (s: string) =>
  s.length > 180 ? s.slice(0, 177).trimEnd() + "…" : s;

const T = (
  id: number,
  category: CategorySlug,
  title: string,
  body: string,
  username: string,
  replyCount: number,
  day: number,
  university: string | null = null,
): SampleThread => ({
  id,
  category,
  university,
  title,
  body,
  excerpt: ex(body),
  author: { username, role: "member" },
  replyCount,
  createdAt: `2026-09-${String(day).padStart(2, "0")}T09:00:00Z`,
  lastActivityAt: `2026-09-${String(day + 1).padStart(2, "0")}T18:30:00Z`,
  hidden: false,
  locked: false,
});

export const SAMPLE_THREADS: SampleThread[] = [
  T(
    1,
    "universities",
    "Anyone studying Computer Science at Leeds? What's the first year like?",
    "I'm in Year 13 and Leeds is on my list. I'd love to hear from anyone on the course about how much maths is in first year, how big the classes are, and what the placement year involves.",
    "example_yr13",
    2,
    24,
    "University of Leeds",
  ),
  T(
    2,
    "universities",
    "How do you actually judge if a uni is good for your subject?",
    "League tables all say different things. What did you look at when you chose? Thinking of things like the module list, contact hours and what graduates go on to do.",
    "example_student",
    2,
    22,
  ),
  T(
    3,
    "sixth-form",
    "Moving from school to a sixth form college. How different is it?",
    "My school doesn't have a sixth form so I'm starting at a college in September. Is it true you get a lot more free periods? How did you use yours?",
    "example_yr11",
    1,
    20,
  ),
  T(
    4,
    "applying",
    "Personal statement: how early did you start?",
    "The new UCAS format uses three questions instead of one long essay. Has anyone started theirs yet, and did your teachers give you any advice on structure?",
    "example_applicant",
    1,
    26,
  ),
  T(
    5,
    "apprenticeships",
    "Degree apprenticeship vs uni for software engineering",
    "I've got an offer for a degree apprenticeship and a uni offer. Anyone done an apprenticeship who can say what the balance of work and study is like?",
    "example_decider",
    0,
    27,
  ),
  T(
    6,
    "student-life",
    "Budgeting tips for your first term?",
    "What do you wish you'd known about money before starting? Food shop, travel, societies, that kind of thing.",
    "example_student",
    0,
    18,
    "University of Manchester",
  ),
];

export const SAMPLE_POSTS = [
  {
    id: 101,
    threadId: 1,
    body: "Not on the course, but worth checking the module catalogue on the uni website. It lists first-year modules and how each is assessed. Open days usually have current students you can ask too.",
    author: { username: "example_helper", role: "member" as const },
    createdAt: "2026-09-25T10:15:00Z",
    hidden: false,
  },
  {
    id: 102,
    threadId: 1,
    body: "Also look at Discover Uni for the official student satisfaction and graduate outcomes for that exact course.",
    author: { username: "example_mod", role: "moderator" as const },
    createdAt: "2026-09-25T18:30:00Z",
    hidden: false,
  },
  {
    id: 103,
    threadId: 2,
    body: "I compared the modules I'd actually take, the contact hours, and whether there's a placement year. League tables were the last thing I looked at.",
    author: { username: "example_uni2", role: "member" as const },
    createdAt: "2026-09-22T16:00:00Z",
    hidden: false,
  },
  {
    id: 104,
    threadId: 2,
    body: "Talk to current students at open days. Ask what a normal week looks like.",
    author: { username: "example_helper", role: "member" as const },
    createdAt: "2026-09-23T18:30:00Z",
    hidden: false,
  },
  {
    id: 105,
    threadId: 3,
    body: "Yes, more free periods. I treated them like lessons and did homework in the library. Made a huge difference.",
    author: { username: "example_yr12", role: "member" as const },
    createdAt: "2026-09-21T18:30:00Z",
    hidden: false,
  },
  {
    id: 106,
    threadId: 4,
    body: "Started in the summer. Doing a rough bullet-point answer to each question first helped a lot before writing properly.",
    author: { username: "example_yr13", role: "member" as const },
    createdAt: "2026-09-27T18:30:00Z",
    hidden: false,
  },
];
