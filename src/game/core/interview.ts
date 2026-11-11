import { type Role, type Task, type Workplace, checkAnswer, jobTasks } from "./careers";
import { type Rng, createRng, pick, shuffle } from "./rng";
import { type PracticalRole } from "./roles";

/**
 * Hiring, the way it works in the UK: a job advert with a person specification,
 * an application, a sift, an invitation, then a structured panel interview at
 * the workplace, scored and followed by an offer (subject to references) or
 * feedback.
 *
 * Grounded in public guidance:
 * - Question set: National Careers Service, "Top 10 interview questions"
 *   (nationalcareers.service.gov.uk/careers-advice/top-10-interview-questions).
 * - Structure and scoring: Civil Service Success Profiles. Panel of at least two,
 *   same core questions for every candidate, behaviours scored 1–7, benchmark of
 *   4 or more in every behaviour (one 3 accepted if the rest are high).
 * - STAR answers (Situation, Task, Action, Result) for "tell us about a time…".
 * - Questions to ask the panel: Prospects, "7 good questions to ask at an interview".
 * - Job knowledge: NHS Constitution values, FSA's 14 allergens and PPDS labelling,
 *   Challenge 25, the police Code of Ethics (2024), GB domestic drivers' hours,
 *   SIA licensing, HSE COSHH and manual handling, KCSIE safeguarding, NEWS2.
 *
 * Pure and seeded: the server rebuilds the same interview from the seed and scores
 * the answers itself.
 */

// ── Competencies (what the panel scores) ─────────────────────────────────────
export const COMPETENCIES = {
  communication: "Communicating clearly",
  teamwork: "Working together",
  customer: "Customer and people focus",
  pressure: "Delivering under pressure",
  decisions: "Making effective decisions",
  values: "Values and integrity",
  knowledge: "Job knowledge",
  motivation: "Motivation for the role",
} as const;
export type Competency = keyof typeof COMPETENCIES;

/** Civil Service Success Profiles scale. */
export const SCALE = ["", "Not demonstrated", "Minimal", "Moderate", "Acceptable", "Good", "Strong", "Outstanding"] as const;

/** One way of answering: 3 strong, 2 acceptable, 1 weak, 0 poor. */
export interface Answer { text: string; marks: 0 | 1 | 2 | 3; note: string }

export interface Question {
  id: string;
  stage: "opening" | "about" | "motivation" | "behavioural" | "situational" | "technical" | "strengths" | "exercise" | "close";
  competency: Competency;
  /** Which panel member asks: 0 chair, 1 second panellist. */
  asker: 0 | 1;
  prompt: string;
  /** Pick one. */
  answers?: Answer[];
  /** Build a STAR answer in three picks. */
  star?: { situation: Answer[]; action: Answer[]; result: Answer[] };
  /** Your questions for the panel: pick up to two. */
  ask?: Answer[];
  /** A real task from the job (technical exercise). */
  task?: Task;
  /** What good looks like, shown in feedback afterwards. */
  tip: string;
}

/** How many answer slots each question takes in the flat answer list. */
export const slots = (q: Question) => (q.star ? 3 : q.ask ? 2 : 1);

export type Track = "food" | "retail" | "health" | "police" | "fire" | "drive" | "trades" | "outdoors" | "services" | "security" | "education" | "tech" | "office";

export interface JobSpec {
  /** Role id (city roles) or workplace id (company careers). */
  key: string;
  kind: "role" | "company";
  title: string;
  employer: string;
  track: Track;
  pay: string;
  hours: string;
  place: string;
  duties: string[];
  /** Company careers add a short technical exercise from the job itself. */
  role?: Role;
}

export interface Panellist { name: string; title: string; look: number }

export interface Interview {
  job: JobSpec;
  panel: [Panellist, Panellist];
  receptionist: string;
  questions: Question[];
  /** Behaviours on the advert, scored at interview. */
  assessed: Competency[];
  length: string;
}

// ── Job adverts and person specifications ────────────────────────────────────
interface TrackInfo {
  essential: string[];
  desirable: string[];
  values: string;
  behaviours: [Competency, Competency];
  manager: string;
  /** A reasonable shift pattern for the job. */
  hours: string;
}

