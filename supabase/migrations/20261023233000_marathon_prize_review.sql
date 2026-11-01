begin;
create table private.marathon_fulfilment(
 ends_at timestamptz not null, user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null check(status in ('review','verified','sent','disqualified')),
 note text not null default '', updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id),
 primary key(ends_at,user_id)
);
alter table private.marathon_fulfilment enable row level security;
create function public.marathon_prize_review(p_end timestamptz,p_user uuid default null,p_status text default null,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_platform_admin() then raise exception 'not_allowed'; end if;
 if p_user is not null then
  if p_end>now() or p_status not in ('review','verified','sent','disqualified') or length(p_note)>1000 then raise exception 'invalid'; end if;
  if not exists(select 1 from public.marathon_entries where user_id=p_user and ends_at=p_end) then raise exception 'not_entered'; end if;
  insert into private.marathon_fulfilment values(p_end,p_user,p_status,p_note,now(),auth.uid())
  on conflict(ends_at,user_id) do update set status=excluded.status,note=excluded.note,updated_at=now(),updated_by=auth.uid();
 end if;
 return (with scores as (
  select e.user_id,p.username,u.email,e.joined_at,
  count(a.id) filter(where a.correct)::int*10 points,
  count(a.id) filter(where not a.correct)::int wrong,
  max(a.answered_at) filter(where a.correct) reached,
  coalesce(f.status,'review') status,coalesce(f.note,'') note
  from public.marathon_entries e join public.profiles p on p.id=e.user_id
  join auth.users u on u.id=e.user_id
  left join private.marathon_fulfilment f on f.user_id=e.user_id and f.ends_at=e.ends_at
  left join public.champ_entries c on c.user_id=e.user_id
  left join public.champ_attempts a on a.entry_id=c.id and a.answered_at>=greatest(e.joined_at,p_end-interval '30 days')
   and a.served_at>=greatest(e.joined_at,p_end-interval '30 days') and a.answered_at<p_end
  where e.ends_at=p_end group by e.user_id,p.username,u.email,e.joined_at,f.status,f.note
 ), ranked as (
 select *,row_number() over(order by (status='disqualified'),points desc,wrong asc,reached asc nulls last,joined_at,user_id) rank from scores
 )
 select coalesce(jsonb_agg(to_jsonb(ranked) order by rank),'[]'::jsonb) from ranked where rank<=50);
end $$;
revoke all on function public.marathon_prize_review(timestamptz,uuid,text,text) from public,anon;
grant execute on function public.marathon_prize_review(timestamptz,uuid,text,text) to authenticated;
commit;
