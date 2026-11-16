-- Recipe engine tests. Runs after security_test.sql and sample_content.sql on a throwaway database.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function pg_temp.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;

-- A draft that must never appear in search.
insert into public.recipes (slug, title, summary, status, kind) values ('secret-draft-jollof', 'Secret Draft Jollof', 'not public', 'draft', 'food');
select set_config('test.draft_id', (select id::text from public.recipes where slug = 'secret-draft-jollof'), false);

set role anon;
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.expect((select count(*) = 0 from public.search_recipes(p_q := 'secret draft')), 'drafts never appear in search');
select pg_temp.expect((select bool_and(kind = 'drink') and count(*) = 6 from public.search_recipes(p_kind := 'drink')), 'kind filter returns only drinks');
select pg_temp.expect((select array_agg(title order by title) = array['Mango Lassi', 'Masala Chai']
  from public.search_recipes(p_kind := 'drink', p_country := 'india')), 'country + kind filters combine');
select pg_temp.expect((select array_agg(title) = array['Black Bean Tacos']
  from public.search_recipes(p_category := 'vegan', p_max_minutes := 30)), 'category + time filters combine (vegan under 30 minutes)');
select pg_temp.expect((select count(*) = 0 from public.search_recipes(p_country := 'italy', p_diet := 'vegan')), 'filters that conflict return nothing');
select pg_temp.expect((select array_agg(title) = array['Dal Tadka'] from public.search_recipes(p_region := 'punjab')), 'region filter');
select pg_temp.expect((select array_agg(title) = array['Jollof Rice'] from public.search_recipes(p_cuisine := 'west-african')), 'cuisine filter');
select pg_temp.expect((select title = 'Jollof Rice' from public.search_recipes(p_q := 'jolof') limit 1), 'typo "jolof" finds Jollof Rice');
select pg_temp.expect((select count(*) >= 1 from public.search_recipes(p_q := 'scallions') where title = 'Vegetable Fried Rice'),
  'ingredient alias search ("scallions" finds fried rice)');
select pg_temp.expect((select count(*) = 2 from public.search_recipes(p_country := 'mexico', p_kind := 'drink')), 'a dish shared by several countries is found from each');
select pg_temp.expect((select count(*) = 1 from public.search_recipes(p_country := 'ghana')), 'Jollof Rice is listed under Ghana as well as Nigeria');
select pg_temp.expect((select count(*) = 0 from public.search_recipes(p_min_rating := 4)), 'minimum rating never matches unrated recipes');
select pg_temp.expect((select max(total_count) = (select count(*) from public.recipes where kind = 'food' and status = 'published') and count(*) = 3 from public.search_recipes(p_kind := 'food', p_limit := 3)), 'result count reports the full total while paging');
select pg_temp.expect((select count(*) = 3 from public.search_recipes(p_kind := 'food', p_limit := 3, p_offset := 3)), 'second page');

select pg_temp.expect((
  select title = 'Chicken Tagine with Olives' and matched_count = 3 and not ('Garlic' = any (missing))
  from public.match_recipes_by_ingredients(array(select id from public.ingredients where slug in ('garlic', 'onion', 'olive-oil'))) limit 1),
  'ingredient finder ranks the best match first and lists only missing ingredients');
select pg_temp.expect((select count(*) = 0 from public.match_recipes_by_ingredients('{}'::bigint[])), 'ingredient finder needs at least one ingredient');
select pg_temp.expect((select bool_and(kind = 'drink') from public.match_recipes_by_ingredients(array(select id from public.ingredients where slug = 'sugar'), 'drink')),
  'ingredient finder can be limited to drinks');

select pg_temp.expect((select count(*) = 1 from public.search_suggestions('mexi') where kind = 'country'), 'suggestions include countries');
select pg_temp.expect((select kind = 'drink' from public.search_suggestions('matcha l') where label = 'Matcha Latte'), 'suggestions mark drinks');
select pg_temp.expect((select count(*) = 0 from public.search_suggestions('m')), 'suggestions wait for two characters');

-- Saved recipes
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.saved_recipes (user_id, recipe_id) select '00000000-0000-0000-0000-00000000000b', id from public.recipes where slug = 'masala-chai';
select pg_temp.expect((select save_count = 1 from public.recipes where slug = 'masala-chai'), 'saving a recipe updates its save count');
do $$ begin
  insert into public.saved_recipes (user_id, recipe_id) values ('00000000-0000-0000-0000-00000000000b', current_setting('test.draft_id')::uuid);
  raise exception 'FAIL: saving an unpublished recipe was allowed';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'PASS (blocked): saving an unpublished recipe';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.expect((select count(*) = 0 from public.saved_recipes), 'members cannot see other members'' saved recipes');
select pg_temp.expect((select count(*) = 1 from public.search_recipes(p_sort := 'popular', p_limit := 1) where title = 'Masala Chai'), 'popular sort uses real saves');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
delete from public.saved_recipes where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select save_count = 0 from public.recipes where slug = 'masala-chai'), 'removing a save updates the count');

-- Storage
set role anon;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('recipe-images', 'hack.png');
  raise exception 'FAIL: visitor uploaded an image';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'PASS (blocked): visitor uploading a recipe image';
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
insert into storage.objects (bucket_id, name) values ('recipe-images', 'recipes/test.webp');
select pg_temp.expect(true, 'editor uploads a recipe image');

reset role;
\echo 'All recipe engine tests passed.'
