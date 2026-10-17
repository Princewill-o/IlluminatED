"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { QUESTION_BANK } from "@/lib/data/topics";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  school_licence_required: "You need an active school licence and the correct student or teacher role.",
  not_allowed: "You don't have access to that.",
  no_class: "No class has that code. Check it with your teacher.",
  own_class: "That's your own class.",
  class_full: "That class is full (60 students).",
  too_many: "You can have up to 30 classes.",
  due_past: "Pick a due date in the future.",
  invalid: "Something didn't add up. Try again.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function rpc<T>(fn: string, args: Record<string, unknown>, paths: string[]): Promise<Result<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false, error: friendly(error.message) };
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, data: data as T };
}

const name = z.string().trim().min(2).max(60);

export async function createClass(input: { name: string; subject: string; school?: string }) {
  const p = z.object({ name, subject: name, school: z.string().trim().max(80).optional() }).safeParse(input);
  if (!p.success) return { ok: false as const, error: "Give the class a name and subject (2 to 60 characters)." };
  return rpc<string>("class_create", { p_name: p.data.name, p_subject: p.data.subject, p_school: p.data.school ?? "" }, ["/homework"]);
}

export async function joinClass(code: string) {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(c)) return { ok: false as const, error: "Class codes are 6 letters and numbers." };
  return rpc<string>("class_join", { p_code: c }, ["/homework", "/games/world"]);
}

export async function leaveClass(classId: string) {
  if (!z.string().uuid().safeParse(classId).success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("class_leave", { p_class: classId }, ["/homework"]);
}

export async function removeStudent(classId: string, userId: string) {
  if (!z.string().uuid().safeParse(classId).success || !z.string().uuid().safeParse(userId).success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("class_remove_student", { p_class: classId, p_user: userId }, [`/homework/class/${classId}`]);
}

export async function deleteClass(classId: string) {
  if (!z.string().uuid().safeParse(classId).success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("class_delete", { p_class: classId }, ["/homework"]);
}

export async function deleteHomework(classId: string, homeworkId: string) {
  if (!z.string().uuid().safeParse(homeworkId).success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("homework_delete", { p_homework: homeworkId }, [`/homework/class/${classId}`]);
}

/** Sets homework from IlluminatED's question bank: picks questions from the chosen topics. */
export async function setHomework(input: { classId: string; title: string; instructions?: string; due: string; topics: string[]; count: number }) {
  const p = z
    .object({
      classId: z.string().uuid(),
      title: z.string().trim().min(2).max(80),
      instructions: z.string().trim().max(500).optional(),
      due: z.string().datetime({ offset: true }),
      topics: z.array(z.string()).min(1).max(10),
      count: z.number().int().min(1).max(30),
    })
    .safeParse(input);
  if (!p.success) return { ok: false as const, error: "Add a title, a due date and at least one topic." };
  const pool = QUESTION_BANK.filter((q) => p.data.topics.includes(q.topicId));
  if (!pool.length) return { ok: false as const, error: "Those topics don't have questions yet." };
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, p.data.count);
  return rpc<string>(
    "homework_create",
    {
      p_class: p.data.classId,
      p_title: p.data.title,
      p_instructions: p.data.instructions ?? "",
      p_due: p.data.due,
      p_questions: picked.map((q) => ({ key: q.key, q: q.q, options: q.options, topic: q.topicTitle })),
      p_answers: picked.map((q) => q.answer),
      p_explains: picked.map((q) => q.explain),
    },
    [`/homework/class/${p.data.classId}`],
  );
}

export async function submitHomework(homeworkId: string, answers: number[]) {
  const p = z.object({ id: z.string().uuid(), answers: z.array(z.number().int().min(-1).max(10)).min(1).max(30) }).safeParse({ id: homeworkId, answers });
  if (!p.success) return { ok: false as const, error: FRIENDLY.invalid };
  const r = await rpc<{ correct: number; total: number; answers: number[]; explains: string[]; reward: number }[]>(
    "homework_submit",
    { p_homework: homeworkId, p_answers: answers },
    ["/homework", `/homework/${homeworkId}`, "/games/world"],
  );
  if (!r.ok) return r;
  const row = r.data[0];
  return { ok: true as const, data: row };
}

/** Teacher-authored multiple-choice work: answer keys remain in the private schema. */
export async function setCustomHomework(input: {classId:string;title:string;instructions:string;due:string;questions:{question:string;options:string[];answer:number;explain:string}[]}) {
 const question=z.object({question:z.string().trim().min(3).max(1200),options:z.array(z.string().trim().min(1).max(300)).length(4),answer:z.number().int().min(0).max(3),explain:z.string().trim().min(3).max(1500)}).refine(q=>new Set(q.options).size===4);
 const p=z.object({classId:z.string().uuid(),title:z.string().trim().min(2).max(80),instructions:z.string().trim().max(500),due:z.string().datetime({offset:true}),questions:z.array(question).min(1).max(30)}).safeParse(input);
 if(!p.success)return {ok:false as const,error:"Add a title, due date, four distinct options and an explanation for each question."};
 const qs=p.data.questions;
 return rpc<string>("homework_create",{p_class:p.data.classId,p_title:p.data.title,p_instructions:p.data.instructions,p_due:p.data.due,p_questions:qs.map(q=>({key:`teacher-${crypto.randomUUID()}`,q:q.question,options:q.options,topic:"Teacher-created homework"})),p_answers:qs.map(q=>q.answer),p_explains:qs.map(q=>q.explain)},[`/homework/class/${p.data.classId}`,"/teacher"]);
}
