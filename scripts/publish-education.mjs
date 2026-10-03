/** Run after source validation. Uses a server secret; never a browser/publishable key. */
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { projectData } from "./lib/project-data.mjs";
const { COURSES } = projectData("src/lib/data/courses.ts");
const { curriculumForCourse } = projectData("src/lib/education.ts");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const snapshots = JSON.parse(
  await fs.readFile("src/lib/data/education/opportunities.json", "utf8"),
);
const stamp = new Date().toISOString();
const catalogue = (
  process.argv.includes("--opportunities-only") ? [] : COURSES
).map((c) => ({
  course_id: c.id,
  content: curriculumForCourse(c.id),
  updated_at: stamp,
}));
if (process.argv.includes("--sql")) {
  const quote = (v) =>
    "'" + JSON.stringify(v).replaceAll("'", "''") + "'::jsonb";
  const lines = ["begin;"];
  for (const row of catalogue)
    lines.push(
      `insert into public.education_catalogue (course_id,content,updated_at) values ('${row.course_id}',${quote(row.content)},now()) on conflict (course_id) do update set content=excluded.content,updated_at=excluded.updated_at;`,
    );
  lines.push(
    `insert into public.education_source_snapshots (id,content,updated_at) values ('opportunities',${quote(snapshots)},now()) on conflict (id) do update set content=excluded.content,updated_at=excluded.updated_at;`,
    "commit;",
  );
  const path = process.argv[process.argv.indexOf("--sql") + 1];
  if (!path || path.startsWith("--"))
    throw new Error("Supply an output file after --sql");
  await fs.writeFile(path, lines.join("\n") + "\n");
  console.log(
    `Exported ${catalogue.length} course records and the opportunity snapshot.`,
  );
} else {
  if (!url || !key) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server. No upload performed.",
    );
    process.exitCode = 1;
  } else {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    for (let i = 0; i < catalogue.length; i += 8) {
      const { error } = await sb
        .from("education_catalogue")
        .upsert(catalogue.slice(i, i + 8));
      if (error) throw new Error(`Catalogue batch failed: ${error.code}`);
    }
    const { error } = await sb
      .from("education_source_snapshots")
      .upsert({ id: "opportunities", content: snapshots, updated_at: stamp });
    if (error) throw new Error(`Snapshot upload failed: ${error.code}`);
    if (catalogue.length) {
      const { count, error: check } = await sb
        .from("education_catalogue")
        .select("course_id", { count: "exact", head: true });
      if (check || count < catalogue.length)
        throw new Error("Uploaded catalogue count did not match");
    }
    const { data: checked, error: readError } = await sb
      .from("education_source_snapshots")
      .select("content")
      .eq("id", "opportunities")
      .single();
    if (readError || checked.content.items.length !== snapshots.items.length)
      throw new Error("Snapshot verification failed");
    console.log(
      `Verified ${catalogue.length} published course records and ${snapshots.items.length} stored opportunities.`,
    );
  }
}
