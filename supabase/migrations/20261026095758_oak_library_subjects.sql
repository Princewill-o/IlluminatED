create function public.oak_library_subjects()
returns table(subject text,title text,lessons bigint)
language sql stable security invoker set search_path='' as $$
  select l.subject,min(l.subject_title),count(*) from public.oak_lessons l group by l.subject order by min(l.subject_title);
$$;
revoke all on function public.oak_library_subjects() from public;
grant execute on function public.oak_library_subjects() to anon, authenticated, service_role;
