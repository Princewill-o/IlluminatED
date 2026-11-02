-- Match the expression used by the public PostgREST title search.
drop index public.oak_lessons_search;
create index oak_lessons_search on public.oak_lessons using gin(to_tsvector('english',title));
