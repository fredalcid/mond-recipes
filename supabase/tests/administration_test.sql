-- Phase 5 tests: administration helpers, roles, audit trail, statistics.
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
create or replace function pg_temp.as_user(p_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, false)
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- a = super admin, e = editor, f = moderator, b = member
set role authenticated;

-- ---------------------------------------------------------------- SEO fields
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
update public.recipes set canonical_url = 'https://example.com/original', noindex = true where slug = 'beas-dal';
select pg_temp.expect((select noindex and canonical_url = 'https://example.com/original' from public.recipes where slug = 'beas-dal'), 'editors set canonical URL and indexing');
select pg_temp.expect_fail($$update public.recipes set canonical_url = 'javascript:alert(1)' where slug = 'beas-dal'$$, 'non-https canonical URLs');

-- ---------------------------------------------------------------- countries
insert into public.cuisines (slug, name) values ('test-cuisine', 'Test Cuisine');
insert into public.country_cuisines (country_id, cuisine_id)
  select (select id from public.countries where slug = 'india'), (select id from public.cuisines where slug = 'test-cuisine');
insert into public.country_featured_recipes (country_id, recipe_id, position)
  select (select id from public.countries where slug = 'india'), id, 1 from public.recipes where slug = 'beas-dal';
select pg_temp.expect((select count(*) = 1 from public.country_cuisines), 'editors link cuisines to countries');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($$insert into public.country_cuisines select (select id from public.countries where slug = 'japan'), (select id from public.cuisines where slug = 'test-cuisine')$$, 'members linking cuisines');
select pg_temp.expect_fail($$update public.countries set intro = 'vandalised' where slug = 'india' returning 1/0$$, 'members editing countries');
reset role;
update public.recipes set status = 'unpublished' where slug = 'beas-dal';
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 0 from public.country_featured_recipes), 'featured recipes are hidden while unpublished');
reset role;
update public.recipes set status = 'published' where slug = 'beas-dal';
set role anon;
select pg_temp.expect((select count(*) = 1 from public.country_featured_recipes), 'featured recipes show once published');
reset role;

-- ---------------------------------------------------------------- audit trail
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_type = 'cuisines' and action = 'insert'
  and details ->> 'label' = 'Test Cuisine'), 'reference data changes are logged with a label');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
update public.cuisines set description = 'About it' where slug = 'test-cuisine';
update public.cuisines set description = 'About it' where slug = 'test-cuisine';
reset role;
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_type = 'cuisines' and action = 'update'
  and details -> 'changed' = '["description"]'), 'updates record which fields changed, and no-change saves are skipped');
select pg_temp.as_user('');
update public.cuisines set description = 'system edit' where slug = 'test-cuisine';
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_type = 'cuisines' and action = 'update'), 'system changes (no signed-in staff) are not logged');

-- ---------------------------------------------------------------- roles
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'editor');
select pg_temp.expect((select granted_by = '00000000-0000-0000-0000-00000000000a' from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000b'),
  'the database records who granted a role');
delete from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_fail($$delete from public.user_roles where role = 'super_admin'$$, 'removing the last super admin');
select pg_temp.expect((select count(*) >= 2 from public.admin_activity_log where entity_type = 'user_roles'), 'role changes are logged');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_fail($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'super_admin')$$, 'editors granting roles');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($$insert into public.user_roles (user_id, role) values (auth.uid(), 'super_admin')$$, 'members making themselves admin');

-- ---------------------------------------------------------------- ingredient merge
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.ingredients (slug, name) values ('tomatos-typo', 'Tomatos');
update public.recipe_ingredients set ingredient_id = (select id from public.ingredients where slug = 'tomatos-typo')
  where id = (select min(id) from public.recipe_ingredients);
select pg_temp.expect(public.merge_ingredients((select id from public.ingredients where slug = 'tomatos-typo'), (select id from public.ingredients where slug = 'tomato')) = 1,
  'merging moves recipes to the kept ingredient');
select pg_temp.expect((select count(*) = 0 from public.ingredients where slug = 'tomatos-typo')
  and (select count(*) = 1 from public.ingredient_aliases where alias = 'Tomatos'), 'the old name becomes a search alias');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($$select public.merge_ingredients(1, 2)$$, 'members merging ingredients');

-- ---------------------------------------------------------------- statistics
select pg_temp.expect_fail($$select public.admin_dashboard_stats()$$, 'members reading dashboard statistics');
select pg_temp.expect_fail($$select * from public.admin_activity_series(30)$$, 'members reading activity trends');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect((select (public.admin_dashboard_stats() ->> 'recipes_published')::int = (select count(*) from public.recipes where status = 'published')),
  'dashboard counts match the real rows');
select pg_temp.expect((select (public.admin_dashboard_stats() ->> 'members_total')::int = (select count(*) from public.profiles)), 'member count is real');
select pg_temp.expect((select count(*) = 30 from public.admin_activity_series(30)), 'activity trends cover each day');
select pg_temp.expect((select sum(comments) >= 1 from public.admin_activity_series(7)), 'activity trends count real comments');
select pg_temp.expect_fail($$select * from public.admin_member_account('00000000-0000-0000-0000-00000000000b')$$, 'moderators reading member emails');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select email = 'member@example.com' from public.admin_member_account('00000000-0000-0000-0000-00000000000b')), 'super admins can look up an account email');

-- ---------------------------------------------------------------- blocks and settings
reset role;
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b') on conflict do nothing;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
delete from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000000c' and blocked_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) = 0 from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000000c' and blocked_id = '00000000-0000-0000-0000-00000000000b'),
  'moderators can lift a block');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
update public.site_settings set value = '"hacked"' where key = 'footer.note';
reset role;
select pg_temp.expect((select value <> '"hacked"' from public.site_settings where key = 'footer.note'), 'only super admins change website settings');
select pg_temp.expect((select value = 'false' from public.site_settings where key = 'seo.allow_indexing'), 'search engines are blocked until launch');

\echo 'All Phase 5 tests passed.'