const TRACKS: Record<Track, TrackInfo> = {
  food: {
    essential: ["Friendly, clear communication with customers", "Follows food hygiene and allergen procedures", "Works quickly and calmly in a busy kitchen or floor"],
    desirable: ["Level 2 Food Hygiene certificate", "Hospitality experience"], values: "Every guest leaves happy and every dish is safe to eat.",
    behaviours: ["teamwork", "pressure"], manager: "Restaurant Manager", hours: "Part-time, evenings and weekends",
  },
  retail: {
    essential: ["Good customer service", "Accurate with money and stock", "Applies Challenge 25 when selling age-restricted products"],
    desirable: ["Retail or warehouse experience", "Comfortable using a handheld scanner"], values: "Helpful, honest and quick at the till and on the shop floor.",
    behaviours: ["customer", "teamwork"], manager: "Store Manager", hours: "Flexible shifts including weekends",
  },
  health: {
    essential: ["Commitment to the NHS values", "Compassionate, clear communication with patients", "Knows when and how to escalate a concern"],
    desirable: ["Care Certificate", "Experience in a care setting"], values: "Working together for patients, respect and dignity, commitment to quality of care, compassion, improving lives, everyone counts.",
    behaviours: ["values", "pressure"], manager: "Ward Manager", hours: "Shifts across days, nights and weekends",
  },
  police: {
    essential: ["Acts with courage, respect and empathy, and in the public interest", "Clear, calm communication", "Accurate notes and reports"],
    desirable: ["Experience of working with the public", "Full driving licence"], values: "The Code of Ethics: courage, respect and empathy, public service.",
    behaviours: ["values", "decisions"], manager: "Police Sergeant", hours: "Rotating shifts",
  },
  fire: {
    essential: ["Works safely as part of a crew", "Stays calm and follows procedures under pressure", "Physically fit and willing to train"],
    desirable: ["First aid certificate", "Community or volunteering experience"], values: "Keeping the community safe, together.",
    behaviours: ["teamwork", "pressure"], manager: "Station Manager", hours: "Watch pattern: two days, two nights, four off",
  },
  drive: {
    essential: ["Full driving licence for the vehicle", "Safe, legal driving including drivers' hours and breaks", "Polite with passengers and customers"],
    desirable: ["Knowledge of London roads", "Customer-facing experience"], values: "Safe journeys, on time, every time.",
    behaviours: ["customer", "decisions"], manager: "Operations Manager", hours: "Early, late and weekend shifts",
  },
  trades: {
    essential: ["Works safely and wears the right PPE", "Takes pride in careful, accurate work", "Reliable time-keeping"],
    desirable: ["CSCS card or trade qualification", "Experience with hand and power tools"], values: "Do it right, do it safe, leave it tidy.",
    behaviours: ["decisions", "teamwork"], manager: "Site Supervisor", hours: "Full-time, Monday to Friday",
  },
  outdoors: {
    essential: ["Works safely outdoors in all weather", "Looks after tools and equipment", "Works independently and with a team"],
    desirable: ["Experience growing, fishing or selling at a market", "Basic first aid"], values: "Respect for the land, the river and the people who rely on them.",
    behaviours: ["decisions", "pressure"], manager: "Team Leader", hours: "Seasonal, early starts",
  },
  services: {
    essential: ["Friendly with clients and the public", "Follows hygiene and chemical safety rules", "Thorough and reliable"],
    desirable: ["Experience in a client-facing service", "Relevant qualification"], values: "High standards, every client, every time.",
    behaviours: ["customer", "decisions"], manager: "Service Manager", hours: "Part-time or full-time shifts",
  },
  security: {
    essential: ["Holds or is willing to gain an SIA licence", "Calm, polite and observant", "Accurate incident logs"],
    desirable: ["Customer service experience", "First aid certificate"], values: "Keep people safe, calmly and fairly.",
    behaviours: ["decisions", "customer"], manager: "Security Manager", hours: "Days and nights on a rota",
  },
  education: {
    essential: ["Puts safeguarding first", "Explains ideas clearly to young people", "Plans and marks work accurately"],
    desirable: ["Teaching or tutoring experience", "Subject degree or qualification"], values: "Every learner safe, supported and stretched.",
    behaviours: ["communication", "values"], manager: "Head of Department", hours: "Full-time, school terms",
  },
  tech: {
    essential: ["Solves problems logically and tests the fix", "Explains technical issues in plain English", "Handles data securely under UK GDPR"],
    desirable: ["Coding or IT support experience", "A portfolio or GitHub"], values: "Build things that work for people, and keep their data safe.",
    behaviours: ["decisions", "teamwork"], manager: "Engineering Manager", hours: "Full-time, hybrid",
  },
  office: {
    essential: ["Accurate, professional written communication", "Organised and meets deadlines", "Handles personal data confidentially"],
    desirable: ["Office or customer-facing experience", "Confident with spreadsheets"], values: "Clear, careful work that clients can trust.",
    behaviours: ["communication", "decisions"], manager: "Team Manager", hours: "Full-time, office-based",
  },
};

const ROLE_TRACK: Record<string, Track> = {
  "pizza-chef": "food", waiter: "food", cashier: "retail", stocker: "retail", warehouse: "retail",
  doctor: "health", nurse: "health", police: "police", firefighter: "fire",
  "delivery-driver": "drive", "bus-driver": "drive", "taxi-driver": "drive",
  mechanic: "trades", builder: "trades", gardener: "outdoors", fisher: "outdoors",
  cleaner: "services", barber: "services", security: "security", teacher: "education",
};
const COMPANY_TRACK: Record<string, Track> = {
  pizzazz: "food", tescow: "retail", "st-plasters": "health", goggle: "tech", macrosoft: "tech",
  barklays: "office", lawz: "office", netflics: "office",
};

export const trackInfo = (t: Track) => TRACKS[t];

/** Who you'd actually work for in each city role. */
const ROLE_EMPLOYER: Record<string, string> = {
  "pizza-chef": "Pizzazz Pizza", waiter: "Pizzazz Pizza", cashier: "Tescow Express", stocker: "Tescow Express", warehouse: "Tescow Distribution Centre",
  doctor: "St Tomas' Hospital", nurse: "St Tomas' Hospital", police: "London Police Service", firefighter: "London Fire Service",
  "delivery-driver": "Parcel Pals", "bus-driver": "London Buses", "taxi-driver": "City Cabs", mechanic: "Motor Mile Garage",
  builder: "Bodge & Sons Builders", gardener: "City Parks Team", fisher: "Thames Fish Market", cleaner: "Sparkle Cleaning Co.",
  barber: "Fresh Fade Salon", security: "Shield Security", teacher: "Study Quarter Academy",
};

export function roleSpec(role: PracticalRole): JobSpec {
  const track = ROLE_TRACK[role.id] ?? "services";
  return {
    key: role.id, kind: "role", title: role.title, employer: ROLE_EMPLOYER[role.id] ?? role.place.label, track,
    pay: `${role.pay[0]}–${role.pay[1]} Clout per job`, hours: TRACKS[track].hours, place: role.place.label,
    duties: role.steps.map((s) => s.label),
  };
}

export function companySpec(workplace: Workplace, role: Role = workplace.roles[0]): JobSpec {
  const track = COMPANY_TRACK[workplace.id] ?? "office";
  return {
    key: workplace.id, kind: "company", title: role.title, employer: workplace.name, track,
    pay: `${role.pay} Clout per shift`, hours: TRACKS[track].hours, place: `${workplace.name} reception`,
    duties: [role.summary], role,
  };
}

// ── Question bank ────────────────────────────────────────────────────────────
const A = (text: string, marks: Answer["marks"], note: string): Answer => ({ text, marks, note });

