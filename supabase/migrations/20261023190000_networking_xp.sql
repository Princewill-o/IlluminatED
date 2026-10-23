-- Networking events: finishing one (meeting the guests, swapping cards) earns XP.
do $$
declare def text;
begin
  select pg_get_functiondef('public.world_xp(text)'::regprocedure) into def;
  if position('''network''' in def) = 0 then
    def := replace(def, $r$when 'sleep' then 4 end$r$, $r$when 'sleep' then 4 when 'network' then 25 end$r$);
    execute def;
  end if;
end $$;
