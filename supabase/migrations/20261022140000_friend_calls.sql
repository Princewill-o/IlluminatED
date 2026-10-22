-- Friend voice and video calls: free peer-to-peer WebRTC, signalled over private
-- Realtime channels. Only accepted friends can signal each other.
--   ring:<user>          incoming-call inbox. Only the owner listens; accepted friends may send.
--   call:<low>:<high>    call signalling between one friendship pair (both may listen and send).

create or replace function private.friend_call_topic(p_topic text, p_send boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_active_member()) and (
    case
      when p_topic ~ '^ring:[0-9a-f-]{36}$' then
        split_part(p_topic, ':', 2)::uuid = auth.uid() and not p_send
        or (p_send and exists (
          select 1 from public.city_friends f
          where f.state = 'accepted'
            and auth.uid() in (f.low_id, f.high_id)
            and split_part(p_topic, ':', 2)::uuid in (f.low_id, f.high_id)
            and split_part(p_topic, ':', 2)::uuid <> auth.uid()))
      when p_topic ~ '^call:[0-9a-f-]{36}:[0-9a-f-]{36}$' then exists (
        select 1 from public.city_friends f
        where f.state = 'accepted'
          and f.low_id = split_part(p_topic, ':', 2)::uuid
          and f.high_id = split_part(p_topic, ':', 3)::uuid
          and auth.uid() in (f.low_id, f.high_id))
      else false
    end);
$$;

grant execute on function private.friend_call_topic(text, boolean) to authenticated;

create policy "friends receive call signals" on realtime.messages for select to authenticated
  using ((select private.friend_call_topic(realtime.topic(), false)));
create policy "friends send call signals" on realtime.messages for insert to authenticated
  with check ((select private.friend_call_topic(realtime.topic(), true)));
