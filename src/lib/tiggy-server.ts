import "server-only";

import {
  type LearnerDetails,
  stageLabel,
  yearLabel,
} from "@/lib/account/details";
import { courseById } from "@/lib/data/courses";
import { BOARDS } from "@/lib/data/routes";
import { TOPICS, coursesForTopic, specRefLabel } from "@/lib/data/topics";
import { type GovUkResult, searchGovUk } from "@/lib/server/govuk";
import { getSupabase } from "@/lib/social/server";
import type { TiggyPlan, TiggyStatus } from "@/lib/tiggy";
import { TIGGY_PLANS } from "@/lib/tiggy";
import type { BoardId, Topic } from "@/lib/types";

type Supabase = NonNullable<Awaited<ReturnType<typeof getSupabase>>>;

/** The signed-in member's plan and today's usage, or null if the database isn't ready (0006 not applied). */
export async function getTiggyStatus(
  sb: Supabase,
): Promise<TiggyStatus | null> {
  const { data, error } = await sb.rpc("tiggy_status");
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { plan: string; used: number; max_per_day: number; remaining: number }
    | undefined;
  if (!row) return null;
  const plan: TiggyPlan = row.plan === "premium" ? "premium" : "free";
  return {
    plan,
    used: Number(row.used) || 0,
    limit: Number(row.max_per_day) || TIGGY_PLANS[plan].perDay,
    remaining: Math.max(0, Number(row.remaining) || 0),
  };
}

// ─────────────────────────────────────────────────────────────
// Safeguarding: keyword check that runs before anything else
// ─────────────────────────────────────────────────────────────

export type FlagCategory = "self-harm" | "abuse" | "danger" | "crisis";

/**
 * Deliberately phrase-based, so study questions ("Durkheim's study of suicide",
 * "this exam is killing me") aren't flagged. The system prompt also tells Tiggy
 * to respond with care to anything subtler that these miss.
 */
