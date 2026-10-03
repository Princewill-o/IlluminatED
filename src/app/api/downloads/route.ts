import { NextRequest, NextResponse } from "next/server";

import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";

import { courseById } from "@/lib/data/courses";
import { topicById, topicNotesText } from "@/lib/data/topics";
import { SYLLABUSES } from "@/lib/education";

export const runtime = "nodejs";

const BLUE = rgb(0.07, 0.30, 0.90);
const NAVY = rgb(0.05, 0.12, 0.26);
const GREY = rgb(0.34, 0.39, 0.48);
const PAGE_W = 595.28;
const PAGE_H = 841.89;

function wrap(text: string, size: number, max: number, font: PDFFont) {
  const words = text.split(/\s+/).flatMap((word) => {
    if (font.widthOfTextAtSize(word, size) <= max) return [word];
    const pieces: string[] = [];
    let piece = "";
    for (const character of word) {
      if (piece && font.widthOfTextAtSize(piece + character, size) > max) {
        pieces.push(piece);
        piece = character;
      } else piece += character;
    }
    if (piece) pieces.push(piece);
    return pieces;
  });
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function makePdf(courseId: string, type: "checklist" | "practice" | "notes", topicId?: string, board?: string) {
  const course = courseById(courseId);
  if (!course) return null;
  const questions = type === "practice"
    ? course.topicIds.flatMap((id) => {
        const topic = topicById(id);
        return topic ? topic.quiz.slice(0, 2).map((q) => ({ topic, q })) : [];
      }).slice(0, 10)
    : [];
  if (type === "practice" && questions.length === 0) return null;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(await readFile(join(process.cwd(), "fonts/dm-sans/DMSans-Regular.ttf")), { subset: true });
  const bold = await pdf.embedFont(await readFile(join(process.cwd(), "fonts/dm-sans/DMSans-Bold.ttf")), { subset: true });
  let logo;
  try {
    logo = await pdf.embedPng(await readFile(join(process.cwd(), "public/brand/lion-head-pdf.png")));
  } catch {
    logo = null;
  }
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 54;
  const contentWidth = PAGE_W - 88;

  const header = (title: string) => {
    page.drawRectangle({ x: 0, y: PAGE_H - 78, width: PAGE_W, height: 78, color: BLUE });
    if (logo) page.drawImage(logo, { x: 34, y: PAGE_H - 62, width: 42, height: 42 });
    page.drawText("IlluminatED", { x: 84, y: PAGE_H - 48, size: 19, font: bold, color: rgb(1, 1, 1) });
    const titleWidth = bold.widthOfTextAtSize(title, 16);
    const titleSize = Math.min(16, (16 * (PAGE_W - 68)) / titleWidth);
    page.drawText(title, { x: 34, y: PAGE_H - 104, size: titleSize, font: bold, color: NAVY });
    y = PAGE_H - 128;
  };
  const footer = () => page.drawText("illumed.co.uk  ·  Original IlluminatED study material", { x: 34, y: 25, size: 7.5, font: regular, color: GREY });
  const nextPage = () => { footer(); page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - 54; };
  const text = (value: string, size = 10, font = regular, color = NAVY, gap = 15) => {
    for (const paragraph of value.split("\n")) {
      const lines = wrap(paragraph, size, contentWidth, font);
      for (const line of lines) {
        if (y < 58) nextPage();
        page.drawText(line, { x: 44, y, size, font, color });
        y -= gap;
      }
      y -= 3;
    }
  };
  const heading = (value: string) => { if (y < 95) nextPage(); page.drawText(value, { x: 44, y, size: 13, font: bold, color: BLUE }); y -= 22; };

  if (type === "notes") {
    const topic = topicId ? topicById(topicId) : null;
    if (!topic || !course.topicIds.includes(topic.id)) return null;
    header(`${topic.title} · Revision notes`);
    text(topicNotesText(topic, course).replace(/^✗ /gm, "Misconception: ").replace(/^✓ /gm, "Correction: "), 9.5, regular, NAVY, 15);
  } else if (type === "checklist") {
    header(`${course.title} · Topic checklist`);
    text(`${course.years} · ${course.level}`, 10, regular, GREY);
    text("Use this checklist alongside your exact exam-board specification. Tick a topic after you have learned it, practised it and checked an answer.", 10, regular, NAVY, 16);
    heading("Course areas");
    for (const area of course.commonAreas) text(`[ ] ${area}`, 10, regular, NAVY, 16);
    const syllabus = board ? SYLLABUSES.find((s) => s.courseId === course.id && `${s.board}:${s.code}`.toLowerCase() === board.toLowerCase()) : null;
    if (board && !syllabus) return null;
    if (syllabus) {
      heading(`${syllabus.board} ${syllabus.code} headings`);
      for (const section of syllabus.sections) text(`[ ] ${section.ref} ${section.title}`, 9.5, regular, NAVY, 15);
    }
    heading("Official sources");
    for (const source of course.officialLinks) text(`${source.label}: ${source.url}`, 8.5, regular, GREY, 13);
    text("This checklist is a study aid, not a complete exam specification. Always confirm optional units, tiers and content with your school and awarding organisation.", 8.5, regular, GREY, 13);
  } else {
    header(`${course.title} · Practice paper`);
    text("Original IlluminatED practice paper · Not an official exam-board paper · Use your own specification to check coverage.", 9, regular, GREY, 14);
    text("Name: ____________________________________    Date: __________________", 10, regular, NAVY, 18);
    text(`Suggested time: about ${questions.length * 2} minutes    1 mark per question`, 10, regular, NAVY, 18);
    text(`${questions.length} questions · ${questions.length} marks`, 10, bold, NAVY, 18);
    questions.forEach(({ topic, q }, index) => {
      heading(`${index + 1}. ${topic.title}`);
      text(q.q, 10, regular, NAVY, 16);
      q.options.forEach((option, optionIndex) => text(`${String.fromCharCode(65 + optionIndex)}. ${option}`, 9.5, regular, NAVY, 14));
      text("Answer: ________________________________________________________________", 9.5, regular, GREY, 18);
    });
    heading("Self-check");
    text("Return to IlluminatED and practise the topics where you were least confident. These questions are original study material and are not a prediction of your live exam.", 9, regular, GREY, 14);
    nextPage();
    heading("Answers and explanations");
    questions.forEach(({ q }, index) => {
      text(`${index + 1}. ${q.options[q.answer]}`, 10, bold, NAVY, 16);
      text(q.explain, 9.5, regular, GREY, 14);
      y -= 5;
    });
  }
  footer();
  return pdf.save();
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const courseId = params.get("course")?.slice(0, 80) ?? "";
  const type = params.get("type") === "practice" ? "practice" : params.get("type") === "notes" ? "notes" : "checklist";
  const topicId = params.get("topic")?.slice(0, 80) ?? undefined;
  const board = params.get("board")?.slice(0, 40) ?? undefined;
  const bytes = await makePdf(courseId, type, topicId, board);
  if (!bytes) return NextResponse.json({ error: "Document not available" }, { status: 404 });
  const course = courseById(courseId)!;
  const safeTitle = [course.title, type === "notes" ? topicId : "", board].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="illuminated-${safeTitle}-${type}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
