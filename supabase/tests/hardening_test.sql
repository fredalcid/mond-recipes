-- Phase 6 tests: launch security review.
\set ON_ERROR_STOP 1
set client_min_messages = notice;
create or replace function pg_temp.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;
create or replace function pg_temp.expect_fail(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'PASS (blocked): %', p_label; return; end;
  raise exception 'FAIL: % was allowed but should be blocked', p_label;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b') on conflict do nothing;

select set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.expect(not public.is_blocked_between('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b'),
  'visitors can''t find out who blocked whom');
select pg_temp.expect_fail($$select public.newsletter_confirm('anything')$$, 'calling newsletter confirmation without the server key');
select pg_temp.expect_fail($$select public.report_target_row_owner('post', gen_random_uuid())$$, 'looking up content owners directly');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.expect(not public.is_blocked_between('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b'),
  'other members can''t find out who blocked whom');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.expect(public.is_blocked_between('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b'),
  'a blocked member''s actions are still stopped');
select pg_temp.expect_fail($$insert into public.follows values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$,
  'following someone who blocked you (after the change)');
reset role;

-- Every public table has row security, and every privileged function pins its search path.
select pg_temp.expect((select count(*) = 0 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 'row security is on for every table');
select pg_temp.expect((select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  'every privileged function has a fixed search path');
select pg_temp.expect((select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute')),
  'internal trigger functions aren''t exposed to visitors');

reset role;
-- Leave no test block behind for the browser flows that run on this data.
delete from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000000c' and blocked_id = '00000000-0000-0000-0000-00000000000b';

\echo 'All Phase 6 hardening tests passed.'
