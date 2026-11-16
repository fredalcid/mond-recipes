-- Mònd Recipes — Phase 2: saving recipes from the admin editor
-- One function call saves a recipe and everything attached to it in a single transaction.
-- SECURITY INVOKER: the caller's own permissions and Row Level Security apply.

create or replace function public.admin_save_recipe(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_is_new boolean := v_id is null;
  v_old_status public.content_status;
  v_ing jsonb;
  v_step jsonb;
  v_ingredient_id bigint;
  v_name text;
  v_slug text;
  v_pos int;
begin
  if not public.can_edit_content() then
    raise exception 'Only editors can save recipes' using errcode = '42501';
  end if;

  if v_is_new then
    insert into public.recipes (kind, slug, title, author_id) values
      ((p ->> 'kind')::public.recipe_kind, p ->> 'slug', p ->> 'title', null)
    returning id into v_id;
  else
    select status into v_old_status from public.recipes where id = v_id for update;
    if not found then raise exception 'Recipe not found'; end if;
  end if;

  update public.recipes set
    kind = (p ->> 'kind')::public.recipe_kind,
    slug = p ->> 'slug',
    title = p ->> 'title',
    summary = nullif(p ->> 'summary', ''),
    status = (p ->> 'status')::public.content_status,
    verification = (p ->> 'verification')::public.verification_level,
    prep_minutes = nullif(p ->> 'prep_minutes', '')::int,
    cook_minutes = nullif(p ->> 'cook_minutes', '')::int,
    servings = nullif(p ->> 'servings', '')::int,
    serving_unit = nullif(p ->> 'serving_unit', ''),
    difficulty = nullif(p ->> 'difficulty', '')::public.difficulty_level,
    tips = nullif(p ->> 'tips', ''),
    substitutions = nullif(p ->> 'substitutions', ''),
    drink_category_id = case when p ->> 'kind' = 'drink'
      then (select id from public.drink_categories where slug = p ->> 'drink_category') end,
    alcohol_percent = case when p ->> 'kind' = 'drink' then nullif(p ->> 'alcohol_percent', '')::numeric end,
    hero_image_path = coalesce(nullif(p ->> 'hero_image_path', ''), case when (p ->> 'remove_image')::boolean then null else hero_image_path end),
    seo_title = nullif(p ->> 'seo_title', ''),
    meta_description = nullif(p ->> 'meta_description', '')
  where id = v_id;

  -- Children are replaced as a whole.
  delete from public.recipe_ingredients where recipe_id = v_id;
  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p -> 'ingredients', '[]'))
  loop
    v_name := trim(v_ing ->> 'name');
    continue when coalesce(v_name, '') = '';
    v_slug := trim(both '-' from regexp_replace(lower(public.f_unaccent(v_name)), '[^a-z0-9]+', '-', 'g'));
    select i.id into v_ingredient_id from public.ingredients i
      where i.slug = v_slug or lower(i.name) = lower(v_name)
         or exists (select 1 from public.ingredient_aliases a where a.ingredient_id = i.id and lower(a.alias) = lower(v_name))
      limit 1;
    if v_ingredient_id is null then
      insert into public.ingredients (slug, name) values (v_slug, v_name) returning id into v_ingredient_id;
    end if;
    v_pos := v_pos + 1;
    insert into public.recipe_ingredients (recipe_id, ingredient_id, position, quantity, unit, note, group_label)
    values (v_id, v_ingredient_id, v_pos, nullif(v_ing ->> 'quantity', '')::numeric, nullif(v_ing ->> 'unit', ''),
            nullif(trim(v_ing ->> 'note'), ''), nullif(trim(v_ing ->> 'group'), ''));
    v_ingredient_id := null;
  end loop;

  delete from public.recipe_steps where recipe_id = v_id;
  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p -> 'steps', '[]'))
  loop
    continue when coalesce(trim(v_step ->> 'body'), '') = '';
    v_pos := v_pos + 1;
    insert into public.recipe_steps (recipe_id, position, body, timer_seconds)
    values (v_id, v_pos, trim(v_step ->> 'body'), nullif(v_step ->> 'timer_seconds', '')::int);
  end loop;

  delete from public.recipe_countries where recipe_id = v_id;
  insert into public.recipe_countries (recipe_id, country_id)
    select v_id, c.id from public.countries c where c.slug in (select jsonb_array_elements_text(coalesce(p -> 'countries', '[]')));

  delete from public.recipe_regions where recipe_id = v_id;
  insert into public.recipe_regions (recipe_id, region_id)
    select v_id, g.id from public.regions g
    join public.recipe_countries rc on rc.country_id = g.country_id and rc.recipe_id = v_id
    where g.slug in (select jsonb_array_elements_text(coalesce(p -> 'regions', '[]')));

  -- Cuisines can be typed freely; new ones are created.
  insert into public.cuisines (slug, name)
    select trim(both '-' from regexp_replace(lower(public.f_unaccent(trim(n))), '[^a-z0-9]+', '-', 'g')), trim(n)
    from jsonb_array_elements_text(coalesce(p -> 'cuisines', '[]')) n
    where trim(n) <> ''
  on conflict (slug) do nothing;
  delete from public.recipe_cuisines where recipe_id = v_id;
  insert into public.recipe_cuisines (recipe_id, cuisine_id)
    select v_id, cu.id from public.cuisines cu
    where cu.slug in (select trim(both '-' from regexp_replace(lower(public.f_unaccent(trim(n))), '[^a-z0-9]+', '-', 'g'))
                      from jsonb_array_elements_text(coalesce(p -> 'cuisines', '[]')) n);

  delete from public.recipe_categories where recipe_id = v_id;
  insert into public.recipe_categories (recipe_id, category_id)
    select v_id, id from public.categories where slug in (select jsonb_array_elements_text(coalesce(p -> 'categories', '[]')));

  delete from public.recipe_dietary_tags where recipe_id = v_id;
  insert into public.recipe_dietary_tags (recipe_id, dietary_tag_id)
    select v_id, id from public.dietary_tags where slug in (select jsonb_array_elements_text(coalesce(p -> 'diets', '[]')));

  delete from public.recipe_allergens where recipe_id = v_id;
  insert into public.recipe_allergens (recipe_id, allergen_id)
    select v_id, id from public.allergens where slug in (select jsonb_array_elements_text(coalesce(p -> 'allergens', '[]')));

  delete from public.recipe_sources where recipe_id = v_id;
  if coalesce(p #>> '{source,type}', '') <> '' then
    insert into public.recipe_sources (recipe_id, source_type, description, url)
    values (v_id, p #>> '{source,type}', nullif(p #>> '{source,description}', ''), nullif(p #>> '{source,url}', ''));
  end if;

  if (select status from public.recipes where id = v_id) = 'published' then
    if not exists (select 1 from public.recipe_steps where recipe_id = v_id)
       or not exists (select 1 from public.recipe_ingredients where recipe_id = v_id) then
      raise exception 'A recipe needs ingredients and steps before it can be published';
    end if;
  end if;

  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when v_is_new then 'create' when v_old_status is distinct from (p ->> 'status')::public.content_status then 'status_change' else 'update' end,
          'recipe', v_id::text,
          jsonb_build_object('title', p ->> 'title', 'status', p ->> 'status', 'previous_status', v_old_status));

  return v_id;
end $$;

create or replace function public.admin_delete_recipe(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare v_title text;
begin
  if not public.can_edit_content() then
    raise exception 'Only editors can delete recipes' using errcode = '42501';
  end if;
  delete from public.recipes where id = p_id returning title into v_title;
  if v_title is null then raise exception 'Recipe not found'; end if;
  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'delete', 'recipe', p_id::text, jsonb_build_object('title', v_title));
end $$;

revoke execute on function public.admin_save_recipe(jsonb) from public, anon;
revoke execute on function public.admin_delete_recipe(uuid) from public, anon;
grant execute on function public.admin_save_recipe(jsonb) to authenticated;
grant execute on function public.admin_delete_recipe(uuid) to authenticated;

-- Don't record a "version" for the empty row a new recipe starts as within the same save.
create or replace function public.snapshot_recipe_version()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if old.created_at = now() then
    return new;
  end if;
  insert into public.recipe_versions (recipe_id, version, snapshot, edited_by)
  values (
    old.id,
    coalesce((select max(version) from public.recipe_versions where recipe_id = old.id), 0) + 1,
    to_jsonb(old) - 'search_vector',
    auth.uid()
  );
  return new;
end $$;
revoke execute on function public.snapshot_recipe_version() from public, anon, authenticated;
