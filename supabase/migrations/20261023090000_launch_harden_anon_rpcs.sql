-- Launch hardening: signed-out visitors can't call learner-only functions.
-- (Webhook billing functions, guardian links, challenge links and platform_stats stay public;
-- they are secret- or token-protected or intentionally public.)
revoke execute on function public.arcade_buy(text), public.arcade_finish(text, integer, integer),
  public.billing_set_customer(uuid, boolean, text, text), public.claim_referral(text),
  public.class_create(text, text, text), public.class_delete(uuid), public.class_join(text),
  public.class_leave(uuid), public.class_remove_student(uuid, uuid), public.class_roster(uuid),
  public.homework_create(uuid, text, text, timestamptz, jsonb, integer[], text[]),
  public.homework_delete(uuid), public.homework_submit(uuid, integer[]), public.my_plan()
  from anon, public;
grant execute on function public.arcade_buy(text), public.arcade_finish(text, integer, integer),
  public.billing_set_customer(uuid, boolean, text, text), public.claim_referral(text),
  public.class_create(text, text, text), public.class_delete(uuid), public.class_join(text),
  public.class_leave(uuid), public.class_remove_student(uuid, uuid), public.class_roster(uuid),
  public.homework_create(uuid, text, text, timestamptz, jsonb, integer[], text[]),
  public.homework_delete(uuid), public.homework_submit(uuid, integer[]), public.my_plan()
  to authenticated;
