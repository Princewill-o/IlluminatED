-- Supply an eligible disposable account with SET LOCAL illuminated.test_user.
-- Every wallet and ownership change below is rolled back.
begin;
do $$
declare
 uid uuid := nullif(current_setting('illuminated.test_user',true),'')::uuid;
 h record; balance integer := 50000; actual integer; rejected boolean;
begin
 if uid is null then raise exception 'Set illuminated.test_user to a test account UUID'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 if not private.is_active_member() then raise exception 'Test account must be an eligible member'; end if;
 insert into public.player_stats(user_id) values(uid) on conflict do nothing;
 perform public.home_buy('studio');
 update public.player_homes set owned=array['studio'],current='studio' where user_id=uid;
 update public.player_stats set clout=balance where user_id=uid;
 for h in select id,price from public.home_types where id<>'studio' order by price loop
   perform public.home_buy(h.id);
   balance:=balance-h.price;
   select clout into actual from public.player_stats where user_id=uid;
   if actual<>balance then raise exception 'Incorrect charge for %',h.id; end if;
   if not exists(select 1 from public.player_homes where user_id=uid and current=h.id and h.id=any(owned)) then raise exception 'Ownership/current home not saved for %',h.id; end if;
   perform public.home_buy(h.id);
   select clout into actual from public.player_stats where user_id=uid;
   if actual<>balance then raise exception 'Owned home charged twice'; end if;
 end loop;
 perform public.home_buy('studio');
 if (select clout<>balance from public.player_stats where user_id=uid) then raise exception 'Moving to owned home incurred a charge'; end if;
 update public.player_homes set owned=array['studio'],current='studio' where user_id=uid;
 update public.player_stats set clout=0 where user_id=uid;
 rejected:=false;
 begin perform public.home_buy('terrace'); exception when others then if sqlerrm='not_enough_clout' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Insufficient funds accepted'; end if;
 if (select owned<>array['studio'] or current<>'studio' from public.player_homes where user_id=uid) then raise exception 'Failed purchase changed ownership'; end if;
 rejected:=false;
 begin perform public.home_buy('not-a-house'); exception when others then if sqlerrm='unknown_home' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Unknown house accepted'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 rejected:=false;
 begin perform public.home_buy('studio'); exception when others then if sqlerrm='not_allowed' then rejected:=true; else raise; end if; end;
 if not rejected or has_function_privilege('anon','public.home_buy(text)','execute') then raise exception 'Anonymous house purchase allowed'; end if;
end $$;
rollback;
select 'All house prices, ownership, free moves, duplicate protection, insufficient funds and anonymous denial passed; all changes rolled back.' as verification;