const SAFEGUARDING: [FlagCategory, RegExp][] = [
  [
    "self-harm",
    /\b(kill(ing)?\s+my\s?self|end(ing)?\s+(my|it)\s+(life|all)|take\s+my\s+(own\s+)?life|suicidal|(want|going|plan(ning)?)\s+to\s+die|wish\s+i\s+(was|were)\s+dead|better\s+off\s+dead|self[\s-]?harm(ing)?|hurt(ing)?\s+my\s?self|cut(ting)?\s+my\s?self|harm(ing)?\s+my\s?self|(took|take|taking|going\s+to\s+take)\s+an\s+overdose|don'?t\s+want\s+to\s+(be\s+alive|live|exist|be\s+here\s+anymore)|no\s+(reason|point)\s+(to|in)\s+(live|living|being\s+alive))\b/i,
  ],
  [
    "abuse",
    /\b((he|she|they|my\s+\w+)\s+(hits?|beats?|kicks?|punch(es)?|touch(es)?|hurts?)\s+me|abus(es|ed|ing)\s+me|being\s+abused|sexually\s+(abused|assaulted)|someone\s+(is\s+)?(touching|hurting)\s+me|touched\s+me\s+(inappropriately|where)|groom(ed|ing)\s+me|making\s+me\s+send\s+(pics|pictures|photos|nudes)|send\s+(him|her|them)\s+nudes|not\s+safe\s+at\s+home|scared\s+to\s+go\s+home|afraid\s+to\s+go\s+home)\b/i,
  ],
  [
    "danger",
    /\b(going\s+to\s+(hurt|kill)\s+me|threaten(ed|ing)\s+(to\s+(hurt|kill)\s+)?me|follow(ed|ing)\s+me\s+home|run(ning)?\s+away\s+from\s+home|i'?m\s+in\s+danger|i\s+am\s+in\s+danger|someone\s+has\s+a\s+(knife|gun)|being\s+(blackmailed|bullied\s+every\s+day))\b/i,
  ],
  [
    "crisis",
    /\b(can'?t\s+go\s+on(\s+anymore)?|i\s+give\s+up\s+on\s+(life|everything)|nobody\s+would\s+(care|miss\s+me)|no\s+one\s+would\s+(care|miss\s+me)|everyone\s+would\s+be\s+better\s+off\s+without\s+me|having\s+a\s+breakdown|nowhere\s+(safe\s+)?to\s+sleep)\b/i,
  ],
];

export function safeguardingCategory(text: string): FlagCategory | null {
  const t = text.replace(/[’‘]/g, "'");
  for (const [cat, re] of SAFEGUARDING) if (re.test(t)) return cat;
  return null;
}

/** Tiggy's fixed reply when the keyword check fires. Not sent to the model, and not counted against the daily limit. */
export const SAFEGUARDING_REPLY = `I'm really glad you told me. What you've said sounds serious, and you deserve support from a real person right now, not just a chatbot.

**If you're in danger or might act on these thoughts, call 999 now.**

You can talk to someone free, any time:

- **Childline**: call **0800 1111** or chat at childline.org.uk (for anyone under 19)
- **Samaritans**: call **116 123**, day or night
- **Shout**: text **SHOUT** to **85258** if you'd rather text than talk

Please also tell a trusted adult today, like a parent or carer, a teacher, your school's safeguarding lead, or your GP. You don't have to have the right words. Showing them this message is enough.

I'm an AI, so I can't check on you or get help for you myself. Our team may look at a short note that this conversation needed support, but they won't see what you wrote. When you're ready, I'm still here to help with your studies.`;

// ─────────────────────────────────────────────────────────────
// Blocklist and topic check
// ─────────────────────────────────────────────────────────────

const CONTACT =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+44\s?7\d{3}|\b07\d{3})\s?\d{3}\s?\d{3}\b/i;
/** Full UK postcodes, written in capitals (so "Q1 2nd part" isn't caught). */
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/;

const BLOCKS: { re: RegExp; reply: string }[] = [
  {
    re: /\b(ignore|forget|disregard)\s+(all\s+|any\s+|your\s+|the\s+|previous\s+|prior\s+|above\s+)+(instructions|rules|prompts?)\b|\b(show|reveal|print|repeat|tell\s+me)\s+(me\s+)?your\s+(system\s+prompt|instructions)\b|\b(developer\s+mode|jailbreak|DAN\s+mode)\b/i,
    reply:
      "I can't change how I work, but I'd love to help you study. What subject are you working on?",
  },
  {
    re: /\b(porn|send\s+nudes|sexting|onlyfans|hentai|sex\s+(positions?|tips|chat))\b/i,
    reply:
      "That's not something I can help with. I'm here for schoolwork, revision and next steps like college, apprenticeships and UCAS.",
  },
  {
    re: /\b(make|build)\s+(a\s+)?(bomb|pipe\s+bomb|gun|firearm|weapon)s?\b|\b(buy|get|make)\s+(some\s+)?(drugs|weed|cannabis|cocaine|ketamine|mdma)\b|\bbuy\s+(a\s+)?(gun|knife|vape)s?\b|\b(how\s+to\s+)?(hack|get\s+into)\s+(someone'?s|an?\s+)?(account|instagram|snapchat|school\s+system)\b/i,
    reply:
      "I can't help with that. If you or someone else could be in danger, call 999. Otherwise, I'm happy to help with your studies.",
  },
  {
    re: /\b(betting\s+tips|crypto\s+(signals|pump)|dating\s+advice|chat\s+me\s+up|be\s+my\s+(girlfriend|boyfriend))\b/i,
    reply:
      "That's outside what I can help with. Ask me about a subject you're studying, revision, exams, or what to do after GCSEs or A levels.",
  },
  {
    re: /\b(leaked|real)\s+(exam\s+)?papers?\s+for\s+(this|next)\s+(year|summer|june|may)|\banswers?\s+to\s+(tomorrow'?s|today'?s|this\s+year'?s)\s+(exam|paper|test)\b/i,
    reply:
      "I can't help with live or leaked exam papers. That's exam malpractice and could cost you your grades. I can help you practise with past papers instead.",
  },
];

/** Returns a friendly refusal when the message shouldn't go to the model at all, otherwise null. */
export function blockedReason(text: string): string | null {
  if (CONTACT.test(text) || POSTCODE.test(text))
    return "Please don't share personal details like email addresses, phone numbers or postcodes with me. Take them out and ask again.";
  for (const b of BLOCKS) if (b.re.test(text)) return b.reply;
  return null;
}

// ─────────────────────────────────────────────────────────────
// Retrieval over IlluminatED topics
// ─────────────────────────────────────────────────────────────

const STOP = new Set(
  "a an and are as at be but by can do does for from how i if in into is it its me my of on or so that the their them then there these this to was what when where which who why will with you your yours i'm im please help explain tell about give some need want know make does doesnt dont don't just like get got really very more most also any than too our we us plan planning revision revise revising gcse gcses level levels exam exams question questions answer answers check topic topics work study studying year mark marks paper papers subject subjects".split(
    " ",
  ),
);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));

/** Very light stemming, so "cells" matches "cell" and "photosynthesising" matches "photosynthesis". */
const stem = (w: string) =>
  w
    .replace(/(ies)$/, "y")
    .replace(/(ing|ised|ises|ise|ized|izes|ize|ed|es|s)$/, "")
    .slice(0, 12);

interface Indexed {
  topic: Topic;
  title: Set<string>;
  terms: Set<string>;
  summary: Set<string>;
  body: Set<string>;
}

let INDEX: Indexed[] | null = null;
function index(): Indexed[] {
  INDEX ??= TOPICS.map((t) => ({
    topic: t,
    title: new Set(words(t.title).map(stem)),
    terms: new Set(t.keyTerms.flatMap((k) => words(k.term)).map(stem)),
    summary: new Set(words(t.summary).map(stem)),
    body: new Set(
      words(`${t.explanation.join(" ")} ${t.objectives.join(" ")}`).map(stem),
    ),
  }));
  return INDEX;
}

export interface TopicSnippet {
  topic: Topic;
  courseId: string;
  courseTitle: string;
  href: string;
}

/** The 2 or 3 IlluminatED topics that best match the question, favouring the learner's own subjects. */
export function findTopics(
  query: string,
  details: LearnerDetails | null,
  max = 3,
): TopicSnippet[] {
  const q = [...new Set(words(query).map(stem))];
  if (!q.length) return [];
  const mine = new Set(details?.subjects.map((s) => s.courseId) ?? []);
  const scored = index()
    .map((ix) => {
      let score = 0;
      for (const w of q) {
        if (ix.title.has(w)) score += 5;
        if (ix.terms.has(w)) score += 4;
        if (ix.summary.has(w)) score += 2;
        if (ix.body.has(w)) score += 1;
      }
      const courses = coursesForTopic(ix.topic.id).map((c) => c.id);
      const own = courses.find((c) => mine.has(c));
      if (score > 0 && own) score *= 1.5;
      return { ix, score, courseId: own ?? ix.topic.courseId };
    })
    .filter((s) => s.score >= 5)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  // Keep close matches only: anything under 40% of the best is probably noise.
  const best = scored[0].score;
  return scored
    .filter((s) => s.score >= best * 0.4)
    .slice(0, max)
    .map(({ ix, courseId }) => ({
      topic: ix.topic,
      courseId,
      courseTitle: courseById(courseId)?.title ?? courseId,
      href: `/courses/${courseId}/${ix.topic.id}`,
    }));
}

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;

function snippetText(s: TopicSnippet): string {
  const t = s.topic;
  const lines = [
    `### ${t.title} (${s.courseTitle})`,
    `Link: ${s.href}`,
    `Summary: ${t.summary}`,
  ];
  if (t.specRefs?.length)
    lines.push(
      `Specification references: ${t.specRefs.map(specRefLabel).join("; ")}`,
    );
  lines.push(
    `Key terms: ${t.keyTerms
      .slice(0, 5)
      .map((k) => `${k.term}: ${k.definition}`)
      .join(" | ")}`,
    `Notes: ${clip(t.explanation.join(" "), 900)}`,
  );
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Official sources from GOV.UK (optional)
// ─────────────────────────────────────────────────────────────

/**
 * Guidance topics worth backing with GOV.UK pages. Each maps to a fixed
 * search, so the learner's own words never leave our server.
 */
const GUIDANCE_TOPICS: [RegExp, string][] = [
  [/ucas/i, "UCAS university applications"],
  [
    /student\s+(finance|loans?)|maintenance\s+loan|tuition\s+fee/i,
    "student finance",
  ],
  [/apprenticeships?/i, "apprenticeships"],
  [/t[\s-]?levels?/i, "T Levels"],
  [/resits?|re-?sit(ting)?|retak(e|es|ing)/i, "GCSE resits"],
  [/access\s+arrangements?|extra\s+time/i, "exam access arrangements"],
  [/results?\s+day/i, "exam results day"],
  [/school\s+leaving\s+age|leave\s+(school|education)/i, "school leaving age"],
  [/epq|extended\s+project/i, "extended project qualification"],
  [
    /btecs?[^.?!]*(chang|scrap|withdraw|defund|replac|reform|cut|axe|remov)|(chang|scrap|withdraw|defund|replac|reform|cut|axe|remov)\w*[^.?!]*btecs?/i,
    "BTEC qualifications funding withdrawn reform",
  ],
];

export type OfficialSource = Pick<GovUkResult, "title" | "description" | "url">;

/** Top 3 GOV.UK pages when the question is about a guidance topic. Fails silently. */
export async function findOfficialSources(
  question: string,
): Promise<OfficialSource[]> {
  const topic = GUIDANCE_TOPICS.find(([re]) => re.test(question))?.[1];
  if (!topic) return [];
  try {
    const { results } = await searchGovUk(topic, {
      count: 3,
      timeoutMs: 2500,
    });
    return results
      .slice(0, 3)
      .map(({ title, description, url }) => ({ title, description, url }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

function learnerText(details: LearnerDetails | null): string {
  if (!details) return "The learner hasn't told us what they study.";
  const subjects = details.subjects
    .map((s) => {
      const c = courseById(s.courseId);
      if (!c) return null;
      const board =
        s.board !== "unsure" ? BOARDS[s.board as BoardId]?.short : null;
      return board
        ? `${c.title} (${board})`
        : `${c.title} (exam board not sure)`;
    })
    .filter(Boolean);
  return [
    `Studying: ${stageLabel(details.stage)}, ${yearLabel(details.yearGroup)}.`,
    details.ageBand === "18+"
      ? "Age range: 18 or over."
      : "Age range: under 18.",
    subjects.length ? `Subjects: ${subjects.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSystemPrompt({
  plan,
  fullSolution,
  details,
  snippets,
  officialSources = [],
}: {
  plan: TiggyPlan;
  fullSolution: boolean;
  details: LearnerDetails | null;
  snippets: TopicSnippet[];
  officialSources?: OfficialSource[];
}): string {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  const length =
    plan === "free"
      ? "Keep answers short and focused: usually under 150 words. Offer to go further rather than writing everything at once."
      : "Give thorough answers when they help, but stay focused. Use headings or numbered steps for longer explanations.";
  const answers = fullSolution
    ? "The learner has asked for the FULL WORKED SOLUTION for this message. Show every step clearly with the reasoning, the final answer, and a short tip on how marks are usually awarded. Then ask one quick question to check they followed it. This still never applies to coursework or NEA."
    : `For homework or practice questions, give hints before answers: start with the first step or a guiding question, and only reveal more if they're still stuck after trying. ${
        plan === "premium"
          ? 'They can switch on "Show full worked solution" if they want every step.'
          : "If they ask for a full worked solution, give a strong hint and the method, and mention that full worked solutions are part of Premium."
      }`;

  return `You are Tiggy, IlluminatED's friendly lion study helper. IlluminatED is a free UK revision platform. You help learners aged 13 to 19 in the UK with GCSE, A level, BTEC, T Level and Functional Skills study, and with next steps such as sixth form, college, apprenticeships, UCAS and personal statements. Today is ${today}.

HOW YOU TEACH
- Be warm, encouraging and patient. Praise effort, not just right answers. Keep a light, friendly tone; the odd lion pun is fine, but never at the expense of clarity.
- Explain step by step in plain language, then check understanding with one short question at the end.
- Use UK spelling and UK curriculum terms (Year 11, key stage, specification, paper, mark scheme, command words such as "describe", "explain", "evaluate"). Use exam board conventions (AQA, Pearson Edexcel, OCR, WJEC Eduqas, CCEA, NCFE) where relevant, and say when boards differ.
- ${length}
- ${answers}
- Format with simple Markdown: short paragraphs, bullet points, **bold** for key terms, tables only when useful. Write maths in plain text with Unicode symbols (x², √, ×, ÷, π, ≤, ½), not LaTeX.

COURSEWORK AND NEA
- Never write coursework, NEA, controlled assessments, BTEC or T Level assignments, EPQ work or personal statements for the learner to submit. If asked, explain kindly that under JCQ rules on malpractice, work submitted for assessment must be their own; submitting work written by someone else, including AI, can lead to losing marks or being disqualified, and teachers must check authenticity.
- You can help them plan, understand the task and criteria, brainstorm their own ideas, and give feedback on short extracts they wrote (point out strengths and what to improve, without rewriting it for them).

WELLBEING AND NEXT STEPS
- Give practical, kind guidance on study stress, exam anxiety, motivation, sleep and revision plans (spaced practice, retrieval, past papers). Suggest talking to a teacher, tutor, school counsellor or trusted adult if stress is getting too much.
- Help with choosing sixth form or college, apprenticeships, T Levels, UCAS, and planning a personal statement in the learner's own words.

SAFETY
- You are an AI. Never pretend to be human, and say so if asked.
- Never ask for or collect personal details (full name, school, address, phone, email, social media, photos). If they share any, tell them gently not to.
- Never arrange to meet anyone, move the chat elsewhere, or keep secrets.
- If anything suggests self-harm, suicidal thoughts, abuse, being in danger or a crisis, respond with care and without judgement, encourage them to talk to a trusted adult today, and give: 999 in an emergency, Childline 0800 1111, Samaritans 116 123, Shout (text SHOUT to 85258). Don't try to counsel them on your own.
- Stay on study, education, careers and wellbeing. Politely steer off-topic, adult, harmful or unsafe requests back to learning.
- You can make mistakes. When facts, dates, grade boundaries or specification content matter, say so and suggest checking the specification, the exam board's website or their teacher.

USING ILLUMINATED CONTENT
- When the notes below are relevant, base your answer on them and add a Markdown link to the topic page using its exact Link path, e.g. [Read the topic](/courses/gcse-maths/gcse-maths-percentages). Mention specification references when helpful. Never invent links or specification codes.
- If the notes don't cover the question, answer from general knowledge and suggest they check their specification.

ABOUT THIS LEARNER
${learnerText(details)}

ILLUMINATED NOTES
${snippets.length ? snippets.map(snippetText).join("\n\n") : "(No matching IlluminatED topics for this message.)"}${
    officialSources.length
      ? `

OFFICIAL SOURCES
These GOV.UK pages matched the learner's question. Use them for facts about rules, dates and funding, and cite them as Markdown links with the exact URL, e.g. [Student finance](https://www.gov.uk/student-finance). Only cite them if they're relevant, and never invent other GOV.UK links.
${officialSources
  .map(
    (o) =>
      `- ${o.title}: ${o.url}${o.description ? `\n  ${o.description}` : ""}`,
  )
  .join("\n")}`
      : ""
  }`;
}
