import { GENERAL_BOARDS, LAST_CHECKED } from "@/lib/data/routes";
import type { BoardId, Course, RouteId } from "@/lib/types";

const PEARSON_GCSE =
  "https://qualifications.pearson.com/en/qualifications/edexcel-gcses.html";
const PEARSON_ALEVEL =
  "https://qualifications.pearson.com/en/qualifications/edexcel-a-levels.html";
const OCR_GCSE = "https://www.ocr.org.uk/qualifications/gcse/";
const OCR_ALEVEL = "https://www.ocr.org.uk/qualifications/as-and-a-level/";
const EDUQAS = "https://www.eduqas.co.uk/qualifications/";
const BTEC_NATIONALS =
  "https://qualifications.pearson.com/en/qualifications/btec-nationals.html";
const BTEC_TECH =
  "https://qualifications.pearson.com/en/qualifications/btec-tech-awards.html";
const TLEVEL_SUBJECTS = "https://www.tlevels.gov.uk/students/subjects";
const TLEVEL_HUB = "https://support.tlevels.gov.uk/hc/en-gb";

const gcseLinks = [
  {
    label: "AQA past papers and mark schemes",
    url: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
  },
  { label: "Pearson Edexcel GCSEs", url: PEARSON_GCSE },
  { label: "OCR GCSEs", url: OCR_GCSE },
  { label: "Eduqas qualifications", url: EDUQAS },
];
const alevelLinks = [
  {
    label: "AQA past papers and mark schemes",
    url: "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
  },
  { label: "Pearson Edexcel A levels", url: PEARSON_ALEVEL },
  { label: "OCR AS and A levels", url: OCR_ALEVEL },
  { label: "Eduqas qualifications", url: EDUQAS },
];

type Seed = Omit<
  Course,
  "lastChecked" | "officialLinks" | "boards" | "years" | "level" | "route"
> &
  Partial<Pick<Course, "officialLinks" | "boards" | "years" | "level">>;

const make =
  (
    route: RouteId,
    defaults: Pick<Course, "years" | "level" | "boards" | "officialLinks">,
  ) =>
  (s: Seed): Course => ({
    route,
    lastChecked: LAST_CHECKED,
    ...defaults,
    ...s,
  });

const gcse = make("gcse", {
  years: "Years 10–11",
  level: "Level 1/2",
  boards: GENERAL_BOARDS,
  officialLinks: gcseLinks,
});
const alevel = make("alevel", {
  years: "Years 12–13",
  level: "Level 3",
  boards: GENERAL_BOARDS,
  officialLinks: alevelLinks,
});
const btec = make("btec", {
  years: "Level 2 or Level 3",
  level: "Level 2–3",
  boards: ["pearson"],
  officialLinks: [
    { label: "BTEC Nationals (Level 3)", url: BTEC_NATIONALS },
    { label: "BTEC Tech Awards (Level 1/2)", url: BTEC_TECH },
  ],
});
const tlevel = make("tlevel", {
  years: "Two-year post-16 course",
  level: "Level 3",
  boards: [],
  officialLinks: [
    { label: "T Level subjects (DfE)", url: TLEVEL_SUBJECTS },
    { label: "T Level support hub (DfE)", url: TLEVEL_HUB },
  ],
});
const other = make("level23", {
  years: "Post-16 and adult",
  level: "Level 2–3",
  boards: [],
  officialLinks: [],
});

const GCSE_SCIENCE_AREAS = (x: string[]) => [
  ...x,
  "Required practicals / practical skills",
  "Maths skills in science",
];