const OPENING: Answer[] = [
  A("Smile, shake hands, \"Thanks for having me, it's good to meet you.\"", 3, "A warm, confident greeting sets a positive first impression."),
  A("\"Hi.\" Sit down and look at your phone while they get ready.", 1, "Put your phone away: the interview starts the moment you arrive."),
  A("\"Sorry I'm a bit late, the bus was slow.\"", 0, "Plan your journey to arrive 10 minutes early."),
  A("\"Hello, nice to meet you. Where would you like me to sit?\"", 2, "Polite and fine, though a little more warmth and thanks helps."),
];

const ABOUT: Answer[] = [
  A("A short summary: what I'm studying or doing now, one or two things I've achieved that fit this job, and why I'm applying.", 3, "Present, past, future in under two minutes, all linked to the job."),
  A("My life story from primary school onwards.", 1, "Keep it brief and relevant to the role."),
  A("\"It's all on my CV.\"", 0, "They've read your CV: this is your chance to sell it in your own words."),
  A("My hobbies and what I like doing at weekends.", 1, "Hobbies help only when you link them to qualities the job needs."),
];

const why = (j: JobSpec): Answer[] => [
  A(`I've read about ${j.employer} and what you stand for, and I want to ${j.duties[0]?.toLowerCase() ?? "do this work"} well. It fits the skills I'm building and I'd like to grow here.`, 3, "Show you've researched the employer and linked the role to your goals."),
  A("I need a job and this one was close to home.", 0, "Honest, but it says nothing about why this role or employer."),
  A("I'm interested in the role and I think I'd be good at it.", 2, "Fine, but name something specific about the employer or the work."),
  A("My friend works here and says the pay is good.", 1, "Focus on the work and what you'll bring, not just the pay."),
];

const STRENGTHS: Answer[] = [
  A("Two strengths that match the advert, each with a quick example and how it would help here.", 3, "Pick 2 or 3 strengths relevant to the job and back each with evidence."),
  A("\"I'm a perfectionist and I work too hard.\"", 1, "Clichés don't convince a panel: be specific and give evidence."),
  A("\"I'm good at everything really.\"", 0, "Be specific and back it up."),
  A("\"I'm reliable.\" (no example)", 2, "A fair strength: add an example to prove it."),
];
const WEAKNESSES: Answer[] = [
  A("A real weakness, like time management, plus the steps I'm taking to improve it.", 3, "Be honest about a weakness and explain what you're doing about it."),
  A("\"I'm a perfectionist.\"", 1, "A cliché the panel has heard many times: pick a real one."),
  A("\"I don't really have any weaknesses.\"", 0, "Everyone has weaknesses: self-awareness is what the panel is testing."),
  A("\"I'm always late and I hate being told what to do.\"", 0, "Honest, but show how you're improving, and don't pick one that rules you out."),
];

const PANEL_QUESTIONS: Answer[] = [
  A("What does a typical day look like in this role?", 3, "A good question: shows you're picturing yourself doing the job."),
  A("How could I impress you in the first three months?", 3, "A strong question that shows ambition."),
  A("What training and progression are there?", 3, "Shows you want to grow with the employer."),
  A("Can you tell me more about the team I'd be working with?", 3, "Shows you care about working well with others."),
  A("How many days' holiday do I get?", 1, "Save pay and holiday questions until you have an offer."),
  A("What does your company actually do?", 0, "Research this before the interview."),
];

