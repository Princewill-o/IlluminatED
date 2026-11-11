-- World owners can also pick a thunderstorm or fog for their world.
create or replace function private.world_settings_ok(s jsonb) returns boolean language sql immutable set search_path = '' as $$
  select s ?& array['police', 'flight', 'time', 'weather', 'visitors']
    and s->>'police' in ('off', 'relaxed', 'normal', 'strict')
    and s->>'flight' in ('off', 'owner', 'everyone')
    and s->>'time' in ('auto', 'day', 'dusk', 'night')
    and s->>'weather' in ('auto', 'clear', 'rain', 'snow', 'storm', 'fog')
    and s->>'visitors' in ('everyone', 'friends');
$$;
