// Renders the Locker's item cards (hair, tops, bottoms, shoes, back) with the
// Blender chibi kit: soft studio light, procedural materials, transparent PNGs,
// then converts them to public/characters/chibi/<id>.webp.
//
//   node scripts/render-locker-thumbs.mjs [--only=back-school,top-tee] [--samples=48]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { projectData } from "./lib/project-data.mjs";

const { COSMETICS } = projectData("src/game/core/cosmetics.ts");
const { HAIR, TOP, BOTTOM, SHOES, BACK } = projectData("src/game/core/chibi-looks.ts");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const only = arg("only", "") ? new Set(arg("only").split(",")) : null;
const samples = arg("samples", "48");

const hex = (c) => (c ?? "#cccccc").replace("#", "");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "thumbs-"));
const jobs = [];
for (const item of COSMETICS) {
  if (!["hair", "top", "bottom", "shoes", "back"].includes(item.slot) || (only && !only.has(item.id))) continue;
  const top = item.slot === "top" ? TOP[item.id] ?? TOP["top-tee"] : TOP["top-tee"];
  const look = {
    hair: item.slot === "hair" ? HAIR[item.id] ?? "none" : "short",
    top: top.v,
    bottom: item.slot === "bottom" ? BOTTOM[item.id] : "trousers",
    shoes: item.slot === "shoes" ? SHOES[item.id] : "trainers",
    back: item.slot === "back" ? BACK[item.id]?.v ?? "none" : "none",
    extra: [...(top.extras ?? []), ...(top.cape ? ["cape"] : [])].join(","),
  };
  const spec = {
    ...look, samples, w: "320", h: "380", transparent: "1",
    "col-skin": "d09460", "col-hair": item.slot === "hair" ? "3a2418" : "13203a",
    "col-top": hex(item.slot === "top" ? item.color : "#5b56c8"), "col-top2": hex(top.second ?? "#ffffff"), "col-accent": hex(top.accent ?? "#ff9f1c"),
    "col-bottom": hex(item.slot === "bottom" ? item.color : "#3c5a9a"), "col-shoes": hex(item.slot === "shoes" ? item.color : "#f3f6fb"),
    "col-pack": hex(item.slot === "back" ? item.color : "#e8473b"), "col-membrane": hex(item.slot === "back" ? item.color : "#3b1f4f"),
    "col-pack2": hex(item.slot === "back" ? BACK[item.id]?.second : "#ffcf4a"),
    ...(item.id === "back-fairy" ? { "col-lens": hex(item.color) } : {}),
  };
  jobs.push({ id: item.id, out: path.join(work, `${item.id}.png`), spec, yaw: item.slot === "back" ? 150 : 25 });
}
if (!jobs.length) { console.log("nothing to render"); process.exit(0); }
fs.writeFileSync(path.join(work, "jobs.json"), JSON.stringify(jobs));
console.log(`rendering ${jobs.length} thumbnails…`);
execFileSync("python3", ["art/blender/chibi.py", "batch", path.join(work, "jobs.json")], { stdio: ["ignore", "ignore", "inherit"] });
// Trim to the character and save as WebP at the card's size.
execFileSync("python3", ["-c", `
import sys, json
from PIL import Image
for j in json.load(open(sys.argv[1])):
    im = Image.open(j["out"]).convert("RGBA"); box = im.getbbox()
    if box:
        pad = 6; im = im.crop((max(0, box[0]-pad), max(0, box[1]-pad), min(im.width, box[2]+pad), min(im.height, box[3]+pad)))
    im.thumbnail((320, 380)); canvas = Image.new("RGBA", (320, 380)); canvas.paste(im, ((320-im.width)//2, 380-im.height))
    canvas.save("public/characters/chibi/%s.webp" % j["id"], "WEBP", quality=88)
    print("saved", j["id"])
`, path.join(work, "jobs.json")], { stdio: "inherit" });