/** "Tell us about a time…" questions, built with STAR. */
const BEHAVIOURAL: Record<Competency, { prompt: string; situation: Answer[]; action: Answer[]; result: Answer[] }> = {
  teamwork: {
    prompt: "Tell us about a time you worked as part of a team to get something done.",
    situation: [
      A("Our school group project was falling behind, two weeks before the deadline.", 3, "A specific, recent situation."),
      A("I'm usually in teams.", 1, "Too general: pick one real example."),
      A("A group chat argument about football.", 0, "Choose an example that shows work-relevant skills."),
    ],
    action: [
      A("I suggested we split the work by strengths, set up a shared checklist, and checked in daily so nobody was stuck.", 3, "Clear about what you did, using \"I\"."),
      A("We all just sort of did it.", 1, "Explain your own part, not just the group's."),
      A("I let the others do it because they were better.", 0, "The panel needs to hear what you contributed."),
    ],
    result: [
      A("We handed in on time and got our best mark of the year. I learnt to agree roles early.", 3, "A measurable result and what you learnt."),
      A("It was fine in the end.", 1, "Say what actually happened and why it mattered."),
      A("We missed the deadline but it wasn't my fault.", 0, "Own the outcome and what you'd do differently."),
    ],
  },
  customer: {
    prompt: "Tell us about a time you dealt with someone who was upset or unhappy.",
    situation: [
      A("At my weekend job a customer's order was wrong and they were angry at the counter.", 3, "A specific, relevant situation."),
      A("People get annoyed sometimes.", 1, "Too general: pick one real example."),
      A("I've never had to deal with anyone upset.", 0, "Use school, volunteering or family examples if you've not worked yet."),
    ],
    action: [
      A("I stayed calm, listened without interrupting, apologised, and fixed the order straight away, then checked they were happy.", 3, "Listen, own it, fix it, check back."),
      A("I told them it was the kitchen's fault.", 0, "Blaming others makes things worse: take ownership."),
      A("I fetched my manager.", 2, "Escalating is fine, but show what you did first."),
    ],
    result: [
      A("They calmed down, thanked me and left a good review. I learnt that listening first defuses most problems.", 3, "A clear outcome and a lesson."),
      A("They left.", 1, "Explain the outcome and what you took from it."),
      A("They shouted more, so I walked off.", 0, "Show how you resolved it or escalated it properly."),
    ],
  },
  pressure: {
    prompt: "Tell us about a time you had to work under pressure or to a tight deadline.",
    situation: [
      A("During exams I had three pieces of coursework due in the same week.", 3, "A specific, relevant situation."),
      A("I'm always busy.", 1, "Too general: choose one real example."),
      A("I don't really get stressed.", 0, "The panel wants evidence of how you cope, not a claim."),
    ],
    action: [
      A("I listed every task, worked out what each was worth and when it was due, and planned my evenings so the biggest one was done first.", 3, "Prioritised and planned, in your own words."),
      A("I stayed up all night before each deadline.", 1, "That's coping, not managing: show planning."),
      A("I asked to skip one.", 0, "Show how you met the challenge."),
    ],
    result: [
      A("I handed in all three on time with good grades, and I still use that planning method now.", 3, "A measurable result and what you kept doing."),
      A("I got through it.", 1, "Say what actually happened."),
      A("I missed two of them.", 0, "Pick an example where your actions made a difference, or explain what you learnt."),
    ],
  },
  decisions: {
    prompt: "Tell us about a time you had to make a decision with incomplete information.",
    situation: [
      A("On a trip I was helping organise, the coach broke down and we had an hour to get everyone to a venue.", 3, "A specific, relevant situation."),
      A("I make decisions every day.", 1, "Too general: pick one real example."),
      A("Choosing what to have for lunch.", 0, "Choose an example with real consequences."),
    ],
    action: [
      A("I checked what we knew, compared two options (wait or split onto buses), agreed it with the teacher, and told everyone the plan.", 3, "Gathered facts, weighed options, checked with the right person, communicated."),
      A("I picked whatever seemed fastest without asking anyone.", 1, "Show how you weighed options and involved the right people."),
      A("I waited for someone else to decide.", 0, "The panel needs to see your judgement."),
    ],
    result: [
      A("Everyone arrived ten minutes late instead of an hour, and I learnt to make a back-up plan early.", 3, "Clear outcome and lesson."),
      A("It worked out.", 1, "Explain the outcome and why your choice helped."),
      A("We never got there.", 0, "Pick an example where your decision made a difference, or explain what you learnt."),
    ],
  },
  values: {
    prompt: "Tell us about a time you did the right thing even when it was difficult.",
    situation: [
      A("I noticed a classmate being left out and picked on in a group activity.", 3, "A specific, relevant situation."),
      A("I'm a good person generally.", 1, "Give evidence, not a claim."),
      A("I can't think of one.", 0, "Prepare examples from school, home or volunteering."),
    ],
    action: [
      A("I included them in my group, spoke to the person leading the activity privately, and checked in with them afterwards.", 3, "Acted with respect and through the right channel."),
      A("I posted about it online.", 0, "Raise concerns properly and privately."),
      A("I told them to ignore it.", 1, "Show how you took responsibility."),
    ],
    result: [
      A("The behaviour stopped and they joined in more. It taught me to speak up early and respectfully.", 3, "Clear outcome and lesson."),
      A("Not sure what happened after.", 1, "Explain the outcome."),
      A("Everyone got in trouble.", 0, "Pick an example where your actions helped."),
    ],
  },
  communication: {
    prompt: "Tell us about a time you had to explain something difficult to someone.",
    situation: [
      A("I helped my younger cousin understand fractions before a test.", 3, "A specific, relevant situation."),
      A("I explain things all the time.", 1, "Too general: pick one example."),
      A("I don't like explaining things.", 0, "Choose an example that shows the skill."),
    ],
    action: [
      A("I found out what they already knew, used pizza slices as an example, and asked them to explain it back to me.", 3, "Adapted to the listener and checked understanding."),
      A("I read the textbook to them.", 1, "Show how you adapted your explanation."),
      A("I did the homework for them.", 0, "Explaining means helping them understand."),
    ],
    result: [
      A("They got 8 out of 10 on the test, up from 4. I learnt to check understanding rather than assume it.", 3, "A measurable result and lesson."),
      A("They kind of got it.", 1, "Say what changed."),
      A("They still didn't get it.", 0, "Pick an example where your explanation worked, or what you'd change."),
    ],
  },
  knowledge: { prompt: "", situation: [], action: [], result: [] },
  motivation: { prompt: "", situation: [], action: [], result: [] },
};

