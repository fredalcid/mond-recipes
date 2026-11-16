-- Security tests for the Phase 1 schema. Run against a disposable database
-- (see scripts/test-db.sh). Every check raises an error if it fails.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function pg_temp.expect_fail(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'PASS (blocked): %', p_label;
    return;
  end;
  raise exception 'FAIL: % was allowed but should be blocked', p_label;
end $$;

create or replace function pg_temp.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;

-- Test accounts
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com',  now(), '{"display_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@example.com', now(), '{"display_name":"Eli Editor"}'),
  ('00000000-0000-0000-0000-00000000000b', 'member@example.com', now(), '{"display_name":"Bea Member"}'),
  ('00000000-0000-0000-0000-00000000000c', 'other@example.com',  now(), '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'unverified@example.com', null, '{"display_name":"Dan"}');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'super_admin'),
  ('00000000-0000-0000-0000-00000000000e', 'editor');
insert into public.ingredients (slug, name) values ('tomato', 'Tomato');

select pg_temp.expect((select count(*) = 5 from public.profiles), 'a profile is created for every new account');
select pg_temp.expect((select display_name = 'other' from public.profiles where id = '00000000-0000-0000-0000-00000000000c'),
  'profile name falls back to the email name');

-- ---------------------------------------------------------------- anonymous visitor
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect((select count(*) > 200 from public.countries), 'visitors can read countries');
select pg_temp.expect_fail($$insert into public.countries (iso2, slug, name) values ('ZZ','zz','Nowhere')$$, 'visitor adding a country');
select pg_temp.expect((select count(*) = 0 from public.newsletter_subscribers), 'visitors cannot see subscribers');
select pg_temp.expect_fail($$select * from public.newsletter_request('reader@example.com', 'consent', 'test', null)$$,
  'visitor calling the newsletter sign-up function directly (server only)');
select pg_temp.expect_fail($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000d','super_admin')$$, 'visitor granting a role');
reset role;
set role service_role;
select * from public.newsletter_request('Reader@Example.com', 'consent text', 'test', '203.0.113.9');
select * from public.newsletter_request('reader@example.com', 'consent text', 'test', 'not-an-ip');
select pg_temp.expect_fail($$select * from public.newsletter_request('not-an-email', 'consent', 'test', null)$$, 'newsletter with an invalid email');
select pg_temp.expect_fail($$select * from public.newsletter_request('a@b.co', '', 'test', null)$$, 'newsletter without consent');
reset role;
select pg_temp.expect((select count(*) = 1 and bool_and(status = 'pending') from public.newsletter_subscribers), 'duplicate sign-ups are merged and stay pending until confirmed');

-- ---------------------------------------------------------------- unverified member
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.expect_fail($$insert into public.recipes (slug, title, author_id) values ('dan-soup','Dan''s Soup','00000000-0000-0000-0000-00000000000d')$$,
  'unverified member submitting a recipe');

-- ---------------------------------------------------------------- verified member
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.recipes (id, slug, title, summary, author_id, status)
  values ('10000000-0000-0000-0000-000000000001', 'bea-creme-mond', 'Crème Mònd Stew', 'A hearty stew', '00000000-0000-0000-0000-00000000000b', 'draft');
select pg_temp.expect(true, 'verified member creates own draft');
insert into public.recipe_steps (recipe_id, position, body) values ('10000000-0000-0000-0000-000000000001', 1, 'Chop the onions.');
insert into public.recipe_ingredients (recipe_id, ingredient_id, position, quantity, unit)
  values ('10000000-0000-0000-0000-000000000001', (select id from public.ingredients where slug = 'tomato'), 1, 2, 'whole');
select pg_temp.expect(true, 'member adds steps and ingredients to own draft');
select pg_temp.expect_fail($$insert into public.recipes (slug, title, author_id, status) values ('bea-2','Published by member','00000000-0000-0000-0000-00000000000b','published')$$,
  'member publishing directly');
select pg_temp.expect_fail($$insert into public.recipes (slug, title, author_id) values ('fake','Pretending to be someone else','00000000-0000-0000-0000-00000000000c')$$,
  'member posting as another member');
select pg_temp.expect_fail($$insert into public.recipes (slug, title, author_id, rating_count) values ('bea-3','Fake ratings','00000000-0000-0000-0000-00000000000b', 500)$$,
  'member inventing rating statistics');
update public.recipes set status = 'pending' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect(true, 'member submits own draft for review');
select pg_temp.expect_fail($$update public.recipes set status = 'published' where id = '10000000-0000-0000-0000-000000000001'$$, 'member approving own recipe');
select pg_temp.expect_fail($$update public.recipes set verification = 'test_kitchen' where id = '10000000-0000-0000-0000-000000000001'$$, 'member adding a verified badge');
select pg_temp.expect_fail($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b','editor')$$, 'member promoting themselves');
select pg_temp.expect_fail($$update public.profiles set is_suspended = true where id = '00000000-0000-0000-0000-00000000000b'$$, 'member changing suspension status');
update public.profiles set bio = 'I love soup' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select bio = 'I love soup' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'member edits own profile');
update public.profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect((select bio is null from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'member cannot edit another profile');
select pg_temp.expect_fail($$insert into public.admin_activity_log (actor_id, action, entity_type) values ('00000000-0000-0000-0000-00000000000b','x','y')$$, 'member writing to the audit log');

-- ---------------------------------------------------------------- other member
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.expect((select count(*) = 0 from public.recipes where id = '10000000-0000-0000-0000-000000000001'), 'pending recipes are hidden from other members');
select pg_temp.expect((select count(*) = 0 from public.recipe_steps where recipe_id = '10000000-0000-0000-0000-000000000001'), 'steps of hidden recipes are hidden too');

-- ---------------------------------------------------------------- editor
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
update public.recipes set status = 'published', verification = 'editorial' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect((select published_at is not null from public.recipes where id = '10000000-0000-0000-0000-000000000001'), 'editor publishes; publish date is recorded');
update public.recipes set title = 'Crème Mònd Stew (revised)' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect((select count(*) >= 1 from public.recipe_versions where recipe_id = '10000000-0000-0000-0000-000000000001'
  and snapshot ->> 'title' = 'Crème Mònd Stew'), 'editing keeps the original version');
insert into public.admin_activity_log (actor_id, action, entity_type, entity_id)
  values ('00000000-0000-0000-0000-00000000000e', 'publish', 'recipe', '10000000-0000-0000-0000-000000000001');
select pg_temp.expect(true, 'editor writes own audit entry');
select pg_temp.expect_fail($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b','moderator')$$, 'editor granting roles');
select pg_temp.expect((select count(*) = 0 from public.newsletter_subscribers), 'editors cannot see newsletter subscribers');

-- ---------------------------------------------------------------- member after publication
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update public.recipes set title = 'Sneaky change after approval' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.expect((select title = 'Crème Mònd Stew (revised)' from public.recipes where id = '10000000-0000-0000-0000-000000000001'),
  'author cannot change a recipe after it is published');
select pg_temp.expect((select count(*) >= 1 from public.recipe_versions), 'authors can read the version history of their own recipe');

-- ---------------------------------------------------------------- visitor sees published recipe and search works
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect((select count(*) = 1 from public.recipes where status = 'published'), 'visitors see published recipes');
select pg_temp.expect((select count(*) = 1 from public.recipe_steps), 'visitors see steps of published recipes');
select pg_temp.expect((select count(*) = 1 from public.recipes where search_vector @@ plainto_tsquery('simple', public.f_unaccent('creme mond'))),
  'search ignores accents ("creme mond" finds "Crème Mònd")');
select pg_temp.expect((select count(*) = 1 from public.recipes where public.f_unaccent(lower(title)) operator(extensions.%) 'creme mond stw'),
  'fuzzy search tolerates typos');

-- ---------------------------------------------------------------- super admin
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect((select count(*) = 1 from public.newsletter_subscribers), 'super admin sees subscribers');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000c', 'moderator');
select pg_temp.expect(true, 'super admin grants a role');
select pg_temp.expect((select count(*) >= 1 from public.admin_activity_log where entity_type = 'user_roles'), 'super admin reads the audit log, including the role grant just made');
create temp table audit_before as select id, action from public.admin_activity_log;
update public.admin_activity_log set action = 'edited';
delete from public.admin_activity_log;
select pg_temp.expect((select count(*) = (select count(*) from audit_before) and bool_and(action <> 'edited') from public.admin_activity_log), 'audit log entries cannot be edited or deleted');

reset role;
\echo 'All security tests passed.'
