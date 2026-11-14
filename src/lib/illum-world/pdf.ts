import {
  degrees,
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";

import {
  decisionLabel,
  MISSION_TITLE,
  REPAIR_DEVICES,
  REPAIR_SKILLS,
  pounds,
  projectStatusLabel,
  signedPounds,
  type RepairProject,
} from "./repair";

const ink = rgb(0.08, 0.13, 0.23);
const black = rgb(0.06, 0.07, 0.09);
const navy = rgb(0.035, 0.2, 0.47);
const navyDeep = rgb(0.02, 0.13, 0.33);
const gold = rgb(0.83, 0.67, 0.33);
const goldLight = rgb(0.93, 0.82, 0.55);
/** Darker gold keeps large gold text readable on white (about 3.4:1). */
const goldText = rgb(0.62, 0.46, 0.13);
const grey = rgb(0.36, 0.4, 0.47);
const white = rgb(1, 1, 1);
const safe = (value: string) =>
  value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, "?");
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safe(text).split("\n")) {
    let line = "";
    const words = paragraph.split(/\s+/).flatMap((word) => {
      const chunks: string[] = [];
      let chunk = "";
      for (const c of word) {
        if (chunk && font.widthOfTextAtSize(chunk + c, size) > width) {
          chunks.push(chunk);
          chunk = c;
        } else chunk += c;
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

export async function makeProjectPdf(project: RepairProject, learner: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${MISSION_TITLE} - ${learner}`);
  pdf.setAuthor("IlluminatED Learning");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 778;
  const footer = () =>
    page.drawText(
      `IllumWorld | Project ${project.id.slice(0, 8)} | Page ${pdf.getPageCount()}`,
      { x: 44, y: 28, font: regular, size: 8, color: grey },
    );
  const line = (text: string, size = 10.5, strong = false) => {
    for (const value of wrap(text, strong ? bold : regular, size, 505)) {
      if (y < 64) {
        footer();
        page = pdf.addPage([595.28, 841.89]);
        y = 786;
      }
      page.drawText(value, {
        x: 44,
        y,
        font: strong ? bold : regular,
        size,
        color: ink,
      });
      y -= size * 1.48;
    }
    y -= 6;
  };
  page.drawRectangle({
    x: 0,
    y: 814,
    width: 595.28,
    height: 28,
    color: navy,
  });
  page.drawRectangle({ x: 0, y: 811, width: 595.28, height: 3, color: gold });
  line("ILLUMWORLD / ILLUMINATED LEARNING", 10, true);
  y -= 10;
  line(MISSION_TITLE, 25, true);
  line(`Learner: ${learner} | ${projectStatusLabel(project.status)}`, 11);
  line(
    `Submitted: ${project.submitted_at ? day(project.submitted_at) : "Not submitted"} | Version: ${project.revision} | Calculations: ${project.score}/3`,
  );
  line(
    "Virtual work experience project. All devices and prices are fictional; profits are before other costs.",
    9,
  );
  y -= 8;
  for (const d of REPAIR_DEVICES) {
    // Keep a normal-length inspection case together; long pupil text can still
    // flow naturally across pages through the line writer.
    if (y < 300) {
      footer();
      page = pdf.addPage([595.28, 841.89]);
      y = 786;
    }
    const answer = project.answers.devices.find((a) => a.id === d.id);
    line(d.name, 16, true);
    line(
      `Acquisition ${pounds(d.acquisition)} | Repair ${pounds(d.repair)} | Expected resale ${pounds(d.resale)} | As-is ${pounds(d.asIs)}`,
      10,
    );
    line("Inspection evidence", 10, true);
    for (const note of d.notes) line(`- ${note}`, 9.5);
    line(
      `Learner's expected profit: ${signedPounds(answer?.profit)} | Recommendation: ${decisionLabel(answer?.decision)}`,
      10,
      true,
    );
    line(answer?.reason || "No reasoning entered.");
    y -= 8;
  }
  line("Customer condition report", 16, true);
  line(
    `Device: ${REPAIR_DEVICES.find((d) => d.id === project.answers.reportDevice)?.name ?? "Unknown"}`,
    10,
    true,
  );
  line(project.answers.report || "No report entered.");
  if (project.feedback) {
    y -= 8;
    line("Teacher feedback", 16, true);
    line(project.feedback);
  }
  if (project.approved_at)
    line(`Teacher approved: ${day(project.approved_at)}`, 11, true);
  y -= 6;
  line(
    "An IlluminatED Learning project record. This is not an externally accredited qualification or evidence of a real work placement.",
    8.5,
  );
  footer();
  return pdf.save();
}

/** Verified context for an awarded certificate. Every field comes from the
 * database (the reviewing teacher and the assignment's class); none is typed
 * by the pupil. Missing values are omitted rather than invented. */
export interface CertificateDetails {
  teacher?: string | null;
  className?: string | null;
  assignmentTitle?: string | null;
}

export const certificateId = (projectId: string) =>
  `IW-${projectId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const W = 841.89;
const H = 595.28;
/** Content column to the right of the navy band. */
const COL_L = 262;
const COL_R = 800;
const MID = (COL_L + COL_R) / 2;

export async function makeCertificatePdf(
  project: RepairProject | null,
  learner: string,
  sample = false,
  details: CertificateDetails = {},
) {
  if (
    !sample &&
    (!project ||
      project.status !== "approved" ||
      !project.approved_at ||
      !project.assignment_id)
  )
    throw new Error("Teacher approval is required.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    sample
      ? "SAMPLE - IllumWorld certificate (not awarded)"
      : `${MISSION_TITLE} - Project completion certificate`,
  );
  pdf.setAuthor("IlluminatED Learning");
  pdf.setSubject(
    "IllumWorld virtual work experience project record. Not an externally accredited qualification.",
  );
  const page = pdf.addPage([W, H]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const display = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const fitSize = (text: string, font: PDFFont, size: number, max: number) =>
    Math.min(size, max / Math.max(font.widthOfTextAtSize(text, 1), 1));
  const centre = (
    text: string,
    y: number,
    {
      size = 12,
      font = regular,
      color = ink,
      max = COL_R - COL_L,
      x = MID,
    }: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      max?: number;
      x?: number;
    } = {},
  ) => {
    const content = safe(text);
    const fit = fitSize(content, font, size, max);
    page.drawText(content, {
      x: x - font.widthOfTextAtSize(content, fit) / 2,
      y,
      font,
      size: fit,
      color,
    });
    return fit;
  };
  const rule = (x1: number, x2: number, y: number, thickness = 0.8) =>
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness,
      color: black,
    });

  // --- Frame: white page, navy angular band with a fine gold edge ---------
  const m = 22; // white margin, as in the reference
  const top = H - m;
  const bottom = m;
  const bandTop = 212; // band width at the top and bottom edges
  const notch = 62; // how far the chevron's point sits from the margin
  // drawSvgPath uses SVG coordinates (y down) from the given origin.
  const svgY = (y: number) => H - y;
  page.drawSvgPath(
    `M ${m} ${svgY(top)} L ${bandTop + 9} ${svgY(top)} L ${notch + 9} ${H / 2} L ${bandTop + 9} ${svgY(bottom)} L ${m} ${svgY(bottom)} Z`,
    { x: 0, y: H, color: gold },
  );
  page.drawSvgPath(
    `M ${m} ${svgY(top)} L ${bandTop} ${svgY(top)} L ${notch} ${H / 2} L ${bandTop} ${svgY(bottom)} L ${m} ${svgY(bottom)} Z`,
    { x: 0, y: H, color: navy },
  );
  // A slightly deeper inner facet gives the band depth without imagery.
  page.drawSvgPath(
    `M ${m} ${svgY(top)} L ${m + 70} ${svgY(top)} L ${m + 22} ${H / 2} L ${m + 70} ${svgY(bottom)} L ${m} ${svgY(bottom)} Z`,
    { x: 0, y: H, color: navyDeep, opacity: 0.55 },
  );
  // Brand identity on the band (IlluminatED's own marks only).
  page.drawText("IlluminatED", {
    x: m + 18,
    y: top - 40,
    font: bold,
    size: 15,
    color: white,
  });
  page.drawText("LEARNING", {
    x: m + 18,
    y: top - 56,
    font: bold,
    size: 8,
    color: goldLight,
  });
  page.drawText("IllumWorld", {
    x: m + 18,
    y: bottom + 40,
    font: bold,
    size: 11,
    color: white,
  });
  page.drawText("Virtual work experience", {
    x: m + 18,
    y: bottom + 26,
    font: regular,
    size: 8,
    color: goldLight,
  });
  // Fine gold line framing the content edge, echoing the reference.
  page.drawRectangle({
    x: m,
    y: m,
    width: W - 2 * m,
    height: H - 2 * m,
    borderColor: gold,
    borderWidth: 1.2,
  });

  // --- Heading ----------------------------------------------------------------
  if (sample)
    centre("SAMPLE - NOT AWARDED", top - 26, {
      size: 11,
      font: bold,
      color: goldText,
    });
  centre("CERTIFICATE", top - 82, { size: 54, font: bold, color: black });
  centre("OF PROJECT COMPLETION", top - 112, {
    size: 21,
    font: bold,
    color: black,
  });
  centre("This is to certify that", top - 150, {
    size: 14,
    font: italic,
    color: ink,
  });

  // --- Recipient ----------------------------------------------------------------
  const nameY = top - 200;
  centre(learner, nameY, { size: 40, font: display, color: goldText, max: 470 });
  rule(MID - 225, MID + 225, nameY - 13);

  // --- Achievement (the pupil's actual project, not generic praise) ---------
  const achievement = [
    `completed the ${MISSION_TITLE} virtual workplace project: three correct`,
    "profit calculations, evidence-based repair decisions and a customer",
    "condition report, reviewed and approved by their teacher.",
  ];
  achievement.forEach((line, i) =>
    centre(line, nameY - 42 - i * 17, { size: 12, color: ink }),
  );
  const skillsY = nameY - 104;
  centre("SKILLS DEMONSTRATED", skillsY, {
    size: 8.5,
    font: bold,
    color: goldText,
  });
  // Two columns of two, each with a small gold diamond marker.
  REPAIR_SKILLS.forEach((skill, i) => {
    const colX = i % 2 === 0 ? MID - 128 : MID + 128;
    const y = skillsY - 20 - Math.floor(i / 2) * 18;
    const size = fitSize(safe(skill), regular, 10.5, 230);
    const w = regular.widthOfTextAtSize(safe(skill), size);
    const x = colX - w / 2;
    page.drawSvgPath("M 0 -3.2 L 3.2 0 L 0 3.2 L -3.2 0 Z", {
      x: x - 9,
      y: y + 3.6,
      color: gold,
    });
    page.drawText(safe(skill), { x, y, size, font: regular, color: ink });
  });

  // --- Date, signatory blocks and seal ---------------------------------------
  const approvedOn = sample
    ? "[completion date]"
    : day(project!.approved_at!);
  const sigY = 112;
  const leftX = COL_L + 95;
  const rightX = COL_R - 95;
  const blockWidth = 170;
  // Left: the verified approving teacher. Typed name, never a drawn signature.
  const teacher = sample
    ? "[Approving teacher]"
    : details.teacher
      ? `@${details.teacher.replace(/^@/, "")}`
      : "Class teacher";
  centre(teacher, sigY + 8, {
    size: 13,
    font: bold,
    color: ink,
    x: leftX,
    max: blockWidth,
  });
  rule(leftX - blockWidth / 2, leftX + blockWidth / 2, sigY);
  centre("Approving teacher", sigY - 13, {
    size: 9.5,
    color: grey,
    x: leftX,
    max: blockWidth,
  });
  const classLine = sample ? "[Class name]" : details.className;
  if (classLine)
    centre(classLine, sigY - 26, {
      size: 8.5,
      color: grey,
      x: leftX,
      max: blockWidth,
    });
  // Right: date of approval.
  centre(approvedOn, sigY + 8, {
    size: 13,
    font: bold,
    color: ink,
    x: rightX,
    max: blockWidth,
  });
  rule(rightX - blockWidth / 2, rightX + blockWidth / 2, sigY);
  centre("Date approved", sigY - 13, {
    size: 9.5,
    color: grey,
    x: rightX,
    max: blockWidth,
  });
  centre("Issued by IlluminatED Learning", sigY - 26, {
    size: 8.5,
    color: grey,
    x: rightX,
    max: blockWidth,
  });

  // Seal: IlluminatED's own project mark. Wording is deliberately a project
  // record, not an awarding body, so it implies no external accreditation.
  const sealX = MID;
  const sealY = sigY + 4;
  page.drawCircle({ x: sealX, y: sealY, size: 40, color: gold });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 35,
    borderColor: goldLight,
    borderWidth: 1.4,
  });
  page.drawCircle({ x: sealX, y: sealY, size: 27, color: goldLight });
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: 27,
    borderColor: goldText,
    borderWidth: 0.6,
  });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    page.drawCircle({
      x: sealX + Math.cos(a) * 31,
      y: sealY + Math.sin(a) * 31,
      size: 0.9,
      color: goldLight,
    });
  }
  centre("ILLUMWORLD", sealY + 8, {
    size: 6.4,
    font: bold,
    color: navy,
    x: sealX,
    max: 48,
  });
  centre("PROJECT", sealY - 1, {
    size: 7.2,
    font: bold,
    color: navy,
    x: sealX,
    max: 48,
  });
  centre("COMPLETE", sealY - 10, {
    size: 7.2,
    font: bold,
    color: navy,
    x: sealX,
    max: 48,
  });

  // --- Reference and honest scope note ---------------------------------------
  centre(
    sample
      ? "Illustrative sample only. This certificate has not been earned."
      : `Certificate ID ${certificateId(project!.id)}  |  Project version ${project!.revision}${details.assignmentTitle ? `  |  ${details.assignmentTitle}` : ""}`,
    48,
    { size: 8, color: grey },
  );
  centre(
    "An IlluminatED Learning project record. Not an externally accredited qualification, employer endorsement or real work placement.",
    35,
    { size: 7.5, color: grey },
  );

  if (sample) {
    // Large, light diagonal watermark so a sample can never pass as awarded.
    const mark = "SAMPLE";
    const size = 120;
    const w = bold.widthOfTextAtSize(mark, size);
    page.drawText(mark, {
      x: MID - (w / 2) * Math.cos(Math.PI / 9) + 10,
      y: H / 2 - (w / 2) * Math.sin(Math.PI / 9) - 10,
      size,
      font: bold,
      color: navy,
      opacity: 0.07,
      rotate: degrees(20),
    });
  }
  return pdf.save();
}