export const COURSES: Course[] = [
  // ——— GCSE ———
  gcse({
    id: "gcse-maths",
    subject: "Mathematics",
    title: "GCSE Mathematics",
    summary:
      "Number, algebra, ratio, geometry, probability and statistics, sat at Foundation or Higher tier.",
    assessment:
      "In England, GCSE Maths is assessed by written exams at Foundation or Higher tier, with calculator and non-calculator papers. The number of papers and their length depend on the board, so check your specification.",
    commonAreas: [
      "Number",
      "Algebra",
      "Ratio, proportion and rates of change",
      "Geometry and measures",
      "Probability",
      "Statistics",
    ],
    studySequence: [
      "Secure number skills and percentages",
      "Algebraic manipulation and equations",
      "Ratio and proportion",
      "Geometry and trigonometry",
      "Probability and statistics",
      "Mixed timed papers",
    ],
    topicIds: ["gcse-maths-percentages", "gcse-maths-linear-equations"],
    register: { title: "Mathematics", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8300" },
      { board: "Pearson Edexcel", code: "1MA1" },
      { board: "OCR", code: "J560" },
      { board: "Eduqas", code: "C300QS" },
    ],
  }),
  gcse({
    id: "gcse-english-language",
    subject: "English Language",
    title: "GCSE English Language",
    summary:
      "Reading unseen fiction and non-fiction, and writing for different purposes and audiences.",
    assessment:
      "Assessed by written exams on unseen texts plus a separately reported spoken language endorsement in England. Paper structure differs by board.",
    commonAreas: [
      "Reading fiction",
      "Reading non-fiction",
      "Language and structure analysis",
      "Comparing viewpoints",
      "Descriptive and narrative writing",
      "Writing to present a viewpoint",
      "Spoken language",
    ],
    studySequence: [
      "Reading for meaning and inference",
      "Language analysis",
      "Structure analysis",
      "Evaluation and comparison",
      "Planning and crafting writing",
      "Timed papers",
    ],
    topicIds: ["gcse-englang-language-analysis"],
    register: {
      title: "English Language",
      qualificationTypes: "GCSE (9 to 1)",
    },
    specCodes: [
      { board: "AQA", code: "8700" },
      { board: "Pearson Edexcel", code: "1EN0" },
      { board: "OCR", code: "J351" },
      { board: "Eduqas", code: "C700QS" },
    ],
  }),
  gcse({
    id: "gcse-english-literature",
    subject: "English Literature",
    title: "GCSE English Literature",
    summary:
      "Shakespeare, a 19th-century novel, modern texts and poetry. The set texts depend on your school.",
    assessment:
      "Closed-book written exams in England. Your school chooses the set texts from the options the board allows, so revise the texts you have actually studied.",
    commonAreas: [
      "Shakespeare play",
      "19th-century novel",
      "Modern prose or drama",
      "Poetry anthology",
      "Unseen poetry",
    ],
    studySequence: [
      "Plot and character knowledge",
      "Key quotations",
      "Themes and context",
      "Analysing methods",
      "Essay planning",
      "Timed essays",
    ],
    topicIds: ["gcse-englit-essay-writing"],
    register: {
      title: "English Literature",
      qualificationTypes: "GCSE (9 to 1)",
    },
    specCodes: [
      { board: "AQA", code: "8702" },
      { board: "Pearson Edexcel", code: "1ET0" },
      { board: "OCR", code: "J352" },
      { board: "Eduqas", code: "C720QS" },
    ],
  }),
  gcse({
    id: "gcse-biology",
    subject: "Biology",
    title: "GCSE Biology",
    summary:
      "Cells, organisation, infection, bioenergetics, homeostasis, inheritance and ecology.",
    assessment:
      "Written exams, usually at Foundation or Higher tier, including questions on required practical work.",
    commonAreas: GCSE_SCIENCE_AREAS([
      "Cell biology",
      "Organisation",
      "Infection and response",
      "Bioenergetics",
      "Homeostasis and response",
      "Inheritance, variation and evolution",
      "Ecology",
    ]),
    studySequence: [
      "Cells and microscopy",
      "Transport and organisation",
      "Disease and immunity",
      "Photosynthesis and respiration",
      "Homeostasis",
      "Genetics and evolution",
      "Ecology",
    ],
    topicIds: ["gcse-bio-cells", "gcse-bio-enzymes"],
    register: { title: "Biology", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8461" },
      { board: "Pearson Edexcel", code: "1BI0" },
      { board: "OCR", code: "J247 (Gateway A)" },
    ],
  }),
  gcse({
    id: "gcse-chemistry",
    subject: "Chemistry",
    title: "GCSE Chemistry",
    summary:
      "Atomic structure, bonding, quantitative chemistry, reactions, rates, organic and atmospheric chemistry.",
    assessment:
      "Written exams, usually tiered, with questions on required practicals and calculations.",
    commonAreas: GCSE_SCIENCE_AREAS([
      "Atomic structure and the periodic table",
      "Bonding and structure",
      "Quantitative chemistry",
      "Chemical and energy changes",
      "Rates and equilibrium",
      "Organic chemistry",
      "Chemical analysis",
      "Earth's atmosphere and resources",
    ]),
    studySequence: [
      "Atoms and the periodic table",
      "Bonding",
      "Moles and calculations",
      "Reactions and electrolysis",
      "Energy and rates",
      "Organic chemistry",
      "Analysis and the atmosphere",
    ],
    topicIds: ["gcse-chem-atomic-structure", "gcse-chem-bonding"],
    register: { title: "Chemistry", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8462" },
      { board: "Pearson Edexcel", code: "1CH0" },
      { board: "OCR", code: "J248" },
    ],
  }),
  gcse({
    id: "gcse-physics",
    subject: "Physics",
    title: "GCSE Physics",
    summary:
      "Energy, electricity, particles, atomic structure, forces, waves, magnetism and space.",
    assessment:
      "Written exams, usually tiered, including equations you need to recall or apply and required practicals.",
    commonAreas: GCSE_SCIENCE_AREAS([
      "Energy",
      "Electricity",
      "Particle model of matter",
      "Atomic structure",
      "Forces",
      "Waves",
      "Magnetism and electromagnetism",
      "Space physics (separate science)",
    ]),
    studySequence: [
      "Energy stores and transfers",
      "Electric circuits",
      "Particles and density",
      "Radioactivity",
      "Forces and motion",
      "Waves",
      "Electromagnetism",
    ],
    topicIds: ["gcse-phys-energy", "gcse-phys-forces"],
    register: { title: "Physics", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8463" },
      { board: "Pearson Edexcel", code: "1PH0" },
      { board: "OCR", code: "J249" },
    ],
  }),
  gcse({
    id: "gcse-combined-science",
    subject: "Combined Science",
    title: "GCSE Combined Science",
    summary:
      "Biology, chemistry and physics studied together, worth two GCSEs.",
    assessment:
      "A double award. Written exams across all three sciences, usually tiered. Boards offer different combined science routes (for example Trilogy, Synergy or Twenty First Century), so check which one you take.",
    commonAreas: [
      "Biology topics",
      "Chemistry topics",
      "Physics topics",
      "Required practicals",
      "Maths skills in science",
    ],
    studySequence: [
      "Cells, atoms and energy first",
      "Organisation, bonding and electricity",
      "Mixed-science retrieval each week",
      "Practical skills",
      "Timed papers per science",
    ],
    topicIds: [
      "gcse-bio-cells",
      "gcse-chem-atomic-structure",
      "gcse-phys-energy",
    ],
    register: {
      title: "Combined Science",
      qualificationTypes: "GCSE (9 to 1)",
    },
    specCodes: [
      { board: "AQA", code: "8464 (Trilogy)" },
      { board: "AQA", code: "8465 (Synergy)" },
      { board: "Pearson Edexcel", code: "1SC0" },
      { board: "OCR", code: "J250" },
    ],
  }),
  gcse({
    id: "gcse-history",
    subject: "History",
    title: "GCSE History",
    summary:
      "A mix of period, depth, thematic and historic-environment studies chosen by your school.",
    assessment:
      "Written exams. The periods and topics vary a lot between boards and schools, so use your school's chosen options as your checklist.",
    commonAreas: [
      "Thematic study",
      "Period study",
      "Depth study",
      "Historic environment",
      "Source analysis",
      "Interpretations",
    ],
    studySequence: [
      "Build a timeline for each option",
      "Key events, people and causes",
      "Source and interpretation skills",
      "Practise extended answers",
      "Timed papers",
    ],
    topicIds: ["gcse-history-sources"],
    register: { title: "History", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8145" },
      { board: "Pearson Edexcel", code: "1HI0" },
      { board: "OCR", code: "J410" },
      { board: "Eduqas", code: "C100QS" },
    ],
  }),
  gcse({
    id: "gcse-geography",
    subject: "Geography",
    title: "GCSE Geography",
    summary: "Physical and human geography, case studies and fieldwork.",
    assessment:
      "Written exams including questions on fieldwork you completed and on geographical skills.",
    commonAreas: [
      "Natural hazards",
      "Ecosystems",
      "Physical landscapes",
      "Urban issues",
      "Economic development",
      "Resource management",
      "Fieldwork and skills",
    ],
    studySequence: [
      "Hazards and ecosystems",
      "Landscapes",
      "Urban and economic geography",
      "Resources",
      "Case studies",
      "Skills and fieldwork",
    ],
    topicIds: ["gcse-geog-tectonics"],
    register: { title: "Geography", qualificationTypes: "GCSE (9 to 1)" },
    specCodes: [
      { board: "AQA", code: "8035" },
      { board: "Pearson Edexcel", code: "1GA0" },
      { board: "Pearson Edexcel", code: "1GB0" },
      { board: "OCR", code: "J383" },
      { board: "OCR", code: "J384" },
      { board: "Eduqas", code: "C111QS" },
      { board: "Eduqas", code: "C112QS" },
    ],
  }),
  gcse({
    id: "gcse-computer-science",
    subject: "Computer Science",
    title: "GCSE Computer Science",
    summary:
      "Algorithms, programming, data representation, computer systems, networks and cyber security.",
    assessment:
      "Written exams, which may include on-screen or written programming tasks depending on the board. Your programming language is chosen by your school.",
    commonAreas: [
      "Algorithms",
      "Programming",
      "Data representation",
      "Computer systems",
      "Networks",
      "Cyber security",
      "Impacts of technology",
    ],
    studySequence: [
      "Data representation",
      "Algorithms and flowcharts",
      "Programming practice",
      "Hardware and software",
      "Networks and security",
      "Exam-style code tracing",
    ],
    topicIds: ["gcse-cs-binary"],
    register: {
      title: "Computer Science",
      qualificationTypes: "GCSE (9 to 1)",
    },
    specCodes: [
      { board: "AQA", code: "8525" },
      { board: "Pearson Edexcel", code: "1CP2" },
      { board: "OCR", code: "J277" },
      { board: "Eduqas", code: "C500QS" },
    ],
  }),

  // ——— A level ———
  alevel({
    id: "alevel-maths",
    subject: "Mathematics",
    title: "A level Mathematics",
    summary: "Pure mathematics, statistics and mechanics.",
    assessment:
      "In England, assessed by written exams at the end of the course, covering pure, statistics and mechanics.",
    commonAreas: [
      "Proof",
      "Algebra and functions",
      "Coordinate geometry",
      "Sequences and series",
      "Trigonometry",
      "Exponentials and logarithms",
      "Differentiation",
      "Integration",
      "Vectors",
      "Statistics",
      "Mechanics",
    ],
    studySequence: [
      "Algebra and functions",
      "Coordinate geometry",
      "Differentiation",
      "Integration",
      "Trig and logs",
      "Statistics and mechanics",
      "Mixed past papers",
    ],
    topicIds: ["alevel-maths-differentiation"],
    register: { title: "Mathematics", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7357" },
      { board: "Pearson Edexcel", code: "9MA0" },
      { board: "OCR", code: "H240" },
    ],
  }),
  alevel({
    id: "alevel-further-maths",
    subject: "Further Mathematics",
    title: "A level Further Mathematics",
    summary:
      "Complex numbers, matrices, further calculus and optional applied modules.",
    assessment:
      "Written exams. Optional modules differ considerably between boards and schools.",
    commonAreas: [
      "Complex numbers",
      "Matrices",
      "Further algebra and functions",
      "Further calculus",
      "Polar coordinates",
      "Hyperbolic functions",
      "Differential equations",
      "Optional applied modules",
    ],
    studySequence: [
      "Complex numbers",
      "Matrices",
      "Proof by induction",
      "Further calculus",
      "Differential equations",
      "Option modules",
    ],
    topicIds: [],
    register: {
      title: "Further Mathematics",
      qualificationTypes: "GCE A Level",
    },
    specCodes: [
      { board: "AQA", code: "7367" },
      { board: "Pearson Edexcel", code: "9FM0" },
      { board: "OCR", code: "H245" },
    ],
  }),
  alevel({
    id: "alevel-biology",
    subject: "Biology",
    title: "A level Biology",
    summary:
      "Biological molecules, cells, exchange, genetics, energy transfers, control systems and ecosystems.",
    assessment:
      "Written exams plus a separately reported practical endorsement in England.",
    commonAreas: [
      "Biological molecules",
      "Cells",
      "Exchange and transport",
      "Genetic information and variation",
      "Energy transfers",
      "Responses and control",
      "Genetics, populations and ecosystems",
      "Practical skills",
    ],
    studySequence: [
      "Molecules and cells",
      "Cell division and immunity",
      "Exchange and transport",
      "Genetics",
      "Photosynthesis and respiration",
      "Control systems",
      "Ecology",
      "Synoptic essays",
    ],
    topicIds: ["alevel-bio-cell-division"],
    register: { title: "Biology", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7402" },
      { board: "Pearson Edexcel", code: "9BN0 (A)" },
      { board: "Pearson Edexcel", code: "9BI0 (B)" },
      { board: "OCR", code: "H420" },
      { board: "Eduqas", code: "A400QS" },
    ],
  }),
  alevel({
    id: "alevel-chemistry",
    subject: "Chemistry",
    title: "A level Chemistry",
    summary: "Physical, inorganic and organic chemistry with practical skills.",
    assessment:
      "Written exams plus a separately reported practical endorsement in England.",
    commonAreas: [
      "Atomic structure",
      "Amount of substance",
      "Bonding",
      "Energetics",
      "Kinetics",
      "Equilibria",
      "Redox",
      "Periodicity and inorganic chemistry",
      "Organic chemistry",
      "Analysis",
    ],
    studySequence: [
      "Atomic structure and moles",
      "Bonding",
      "Energetics and kinetics",
      "Equilibria",
      "Inorganic chemistry",
      "Organic mechanisms",
      "Spectroscopy",
    ],
    topicIds: ["alevel-chem-equilibria"],
    register: { title: "Chemistry", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7405" },
      { board: "Pearson Edexcel", code: "9CH0" },
      { board: "OCR", code: "H432" },
      { board: "Eduqas", code: "A410QS" },
    ],
  }),
  alevel({
    id: "alevel-physics",
    subject: "Physics",
    title: "A level Physics",
    summary:
      "Mechanics, materials, waves, electricity, fields, thermal and nuclear physics.",
    assessment:
      "Written exams plus a separately reported practical endorsement in England.",
    commonAreas: [
      "Measurements and errors",
      "Particles and radiation",
      "Waves",
      "Mechanics and materials",
      "Electricity",
      "Further mechanics",
      "Thermal physics",
      "Fields",
      "Nuclear physics",
      "Option topic",
    ],
    studySequence: [
      "Measurement and uncertainty",
      "Mechanics",
      "Materials",
      "Waves",
      "Electricity",
      "Circular motion and oscillations",
      "Fields",
      "Thermal and nuclear",
    ],
    topicIds: [],
    register: { title: "Physics", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7408" },
      { board: "Pearson Edexcel", code: "9PH0" },
      { board: "OCR", code: "H556" },
      { board: "Eduqas", code: "A420QS" },
    ],
  }),
  alevel({
    id: "alevel-psychology",
    subject: "Psychology",
    title: "A level Psychology",
    summary:
      "Approaches, research methods, biopsychology, memory, attachment, psychopathology and options.",
    assessment:
      "Written exams with short-answer, research-methods and extended-writing questions.",
    commonAreas: [
      "Social influence",
      "Memory",
      "Attachment",
      "Psychopathology",
      "Approaches",
      "Biopsychology",
      "Research methods",
      "Issues and debates",
      "Option topics",
    ],
    studySequence: [
      "Research methods throughout",
      "Approaches",
      "Memory and attachment",
      "Social influence",
      "Psychopathology",
      "Biopsychology",
      "Options",
      "Essay practice",
    ],
    topicIds: ["alevel-psych-research-methods"],
    register: { title: "Psychology", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7182" },
      { board: "Pearson Edexcel", code: "9PS0" },
      { board: "OCR", code: "H567" },
      { board: "Eduqas", code: "A290QS" },
    ],
  }),
  alevel({
    id: "alevel-english-literature",
    subject: "English Literature",
    title: "A level English Literature",
    summary:
      "Prose, poetry and drama across periods, often with a non-exam assessment.",
    assessment:
      "Written exams and, with most boards, a coursework (non-exam assessment) essay.",
    commonAreas: [
      "Drama including Shakespeare",
      "Prose",
      "Poetry",
      "Critical perspectives",
      "Context",
      "Non-exam assessment",
    ],
    studySequence: [
      "Close reading",
      "Context and critics",
      "Comparative essays",
      "Coursework drafting",
      "Timed essays",
    ],
    topicIds: [],
    register: {
      title: "English Literature",
      qualificationTypes: "GCE A Level",
    },
    specCodes: [
      { board: "AQA", code: "7712 (A)" },
      { board: "AQA", code: "7717 (B)" },
      { board: "Pearson Edexcel", code: "9ET0" },
      { board: "OCR", code: "H472" },
      { board: "Eduqas", code: "A720QS" },
    ],
  }),
  alevel({
    id: "alevel-history",
    subject: "History",
    title: "A level History",
    summary:
      "Breadth and depth studies plus an independent historical investigation.",
    assessment:
      "Written exams and a non-exam assessment (independent investigation) in England.",
    commonAreas: [
      "Breadth study",
      "Depth study",
      "Historical interpretations",
      "Source analysis",
      "Independent investigation",
    ],
    studySequence: [
      "Chronology",
      "Causation and change",
      "Interpretations",
      "Sources",
      "Coursework",
      "Timed essays",
    ],
    topicIds: [],
    register: { title: "History", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7042" },
      { board: "Pearson Edexcel", code: "9HI0" },
      { board: "OCR", code: "H505" },
    ],
  }),
  alevel({
    id: "alevel-economics",
    subject: "Economics",
    title: "A level Economics",
    summary:
      "Microeconomics and macroeconomics, with data response and essays.",
    assessment:
      "Written exams with multiple-choice, data response and essay questions.",
    commonAreas: [
      "Economic methodology",
      "Markets and market failure",
      "Business economics",
      "Labour markets",
      "Macroeconomic performance",
      "Policy",
      "Financial markets",
      "International economics",
    ],
    studySequence: [
      "Supply and demand",
      "Elasticity",
      "Market failure",
      "Market structures",
      "Macro objectives",
      "Policy",
      "Global economy",
      "Essay technique",
    ],
    topicIds: ["alevel-econ-supply-demand"],
    register: { title: "Economics", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7136" },
      { board: "Pearson Edexcel", code: "9EC0 (A)" },
      { board: "Pearson Edexcel", code: "9EB0 (B)" },
      { board: "OCR", code: "H460" },
      { board: "Eduqas", code: "A520QS" },
    ],
  }),
  alevel({
    id: "alevel-computer-science",
    subject: "Computer Science",
    title: "A level Computer Science",
    summary:
      "Programming, algorithms, data structures, theory of computation and a programming project.",
    assessment:
      "Written/on-screen exams plus a programming project (non-exam assessment).",
    commonAreas: [
      "Programming",
      "Data structures",
      "Algorithms",
      "Theory of computation",
      "Data representation",
      "Computer systems",
      "Networking",
      "Databases",
      "Programming project",
    ],
    studySequence: [
      "Programming fundamentals",
      "Data structures",
      "Algorithms",
      "Theory",
      "Systems and networks",
      "Project",
    ],
    topicIds: ["gcse-cs-binary"],
    register: { title: "Computer Science", qualificationTypes: "GCE A Level" },
    specCodes: [
      { board: "AQA", code: "7517" },
      { board: "OCR", code: "H446" },
      { board: "Eduqas", code: "A500QS" },
    ],
  }),

  // ——— BTEC ———
  btec({
    id: "btec-applied-science",
    subject: "Applied Science",
    title: "BTEC Applied Science",
    group: "Science",
    summary: "Practical science for laboratory, health and scientific careers.",
    assessment:
      "A mix of internally assessed assignments and externally assessed units (exams or set tasks). The unit list and assessment depend on the qualification size and version.",
    commonAreas: [
      "Principles of science",
      "Practical scientific procedures",
      "Science investigation skills",
      "Optional specialist units",
    ],
    studySequence: [
      "Check your unit list",
      "Plan assignment evidence",
      "Practical write-ups",
      "External unit preparation",
    ],
    topicIds: [],
    register: { title: "BTEC Applied Science" },
  }),
  btec({
    id: "btec-business",
    subject: "Business",
    title: "BTEC Business",
    group: "Business",
    summary: "How businesses work, marketing, finance and customer service.",
    assessment:
      "Internal assignments plus external assessments, which may be exams or set tasks.",
    commonAreas: [
      "Exploring business",
      "Marketing",
      "Personal and business finance",
      "Managing an event",
      "Optional units",
    ],
    studySequence: [
      "Unit plan",
      "Research evidence",
      "Finance practice",
      "External task preparation",
    ],
    topicIds: ["btec-business-marketing-mix"],
    register: { title: "BTEC Business" },
  }),
  btec({
    id: "btec-health-social-care",
    subject: "Health and Social Care",
    title: "BTEC Health and Social Care",
    group: "Health and care",
    summary: "Human development, care values, health and wellbeing.",
    assessment:
      "Internal assignments plus external assessments. Placement or visits may support some units.",
    commonAreas: [
      "Human lifespan development",
      "Working in health and social care",
      "Care values",
      "Meeting individual care needs",
      "Anatomy and physiology (Level 3)",
    ],
    studySequence: [
      "Lifespan development",
      "Care values",
      "Case-study practice",
      "Assignment evidence",
      "External unit preparation",
    ],
    topicIds: ["btec-hsc-care-values"],
    register: { title: "BTEC Health and Social Care" },
  }),
  btec({
    id: "btec-it",
    subject: "Information Technology",
    title: "BTEC Information Technology",
    group: "Digital",
    summary: "IT systems, data, cyber security and digital solutions.",
    assessment:
      "Internal assignments plus external assessments, which may be on-screen tasks or exams.",
    commonAreas: [
      "Information technology systems",
      "Creating systems to manage information",
      "Using social media in business",
      "Cyber security",
      "Programming or web development options",
    ],
    studySequence: [
      "IT systems theory",
      "Database and data tasks",
      "Cyber security",
      "Project evidence",
    ],
    topicIds: ["digital-cyber-threats"],
    register: { title: "BTEC Information Technology" },
  }),
  btec({
    id: "btec-sport",
    subject: "Sport",
    title: "BTEC Sport",
    group: "Sport",
    summary: "Anatomy, fitness training, coaching and the sports industry.",
    assessment: "Internal assignments plus external assessments.",
    commonAreas: [
      "Anatomy and physiology",
      "Fitness training and programming",
      "Professional development in sport",
      "Coaching and leadership",
    ],
    studySequence: [
      "Body systems",
      "Fitness testing and training",
      "Programme design",
      "Coaching evidence",
    ],
    topicIds: [],
    register: { title: "BTEC Sport" },
  }),
  btec({
    id: "btec-engineering",
    subject: "Engineering",
    title: "BTEC Engineering",
    group: "Engineering",
    summary: "Engineering principles, design, manufacture and maintenance.",
    assessment:
      "Internal assignments plus external assessments including maths-based exams.",
    commonAreas: [
      "Engineering principles",
      "Delivery of engineering processes safely",
      "Engineering product design and manufacture",
      "Specialist options",
    ],
    studySequence: [
      "Engineering maths",
      "Mechanical and electrical principles",
      "Design process",
      "Practical evidence",
    ],
    topicIds: [],
    register: { title: "BTEC Engineering" },
  }),
  btec({
    id: "btec-creative-media",
    subject: "Creative Media",
    title: "BTEC Creative Media",
    group: "Creative",
    summary: "Media representations, production skills and industry practice.",
    assessment:
      "Internal assignments, portfolio evidence and external assessments.",
    commonAreas: [
      "Media representations",
      "Pre-production and planning",
      "Production skills",
      "Responding to a brief",
    ],
    studySequence: [
      "Analyse media products",
      "Plan productions",
      "Build a portfolio",
      "Respond to briefs",
    ],
    topicIds: [],
    register: { title: "BTEC Creative Media" },
  }),

  // ——— T Levels ———
  tlevel({
    id: "tlevel-digital-production",
    subject: "Digital Software Development",
    title: "T Level in Digital Software Development",
    group: "Digital and IT",
    boards: ["pearson"],
    boardFixed: true,
    summary:
      "Software design and development, with an occupational specialism in digital production.",
    assessment:
      "Core component (exams plus an employer-set project), an occupational specialism assessment and an industry placement of at least 315 hours (about 45 days).",
    commonAreas: [
      "Core knowledge: business context, data, digital environments, legislation, security",
      "Employer-set project",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Employer-set project practice",
      "Specialism skills",
      "Placement reflection",
    ],
    topicIds: ["digital-cyber-threats"],
    register: { title: "Digital Production, Design and Development" },
    statusNote: "Previously Digital Production, Design and Development.",
  }),
  tlevel({
    id: "tlevel-digital-support",
    subject: "Digital Support and Security",
    title: "T Level in Digital Support and Security",
    group: "Digital and IT",
    boards: ["pearson"],
    boardFixed: true,
    summary: "Supporting digital infrastructure, networks, security and users.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Core digital knowledge",
      "Employer-set project",
      "Occupational specialism (for example network cabling, cyber security or digital support)",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Security and networks",
      "Specialism practice",
      "Placement",
    ],
    topicIds: ["digital-cyber-threats"],
    register: { title: "Digital Support Services" },
    statusNote: "Previously Digital Support Services.",
  }),
  tlevel({
    id: "tlevel-health",
    subject: "Health",
    title: "T Level in Health",
    group: "Health and science",
    boards: ["pearson", "ncfe"],
    boardFixed: true,
    summary:
      "Healthcare knowledge with occupational specialisms such as supporting the adult nursing team.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Core health knowledge",
      "Infection prevention and control",
      "Person-centred care",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Care practice",
      "Specialism skills",
      "Placement reflection",
    ],
    topicIds: ["tlevel-health-infection-control"],
    register: {
      title: "Health",
      qualificationTypes: "Technical Qualification",
    },
    statusNote:
      "From September 2026 new students take the Pearson T Level in Health (610/7438/X). Students who started earlier stay on NCFE.",
  }),
  tlevel({
    id: "tlevel-healthcare-science",
    subject: "Healthcare Science",
    title: "T Level in Healthcare Science",
    group: "Health and science",
    boards: ["ncfe"],
    boardFixed: true,
    summary: "Scientific and technical work that supports patient care.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Core health and science knowledge",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Scientific skills",
      "Specialism",
      "Placement",
    ],
    topicIds: ["tlevel-health-infection-control"],
    register: { title: "Healthcare Science" },
    statusNote: "No new starts after September 2025.",
  }),
  tlevel({
    id: "tlevel-science",
    subject: "Science",
    title: "T Level in Science",
    group: "Health and science",
    boards: ["pearson", "ncfe"],
    boardFixed: true,
    summary: "Laboratory and technical science roles.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Core science knowledge",
      "Good scientific practice",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: ["Core science", "Lab practice", "Specialism", "Placement"],
    topicIds: [],
    register: { title: "T Level Technical Qualification in Science" },
    statusNote:
      "From September 2026 new students take the Pearson T Level in Science. Students who started earlier stay on NCFE.",
  }),
  tlevel({
    id: "tlevel-education-early-years",
    subject: "Education and Early Years",
    title: "T Level in Education and Early Years",
    group: "Education and childcare",
    boards: ["ncfe"],
    boardFixed: true,
    summary:
      "Child development, education and care, with specialisms in early years or assisting teaching.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Child development",
      "Safeguarding",
      "Supporting education",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Development and play",
      "Safeguarding",
      "Specialism",
      "Placement",
    ],
    topicIds: [],
    register: { title: "Education and Early Years" },
  }),
  tlevel({
    id: "tlevel-construction-design",
    subject: "Design, Surveying and Planning for Construction",
    title: "T Level in Design, Surveying and Planning for Construction",
    group: "Construction",
    boards: ["pearson"],
    boardFixed: true,
    summary: "Construction design, surveying and planning roles.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Construction core knowledge",
      "Health and safety",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Design and surveying",
      "Specialism",
      "Placement",
    ],
    topicIds: [],
    register: { title: "Design, Surveying and Planning" },
  }),
  tlevel({
    id: "tlevel-onsite-construction",
    subject: "Onsite Construction",
    title: "T Level in Onsite Construction",
    group: "Construction",
    boards: ["cityguilds"],
    boardFixed: true,
    summary:
      "Practical construction trades such as carpentry, bricklaying and plastering.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Construction core knowledge",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Core knowledge",
      "Practical skills",
      "Specialism",
      "Placement",
    ],
    topicIds: [],
    register: { title: "Onsite Construction" },
    statusNote:
      "This T Level has been withdrawn by the Department for Education, so there are no new starts. Students already on the course should check with their college.",
  }),
  tlevel({
    id: "tlevel-accounting",
    subject: "Accounting",
    title: "T Level in Accounting",
    group: "Finance and accounting",
    boards: ["aat"],
    boardFixed: true,
    summary: "Accounting, bookkeeping and financial processes for business.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Business and finance core",
      "Accounting principles",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: ["Core knowledge", "Bookkeeping", "Specialism", "Placement"],
    topicIds: [],
    register: {
      title: "Accounting",
      qualificationTypes: "Technical Qualification",
    },
  }),
  tlevel({
    id: "tlevel-legal-services",
    subject: "Legal Services",
    title: "T Level in Legal Services",
    group: "Legal, finance and accounting",
    boards: ["cilex"],
    boardFixed: true,
    summary: "Legal systems, services and practice.",
    assessment:
      "Core exams and employer-set project, occupational specialism assessment and an industry placement.",
    commonAreas: [
      "Legal core knowledge",
      "Occupational specialism",
      "Industry placement",
    ],
    studySequence: [
      "Legal system",
      "Legal practice skills",
      "Specialism",
      "Placement",
    ],
    topicIds: [],
    register: { title: "Legal Services" },
  }),

  // ——— Level 2 & 3 ———
  other({
    id: "cambridge-technicals",
    subject: "Cambridge Technicals",
    title: "OCR Cambridge Technicals",
    group: "Vocational",
    boards: ["ocr"],
    level: "Level 2–3",
    summary:
      "Vocational qualifications in areas such as IT, business, health and science.",
    assessment:
      "Units assessed by exams set by OCR and centre-assessed assignments.",
    commonAreas: [
      "Mandatory units",
      "Optional units",
      "Externally assessed exams",
      "Centre-assessed assignments",
    ],
    studySequence: [
      "Check your unit list",
      "Plan assignment evidence",
      "Prepare for exam units",
    ],
    topicIds: [],
    officialLinks: [
      {
        label: "OCR Cambridge Technicals",
        url: "https://www.ocr.org.uk/qualifications/cambridge-technicals/",
      },
    ],
    register: { title: "Cambridge Technical" },
    statusNote:
      "Post-16 funding for some applied general and technical qualifications in England is being withdrawn in stages. Check with your college that your course is still offered.",
  }),
  other({
    id: "functional-skills-maths",
    subject: "Functional Skills Maths",
    title: "Functional Skills Mathematics",
    group: "Functional Skills",
    boards: ["pearson", "cityguilds", "ncfe"],
    level: "Entry Level to Level 2",
    summary:
      "Practical maths for work and everyday life, often taken alongside a college course or apprenticeship.",
    assessment:
      "Exams (on paper or on screen) set by your awarding organisation, usually with calculator and non-calculator sections.",
    commonAreas: [
      "Using numbers and the number system",
      "Using common measures, shape and space",
      "Handling information and data",
    ],
    studySequence: [
      "Number and calculation",
      "Fractions, decimals and percentages",
      "Ratio and proportion",
      "Measures and shape",
      "Data",
      "Practice papers",
    ],
    topicIds: ["gcse-maths-percentages", "fs-maths-ratio"],
    officialLinks: [
      {
        label: "Functional Skills maths subject content (GOV.UK)",
        url: "https://www.gov.uk/government/publications/functional-skills-subject-content-mathematics",
      },
    ],
    register: {
      title: "Functional Skills",
      qualificationTypes: "Functional Skills",
    },
  }),
  other({
    id: "functional-skills-english",
    subject: "Functional Skills English",
    title: "Functional Skills English",
    group: "Functional Skills",
    boards: ["pearson", "cityguilds", "ncfe"],
    level: "Entry Level to Level 2",
    summary:
      "Reading, writing, speaking and listening for work and everyday life.",
    assessment:
      "Reading and writing assessments plus speaking, listening and communicating assessed by your centre.",
    commonAreas: [
      "Reading",
      "Writing",
      "Speaking, listening and communicating",
      "Spelling, punctuation and grammar",
    ],
    studySequence: [
      "Reading for purpose",
      "Writing structure",
      "SPaG practice",
      "Speaking and listening tasks",
    ],
    topicIds: ["gcse-englang-language-analysis"],
    officialLinks: [
      {
        label: "Functional Skills English subject content (GOV.UK)",
        url: "https://www.gov.uk/government/publications/functional-skills-subject-content-english",
      },
    ],
    register: {
      title: "Functional Skills",
      qualificationTypes: "Functional Skills",
    },
  }),
  other({
    id: "core-maths",
    subject: "Core Maths",
    title: "Core Maths (Level 3)",
    group: "Academic",
    boards: ["aqa", "ocr", "pearson"],
    level: "Level 3",
    summary:
      "Applied maths for students who passed GCSE maths but are not taking A level Maths.",
    assessment:
      "Written exams, often using pre-released data or real-world contexts. Qualification titles vary by board.",
    commonAreas: [
      "Estimation and Fermi problems",
      "Personal finance",
      "Statistics and data",
      "Modelling",
      "Critical analysis of data",
    ],
    studySequence: [
      "Estimation",
      "Finance",
      "Statistics",
      "Modelling",
      "Past papers",
    ],
    topicIds: ["core-maths-estimation"],
    officialLinks: [
      {
        label: "Core maths technical guidance (GOV.UK)",
        url: "https://www.gov.uk/government/publications/core-maths-qualifications-technical-guidance",
      },
    ],
    register: { title: "Mathematical Studies" },
    statusNote:
      "Approved Core Maths qualifications: AQA Mathematical Studies (1350), OCR Core Maths A (MEI) and B (MEI), and Pearson Edexcel Mathematics in Context.",
  }),
  other({
    id: "epq",
    subject: "Extended Project",
    title: "Extended Project Qualification (EPQ)",
    group: "Academic",
    boards: ["aqa", "pearson", "ocr", "wjec"],
    level: "Level 3",
    summary:
      "An independent project: a dissertation, investigation, performance or artefact with a written report.",
    assessment:
      "Assessed on your production log, the project itself and a presentation. It is marked by your centre and moderated by the board.",
    commonAreas: [
      "Choosing a question",
      "Planning",
      "Research and referencing",
      "Developing and realising the project",
      "Reviewing and presenting",
    ],
    studySequence: [
      "Pick a focused question",
      "Project plan",
      "Research log",
      "Draft and review",
      "Presentation",
    ],
    topicIds: ["epq-planning"],
    register: { title: "Extended Project" },
    specCodes: [{ board: "AQA", code: "7993" }],
  }),
  other({
    id: "applied-general",
    subject: "Applied General",
    title: "Applied General and other Level 3 vocational qualifications",
    group: "Vocational",
    boards: ["aqa", "pearson", "ocr", "ncfe", "cityguilds"],
    level: "Level 3",
    summary:
      "Broad vocational qualifications taken alongside or instead of A levels.",
    assessment:
      "Usually a mix of exams and internally assessed coursework. Structure varies by qualification.",
    commonAreas: [
      "Mandatory units",
      "Optional units",
      "External assessment",
      "Internal assessment",
    ],
    studySequence: ["Unit list", "Evidence plan", "Exam preparation"],
    topicIds: [],
    register: { title: "Applied General" },
    statusNote:
      "Availability and funding of these qualifications is changing in England. Check the Ofqual register status and ask your college before relying on a course.",
  }),
];

export const MORE_GCSE_SUBJECTS = [
  "Religious Studies",
  "French",
  "Spanish",
  "German",
  "Business",
  "Design and Technology",
  "Art and Design",
  "Drama",
  "Music",
  "Physical Education",
  "Food Preparation and Nutrition",
  "Statistics",
  "Sociology",
  "Citizenship Studies",
];

export const courseById = (id: string) => COURSES.find((c) => c.id === id);
export const coursesByRoute = (route: RouteId) =>
  COURSES.filter((c) => c.route === route);
export const courseBoards = (c: Course): BoardId[] => c.boards;
