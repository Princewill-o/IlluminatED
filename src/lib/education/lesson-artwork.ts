export type LessonArtworkKind = "goal" | "learn" | "keyword" | "teaching" | "review" | "question" | "answer";

function topicFamily(subject: string, title: string) {
  const text = `${subject} ${title}`.toLowerCase();
  if (/math|number|algebra|geometry|statistic|fraction|ratio/.test(text)) return "math";
  if (/science|biology|chemistry|physics|cell|energy|force|plant|atom/.test(text)) return "science";
  if (/english|literature|poetry|novel|language|writing|reading/.test(text)) return "english";
  if (/history|historical|empire|war|civilisation|civilization/.test(text)) return "history";
  if (/geography|place|climate|river|coast|landscape|weather/.test(text)) return "geography";
  if (/comput|digital|algorithm|program|coding|data|network/.test(text)) return "computing";
  return "general";
}

/** A lightweight, original vector illustration used in the live deck and its PPTX export. */
export function lessonSlideArtwork(title: string, subject: string, kind: LessonArtworkKind, index: number) {
  const family = topicFamily(subject, title);
  const palettes: Record<string, [string, string, string]> = {
    math: ["#e9f3ff", "#2764ca", "#8fbaff"],
    science: ["#e5f7f1", "#087d73", "#74cbb2"],
    english: ["#f9edf3", "#a34775", "#e3a7c3"],
    history: ["#f7f0df", "#9c632d", "#d8ae69"],
    geography: ["#e9f3eb", "#3e7755", "#a4c6a1"],
    computing: ["#ebedff", "#514db0", "#a6a2ef"],
    general: ["#f0edff", "#6252b7", "#b8adf0"],
  };
  const [paper, ink, accent] = palettes[family];
  const shift = (index % 5) * 18;
  const art: Record<string, string> = {
    math: `<path d="M130 650H850" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><path d="M190 625v48m132-48v32m132-32v48m132-48v32m132-32v48" stroke="${ink}" stroke-width="8" stroke-linecap="round"/><circle cx="${190 + (index % 5) * 132}" cy="650" r="30" fill="${accent}" stroke="${ink}" stroke-width="9"/><rect x="260" y="230" width="${160 + shift}" height="250" rx="30" fill="${accent}"/><rect x="485" y="320" width="${190 - shift}" height="160" rx="30" fill="#fff" stroke="${ink}" stroke-width="10"/><path d="M320 390h44m-22-22v44M548 382h70" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>`,
    science: `<path d="M490 420c-135-230 135-230 0 0s-135 230 0 0 135-230 0 0" fill="none" stroke="${ink}" stroke-width="11"/><circle cx="490" cy="420" r="60" fill="${accent}"/><circle cx="470" cy="395" r="18" fill="#fff"/><circle cx="380" cy="274" r="26" fill="${ink}"/><circle cx="640" cy="500" r="26" fill="${ink}"/><circle cx="492" cy="673" r="26" fill="${ink}"/><path d="M200 690c90-54 180-54 270 0s180 54 270 0" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>`,
    english: `<path d="M178 265q155-80 312 10v405q-157-90-312-10z" fill="#fff" stroke="${ink}" stroke-width="12"/><path d="M490 275q157-90 312-10v405q-155-70-312 10z" fill="${accent}" stroke="${ink}" stroke-width="12"/><path d="M222 350h205m-205 55h190m-190 55h166m145-100h202m-202 55h175m-175 55h195" stroke="${ink}" stroke-width="10" stroke-linecap="round" opacity=".72"/><path d="M490 275v405" stroke="${ink}" stroke-width="9"/><circle cx="735" cy="250" r="64" fill="${ink}"/><path d="M712 225v45h48" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,
    history: `<path d="M150 535H850" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><circle cx="230" cy="535" r="42" fill="${accent}" stroke="${ink}" stroke-width="9"/><circle cx="490" cy="535" r="42" fill="#fff" stroke="${ink}" stroke-width="9"/><circle cx="750" cy="535" r="42" fill="${accent}" stroke="${ink}" stroke-width="9"/><path d="M230 490V325m260 165V250m260 240V325" stroke="${ink}" stroke-width="10"/><path d="M170 325h120m-60-60v120M430 250h120m-60-60v120M690 325h120m-60-60v120" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><rect x="${355 + shift}" y="650" width="275" height="50" rx="24" fill="${accent}"/>`,
    geography: `<path d="M130 320q145-135 280 0t280 0 250 0M130 410q145-135 280 0t280 0 250 0M130 500q145-135 280 0t280 0 250 0M130 590q145-135 280 0t280 0 250 0" fill="none" stroke="${accent}" stroke-width="13" stroke-linecap="round"/><circle cx="${490 + shift}" cy="410" r="72" fill="${ink}"/><circle cx="${490 + shift}" cy="410" r="27" fill="#fff"/><path d="M490 482l-55 112q55 52 110 0z" fill="${ink}"/><path d="M720 260l25 72 72 25-72 25-25 72-25-72-72-25 72-25z" fill="${accent}" stroke="${ink}" stroke-width="8"/>`,
    computing: `<rect x="175" y="250" width="630" height="405" rx="34" fill="#fff" stroke="${ink}" stroke-width="14"/><path d="M175 335h630" stroke="${ink}" stroke-width="12"/><circle cx="230" cy="294" r="14" fill="${accent}"/><circle cx="278" cy="294" r="14" fill="${accent}"/><circle cx="326" cy="294" r="14" fill="${accent}"/><path d="M290 425l-65 52 65 52m${100 + shift} -104 65 52-65 52m172-104-57 104" fill="none" stroke="${ink}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><rect x="405" y="665" width="170" height="28" rx="14" fill="${accent}"/>`,
    general: `<path d="M190 570c135-190 260-190 395 0s260 190 385 0" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/><circle cx="220" cy="535" r="70" fill="#fff" stroke="${ink}" stroke-width="11"/><circle cx="${490 + shift}" cy="430" r="95" fill="${accent}" stroke="${ink}" stroke-width="11"/><circle cx="760" cy="535" r="70" fill="#fff" stroke="${ink}" stroke-width="11"/><path d="M205 535h30m-15-15v30m250-120h20m-10-10v20m270 115h30m-15-15v30" stroke="${ink}" stroke-width="11" stroke-linecap="round"/>`,
  };
  const backdrop = kind === "question" ? "#eff6ff" : kind === "answer" ? "#e9f8f2" : paper;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" viewBox="0 0 1000 800"><rect width="1000" height="800" rx="52" fill="${backdrop}"/><circle cx="${820 - shift}" cy="165" r="160" fill="${accent}" opacity=".24"/><circle cx="165" cy="690" r="142" fill="${accent}" opacity=".16"/><path d="M70 120h190" stroke="${ink}" stroke-width="14" stroke-linecap="round" opacity=".3"/><g>${art[family]}</g><rect x="70" y="724" width="${130 + (index % 4) * 44}" height="18" rx="9" fill="${ink}" opacity=".65"/></svg>`;
}

export function lessonSlideArtworkData(title: string, subject: string, kind: LessonArtworkKind, index: number) {
  return `data:image/svg+xml,${encodeURIComponent(lessonSlideArtwork(title, subject, kind, index))}`;
}
