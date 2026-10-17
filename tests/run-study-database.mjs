// Runs the study migration and rollback-only integration checks on disposable PostgreSQL.
// Requires initdb, pg_ctl and psql on PATH. Never connects to the production database.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "illuminated-study-pg-"));
const data = path.join(dir, "data");
const run = (bin, args, input) => {
  const result = spawnSync(bin, args, { input, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${bin}: ${result.stderr || result.stdout || result.error}`);
  return result.stdout;
};
let started = false;
try {
  run("initdb", ["-D", data, "-A", "trust", "--no-locale"]);
  run("pg_ctl", ["-D", data, "-l", path.join(dir, "server.log"), "-o", `-k ${dir} -p 6547 -c listen_addresses=''`, "-w", "start"]);
  started = true;
  const args = ["-h", dir, "-p", "6547", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-X", "-q", "-A", "-t"];
  const sql = (input) => run("psql", args, input);
  const concurrentSql = (input) => new Promise((resolve, reject) => {
    const process = spawn("psql", args, { stdio: ["pipe", "pipe", "pipe"] });
    let errors = "";
    process.stderr.on("data", (data) => { errors += data; });
    process.stdout.resume();
    process.on("error", reject);
    process.on("close", (code) => code === 0 ? resolve() : reject(new Error(errors)));
    process.stdin.end(input);
  });
  sql(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create table public.profiles(id uuid primary key references auth.users, username text, banned boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,private to authenticated,anon;
    create function private.is_active_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and not banned)$$;
    create function private.london_today() returns date language sql stable as $$select (now() at time zone 'Europe/London')::date$$;
    create table public.player_stats(user_id uuid primary key references auth.users, xp integer default 0, clout integer default 0, level integer default 1, updated_at timestamptz default now());
    alter table public.player_stats enable row level security;
    grant select on public.player_stats to authenticated;
    create policy own_stats on public.player_stats for select to authenticated using(user_id=(select auth.uid()));
  `);
  sql(fs.readFileSync("supabase/migrations/20261017134206_learning_study_room.sql", "utf8"));
  sql(fs.readFileSync("tests/study-room-database.sql", "utf8"));
  const uid = "88888888-8888-4888-8888-888888888881";
  const asLearner = `set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true);`;
  sql(`insert into auth.users(id) values('${uid}'); insert into public.profiles(id,username) values('${uid}','concurrency_test');`);
  const start = () => sql(`begin; ${asLearner} select public.study_start_session('gcse-maths')->>'id'; commit;`).trim().split("\n").at(-1);
  const finish = (id) => concurrentSql(`begin; ${asLearner} select public.study_submit_session('${id}',array[0,0,0,0,0]); commit;`);
  const replay = start();
  await Promise.all([finish(replay), finish(replay)]);
  sql(`do $$ begin
    if (select sessions from public.study_progress where user_id='${uid}') <> 1 then raise exception 'Concurrent replay counted twice'; end if;
    if (select xp from public.player_stats where user_id='${uid}') <> (select (result->>'xp')::integer from public.study_sessions where id='${replay}') then raise exception 'Concurrent replay paid twice'; end if;
  end $$;`);
  sql(`update public.study_progress set rewarded_today=9,reward_day=private.london_today() where user_id='${uid}';`);
  const rounds = [start(), start()];
  await Promise.all(rounds.map(finish));
  sql(`do $$ begin
    if (select count(*) from public.study_sessions where id in ('${rounds[0]}','${rounds[1]}') and (result->>'xp')::integer>0) <> 1 then raise exception 'Concurrent requests bypassed reward cap'; end if;
    if (select sessions from public.study_progress where user_id='${uid}') <> 3 then raise exception 'Concurrent practice lost progress'; end if;
  end $$;`);
  console.log("Study database checks passed: scoring, answer secrecy, ownership, bans, replay, reward cap and concurrent submissions.");
} finally {
  if (started) run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]);
  fs.rmSync(dir, { recursive: true, force: true });
}