/** Job knowledge, by track: real rules and practice. */
const TECHNICAL: Record<Track, { prompt: string; answers: Answer[]; tip: string }[]> = {
  food: [
    { prompt: "A customer asks whether a dish is safe for their nut allergy. What do you do?", tip: "UK food law covers 14 allergens. Never guess: check the allergen information.", answers: [
      A("Check the recipe and allergen information, and the kitchen's cross-contamination controls, then tell them accurately, or say we can't guarantee it.", 3, "Exactly right: accurate information or an honest \"we can't guarantee it\"."),
      A("Say it's probably fine; there aren't nuts on the menu.", 0, "Never guess about allergens: it can be life-threatening."),
      A("Pick the nuts off before serving.", 0, "Removing the allergen doesn't remove the risk."),
      A("Ask the chef and pass on what they say.", 2, "Good instinct, but check the written allergen records too."),
    ] },
    { prompt: "How many allergens must UK food businesses give information about?", tip: "The 14 include celery, gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, peanuts, sesame, soya, sulphites and tree nuts.", answers: [
      A("14", 3, "Correct: the FSA lists 14 allergens."), A("8", 0, "It's 14 in UK law."), A("3", 0, "It's 14 in UK law."), A("Just nuts and gluten", 0, "It's 14 in UK law."),
    ] },
    { prompt: "Sandwiches made and packed here before customers order them. What must the label show?", tip: "Since October 2021 (Natasha's Law), prepacked-for-direct-sale food needs a full ingredients list with allergens emphasised.", answers: [
      A("The name of the food and a full ingredients list with allergens emphasised.", 3, "Correct: that's the PPDS rule."), A("Just the price.", 0, "PPDS food needs full ingredients with allergens emphasised."),
      A("Nothing; staff can tell customers.", 0, "That's for loose food. PPDS needs a label."), A("Only \"may contain nuts\".", 1, "A full ingredients list is required."),
    ] },
  ],
  retail: [
    { prompt: "Someone who looks about 20 wants to buy alcohol. What do you do?", tip: "Challenge 25: ask anyone who looks under 25 for photo ID with a hologram, like a passport, photo driving licence or PASS card.", answers: [
      A("Politely ask for photo ID such as a passport, photo driving licence or PASS card, and refuse the sale if they can't show it.", 3, "Exactly Challenge 25."),
      A("Serve them; they look old enough.", 0, "Under Challenge 25 you ask anyone who looks under 25."),
      A("Ask how old they are and take their word for it.", 0, "You need valid photo ID."),
      A("Ask their friend to vouch for them.", 0, "Only valid photo ID counts."),
    ] },
    { prompt: "A customer pays £20 for £13.45 of shopping. How much change?", tip: "Count up from the price to what they gave you: £13.45 → £14 → £20.", answers: [
      A("£6.55", 3, "Correct."), A("£7.55", 0, "Count up: 55p to £14, then £6 to £20."), A("£6.45", 0, "Count up: 55p to £14, then £6 to £20."), A("£5.55", 0, "Count up: 55p to £14, then £6 to £20."),
    ] },
    { prompt: "You need to lift a heavy box of stock. What's the safe approach?", tip: "HSE manual handling: think about the Task, the Individual, the Load and the Environment, and use equipment or help when you can.", answers: [
      A("Check the load and route, use a trolley or ask for help if it's heavy, and lift with bent knees, keeping it close.", 3, "Matches HSE manual handling guidance."),
      A("Bend over and lift with my back quickly.", 0, "That's how backs get injured."),
      A("Drag it across the floor.", 1, "Better to use a trolley or get help."),
      A("Leave it for someone else.", 0, "Ask for help rather than leaving it."),
    ] },
  ],
  health: [
    { prompt: "Which of these is one of the NHS Constitution's six values?", tip: "Working together for patients; respect and dignity; commitment to quality of care; compassion; improving lives; everyone counts.", answers: [
      A("Compassion", 3, "Correct."), A("Profit", 0, "Not an NHS value."), A("Speed above all", 0, "Not an NHS value."), A("Competition", 0, "Not an NHS value."),
    ] },
    { prompt: "A patient's observations add up to a NEWS2 score of 6. What should happen?", tip: "NEWS2: an aggregate score of 5 or more is a key threshold that needs an urgent response from a clinician.", answers: [
      A("Tell the nurse in charge or doctor straight away and increase observations: it needs an urgent clinical review.", 3, "Correct escalation."),
      A("Write it down and recheck at the next routine round.", 0, "A score of 5+ needs urgent escalation."),
      A("Wait to see if it improves.", 0, "Escalate now: it may mean the patient is deteriorating."),
      A("Ask the patient if they feel OK.", 1, "Talk to them, but escalate the score too."),
    ] },
    { prompt: "A relative phones asking for a patient's test results. What do you do?", tip: "Confidentiality: only share information with people the patient has agreed to, after confirming identity.", answers: [
      A("Politely explain I can't share it unless the patient has consented and we've confirmed who they are; offer to pass a message on.", 3, "Protects confidentiality and stays helpful."),
      A("Read the results out; they're family.", 0, "Family aren't automatically entitled to medical information."),
      A("Hang up.", 0, "Be polite and offer a proper route."),
      A("Tell them to come in and look at the notes.", 0, "Patient records are confidential."),
    ] },
  ],
  police: [
    { prompt: "The police Code of Ethics (2024) is built on three principles. Which set is right?", tip: "Courage, respect and empathy, and public service.", answers: [
      A("Courage, respect and empathy, public service", 3, "Correct."), A("Speed, strength, loyalty", 0, "Not the Code of Ethics."), A("Obedience, silence, discipline", 0, "Not the Code of Ethics."), A("Winning, targets, arrests", 0, "Not the Code of Ethics."),
    ] },
    { prompt: "You see a colleague treat a member of the public unfairly. What do you do?", tip: "The Code of Ethics expects you to challenge and report behaviour that falls below standards.", answers: [
      A("Challenge it if safe and appropriate, support the member of the public, and report it to a supervisor.", 3, "Courage and integrity."),
      A("Ignore it to keep the peace in the team.", 0, "Officers must challenge and report poor behaviour."),
      A("Join in so you fit in.", 0, "Never."),
      A("Mention it next year if it happens again.", 0, "Report it now."),
    ] },
  ],
  fire: [
    { prompt: "You arrive at a building on fire and see people at a window. What's your first priority?", tip: "Follow the incident commander's plan; saving life comes first, working safely as a crew.", answers: [
      A("Report it to the incident commander and follow the crew's plan to rescue them safely.", 3, "Life first, as part of a coordinated crew."),
      A("Run in on your own straight away.", 0, "Freelancing puts you and others at risk."),
      A("Start spraying water at the window.", 1, "Tell command and follow the plan."),
      A("Wait for the fire to go out.", 0, "Saving life is the priority."),
    ] },
    { prompt: "Which fire extinguisher should never be used on an electrical fire?", tip: "Water conducts electricity: use CO₂ on electrical fires.", answers: [
      A("Water", 3, "Correct: water conducts electricity."), A("CO₂", 0, "CO₂ is the one to use on electrical fires."), A("Dry powder", 1, "Powder can be used, though CO₂ is preferred."), A("None of them", 0, "Water must not be used on electrical fires."),
    ] },
  ],
  drive: [
    { prompt: "Under GB domestic rules, a bus driver has driven for 5½ hours. What must happen?", tip: "GB domestic rules for buses: after 5 hours 30 minutes of driving, a break of at least 30 minutes.", answers: [
      A("Take a break of at least 30 minutes.", 3, "Correct."), A("Keep going until the end of the route.", 0, "The law requires a break."), A("Have a quick 5-minute stop.", 0, "It must be at least 30 minutes."), A("Swap seats and keep driving later.", 0, "Take the full break."),
    ] },
    { prompt: "Your phone rings while you're driving. What do you do?", tip: "It's illegal to hold and use a phone while driving. Let it go, or answer only hands-free and only if safe.", answers: [
      A("Ignore it until I've parked safely, or use a fitted hands-free set only if it's safe.", 3, "Correct."), A("Pick it up quickly at a red light.", 0, "Illegal, even at traffic lights."),
      A("Text back at slow speed.", 0, "Illegal and dangerous."), A("Hold it on loudspeaker in my lap.", 0, "Still holding it: illegal."),
    ] },
    { prompt: "Before your first run of the day, what should you do?", tip: "A daily walkaround check: lights, tyres, mirrors, brakes and any damage, reported before driving.", answers: [
      A("A walkaround check of lights, tyres, mirrors and damage, and report any defect before driving.", 3, "Correct."), A("Get straight in; the night shift would have said.", 0, "Check it yourself every time."),
      A("Only check the fuel.", 1, "Fuel matters, but do the full walkaround."), A("Wash the vehicle.", 0, "Safety checks first."),
    ] },
  ],
  trades: [
    { prompt: "What do you need before working on a typical UK building site?", tip: "Most sites ask for a CSCS card and the right PPE, and you'll get a site induction.", answers: [
      A("A site induction, the right PPE (hard hat, boots, hi-vis) and usually a CSCS card.", 3, "Correct."), A("Just turn up and start.", 0, "Inductions and PPE are required."),
      A("Only a hard hat.", 1, "You'll need full PPE and an induction."), A("A driving licence.", 0, "Not what lets you work on site."),
    ] },
    { prompt: "A car is raised on a jack. Can you work underneath it?", tip: "Never work under a vehicle supported only by a jack: use axle stands or a proper lift.", answers: [
      A("Only once it's on axle stands or a proper vehicle lift.", 3, "Correct."), A("Yes, if I'm quick.", 0, "Jacks can fail. Never."),
      A("Yes, if someone holds the jack.", 0, "Use axle stands or a lift."), A("Yes, if the handbrake is on.", 0, "Still unsafe."),
    ] },
  ],
  outdoors: [
    { prompt: "You're about to use a strimmer in a park. What should you check first?", tip: "Read the risk assessment, wear PPE (eye and ear protection, boots) and check the area is clear of people.", answers: [
      A("Wear eye and ear protection and boots, check the tool, and make sure nobody is nearby.", 3, "Correct."), A("Just start; it's only grass.", 0, "Flying debris causes injuries."),
      A("Only wear gloves.", 1, "Eyes and ears need protecting too."), A("Use it near the children's playground to get it done.", 0, "Clear the area first."),
    ] },
    { prompt: "You're working by the river and someone falls in. What do you do?", tip: "Call 999 and ask for the coastguard or fire service; throw something that floats. Don't jump in.", answers: [
      A("Call 999, throw a life ring or anything that floats, and keep them in sight. Don't jump in.", 3, "Correct."), A("Jump in after them.", 0, "You could become a second casualty."),
      A("Wait to see if they swim out.", 0, "Act straight away."), A("Film it.", 0, "Call for help."),
    ] },
  ],
  services: [
    { prompt: "You're cleaning with a bleach product and another cleaner. What must you never do?", tip: "COSHH: follow the label and safety data sheet, wear PPE, and never mix products: bleach and acid release toxic gas.", answers: [
      A("Mix it with another cleaning product.", 3, "Correct: mixing can release toxic gas."), A("Read the label.", 0, "Reading the label is exactly what you should do."),
      A("Wear gloves.", 0, "Gloves are good practice."), A("Open a window.", 0, "Ventilation is good practice."),
    ] },
    { prompt: "A client sits down for a haircut. What do you do before starting?", tip: "A consultation: what they want, any scalp issues or allergies, and clean, disinfected tools.", answers: [
      A("A quick consultation about the style and any skin or scalp issues, with clean, disinfected tools ready.", 3, "Correct."), A("Start cutting; they'll say if they don't like it.", 0, "Consult first."),
      A("Ask them to show a photo and copy it exactly without discussion.", 1, "Photos help, but talk it through."), A("Use the same comb as the last client.", 0, "Disinfect between clients."),
    ] },
  ],
  security: [
    { prompt: "What licence do you need to work as a contracted security guard or door supervisor in the UK?", tip: "An SIA licence. Door supervision at licensed premises always needs one.", answers: [
      A("An SIA licence", 3, "Correct."), A("A driving licence", 0, "Not for security work."), A("No licence needed", 0, "You may be breaking the law without one."), A("A first aid certificate only", 1, "Useful, but you need an SIA licence."),
    ] },
    { prompt: "Someone without a pass tries to follow staff through a secure door. What do you do?", tip: "Politely stop and check, offer to help via reception, and log it.", answers: [
      A("Politely stop them, ask how I can help, direct them to reception to be signed in, and log it.", 3, "Calm, fair and secure."), A("Let them through; they look like staff.", 0, "Check every time."),
      A("Shout at them to leave.", 0, "Stay calm and polite."), A("Ignore it; it's not my door.", 0, "Security is everyone's job, especially yours."),
    ] },
  ],
  education: [
    { prompt: "A student tells you something that makes you worried they're not safe at home. What do you do?", tip: "KCSIE: listen, don't promise secrecy, record it, and tell the designated safeguarding lead straight away.", answers: [
      A("Listen calmly, don't promise to keep it secret, write down what they said, and tell the designated safeguarding lead immediately.", 3, "Exactly right."),
      A("Promise to keep it secret so they trust me.", 0, "Never promise secrecy: you must pass it on."),
      A("Investigate it myself by calling their parents.", 0, "Pass it to the DSL; don't investigate."),
      A("Wait to see if they say more next week.", 0, "Report it the same day."),
    ] },
    { prompt: "Half the class didn't understand today's lesson. What's your next step?", tip: "Check understanding, then re-teach in a different way and give targeted practice.", answers: [
      A("Use their work to see what went wrong, re-teach it a different way next lesson, and give targeted practice.", 3, "Assessment for learning."),
      A("Move on; the test will catch it.", 0, "Fix gaps before moving on."), A("Set the same worksheet again.", 1, "Change the approach."), A("Blame the students.", 0, "Reflect on the teaching."),
    ] },
  ],
  tech: [
    { prompt: "A user says the app crashes when they upload a photo. What do you do first?", tip: "Reproduce it, read the logs or error, isolate the cause, fix, then add a test so it doesn't come back.", answers: [
      A("Reproduce it, check the error and logs, find the cause, fix it, and add a test.", 3, "A methodical debugging approach."), A("Rewrite the upload feature from scratch.", 0, "Find the cause first."),
      A("Tell them to use a smaller photo.", 1, "A workaround, not a fix."), A("Restart the server and hope.", 0, "Investigate the cause."),
    ] },
    { prompt: "A colleague asks you to email them a customer database so they can work from home. What do you do?", tip: "UK GDPR: share personal data only securely and only when needed; use the approved system, not email attachments.", answers: [
      A("Explain we can't email personal data; point them to the secure, access-controlled system.", 3, "Protects personal data."), A("Email it; they work here.", 0, "Personal data must be shared securely."),
      A("Put it on a USB stick for them.", 0, "Unencrypted copies are a data breach risk."), A("Upload it to a public link.", 0, "A serious data breach."),
    ] },
  ],
  office: [
    { prompt: "You get an email from \"the bank's CEO\" asking you to transfer money urgently. What do you do?", tip: "Classic CEO fraud: verify by phone using a known number, and report it.", answers: [
      A("Don't act on it; verify through a known phone number and report it to IT or security.", 3, "Correct fraud awareness."), A("Transfer it quickly; the CEO is senior.", 0, "Urgency and authority are classic scam tactics."),
      A("Reply to the email to check.", 1, "Replying goes to the scammer: verify another way."), A("Forward it to friends to ask.", 0, "Report it internally."),
    ] },
    { prompt: "You've two urgent pieces of work with the same deadline. What do you do?", tip: "Prioritise with your manager and communicate early.", answers: [
      A("Check with my manager which matters most, agree priorities, and update them if anything slips.", 3, "Clear prioritisation and communication."), A("Do the easiest one and hope.", 0, "Agree priorities."),
      A("Do both half-finished.", 0, "Agree priorities."), A("Say nothing and miss one.", 0, "Raise it early."),
    ] },
  ],
};

