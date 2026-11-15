import { NextResponse } from "next/server";

import { readFile } from "node:fs/promises";
import { join } from "node:path";


import { assessCourseWork } from "@/lib/illum-world/course-work";
import { makeRoleCertificate } from "@/lib/illum-world/role-certificate";
import { markContract, roleContract } from "@/lib/illum-world/role-contracts";
import { getSupabase } from "@/lib/social/server";
export const runtime = "nodejs";
const headers = {
  "Content-Type": "application/pdf",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function POST(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const course = roleContract((await params).role);
  if (!course)
    return NextResponse.json(
      { error: "Unknown in-game role." },
      { status: 404 },
    );
  try {
    const text = await request.text();
    if (text.length > 16384)
      return NextResponse.json(
        { error: "Submission is too large." },
        { status: 413 },
      );
    const input: unknown = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 },
      );
    const submission = input as Record<string, unknown>;
    const learner =
      typeof submission.learner === "string"
        ? submission.learner.replace(/[\r\n\t]/g, " ").trim()
        : "";
    if (!learner || learner.length > 60)
      return NextResponse.json(
        { error: "Enter a player name of 1–60 characters." },
        { status: 400 },
      );
    const result = markContract(course, submission.answers);
    if (!result.complete)
      return NextResponse.json(
        {
          error:
            "Complete all three shift checks before downloading a certificate.",
          result,
        },
        { status: 422 },
      );
    const practical = assessCourseWork(course, submission.work);
    if (!practical.complete) return NextResponse.json({ error: "Finish the practical work before downloading.", practical }, { status: 422 });
    const sb = await getSupabase();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (!sb || !user) return NextResponse.json({ error: "Sign in to save course completion and download your certificate." }, { status: 401 });
    const { data: record, error: saveError } = await sb.rpc("complete_world_course", {
      p_role: course.id,
      p_work: submission.work,
      p_answers: Object.fromEntries(course.shifts.map(shift => [shift.id, submission.answers && typeof submission.answers === "object" ? (submission.answers as Record<string, unknown>)[shift.id] : null])),
    });
    if (saveError || !record) return NextResponse.json({ error: "Account completion saving is unavailable. Your answers remain on this device." }, { status: 503 });
    const logo = await readFile(
      join(process.cwd(), "public/brand/wordmark-navy-pdf.png"),
    );
    const bytes = await makeRoleCertificate(
      course,
      submission.answers,
      record.learner,
      logo,
      {
        id: `IW-${record.id}`,
        date: record.completed_at,
      },
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        ...headers,
        "Content-Disposition": `attachment; filename="IllumWorld-${course.id}-completion.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          "The certificate could not be created. Your progress remains on this device; try again.",
      },
      { status: 503 },
    );
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const course = roleContract((await params).role);
  if (!course)
    return NextResponse.json(
      { error: "Unknown in-game role." },
      { status: 404 },
    );
  if (new URL(request.url).searchParams.get("earned") === "1") {
    const sb = await getSupabase();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (!sb || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: record, error } = await sb.from("world_course_completions").select("*").eq("user_id", user.id).eq("role_id", course.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Course records are temporarily unavailable." }, { status: 503 });
    if (!record) return NextResponse.json({ error: "Course completion not found." }, { status: 404 });
    if (new URL(request.url).searchParams.get("work") === "1") {
      return NextResponse.json({ course: course.title, company: course.workplace, learner: record.learner, completed: record.completed_at, work: record.work ?? null }, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="IllumWorld-${course.id}-work.json"` } });
    }
    const logo = await readFile(join(process.cwd(), "public/brand/wordmark-navy-pdf.png"));
    const bytes = await makeRoleCertificate(course, record.answers, record.learner, logo, { id: `IW-${record.id}`, date: record.completed_at });
    return new Response(Buffer.from(bytes), { headers: { ...headers, "Content-Disposition": `attachment; filename="IllumWorld-${course.id}-completion.pdf"` } });
  }
  const logo = await readFile(
    join(process.cwd(), "public/brand/wordmark-navy-pdf.png"),
  );
  const bytes = await makeRoleCertificate(course, {}, "Sample Player", logo, {
    id: "SAMPLE",
    date: new Date().toISOString(),
    sample: true,
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      ...headers,
      "Content-Disposition": `inline; filename="IllumWorld-${course.id}-SAMPLE.pdf"`,
    },
  });
}
