/** Reviewed provider capabilities; an official link is not a redistribution licence. */
export const EDUCATION_PROVIDERS = [
  {
    id: "oak",
    name: "Oak Curriculum API",
    boards: ["aqa", "pearson", "ocr", "wjec"],
    regions: ["England"],
    url: "https://open-api.thenational.academy/docs/about-oaks-api/api-overview",
    resources: "https://www.thenational.academy/",
    mode: "api",
    access: "API key required",
    coverage:
      "KS1–4 lessons, quizzes, answers, key learning points and misconceptions. Board pathways vary by subject. Not complete A-level, vocational, CCEA or Scottish coverage.",
    reuse:
      "API content under OGL except where stated; retain attribution and respect excluded assets.",
    terms:
      "https://www.thenational.academy/legal/terms-and-conditions-api-version",
  },
  {
    id: "aqa",
    name: "AQA / Exampro",
    boards: ["aqa"],
    regions: ["England"],
    url: "https://www.exampro.co.uk/",
    resources: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
    mode: "publisher",
    access: "Publisher agreement needed for platform reuse",
    coverage:
      "Official papers, mark schemes and AQA question-bank service. No public integration API verified.",
    reuse:
      "A centre subscription does not authorise redistribution in IlluminatED. Request commercial permission.",
    terms:
      "https://www.aqa.org.uk/about-us/who-we-are/our-standards/copyright-and-intellectual-property-policy",
  },
  {
    id: "pearson",
    name: "Pearson Edexcel / examWizard",
    boards: ["pearson"],
    regions: ["England", "UK vocational"],
    url: "https://qualifications.pearson.com/en/support/Services/examwizard.html",
    resources:
      "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html",
    mode: "publisher",
    access: "Publisher agreement needed for platform reuse",
    coverage:
      "Edexcel papers and examWizard; BTEC and T Level materials vary by qualification. No public question-content API verified.",
    reuse:
      "Link to publisher resources; request explicit commercial rights before importing question text or mark schemes.",
    terms:
      "https://qualifications.pearson.com/en/support/support-topics/understanding-our-qualifications/policies-for-centres-learners-and-employees.html",
  },
  {
    id: "ocr",
    name: "Cambridge OCR / ExamBuilder",
    boards: ["ocr"],
    regions: ["England"],
    url: "https://www.ocr.org.uk/qualifications/past-paper-finder/exambuilder/",
    resources: "https://www.ocr.org.uk/qualifications/past-paper-finder/",
    mode: "publisher",
    access: "ExamBuilder is restricted to OCR centre staff",
    coverage:
      "Official assessment materials and centre test building. No public integration API verified.",
    reuse:
      "ExamBuilder terms restrict copying and resale. Separate publisher permission is needed for platform reuse.",
    terms: "https://exambuilder.ocr.org.uk/marketing/terms/",
  },
  {
    id: "wjec",
    name: "WJEC",
    boards: ["wjec"],
    regions: ["Wales"],
    url: "https://www.wjec.co.uk/en/home/question-bank/",
    resources: "https://www.wjec.co.uk/home/past-papers/",
    mode: "publisher",
    access: "Public resource links; commercial permission unverified",
    coverage:
      "GCSE and AS/A-level questions, mark schemes and examiner comments. The legacy question bank states it is no longer adding questions.",
    reuse:
      "Do not treat classroom PDF export as a licence for a paid platform. Ask for an up-to-date commercial feed.",
    terms: "https://www.wjec.co.uk/en/home/question-bank/",
  },
  {
    id: "eduqas",
    name: "Eduqas",
    boards: ["wjec"],
    regions: ["England"],
    url: "https://questionbank.resources.eduqas.co.uk/",
    resources: "https://www.eduqas.co.uk/home/past-papers-and-mark-schemes/",
    mode: "publisher",
    access: "Public resource links; commercial permission unverified",
    coverage:
      "Eduqas question bank and official assessment materials. No public integration API verified.",
    reuse:
      "Request written rights for automated import and commercial question/answer reuse.",
    terms: "https://www.eduqas.co.uk/ed/home/question-bank/",
  },
  {
    id: "ccea",
    name: "CCEA",
    boards: ["ccea"],
    regions: ["Northern Ireland"],
    url: "https://ccea.org.uk/",
    resources: "https://ccea.org.uk/past-papers-mark-schemes",
    mode: "publisher",
    access: "Official resource links; integration licence needed",
    coverage:
      "Northern Ireland papers and mark schemes. No public question-content API verified.",
    reuse:
      "Commercial redistribution rights have not been established; use publisher links pending agreement.",
    terms: "https://ccea.org.uk/",
  },
  {
    id: "scotland",
    name: "Qualifications Scotland",
    boards: ["qualifications-scotland"],
    regions: ["Scotland"],
    url: "https://qualifications.gov.scot/",
    resources: "https://www.sqa.org.uk/pastpapers/",
    mode: "publisher",
    access: "Official resource links; commercial permission required",
    coverage:
      "National Qualifications, Higher and Advanced Higher papers/marking instructions. Not currently mapped to IlluminatED courses.",
    reuse:
      "Commercial use needs advance written permission. Scottish qualification mapping is a separate content task.",
    terms: "https://qualifications.gov.scot/terms-and-conditions",
  },
  {
    id: "ncfe",
    name: "NCFE / CACHE",
    boards: ["ncfe"],
    regions: ["UK vocational"],
    url: "https://www.ncfe.org.uk/customer-and-learner-support/assessment-support/",
    resources:
      "https://www.ncfe.org.uk/customer-and-learner-support/learner-support/past-papers/",
    mode: "publisher",
    access: "Some materials require centre access",
    coverage:
      "Functional Skills, technical qualifications and qualification-specific samples. Not every qualification has exam papers.",
    reuse:
      "Publisher agreement required before importing protected assessment material.",
    terms:
      "https://www.ncfe.org.uk/customer-and-learner-support/assessment-support/",
  },
  {
    id: "cityguilds",
    name: "City & Guilds",
    boards: ["cityguilds"],
    regions: ["UK vocational"],
    url: "https://www.cityandguilds.com/delivering-our-qualifications/exams-and-admin",
    resources:
      "https://www.cityandguilds.com/qualifications-and-apprenticeships",
    mode: "publisher",
    access: "Qualification and centre-specific resources",
    coverage:
      "Vocational qualifications, handbooks and assessment support. No public question-content API verified.",
    reuse:
      "Do not import secure centre assessments. Negotiate commercial rights for permitted materials.",
    terms:
      "https://www.cityandguilds.com/delivering-our-qualifications/exams-and-admin",
  },
  {
    id: "aat",
    name: "AAT",
    boards: ["aat"],
    regions: ["UK vocational"],
    url: "https://www.aat.org.uk/qualifications-and-courses/how-to-study",
    resources: "https://www.aat.org.uk/qualifications-and-courses",
    mode: "publisher",
    access: "Registered student/provider resources",
    coverage:
      "Accounting and bookkeeping study support. No public question-content API verified.",
    reuse:
      "Student/provider access is not a commercial redistribution agreement.",
    terms: "https://www.aat.org.uk/about/help-and-support",
  },
  {
    id: "cilex",
    name: "CILEX",
    boards: ["cilex"],
    regions: ["UK vocational"],
    url: "https://www.cilex.org.uk/study/information_for_students/exams/past_papers/",
    resources:
      "https://www.cilex.org.uk/study/information_for_students/exams/past_papers/",
    mode: "publisher",
    access: "Published and provider-specific resources",
    coverage:
      "Legal qualification past papers and examiner reports; availability varies by qualification. No public integration API verified.",
    reuse: "Request explicit commercial permission before ingesting materials.",
    terms:
      "https://www.cilex.org.uk/for-centres/information_for_training_providers/",
  },
] as const;
export const PROVIDERS_REVIEWED_AT = "2026-10-18";
export function providersForBoard(board: string | null) {
  return board
    ? EDUCATION_PROVIDERS.filter((p) =>
        (p.boards as readonly string[]).includes(board),
      )
    : [...EDUCATION_PROVIDERS];
}