/** "What would you do if…": situational questions shared by every job. */
const SITUATIONAL: { prompt: string; competency: Competency; answers: Answer[]; tip: string }[] = [
  { prompt: "On your first day, you don't understand an instruction. What do you do?", competency: "communication", tip: "Ask early and clearly; it avoids mistakes.", answers: [
    A("Ask a clear question, note the answer, and check back once I've tried it.", 3, "Shows initiative and avoids mistakes."), A("Guess and hope nobody notices.", 0, "Ask."),
    A("Wait until someone asks why it isn't done.", 0, "Ask straight away."), A("Watch a colleague and copy them.", 1, "Fine, but check with someone too."),
  ] },
  { prompt: "A colleague keeps arriving late and you're covering their work. What do you do?", competency: "teamwork", tip: "Talk to them first privately; raise it with the manager if it continues.", answers: [
    A("Have a friendly word with them privately, and if it carries on, raise it with the manager.", 3, "Fair and constructive."), A("Complain about them to everyone else.", 0, "Talk to them, not about them."),
    A("Start arriving late too.", 0, "Keep your own standards."), A("Say nothing and get resentful.", 1, "Raise it constructively."),
  ] },
  { prompt: "You notice a colleague isn't following a safety rule. What do you do?", competency: "values", tip: "Safety is everyone's job: raise it calmly, then escalate if needed.", answers: [
    A("Remind them politely, and report it to the supervisor if the risk continues.", 3, "Correct."), A("Ignore it; it's not my job.", 0, "Safety is everyone's job."),
    A("Copy them so we're both quicker.", 0, "Never."), A("Post about it on social media.", 0, "Raise it internally."),
  ] },
  { prompt: "It's the busiest hour and a queue is building while a customer asks you lots of questions. What do you do?", competency: "pressure", tip: "Stay polite, help efficiently, and call for back-up when the queue builds.", answers: [
    A("Help them politely but efficiently, and call a colleague over to open another till or help the queue.", 3, "Calm and practical."), A("Tell them to hurry up.", 0, "Stay polite."),
    A("Ignore the queue completely.", 1, "Think about everyone waiting too."), A("Walk away to calm down.", 0, "Ask for help instead."),
  ] },
];

