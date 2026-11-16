import PptxGenJS from "pptxgenjs";

import type { LessonRecall, LessonSlide } from "./lesson-adaptation";
import { lessonSlideArtwork } from "./lesson-artwork";

interface LessonDeckSource {
  slug: string;
  title: string;
  subject: string;
  subject_title: string;
  key_stage: string;
  unit_title: string;
  source_url: string;
}

interface LessonDeckContent {
  slides: LessonSlide[];
  questions: LessonRecall[];
}

const SH = 7.5;
const C = { ink: "15274C", muted: "536682", paper: "F8F9FC", line: "DCE3EF", violet: "6156C9", blue: "2866CA", green: "167D70", pale: "E9F3FF", white: "FFFFFF" };

function addBackground(slide: PptxGenJS.Slide) {
  slide.background = { color: C.paper };
  slide.addShape("rect", { x: 0, y: 0, w: 0.17, h: SH, line: { color: C.violet, transparency: 100 }, fill: { color: C.violet } });
}

function addArtwork(slide: PptxGenJS.Slide, lesson: LessonDeckSource, title: string, kind: "goal" | "learn" | "keyword" | "teaching" | "review" | "question" | "answer", index: number, x = 8.55, y = 1.28, w = 4.12, h = 4.8) {
  const svg = lessonSlideArtwork(title, lesson.subject, kind, index);
  slide.addImage({ data: `image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`, x, y, w, h, transparency: 0 });
}

function addFooter(slide: PptxGenJS.Slide, index: number, total: number, source: string) {
  slide.addShape("line", { x: 0.7, y: 6.9, w: 11.95, h: 0, line: { color: C.line, width: 1 } });
  slide.addText(`IllumED  ·  ${index} / ${total}`, { x: 0.74, y: 7.02, w: 2.9, h: 0.22, fontFace: "Aptos", fontSize: 9, color: C.muted, margin: 0 });
  slide.addText("Adapted from Oak National Academy · Open Government Licence v3.0", { x: 7.5, y: 7.02, w: 5.15, h: 0.22, fontFace: "Aptos", fontSize: 8, color: C.muted, align: "right", margin: 0 });
  slide.addNotes(`IllumED adaptation of ${source}. Source: ${source}. This adapted presentation is not endorsed by Oak National Academy.`);
}

function addTitle(slide: PptxGenJS.Slide, kicker: string, title: string, body: string[], index: number, kind: "goal" | "learn" | "keyword" | "teaching" | "review" | "question" | "answer", lesson: LessonDeckSource) {
  addBackground(slide);
  slide.addText(kicker.toUpperCase(), { x: 0.82, y: 0.55, w: 7.2, h: 0.28, fontFace: "Aptos", fontSize: 10, bold: true, charSpacing: 1.5, color: C.violet, margin: 0 });
  slide.addText(title, { x: 0.82, y: 1.03, w: 7.35, h: 1.28, fontFace: "Aptos Display", fontSize: title.length > 54 ? 25 : 31, bold: true, color: C.ink, breakLine: false, margin: 0.02, valign: "middle", fit: "shrink" });
  const bodyText = body.join("\n\n");
  const bodyFont = bodyText.length > 560 ? 15 : bodyText.length > 350 ? 17 : 20;
  slide.addText(bodyText, { x: 0.86, y: 2.55, w: 7.13, h: 3.65, fontFace: "Aptos", fontSize: bodyFont, color: C.ink, breakLine: false, valign: "top", margin: 0.02, paraSpaceAfter: 15, lineSpacingMultiple: 1.12, fit: "shrink" });
  addArtwork(slide, lesson, title, kind, index);
}

/** Create an editable 16:9 PowerPoint with original vector artwork on every slide. */
export async function createLessonPowerpoint(lesson: LessonDeckSource, content: LessonDeckContent): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "IlluminatED";
  pptx.company = "IlluminatED";
  pptx.subject = `${lesson.subject_title} · ${lesson.key_stage}`;
  pptx.title = lesson.title;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };

  const total = content.slides.length + content.questions.length * 2 + 1;
  let page = 1;
  const cover = pptx.addSlide();
  cover.background = { color: C.paper };
  cover.addShape("rect", { x: 0, y: 0, w: 0.19, h: SH, line: { color: C.violet, transparency: 100 }, fill: { color: C.violet } });
  cover.addText("ILLUMED  ·  LESSON DECK", { x: 0.86, y: 0.72, w: 6.7, h: 0.3, fontFace: "Aptos", fontSize: 11, bold: true, charSpacing: 1.6, color: C.violet, margin: 0 });
  cover.addText(lesson.title, { x: 0.82, y: 1.48, w: 7.05, h: 2.05, fontFace: "Aptos Display", fontSize: lesson.title.length > 36 ? 34 : 42, bold: true, color: C.ink, valign: "middle", margin: 0.02, fit: "shrink" });
  cover.addText(`${lesson.subject_title}  ·  ${lesson.key_stage.toUpperCase()}\n${lesson.unit_title}`, { x: 0.88, y: 3.9, w: 6.7, h: 0.9, fontFace: "Aptos", fontSize: 20, color: C.muted, breakLine: false, margin: 0.02, valign: "top" });
  cover.addText("Learn the key ideas, then check what you remember.", { x: 0.88, y: 5.2, w: 6.65, h: 0.45, fontFace: "Aptos", fontSize: 16, color: C.ink, margin: 0 });
  addArtwork(cover, lesson, lesson.title, "goal", 0, 8.0, 0.94, 4.65, 5.3);
  addFooter(cover, page++, total, lesson.source_url);

  content.slides.forEach((slide, index) => {
    const current = pptx.addSlide();
    const kicker = slide.kind === "goal" ? "Learning goal" : slide.kind === "keyword" ? "Word to know" : slide.kind === "review" ? "Common mistake" : slide.kind === "teaching" ? "Lesson notes" : "Key idea";
    addTitle(current, `${lesson.subject_title} · ${kicker}`, slide.title, slide.body, index + 1, slide.kind, lesson);
    addFooter(current, page++, total, lesson.source_url);
  });

  content.questions.forEach((item, index) => {
    const question = pptx.addSlide();
    addTitle(question, `Recall check ${index + 1}`, "Recall question", [item.question, "Pause here and answer in your own words before moving on."], content.slides.length + index + 1, "question", lesson);
    addFooter(question, page++, total, lesson.source_url);

    const answer = pptx.addSlide();
    addTitle(answer, "Model answer", "Check your thinking", [item.answer, item.explanation], content.slides.length + index + 1, "answer", lesson);
    addFooter(answer, page++, total, lesson.source_url);
  });
  const generated = await pptx.write({ outputType: "uint8array" }) as Uint8Array;
  return new Uint8Array(generated);
}
