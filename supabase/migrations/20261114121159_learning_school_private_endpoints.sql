-- Keep privileged class operations out of the exposed schema. The public
-- endpoints are invokers and call only the corresponding guarded operation.
alter function public.learning_assignment_create(uuid,text,text,text,timestamptz) set schema private;
alter function public.learning_assignment_start(uuid) set schema private;
alter function public.learning_review_subject(uuid,uuid,text,text) set schema private;
revoke all on function private.learning_assignment_create(uuid,text,text,text,timestamptz),private.learning_assignment_start(uuid),private.learning_review_subject(uuid,uuid,text,text) from public,anon;
grant execute on function private.learning_assignment_create(uuid,text,text,text,timestamptz),private.learning_assignment_start(uuid),private.learning_review_subject(uuid,uuid,text,text) to authenticated;

create or replace function private.learning_review_subject(p_assignment uuid,p_user uuid,p_decision text,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments;
begin
  select * into a from public.learning_assignments where id=p_assignment;
  if auth.uid() is null or not private.owns_class(a.class_id) or a.product='world' then raise exception 'not_allowed'; end if;
  if p_decision is null or p_decision not in ('completed','changes_requested') or length(coalesce(p_feedback,''))>4000 then raise exception 'invalid'; end if;
  if p_decision='changes_requested' and length(trim(coalesce(p_feedback,'')))<10 then raise exception 'feedback_required'; end if;
  if not exists(select 1 from public.class_members where class_id=a.class_id and user_id=p_user) then raise exception 'not_allowed'; end if;
  update public.learning_assignment_progress set status=p_decision,feedback=nullif(trim(p_feedback),'')
  where assignment_id=p_assignment and user_id=p_user and status<>'started';
  if not found then raise exception 'not_submitted'; end if;
end; $$;
revoke all on function private.learning_review_subject(uuid,uuid,text,text) from public,anon;
grant execute on function private.learning_review_subject(uuid,uuid,text,text) to authenticated;

create function public.learning_assignment_create(p_class uuid,p_product text,p_slug text,p_title text,p_due timestamptz default null)
returns uuid language sql security invoker set search_path='' as $$
  select private.learning_assignment_create(p_class,p_product,p_slug,p_title,p_due);
$$;
create function public.learning_assignment_start(p_assignment uuid)
returns void language sql security invoker set search_path='' as $$
  select private.learning_assignment_start(p_assignment);
$$;
create function public.learning_review_subject(p_assignment uuid,p_user uuid,p_decision text,p_feedback text)
returns void language sql security invoker set search_path='' as $$
  select private.learning_review_subject(p_assignment,p_user,p_decision,p_feedback);
$$;
revoke all on function public.learning_assignment_create(uuid,text,text,text,timestamptz),public.learning_assignment_start(uuid),public.learning_review_subject(uuid,uuid,text,text) from public,anon;
grant execute on function public.learning_assignment_create(uuid,text,text,text,timestamptz),public.learning_assignment_start(uuid),public.learning_review_subject(uuid,uuid,text,text) to authenticated;

-- A narrow public catalogue deliberately excludes draft/question/mission rows,
-- answer keys, author identities and internal review notes.
create function private.learning_reviewed_resources(p_product text default null,p_id uuid default null)
returns table(id uuid,product text,title text,topic text,exam_board text,board_verified boolean,body text,source_url text,reviewed_at timestamptz)
language sql stable security definer set search_path='' as $$
  select r.id,r.product,r.title,r.topic,
    case when r.board_verified then r.exam_board else null end,
    r.board_verified,r.body,r.source_url,r.reviewed_at
  from public.learning_content_review r
  where r.status='reviewed' and r.kind='resource' and r.reviewed_by is not null and r.reviewed_at is not null
    and (p_product is null or r.product=p_product) and (p_id is null or r.id=p_id)
  order by r.reviewed_at desc,r.id limit 100;
$$;
revoke all on function private.learning_reviewed_resources(text,uuid) from public;
grant execute on function private.learning_reviewed_resources(text,uuid) to anon,authenticated;
create function public.learning_reviewed_resources(p_product text default null,p_id uuid default null)
returns table(id uuid,product text,title text,topic text,exam_board text,board_verified boolean,body text,source_url text,reviewed_at timestamptz)
language sql stable security invoker set search_path='' as $$
  select * from private.learning_reviewed_resources(p_product,p_id);
$$;
revoke all on function public.learning_reviewed_resources(text,uuid) from public;
grant execute on function public.learning_reviewed_resources(text,uuid) to anon,authenticated;
