import { NextResponse } from "next/server";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { makeRoleCertificate } from "@/lib/illum-world/role-certificate";
import { markContract, roleContract } from "@/lib/illum-world/role-contracts";
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
    const logo = await readFile(
      join(process.cwd(), "public/brand/wordmark-navy-pdf.png"),
    );
    const bytes = await makeRoleCertificate(
      course,
      submission.answers,
      learner,
      logo,
      {
        id: `IW-${randomUUID().slice(0, 8).toUpperCase()}`,
        date: new Date().toISOString(),
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
  _request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  const course = roleContract((await params).role);
  if (!course)
    return NextResponse.json(
      { error: "Unknown in-game role." },
      { status: 404 },
    );
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
