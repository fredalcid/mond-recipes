-- Admin editor tests. Runs after search_test.sql.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function pg_temp.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;

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

set role authenticated;

-- A regular member cannot use the editor.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.expect_fail($$select public.admin_save_recipe('{"kind":"food","slug":"x-x","title":"Member attempt","status":"published","verification":"test_kitchen"}')$$,
  'member using the recipe editor');
select pg_temp.expect_fail($$select public.admin_delete_recipe((select id from public.recipes where slug = 'masala-chai'))$$, 'member deleting a recipe');

-- Editor
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select pg_temp.expect_fail($$select public.admin_save_recipe('{"kind":"food","slug":"empty-pub","title":"Empty Published","status":"published","verification":"community"}')$$,
  'publishing a recipe with no ingredients or steps');
select pg_temp.expect((select count(*) = 0 from public.recipes where slug = 'empty-pub'), 'a failed save leaves nothing behind');

select set_config('test.new_id', public.admin_save_recipe($json${
  "kind": "food", "slug": "plantain-chips", "title": "Plantain Chips", "summary": "Crisp fried plantain.",
  "status": "published", "verification": "editorial", "prep_minutes": "10", "cook_minutes": "15", "servings": "4", "difficulty": "easy",
  "countries": ["nigeria", "ghana"], "regions": ["yoruba"], "cuisines": ["West African", "Street Food"],
  "categories": ["snacks"], "diets": ["vegan"], "allergens": [],
  "ingredients": [
    {"name": "Green plantains", "quantity": "3", "unit": "piece", "note": "peeled"},
    {"name": "Vegetable oil", "quantity": "2", "unit": "cup", "note": "for frying"},
    {"name": "Salt", "quantity": "1", "unit": "tsp"},
    {"name": "   ", "quantity": "", "unit": ""}
  ],
  "steps": [{"body": "Slice the plantains thinly."}, {"body": "Fry in batches until golden.", "timer_seconds": "240"}, {"body": ""}],
  "source": {"type": "original", "description": "Mònd test kitchen"}
}$json$::jsonb)::text, false);

select pg_temp.expect((select status = 'published' and verification = 'editorial' and total_minutes = 25 from public.recipes where slug = 'plantain-chips'),
  'editor creates and publishes a recipe');
select pg_temp.expect((select count(*) = 3 from public.recipe_ingredients where recipe_id = current_setting('test.new_id')::uuid), 'blank ingredient rows are skipped');
select pg_temp.expect((select count(*) = 2 from public.recipe_steps where recipe_id = current_setting('test.new_id')::uuid), 'blank steps are skipped');
select pg_temp.expect((select count(*) = 1 from public.ingredients where slug = 'green-plantains'), 'new ingredients are created');
select pg_temp.expect((select count(*) = 1 from public.recipe_ingredients ri join public.ingredients i on i.id = ri.ingredient_id
  where ri.recipe_id = current_setting('test.new_id')::uuid and i.slug = 'vegetable-oil'), 'existing ingredients are reused');
select pg_temp.expect((select count(*) = 1 from public.cuisines where slug = 'street-food'), 'new cuisines are created');
select pg_temp.expect((select count(*) = 1 from public.recipe_regions where recipe_id = current_setting('test.new_id')::uuid), 'regions link only within the chosen countries');
select pg_temp.expect((select count(*) = 0 from public.recipe_versions where recipe_id = current_setting('test.new_id')::uuid), 'a brand-new recipe has no old versions');
reset role;
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_id = current_setting('test.new_id') and action = 'create'), 'creation is logged');
set role authenticated;

select public.admin_save_recipe(jsonb_set(jsonb_set(
  (select to_jsonb(x) from (select current_setting('test.new_id') as id) x) ||
  '{"kind":"food","slug":"plantain-chips","title":"Crispy Plantain Chips","status":"unpublished","verification":"editorial","countries":["ghana"],
    "ingredients":[{"name":"Green plantains","quantity":"3","unit":"piece"}],"steps":[{"body":"Fry."}]}'::jsonb,
  '{summary}', '"Updated"'), '{servings}', '"2"'));
select pg_temp.expect((select title = 'Crispy Plantain Chips' and status = 'unpublished' from public.recipes where id = current_setting('test.new_id')::uuid), 'editor updates and unpublishes');
select pg_temp.expect((select snapshot ->> 'title' = 'Plantain Chips' from public.recipe_versions where recipe_id = current_setting('test.new_id')::uuid order by version limit 1),
  'the original version is kept');
select pg_temp.expect((select count(*) = 0 from public.recipe_regions where recipe_id = current_setting('test.new_id')::uuid), 'regions of removed countries are dropped');
reset role;
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_id = current_setting('test.new_id') and action = 'status_change'), 'status changes are logged');
set role authenticated;

set role anon;
select pg_temp.expect((select count(*) = 0 from public.search_recipes(p_q := 'plantain')), 'unpublished recipes disappear from search');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select public.admin_delete_recipe(current_setting('test.new_id')::uuid);
select pg_temp.expect((select count(*) = 0 from public.recipes where id = current_setting('test.new_id')::uuid), 'editor deletes a recipe');
reset role;
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where entity_id = current_setting('test.new_id') and action = 'delete'), 'deletion is logged');
set role authenticated;

reset role;
\echo 'All admin tests passed.'