// ── Building an interview ────────────────────────────────────────────────────
const FIRST = ["Priya", "James", "Aisha", "Tom", "Grace", "Kwame", "Sophie", "Hassan", "Emily", "Daniel", "Chloe", "Olu", "Megan", "Ravi", "Hannah", "Marcus"];
const LAST = ["Patel", "Okafor", "Smith", "Khan", "Williams", "Mensah", "Taylor", "Ahmed", "Brown", "Nowak", "Evans", "Adeyemi", "Clarke", "Singh", "Wilson", "Hughes"];

const shuffled = (rng: Rng, answers: Answer[]) => shuffle(rng, answers);

export function buildInterviewPlan(job: JobSpec, seed: number): Interview {
  const rng = createRng(seed ^ 0x51a7e);
  const info = TRACKS[job.track];
  // The same people work there whichever interview you get: the panel comes from the employer.
  const staff = createRng([...`${job.key}:${job.employer}`].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261));
  const name = () => `${pick(staff, FIRST)} ${pick(staff, LAST)}`;
  const chair = { name: name(), title: info.manager, look: Math.floor(staff() * 8) };
  let second = { name: name(), title: "People Partner (HR)", look: Math.floor(staff() * 8) };
  while (second.name.split(" ")[0] === chair.name.split(" ")[0]) second = { ...second, name: name() };
  const receptionist = name().split(" ")[0];
  const questions: Question[] = [];
  questions.push({ id: "opening", stage: "opening", competency: "communication", asker: 0, prompt: `Hi, I'm ${chair.name.split(" ")[0]}, ${info.manager.toLowerCase()} here. Thanks for coming in.`, answers: shuffled(rng, OPENING), tip: "First impressions count: arrive early, greet warmly, phone away." });
  questions.push({ id: "about", stage: "about", competency: "communication", asker: 0, prompt: "To start us off, tell us a bit about yourself.", answers: shuffled(rng, ABOUT), tip: "Two minutes: what you do now, what you've achieved that fits this job, why you're here." });
  questions.push({ id: "why", stage: "motivation", competency: "motivation", asker: 1, prompt: `Why do you want to work as a ${job.title.toLowerCase()} at ${job.employer}?`, answers: shuffled(rng, why(job)), tip: "Research the employer and link the role to your goals." });
  for (const [i, c] of info.behaviours.entries()) {
    const b = BEHAVIOURAL[c];
    questions.push({ id: `star-${c}`, stage: "behavioural", competency: c, asker: (i % 2) as 0 | 1, prompt: b.prompt, star: { situation: shuffled(rng, b.situation), action: shuffled(rng, b.action), result: shuffled(rng, b.result) }, tip: "Use STAR: Situation, Task, Action (what YOU did), Result (what changed, and what you learnt)." });
  }
  const sj = pick(rng, SITUATIONAL.filter((s) => !info.behaviours.includes(s.competency)));
  questions.push({ id: "situational", stage: "situational", competency: sj.competency, asker: 1, prompt: sj.prompt, answers: shuffled(rng, sj.answers), tip: sj.tip });
  const tech = shuffle(rng, TECHNICAL[job.track]).slice(0, 2);
  tech.forEach((t, i) => questions.push({ id: `tech-${i}`, stage: "technical", competency: "knowledge", asker: 0, prompt: t.prompt, answers: shuffled(rng, t.answers), tip: t.tip }));
  if (job.role) {
    for (const [i, task] of jobTasks(job.role, rng, 2).entries())
      questions.push({ id: `exercise-${i}`, stage: "exercise", competency: "knowledge", asker: 1, prompt: task.prompt, task, tip: task.explain });
  }
  const strengths = rng() < 0.5;
  questions.push({ id: "strengths", stage: "strengths", competency: "motivation", asker: 1, prompt: strengths ? "What are your main strengths?" : "Do you have any weaknesses?", answers: shuffled(rng, strengths ? STRENGTHS : WEAKNESSES), tip: strengths ? "Two or three strengths relevant to the job, each with evidence." : "An honest weakness and what you're doing to improve it." });
  questions.push({ id: "close", stage: "close", competency: "motivation", asker: 0, prompt: "That's everything from us. Do you have any questions for us?", ask: shuffled(rng, PANEL_QUESTIONS), tip: "Always ask one or two thoughtful questions; save pay and holidays for after an offer." });
  const assessed = Array.from(new Set(questions.map((q) => q.competency)));
  return { job, panel: [chair, second], receptionist, questions, assessed, length: job.role ? "about 30 minutes" : "about 20 minutes" };
}

