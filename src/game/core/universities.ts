/** Unofficial exploration district. Only organisers' pages provide admission and event details. */
export const UNIVERSITIES = [
  {
    city: "city",
    id: "ucl",
    name: "UCL",
    fullName: "University College London",
    colour: "#7153b9",
    subjects:
      "A wide range of subjects across sciences, arts, engineering and social sciences.",
    events:
      "https://www.ucl.ac.uk/prospective-students/undergraduate/events-and-open-days",
    advice:
      "Try a subject taster and speak to current students. Ask how teaching and assessment work, and what support is available.",
  },
  {
    city: "city",
    id: "imperial",
    name: "Imperial",
    fullName: "Imperial College London",
    colour: "#146a96",
    subjects: "Explore science, engineering, medicine and business pathways.",
    events: "https://www.imperial.ac.uk/study/visit/undergraduate/open-days/",
    advice:
      "Start with an undergraduate open day or campus tour. Ask about subject requirements and opportunities to try projects.",
  },
  {
    city: "city",
    id: "kcl",
    name: "King’s",
    fullName: "King’s College London",
    colour: "#c84a59",
    subjects:
      "Explore subjects including arts, law, sciences, health and social sciences.",
    events: "https://www.kcl.ac.uk/study/undergraduate/events/open-days",
    advice:
      "Choose talks for subjects you are considering. Compare the course content, placements and the different campuses.",
  },
  {
    city: "city",
    id: "lse",
    name: "LSE",
    fullName: "London School of Economics and Political Science",
    colour: "#bb5a34",
    subjects: "Explore economics, politics, law and other social sciences.",
    events:
      "https://www.lse.ac.uk/study-at-lse/meet-visit-and-discover-LSE/experience-lse/undergraduate-open-day",
    advice:
      "Use an undergraduate open day to ask about quantitative content, reading expectations and student societies.",
  },
  {
    city: "kent",
    id: "kent",
    name: "Kent",
    fullName: "University of Kent",
    colour: "#235579",
    events: "https://www.kent.ac.uk/courses/visit/open-days",
    subjects:
      "Explore sciences, humanities, arts, computing and social sciences in Canterbury and Medway.",
    advice:
      "Plan your visit: compare modules and entry requirements, ask about living costs, support and placements, and check booking and age requirements on the official calendar.",
  },
  {
    city: "nottingham",
    id: "ntu",
    name: "Nottingham Trent",
    fullName: "Nottingham Trent University",
    colour: "#b41754",
    events:
      "https://www.ntu.ac.uk/study-and-courses/open-days/undergraduate-open-days",
    subjects:
      "Explore creative arts, business, science, computing, education and vocational courses.",
    advice:
      "Plan your visit: compare modules and entry requirements, ask about living costs, support and placements, and check booking and age requirements on the official calendar.",
  },
  {
    city: "birmingham",
    id: "birmingham",
    name: "Birmingham",
    fullName: "University of Birmingham",
    colour: "#394b8c",
    events: "https://www.birmingham.ac.uk/study/visit-us",
    subjects:
      "Explore engineering, sciences, humanities, medicine, business and social sciences.",
    advice:
      "Plan your visit: compare modules and entry requirements, ask about living costs, support and placements, and check booking and age requirements on the official calendar.",
  },
  {
    city: "manchester",
    id: "manchester",
    name: "Manchester",
    fullName: "The University of Manchester",
    colour: "#67428c",
    events:
      "https://www.manchester.ac.uk/study/undergraduate/open-days-visits/",
    subjects:
      "Explore science, engineering, humanities, health and interdisciplinary courses.",
    advice:
      "Plan your visit: compare modules and entry requirements, ask about living costs, support and placements, and check booking and age requirements on the official calendar.",
  },
  {
    city: "edinburgh",
    id: "edinburgh",
    name: "Edinburgh",
    fullName: "The University of Edinburgh",
    colour: "#174b7e",
    events: "https://study.ed.ac.uk/undergraduate/open-days-events-visits",
    subjects:
      "Explore arts, humanities, sciences, engineering, medicine and social sciences.",
    advice:
      "Plan your visit: compare modules and entry requirements, ask about living costs, support and placements, and check booking and age requirements on the official calendar.",
  },
] as const;
export const universityById = (id: string) =>
  UNIVERSITIES.find((u) => u.id === id) ?? null;
export const NETWORKING_TIPS = [
  "For GCSE learners: start with a school-organised visit, a subject taster or an event explicitly open to your age group.",
  "For sixth-form students: shortlist open days and outreach events relevant to your subjects. Check eligibility and booking with the organiser.",
  "Introduce yourself with your interests and one question. You do not need to share your school, phone number or private details with strangers.",
  "Check costs, accessibility, travel and supervision with a trusted adult. Ask permission before exchanging contact details; use school-approved channels.",
];

export const universitiesInCity = (city: string) =>
  UNIVERSITIES.filter((university) => university.city === city);
