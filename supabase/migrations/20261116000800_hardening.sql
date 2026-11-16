-- ---------------------------------------------------------------------------
-- Mònd Recipes — Phase 6: security hardening from the launch review
-- ---------------------------------------------------------------------------

-- 1. Blocks are private. The helper used by permission checks only answers for
--    the two members involved or staff; anyone else (including visitors) gets
--    "not blocked", so the API can't be used to discover who blocked whom.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select (coalesce(auth.uid() in (a, b), false) or public.is_staff())
     and exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- 2. Trigger functions are internal and not part of the public API.
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- Newsletter confirmation and unsubscribe run on the server with the service key only.
revoke execute on function public.newsletter_confirm(text) from public, anon, authenticated;
revoke execute on function public.newsletter_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.newsletter_confirm(text) to service_role;
grant execute on function public.newsletter_unsubscribe(text) to service_role;

-- Owner look-ups reveal who wrote something; only the permission checks need them.
revoke execute on function public.report_target_row_owner(public.report_target, uuid) from public, anon;
