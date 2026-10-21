#!/usr/bin/env node
/**
 * Loads data/question-bank/questions.jsonl into Supabase (public.bank_questions).
 * Run the migration supabase/migrations/20261021200000_question_bank.sql first.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=<service role / secret key> \
 *     node scripts/import-question-bank.mjs
 *
 * Re-running is safe: rows are upserted by id. Review status and publish_ready
 * are taken from the file (all drafts) unless --keep-review is passed, in which
 * case existing review decisions in the database are left alone.
 */
import fs from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (the secret/service-role key, never the publishable key).");
  process.exit(1);
}
const keepReview = process.argv.includes("--keep-review");
const file = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "data", "question-bank", "questions.jsonl");
const rows = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => {
  const r = JSON.parse(l);
  const row = {
    id: r.id, level: r.level, subject: r.subject, topic: r.topic, question_type: r.question_type,
    question: r.question, answer: String(r.answer ?? ""), explanation: r.explanation ?? "", marks: Number(r.marks) || 1,
    difficulty: r.difficulty ?? "ungraded", source: r.source, licence: r.licence, exam_board: r.exam_board ?? "generic",
    official_past_paper: Boolean(r.official_past_paper), board_alignment_status: r.board_alignment_status ?? "NOT_VERIFIED",
    exam_board_targets: r.exam_board_targets ?? [], curriculum_tags: r.curriculum_tags ?? [],
  };
  if (!keepReview) Object.assign(row, { review_status: r.review_status, publish_ready: Boolean(r.publish_ready) });
  return row;
});

let done = 0;
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);
  const res = await fetch(`${url}/rest/v1/bank_questions?on_conflict=id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    console.error(`Batch at ${i} failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  done += batch.length;
  console.log(`Imported ${done} / ${rows.length}`);
}
console.log("Question bank loaded.");
