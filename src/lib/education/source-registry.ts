import type { SkillId } from "@/game/core/careers";

export interface LearningSource {
  id: string;
  title: string;
  provider: string;
  url: string;
  purpose: string;
  skills: SkillId[];
}
/** Publisher links provide reference context, not endorsement or certification of our scenarios. */
export const LEARNING_SOURCES: LearningSource[] = [
  {
    id: "oak",
    title: "Lessons and question practice",
    provider: "Oak National Academy",
    url: "https://www.thenational.academy/",
    purpose:
      "Year, subject, board and tier-specific lessons. In-app quizzes require the authorised Oak API.",
    skills: [],
  },
  {
    id: "aqa",
    title: "Past papers and mark schemes",
    provider: "AQA",
    url: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
    purpose:
      "Official papers, mark schemes and examiner reports. Papers open on the publisher’s site.",
    skills: [],
  },
  {
    id: "pearson",
    title: "Past papers",
    provider: "Pearson Edexcel",
    url: "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html",
    purpose:
      "Official paper discovery; some recent materials are restricted to centres.",
    skills: [],
  },
  {
    id: "ocr",
    title: "Qualifications and assessment resources",
    provider: "OCR",
    url: "https://www.ocr.org.uk/qualifications/",
    purpose:
      "Choose the qualification and specification before using its assessment materials.",
    skills: [],
  },
  {
    id: "careers",
    title: "Explore careers",
    provider: "National Careers Service",
    url: "https://nationalcareers.service.gov.uk/explore-careers",
    purpose:
      "Reference context for careers, transferable skills and simulated workplace tasks.",
    skills: [
      "customer-service",
      "scheduling",
      "written-communication",
      "prioritisation",
      "marketing-analytics",
      "copywriting",
      "stock-control",
      "order-accuracy",
    ],
  },
  {
    id: "money",
    title: "Budgeting and managing money",
    provider: "MoneyHelper",
    url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting",
    purpose:
      "Background for budgeting and numeracy practice; portfolio prices are entirely fictional.",
    skills: ["numeracy", "cash-handling", "finance"],
  },
  {
    id: "food",
    title: "Food allergy and intolerance",
    provider: "Food Standards Agency",
    url: "https://www.food.gov.uk/safety-hygiene/food-allergy-and-intolerance",
    purpose:
      "Reference for allergen-awareness scenarios. This game is not food-safety training certification.",
    skills: ["food-safety"],
  },
  {
    id: "ico",
    title: "Data protection advice",
    provider: "Information Commissioner’s Office",
    url: "https://ico.org.uk/for-organisations/",
    purpose: "Background on personal data and organisational responsibilities.",
    skills: ["data-protection", "legal-research"],
  },
  {
    id: "ncsc",
    title: "Cyber security guidance",
    provider: "National Cyber Security Centre",
    url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online",
    purpose: "Reference context for security, scams and IT support scenarios.",
    skills: ["cyber-security", "fraud-awareness", "it-support"],
  },
  {
    id: "mdn",
    title: "Learn web development",
    provider: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    purpose: "Reference context for JavaScript and debugging practice.",
    skills: ["programming", "debugging"],
  },
  {
    id: "postgres",
    title: "SQL tutorial",
    provider: "PostgreSQL",
    url: "https://www.postgresql.org/docs/current/tutorial-sql.html",
    purpose: "Reference context for SQL practice.",
    skills: ["sql"],
  },
  {
    id: "nhs",
    title: "When to use NHS 111",
    provider: "NHS",
    url: "https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/",
    purpose:
      "Background for health-career awareness. Simulations are not clinical advice or professional training.",
    skills: ["triage", "clinical-observations"],
  },
];
export function sourceFreshness(
  checkedAt: string | null | undefined,
  now = Date.now(),
) {
  const timestamp = checkedAt ? Date.parse(checkedAt) : NaN;
  return !Number.isFinite(timestamp) || timestamp > now
    ? "not-checked"
    : now - timestamp > 14 * 86400000
      ? "stale"
      : "recent";
}
