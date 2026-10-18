// Disposable embedded PostgreSQL. This never targets the hosted database.
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(
  process.env.PGLITE_MODULE
    ? pathToFileURL(process.env.PGLITE_MODULE).href
    : "@electric-sql/pglite"
);
const db = new PGlite();
let checks = 0;
const uid = (n) => `77777777-7777-4777-8777-${String(n).padStart(12, "0")}`;
const client = (n) => `66666666-6666-4666-8666-${String(n).padStart(12, "0")}`;
const topic = () =>
  db.query("select topic from private.world_leases order by user_id");
async function as(n, sql, args = [], role = "authenticated") {
  await db.exec(`begin;set local role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
    n ? uid(n) : "",
  ]);
  try {
    const result = await db.query(sql, args);
    await db.exec("commit");
    return result.rows[0]?.value;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const claim = (n, map = "city", server = "lse-1", cid = client(n ?? 1)) =>
  as(n, "select public.world_claim($1,$2,$3) value", [map, server, cid]);
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};
try {
  await db.exec(`
    create role anon;create role authenticated;
    create schema auth;create schema private;create schema realtime;
    create table auth.users(id uuid primary key);
    create table public.profiles(id uuid primary key,banned boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function private.is_active_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and not banned)$$;
    create function realtime.topic() returns text language sql stable as $$select current_setting('request.realtime.topic',true)$$;
    create table realtime.messages(topic text);
    alter table realtime.messages enable row level security;
    grant usage on schema private,auth,realtime to anon,authenticated;
    grant select,insert on realtime.messages to authenticated;
    insert into auth.users select ('77777777-7777-4777-8777-'||lpad(n::text,12,'0'))::uuid from generate_series(1,30)n;
    insert into public.profiles(id) select id from auth.users;
  `);
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/20261018120000_world_admission.sql",
      "utf8",
    ),
  );
  await assert.rejects(
    as(null, "select public.world_counts() value", [], "anon"),
    /permission denied/,
  );
  checks++;
  await assert.rejects(claim(null), /not_allowed/);
  checks++;
  await assert.rejects(claim(1, "home"), /invalid/);
  checks++;
  await assert.rejects(claim(1, "city", "arbitrary"), /invalid/);
  checks++;
  await assert.rejects(
    as(1, "select * from private.world_leases"),
    /permission denied/,
  );
  checks++;
  await assert.rejects(
    as(1, "update private.world_limits set event_budget=99999"),
    /permission denied/,
  );
  checks++;
  const first = await claim(1);
  check(
    first.accepted && first.topic.startsWith("world:room:city:lse-1:"),
    "claim namespace",
  );
  check(
    first.expiresAt > Date.now() && first.rotateAt > Date.now(),
    "lease expiry/boundary",
  );
  check((await claim(1)).accepted, "idempotent renewal");
  check(
    (await claim(1, "city", "lse-1", client(20))).reason ===
      "already_connected",
    "one browser session per account",
  );
  check((await claim(2)).accepted, "second player fits conservative budget");
  check(
    (await claim(3)).reason === "service_busy",
    "global event budget enforced before room cap",
  );
  await db.exec("update private.world_limits set event_budget=300");
  for (let n = 3; n <= 5; n++)
    check((await claim(n)).accepted, "verified Pro budget allows five");
  check((await claim(6)).reason === "room_full", "sixth city player refused");
  check((await claim(6, "office-acme")).accepted, "separate office room");
  check(
    (await claim(7, "office-acme")).reason === "service_busy",
    "budget shared across rooms, including acknowledgements",
  );
  await db.exec("update private.world_limits set event_budget=2000");
  check((await claim(7, "office-acme")).accepted, "office second");
  check((await claim(8, "office-acme")).accepted, "office third");
  check((await claim(9, "office-acme")).accepted, "office fourth");
  check((await claim(10, "office-acme")).accepted, "office fifth");
  check(
    (await claim(11, "office-acme")).reason === "room_full",
    "offices do not bypass cap",
  );
  check(
    (await claim(11, "office-acme", "lse-2")).accepted,
    "office server instances separate",
  );
  const topics = (await topic()).rows;
  check(
    new Set(topics.map((t) => t.topic)).size === 3,
    "three independent authorized topics",
  );
  const own = first.topic;
  check(
    await as(1, "select private.world_topic_allowed($1) value", [own]),
    "own lease authorizes topic",
  );
  check(
    !(await as(11, "select private.world_topic_allowed($1) value", [own])),
    "other room denied",
  );
  check(
    !(await as(
      1,
      "select private.world_topic_allowed('world:city:lse-1') value",
    )),
    "legacy bypass denied",
  );
  check(
    !(await as(1, "select private.world_topic_allowed('world:lobby') value")),
    "global lobby disabled",
  );
  const stale = own.replace(/\d+$/, String(Number(own.split(":").at(-1)) - 1));
  check(
    !(await as(1, "select private.world_topic_allowed($1) value", [stale])),
    "old epoch denied",
  );
  const counts = await as(1, "select public.world_counts() value");
  check(
    counts.counts["city:lse-1"] === 5 && counts.capacity === 5,
    "aggregate counts only",
  );
  check(
    !JSON.stringify(counts).includes(uid(1)),
    "counts never expose identities",
  );
  await as(1, "select public.world_release($1) value", [client(20)]);
  check((await claim(1)).accepted, "old session cannot release current lease");
  await as(1, "select public.world_release($1) value", [client(1)]);
  check(
    !(await as(1, "select private.world_topic_allowed($1) value", [own])),
    "released authorization denied on subsequent checks",
  );
  check((await claim(12)).accepted, "released seat reusable");
  await db.exec(
    `update private.world_leases set expires_at=now()-interval '1 second' where user_id='${uid(2)}'`,
  );
  check(
    !(await as(2, "select private.world_topic_allowed($1) value", [own])),
    "expired lease denied",
  );
  check((await claim(13)).accepted, "expired seat reclaimed atomically");
  await db.exec(`update public.profiles set banned=true where id='${uid(13)}'`);
  check(
    !(await as(13, "select private.world_topic_allowed($1) value", [own])),
    "banned lease denied",
  );
  await assert.rejects(claim(13), /not_allowed/);
  checks++;
  // Exercise actual RLS, rather than just its helper.
  await db.query("insert into realtime.messages(topic) values($1)", [own]);
  await db.exec("begin;set local role authenticated");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.realtime.topic',$2,true)",
    [uid(3), own],
  );
  check(
    (await db.query("select * from realtime.messages")).rows.length === 1,
    "leased member receives via RLS",
  );
  await db.exec("rollback;begin;set local role authenticated");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.realtime.topic',$2,true)",
    [uid(11), own],
  );
  check(
    (await db.query("select * from realtime.messages")).rows.length === 0,
    "unleased receiver filtered by RLS",
  );
  await assert.rejects(
    db.query("insert into realtime.messages(topic) values($1)", [own]),
    /row-level security/,
  );
  checks++;
  await db.exec("rollback");
  check((await claim(14,"campus")).accepted,"initial browser lease");
  const handoff=await as(14,"select public.world_claim($1,$2,$3,$4) value",["study-lobby","lse-1",client(114),client(14)]);
  check(handoff.accepted,"same-tab map handoff is atomic");
  await as(14,"select public.world_release($1) value",[client(14)]);
  check((await claim(14,"study-lobby","lse-1",client(114))).accepted,"late old-map cleanup cannot release new-map lease");
  check((await claim(14,"campus")).reason==="already_connected","old client cannot reclaim a newer lease without its handoff token");
  console.log(
    `${checks} world admission database checks passed. PGlite serializes queries; this is not an independent-connection concurrency load test.`,
  );
} finally {
  await db.close();
}
