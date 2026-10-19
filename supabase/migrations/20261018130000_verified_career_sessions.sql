begin;
-- Move score-taking entry points out of the exposed API schema. Existing business
-- rules remain in place, but only the verified server completion can invoke them.
alter function public.career_interview(text, integer, integer) set schema private;
alter function public.career_finish_shift(integer, integer, integer, integer, jsonb) set schema private;
revoke all on function private.career_interview(text, integer, integer), private.career_finish_shift(integer, integer, integer, integer, jsonb) from public, anon, authenticated;
create table private.career_completion_claims (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.career_completion_claims enable row level security;
revoke all on private.career_completion_claims from public, anon, authenticated;
create function public.career_complete_verified(p_secret text, p_claim uuid, p_mode text, p_workplace text, p_role text, p_seed integer, p_correct integer, p_duration_ms integer, p_skills jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.career_jobs;
begin
  if uid is null or not private.is_active_member() or not coalesce(private.billing_secret_ok(p_secret), false) then raise exception 'not_allowed'; end if;
  -- Serialise claims, promotions and role switches for the same learner.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 718));
  if p_mode not in ('shift', 'interview') or p_claim is null then raise exception 'invalid'; end if;
  insert into private.career_completion_claims(id,user_id) values(p_claim,uid);
  if p_mode = 'interview' then
    return private.career_interview(p_workplace,p_correct,p_duration_ms);
  end if;
  select * into j from public.career_jobs where user_id=uid and status='active' for update;
  if not found or j.workplace <> p_workplace or j.role <> p_role then raise exception 'no_job'; end if;
  return private.career_finish_shift(p_seed,p_correct,5,p_duration_ms,p_skills);
end;
$$;
revoke all on function public.career_complete_verified(text,uuid,text,text,text,integer,integer,integer,jsonb) from public, anon;
grant execute on function public.career_complete_verified(text,uuid,text,text,text,integer,integer,integer,jsonb) to authenticated;
create function public.career_verified_ready(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.is_active_member() and coalesce(private.billing_secret_ok(p_secret),false);
$$;
revoke all on function public.career_verified_ready(text) from public,anon;
grant execute on function public.career_verified_ready(text) to authenticated;
commit;
