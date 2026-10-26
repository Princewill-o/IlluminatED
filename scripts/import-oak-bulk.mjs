/** Extract the supplied ZIP to an ignored directory first. No source data or credentials enter Git. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { mergeOakLesson, normaliseOakCollection, OAK_ATTRIBUTION, OAK_LICENCE } from "./lib/oak-bulk.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const directory = arg("--directory", ".education-export/oak");
const version = arg("--version", "oak-bulk-2026-10-26");
const apply = args.includes("--apply");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const tokenPath = arg("--token-file", null);
const token = tokenPath ? (await fs.readFile(tokenPath, "utf8")).trim() : null;
if (apply && (!url || !(serviceKey || (publicKey && token)))) throw Error("Configure server publishing credentials before --apply");
const lessons = new Map(), units = new Map(), files = [];
for (const file of (await fs.readdir(directory)).filter(f => /-(primary|secondary)\.json$/.test(f)).sort()) {
  const raw = await fs.readFile(path.join(directory,file));
  const data = JSON.parse(raw);
  const rows = normaliseOakCollection(data, version);
  for (const unit of rows.units) units.set(unit.unit_id, unit);
  for (const lesson of rows.lessons) lessons.set(lesson.slug, mergeOakLesson(lessons.get(lesson.slug), lesson));
  files.push({ name: file, sha256: createHash("sha256").update(raw).digest("hex"), lessons: rows.lessons.length });
}
if (!files.length) throw Error("No Oak subject JSON files found");
const report = { version, source: "Oak National Academy", attribution: OAK_ATTRIBUTION, licence: OAK_LICENCE,
  collections: files.length, units: units.size, lessons: lessons.size,
  readable_lessons: [...lessons.values()].filter(l => !l.restricted).length,
  restricted_lessons: [...lessons.values()].filter(l => l.restricted).length,
  transcripts: [...lessons.values()].filter(l => !l.restricted && l.content.transcript_sentences).length,
  key_stages: [...new Set([...lessons.values()].map(l => l.key_stage))].sort(), files };
await fs.writeFile(".education-export/oak-report.json", JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({ ...report, files: `${files.length} hashed source files` }));
if (!apply) process.exit(0);

async function request(table, rows) {
  const endpoint = token ? "rpc/import_oak_batch_temporary" : table;
  const body = JSON.stringify(token ? {p_token: token,p_table:table,p_rows:rows} : rows);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${url}/rest/v1/${endpoint}`, { method:"POST", signal:AbortSignal.timeout(90000),
        headers:{apikey:serviceKey ?? publicKey, ...(serviceKey ? {Authorization:`Bearer ${serviceKey}`} : {}), "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal"}, body });
      if (!res.ok) { const error = await res.json().catch(()=>({})); throw Error(`${table} HTTP ${res.status}: ${error.code ?? "request_failed"}`); }
      return;
    } catch(error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, (attempt+1)*1500)); }
  }
}
async function publish(table, values) {
  const batches = []; let batch=[], size=0;
  for (const row of values) {
    const bytes=Buffer.byteLength(JSON.stringify(row));
    if (batch.length && (size+bytes>1400000 || batch.length>=40)) { batches.push(batch); batch=[]; size=0; }
    batch.push(row);size+=bytes;
  }
  if (batch.length) batches.push(batch);
  let next=0, done=0;
  await Promise.all(Array.from({length:3},async()=>{ while(next<batches.length) { const rows=batches[next++];await request(table,rows);done+=rows.length;if(done%500<40 || done===values.length)console.log(`${table}: ${done}/${values.length}`); } }));
}
await publish("oak_units", [...units.values()]);
await publish("oak_lessons", [...lessons.values()]);
// The marker is written last: incomplete imports never inflate advertised totals.
await request("oak_imports", [{version, report, completed_at: new Date().toISOString()}]);
console.log("Oak import completed; verify counts through the read-only API.");