/** Total answer slots for an interview. */
export const answerCount = (iv: Interview) => iv.questions.reduce((n, q) => n + slots(q), 0);

export interface Scorecard {
  scores: { competency: Competency; label: string; score: number; band: string }[];
  average: number;
  passed: boolean;
  /** Per question: marks out of 3 and the panel's note. */
  notes: { id: string; prompt: string; marks: number; note: string; tip: string }[];
}

/**
 * Score a whole interview the Civil Service way: each behaviour 1–7, and the
 * benchmark is 4 or more in every behaviour (a single 3 is accepted when every
 * other behaviour scores 5 or more).
 */
export function scoreInterview(iv: Interview, flat: (number | string)[]): Scorecard {
  const per: Partial<Record<Competency, number[]>> = {};
  const notes: Scorecard["notes"] = [];
  let at = 0;
  for (const q of iv.questions) {
    const take = flat.slice(at, at + slots(q));
    at += slots(q);
    let marks = 0, note = "";
    const choose = (list: Answer[], v: number | string | undefined) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < list.length ? list[v] : null);
    if (q.star) {
      const parts = [choose(q.star.situation, take[0]), choose(q.star.action, take[1]), choose(q.star.result, take[2])];
      marks = parts.reduce((s, p) => s + (p?.marks ?? 0), 0) / 3;
      note = parts.map((p) => p?.note ?? "No answer.").join(" ");
    } else if (q.ask) {
      const picked = [choose(q.ask, take[0]), choose(q.ask, take[1])].filter((p): p is Answer => !!p);
      marks = picked.length ? picked.reduce((s, p) => s + p.marks, 0) / picked.length : 1;
      note = picked.length ? picked.map((p) => p.note).join(" ") : "No questions for the panel: always prepare one or two.";
    } else if (q.task) {
      const ok = take[0] !== undefined && take[0] !== "" && checkAnswer(q.task, take[0]);
      marks = ok ? 3 : 0;
      note = ok ? "Correct." : q.task.explain;
    } else if (q.answers) {
      const a = choose(q.answers, take[0]);
      marks = a?.marks ?? 0;
      note = a?.note ?? "No answer.";
    }
    (per[q.competency] ??= []).push(marks);
    notes.push({ id: q.id, prompt: q.prompt, marks: Math.round(marks * 10) / 10, note, tip: q.tip });
  }
  const scores = iv.assessed.map((c) => {
    const list = per[c] ?? [0];
    const avg = list.reduce((s, m) => s + m, 0) / list.length;
    const score = Math.max(1, Math.min(7, Math.round(1 + (avg / 3) * 6)));
    return { competency: c, label: COMPETENCIES[c], score, band: SCALE[score] };
  });
  const low = scores.filter((s) => s.score < 4);
  const passed = low.length === 0 || (low.length === 1 && low[0].score === 3 && scores.every((s) => s === low[0] || s.score >= 5));
  const average = Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 10) / 10;
  return { scores, average, passed, notes };
}
