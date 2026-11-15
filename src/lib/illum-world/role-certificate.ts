import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

import {
  contractMinutes,
  markContract,
  type RoleContract,
} from "./role-contracts";

import { logoFor } from "@/game/core/logos";

const safe = (value: string) =>
  value
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "")
    .trim();
/** This is an in-game knowledge-check completion record, never an employer or accredited qualification. */
export async function makeRoleCertificate(
  course: RoleContract,
  answers: unknown,
  learner: string,
  logo: Uint8Array,
  details: { id: string; date: string; sample?: boolean },
) {
  if (!details.sample && !markContract(course, answers).complete)
    throw new Error("Finish every shift knowledge check first.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `${details.sample ? "SAMPLE - " : ""}IllumWorld ${course.title} - In-game course completion`,
  );
  pdf.setAuthor("IlluminatED");
  const p = pdf.addPage([841.89, 595.28]),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold),
    display = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const ink = rgb(0.115, 0.1, 0.29),
    gold = rgb(0.73, 0.53, 0.14),
    muted = rgb(0.35, 0.38, 0.47),
    white = rgb(1, 1, 1);
  p.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: white });
  p.drawRectangle({
    x: 22,
    y: 22,
    width: 798,
    height: 551,
    borderWidth: 2,
    borderColor: gold,
  });
  p.drawRectangle({
    x: 31,
    y: 31,
    width: 780,
    height: 533,
    borderWidth: 0.7,
    borderColor: ink,
  });
  p.drawRectangle({ x: 32, y: 518, width: 778, height: 45, color: ink });
  p.drawText("ILLUMWORLD  /  IN-GAME LEARNING", {
    x: 54,
    y: 536,
    font: bold,
    size: 12,
    color: white,
  });
  p.drawText(details.sample ? "SAMPLE - NOT AWARDED" : "COURSE COMPLETION", {
    x: 552,
    y: 536,
    font: bold,
    size: 10,
    color: white,
  });
  const companyMark = logoFor(course.workplaceId);
  if (!companyMark)
    throw new Error("The contract workplace is missing its logo.");

  const illuminatEDMark = await pdf.embedPng(logo);
  const logoWidth = 188;
  const logoHeight =
    (logoWidth * illuminatEDMark.height) / illuminatEDMark.width;
  const badgeSize = 43;
  const companyText = safe(course.workplace);
  const companyTextSize = 25;
  const companyTextWidth = bold.widthOfTextAtSize(companyText, companyTextSize);
  const gap = 17;
  const separatorWidth = regular.widthOfTextAtSize("×", 23);
  const totalWidth =
    badgeSize + 10 + companyTextWidth + gap * 2 + separatorWidth + logoWidth;
  const left = (p.getWidth() - totalWidth) / 2;
  const centerY = 470;
  const badgeTop = centerY + badgeSize / 2;
  const colour = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return rgb(
      (value >> 16) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255,
    );
  };

  // Share the game's badge artwork so the certificate matches the signs, uniforms and phone.
  const badgeOptions = { x: left, y: badgeTop, scale: badgeSize / 64 };
  p.drawSvgPath(
    "M16 0H48Q64 0 64 16V48Q64 64 48 64H16Q0 64 0 48V16Q0 0 16 0Z",
    {
      ...badgeOptions,
      color: colour(companyMark.bg),
    },
  );
  for (const shape of companyMark.shapes) {
    if (shape.fill !== "none")
      p.drawSvgPath(shape.d, { ...badgeOptions, color: colour(shape.fill) });
  }
  p.drawText(companyText, {
    x: left + badgeSize + 10,
    y: centerY - 8,
    font: bold,
    size: companyTextSize,
    color: ink,
  });
  const separatorX = left + badgeSize + 10 + companyTextWidth + gap;
  p.drawText("×", {
    x: separatorX,
    y: centerY - 7,
    font: regular,
    size: 23,
    color: muted,
  });
  p.drawImage(illuminatEDMark, {
    x: separatorX + separatorWidth + gap,
    y: centerY - logoHeight / 2,
    width: logoWidth,
    height: logoHeight,
  });
  const center = (
    str: string,
    y: number,
    size: number,
    font = regular,
    col = ink,
  ) => {
    const value = safe(str);
    const fit = Math.min(
      size,
      (730 / Math.max(1, font.widthOfTextAtSize(value, size))) * size,
    );
    p.drawText(value, {
      x: (842 - font.widthOfTextAtSize(value, fit)) / 2,
      y,
      font,
      size: fit,
      color: col,
    });
  };
  center("CERTIFICATE OF COMPLETION", 399, 30, display);
  center("This records that", 360, 11, regular, muted);
  center(
    details.sample ? "Sample Player" : safe(learner).slice(0, 60) || "Player",
    315,
    36,
    display,
    gold,
  );
  center("completed the original IlluminatED in-game course", 283, 12);
  center(course.title, 247, 25, bold);
  center(
    `Three learning shifts - ${contractMinutes(course)} minutes suggested, self-paced`,
    222,
    11,
    regular,
    muted,
  );
  center("Knowledge checks completed across:", 184, 10, regular, muted);
  center(course.skills.slice(0, 2).join("  /  "), 162, 12, bold);
  center(course.skills.slice(2).join("  /  "), 142, 12, bold);
  const date = new Date(details.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
  p.drawLine({
    start: { x: 66, y: 114 },
    end: { x: 776, y: 114 },
    thickness: 0.8,
    color: gold,
  });
  p.drawText(`Issued by IlluminatED | ${safe(date)}`, {
    x: 66,
    y: 93,
    font: regular,
    size: 9,
    color: ink,
  });
  p.drawText(`Record: ${safe(details.id)}`, {
    x: 552,
    y: 93,
    font: regular,
    size: 9,
    color: ink,
  });
  center(
    "Issued independently by IlluminatED for completing a simulated workplace course in IllumWorld.",
    65,
    8,
    regular,
    muted,
  );
  center(
    "Player name supplied for this activity; identity is not independently verified.",
    49,
    7.5,
    regular,
    muted,
  );
  if (details.sample)
    p.drawText("SAMPLE - NOT AWARDED", {
      x: 125,
      y: 175,
      size: 55,
      font: bold,
      color: rgb(0.5, 0.5, 0.6),
      opacity: 0.15,
      rotate: degrees(21),
    });
  return pdf.save();
}
