// Disposable embedded Postgres. Install @electric-sql/pglite outside the app and set PGLITE_MODULE.
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const modulePath = process.env.PGLITE_MODULE;
const { PGlite } = await import(
  modulePath ? pathToFileURL(modulePath).href : "@electric-sql/pglite"
);
const db = new PGlite();
const uid = (n) => `88888888-8888-4888-8888-${String(n).padStart(12, "0")}`;
let checks = 0;
async function as(n, run, role = "authenticated") {
  await db.exec(`begin; set local role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
    n ? uid(n) : "",
  ]);
  try {
    const result = await run();
    await db.exec("commit");
    return result;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function rejects(n, sql, pattern, role) {
  await assert.rejects(
    as(n, () => db.exec(sql), role),
    pattern,
  );
  checks++;
}
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create table public.profiles(id uuid primary key references auth.users,username text unique,banned boolean default false,vip boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,private to authenticated,anon;
    create function private.is_active_member() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and not banned)$$;
    create function private.is_moderator() returns boolean language sql stable as $$select false$$;
    create function private.tiggy_plan(uid uuid) returns text language sql stable security definer set search_path='' as $$select case when vip then 'premium' else 'free' end from public.profiles where id=uid$$;
    create function private.london_today() returns date language sql stable as $$select '2026-10-18'::date$$;
    create table public.player_stats(user_id uuid primary key references auth.users,xp integer default 0,clout integer default 0,updated_at timestamptz default now());
    create table public.study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,completed_at timestamptz,result jsonb);
    alter table public.player_stats enable row level security;
    grant select on public.player_stats to authenticated;
    create policy own_stats on public.player_stats for select to authenticated using(user_id=(select auth.uid()));
    insert into auth.users select ('88888888-8888-4888-8888-'||lpad(n::text,12,'0'))::uuid from generate_series(1,36) n;
    insert into public.profiles(id,username) select id,'player'||row_number() over(order by id) from auth.users;
    insert into public.player_stats(user_id,clout) select id,20000 from auth.users;
  `);
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/20261018100842_city_wealth_friends_seasons.sql",
      "utf8",
    ),
  );
  await rejects(
    null,
    "select public.city_snapshot()",
    /permission denied/,
    "anon",
  );
  await rejects(null, "select public.city_trade('jet',1)", /not_allowed/);
  await rejects(
    1,
    "update public.city_holdings set units=9000",
    /permission denied/,
  );
  await rejects(1, "select public.city_trade('moon-fox',1)", /vip_required/);
  await db.exec(`update public.profiles set vip=true where id='${uid(4)}'`);
  await as(4, () => db.exec("select public.city_trade('moon-fox',1)")); checks++;
  await db.exec("update public.city_assets set available_until=now()-interval '1 second' where id='autumn-makers'");
  await rejects(1, "select public.city_trade('autumn-makers',1)", /unavailable/);
  await rejects(1, "select public.city_friend_action('player2',null)", /invalid/);
  await rejects(1, "select public.city_trade('jet',-1)", /invalid/);
  await rejects(1, "select public.city_trade('index-fund',-1)", /not_owned/);
  await rejects(
    1,
    "select public.city_trade('index-fund',-2147483648)",
    /invalid/,
  );
  await as(1, () =>
    db.exec(
      "select public.city_trade('prop-plane',1); select public.city_trade('index-fund',10)",
    ),
  );
  const snapshot = (
    await as(1, () => db.query("select public.city_snapshot() value"))
  ).rows[0].value;
  assert.equal(
    snapshot.clout,
    20000 - 1800 - snapshot.quotes["index-fund"] * 10,
  );
  assert.equal(
    snapshot.holdings.find((h) => h.asset_id === "index-fund").units,
    10,
  );
  checks++;
  await rejects(1, "select public.city_trade('prop-plane',1)", /already_owned/);
  await as(1, () => db.exec("select public.city_trade('index-fund',-10)"));
  const after = (
    await as(1, () => db.query("select public.city_snapshot() value"))
  ).rows[0].value;
  assert.ok(after.clout < 20000 - 1800);
  checks++;
  const foreign = await as(2, () =>
    db.query("select * from public.city_holdings"),
  );
  assert.equal(foreign.rows.length, 0);
  checks++;
  await db.exec(
    `update public.player_stats set clout=1 where user_id='${uid(2)}'`,
  );
  await rejects(2, "select public.city_trade('jet',1)", /not_enough_clout/);
  await as(1, () =>
    db.exec("select public.city_friend_action('player2','request')"),
  );
  await rejects(
    1,
    "select public.city_friend_action('player2','accept')",
    /unavailable/,
  );
  await as(2, () =>
    db.exec("select public.city_friend_action('player1','accept')"),
  );
  const edge = (
    await as(1, () => db.query("select id from public.city_friends"))
  ).rows[0].id;
  assert.equal(
    (await as(3, () => db.query("select * from public.city_friends"))).rows
      .length,
    0,
  );
  checks++;
  await rejects(
    3,
    `select public.city_send_message('${edge}','${"A".repeat(24)}','${"A".repeat(16)}')`,
    /unavailable/,
  );
  for (const n of [1, 2])
    await as(n, () =>
      db.query(
        "insert into public.city_friend_keys(user_id,public_key) values($1,$2)",
        [uid(n), { kty: "EC", crv: "P-256", x: "demo-x", y: "demo-y" }],
      ),
    );
  await rejects(
    1,
    "update public.city_friend_keys set public_key='{}'",
    /permission denied/,
  );
  await as(1, () =>
    db.exec(
      `select public.city_send_message('${edge}','${"A".repeat(24)}','${"A".repeat(16)}')`,
    ),
  );
  assert.equal(
    (await as(3, () => db.query("select * from public.city_friend_messages")))
      .rows.length,
    0,
  );
  checks++;
  await rejects(
    3,
    "insert into public.city_friend_reports(reporter,message_id,disclosed_text) values(auth.uid(),1,'pretend')",
    /row-level security/,
  );
  await as(2, () =>
    db.exec(
      "insert into public.city_friend_reports(reporter,message_id,disclosed_text) values(auth.uid(),1,'Selected message')",
    ),
  );
  checks++;
  await as(2, () =>
    db.exec("select public.city_friend_action('player1','block')"),
  );
  await rejects(
    1,
    `select public.city_send_message('${edge}','${"A".repeat(24)}','${"A".repeat(16)}')`,
    /unavailable/,
  );
  await rejects(
    1,
    "select public.city_friend_action('player2','request')",
    /unavailable/,
  );
  await rejects(1, "select public.city_claim_week('weekly')", /not_ready/);
  await db.exec(
    `insert into public.study_sessions(user_id,completed_at,result) values('${uid(1)}','2026-10-12T10:00:00Z','{"correct":5}'),('${uid(1)}','2026-10-17T10:00:00Z','{"correct":5}'),('${uid(1)}','2026-10-18T10:00:00Z','{"correct":5}')`,
  );
  await as(1, () =>
    db.exec(
      "select public.city_claim_week('weekly'); select public.city_claim_week('weekend')",
    ),
  );
  checks++;
  await rejects(
    1,
    "select public.city_claim_week('weekly')",
    /already_claimed/,
  );
  await rejects(
    1,
    "select public.city_claim_week('weekend')",
    /already_claimed/,
  );
  // The cap is checked on both sides of acceptance.
  for (let n = 4; n <= 33; n++) {
    await as(n, () =>
      db.exec("select public.city_friend_action('player3','request')"),
    );
    await as(3, () =>
      db.exec(`select public.city_friend_action('player${n}','accept')`),
    );
  }
  await as(34, () =>
    db.exec("select public.city_friend_action('player3','request')"),
  );
  await rejects(
    3,
    "select public.city_friend_action('player34','accept')",
    /friend_limit/,
  );
  await db.exec(`update public.profiles set banned=true where id='${uid(1)}'`);
  await rejects(1, "select public.city_snapshot()", /not_allowed/);
  assert.equal(
    (await as(1, () => db.query("select * from public.city_friend_messages")))
      .rows.length,
    0,
  );
  checks++;
  console.log(
    `Passed ${checks} database checks: permissions, ownership, prices, sales, VIP, study rewards, replay, friends, blocking, reports, bans and 30-friend cap.`,
  );
} finally {
  await db.close();
}
