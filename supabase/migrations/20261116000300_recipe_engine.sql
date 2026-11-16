-- Mònd Recipes — Phase 2: recipe engine
-- Search, ingredient matching, suggestions, saved recipes and recipe images.

-- Sample/demonstration recipes are flagged so they are always labelled and easy to remove.
alter table public.recipes add column is_sample boolean not null default false;

create index recipe_ingredients_recipe on public.recipe_ingredients (recipe_id);
create index regions_country on public.regions (country_id);

-- ---------------------------------------------------------------------------
-- Saved recipes (favourites)
-- ---------------------------------------------------------------------------
create table public.saved_recipes (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index saved_recipes_recipe on public.saved_recipes (recipe_id);
alter table public.saved_recipes enable row level security;

create policy "members read own saves" on public.saved_recipes for select to authenticated using (user_id = auth.uid());
create policy "members save published recipes" on public.saved_recipes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published'));
create policy "members remove own saves" on public.saved_recipes for delete to authenticated using (user_id = auth.uid());

-- Keeps recipes.save_count in step with real saves.
create or replace function public.sync_save_count()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.recipes
     set save_count = (select count(*) from public.saved_recipes where recipe_id = coalesce(new.recipe_id, old.recipe_id))
   where id = coalesce(new.recipe_id, old.recipe_id);
  return null;
end $$;
create trigger saved_recipes_count after insert or delete on public.saved_recipes
  for each row execute function public.sync_save_count();
revoke execute on function public.sync_save_count() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Search: every filter is combined with AND. Only published recipes are returned.
-- Runs with the caller's permissions (SECURITY INVOKER) so Row Level Security applies.
-- ---------------------------------------------------------------------------
create or replace function public.search_recipes(
  p_q text default null,
  p_kind public.recipe_kind default null,
  p_country text default null,
  p_region text default null,
  p_cuisine text default null,
  p_category text default null,
  p_diet text default null,
  p_drink_category text default null,
  p_max_minutes int default null,
  p_difficulty public.difficulty_level default null,
  p_min_rating numeric default null,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, summary text, kind public.recipe_kind,
  prep_minutes int, cook_minutes int, total_minutes int, difficulty public.difficulty_level,
  hero_image_path text, rating_average numeric, rating_count int, save_count int,
  verification public.verification_level, is_sample boolean, published_at timestamptz,
  cuisines text[], countries text[], country_codes text[], score real, total_count bigint
)
language sql stable
set search_path = ''
as $$
  with params as (
    select nullif(trim(p_q), '') as q,
           case when nullif(trim(p_q), '') is null then null
                else websearch_to_tsquery('simple', public.f_unaccent(trim(p_q))) end as tsq,
           public.f_unaccent(lower(coalesce(trim(p_q), ''))) as q_plain
  ),
  ingredient_hits as (
    select distinct ri.recipe_id
    from public.recipe_ingredients ri
    join public.ingredients i on i.id = ri.ingredient_id
    left join public.ingredient_aliases a on a.ingredient_id = i.id
    cross join params
    where params.q is not null
      and (public.f_unaccent(lower(i.name)) = params.q_plain
           or public.f_unaccent(lower(a.alias)) = params.q_plain
           or public.f_unaccent(lower(i.name)) like params.q_plain || '%')
  ),
  base as (
    select r.*,
      (case when params.q is null then 0
            else coalesce(ts_rank(r.search_vector, params.tsq), 0) * 2
               + extensions.similarity(public.f_unaccent(lower(r.title)), params.q_plain)
               + case when r.id in (select recipe_id from ingredient_hits) then 0.4 else 0 end
       end)::real as score
    from public.recipes r cross join params
    where r.status = 'published'
      and (p_kind is null or r.kind = p_kind)
      and (params.q is null
           or r.search_vector @@ params.tsq
           or public.f_unaccent(lower(r.title)) like '%' || params.q_plain || '%'
           or extensions.similarity(public.f_unaccent(lower(r.title)), params.q_plain) > 0.3
           or r.id in (select recipe_id from ingredient_hits))
      and (p_country is null or exists (
            select 1 from public.recipe_countries rc join public.countries c on c.id = rc.country_id
            where rc.recipe_id = r.id and c.slug = p_country))
      and (p_region is null or exists (
            select 1 from public.recipe_regions rr join public.regions g on g.id = rr.region_id
            where rr.recipe_id = r.id and g.slug = p_region))
      and (p_cuisine is null or exists (
            select 1 from public.recipe_cuisines rcu join public.cuisines cu on cu.id = rcu.cuisine_id
            where rcu.recipe_id = r.id and cu.slug = p_cuisine))
      and (p_category is null or exists (
            select 1 from public.recipe_categories rca join public.categories ca on ca.id = rca.category_id
            where rca.recipe_id = r.id and ca.slug = p_category))
      and (p_diet is null or exists (
            select 1 from public.recipe_dietary_tags rd join public.dietary_tags d on d.id = rd.dietary_tag_id
            where rd.recipe_id = r.id and d.slug = p_diet))
      and (p_drink_category is null or exists (
            select 1 from public.drink_categories dc where dc.id = r.drink_category_id and dc.slug = p_drink_category))
      and (p_max_minutes is null or r.total_minutes <= p_max_minutes)
      and (p_difficulty is null or r.difficulty = p_difficulty)
      and (p_min_rating is null or (r.rating_count > 0 and r.rating_average >= p_min_rating))
  )
  select b.id, b.slug, b.title, b.summary, b.kind, b.prep_minutes, b.cook_minutes, b.total_minutes, b.difficulty,
         b.hero_image_path, b.rating_average, b.rating_count, b.save_count, b.verification, b.is_sample, b.published_at,
         coalesce((select array_agg(cu.name order by cu.name) from public.recipe_cuisines x join public.cuisines cu on cu.id = x.cuisine_id where x.recipe_id = b.id), '{}'),
         coalesce((select array_agg(c.name order by c.name) from public.recipe_countries x join public.countries c on c.id = x.country_id where x.recipe_id = b.id), '{}'),
         coalesce((select array_agg(c.iso2::text order by c.name) from public.recipe_countries x join public.countries c on c.id = x.country_id where x.recipe_id = b.id), '{}'),
         b.score,
         count(*) over ()
  from base b
  order by
    case when p_sort = 'rating' then coalesce(b.rating_average, 0) end desc nulls last,
    case when p_sort = 'rating' then b.rating_count end desc,
    case when p_sort = 'popular' then b.save_count + b.rating_count * 2 end desc,
    case when p_sort = 'newest' then b.published_at end desc,
    case when p_sort not in ('rating', 'popular', 'newest') then b.score end desc,
    b.published_at desc,
    b.title
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- ---------------------------------------------------------------------------
-- "What can I make?": recipes ranked by how many of the chosen ingredients they use.
-- ---------------------------------------------------------------------------
create or replace function public.match_recipes_by_ingredients(
  p_ingredient_ids bigint[],
  p_kind public.recipe_kind default null,
  p_limit int default 24
)
returns table (
  id uuid, slug text, title text, kind public.recipe_kind, total_minutes int, difficulty public.difficulty_level,
  hero_image_path text, is_sample boolean, cuisines text[],
  matched_count int, ingredient_count int, missing text[]
)
language sql stable
set search_path = ''
as $$
  with counts as (
    select ri.recipe_id,
           count(distinct ri.ingredient_id) filter (where ri.ingredient_id = any (p_ingredient_ids))::int as matched,
           count(distinct ri.ingredient_id)::int as total,
           array_agg(distinct i.name order by i.name) filter (where not (ri.ingredient_id = any (p_ingredient_ids))) as missing
    from public.recipe_ingredients ri
    join public.ingredients i on i.id = ri.ingredient_id
    group by ri.recipe_id
  )
  select r.id, r.slug, r.title, r.kind, r.total_minutes, r.difficulty, r.hero_image_path, r.is_sample,
         coalesce((select array_agg(cu.name order by cu.name) from public.recipe_cuisines x join public.cuisines cu on cu.id = x.cuisine_id where x.recipe_id = r.id), '{}'),
         c.matched, c.total, coalesce(c.missing, '{}')
  from counts c
  join public.recipes r on r.id = c.recipe_id
  where r.status = 'published' and c.matched > 0 and (p_kind is null or r.kind = p_kind)
    and coalesce(array_length(p_ingredient_ids, 1), 0) between 1 and 30
  order by c.matched desc, (c.total - c.matched) asc, r.title
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
$$;

-- ---------------------------------------------------------------------------
-- Search suggestions (recipes, ingredients, countries) as the visitor types.
-- ---------------------------------------------------------------------------
create or replace function public.search_suggestions(p_q text)
returns table (kind text, label text, slug text)
language sql stable
set search_path = ''
as $$
  with q as (select public.f_unaccent(lower(trim(p_q))) as v)
  (select case when r.kind = 'drink' then 'drink' else 'recipe' end, r.title, r.slug from public.recipes r, q
    where char_length(q.v) >= 2 and r.status = 'published'
      and (public.f_unaccent(lower(r.title)) like '%' || q.v || '%' or extensions.similarity(public.f_unaccent(lower(r.title)), q.v) > 0.35)
    order by extensions.similarity(public.f_unaccent(lower(r.title)), q.v) desc limit 5)
  union all
  (select 'ingredient', i.name, i.slug from public.ingredients i, q
    where char_length(q.v) >= 2 and public.f_unaccent(lower(i.name)) like q.v || '%'
      and exists (select 1 from public.recipe_ingredients ri join public.recipes r on r.id = ri.recipe_id
                  where ri.ingredient_id = i.id and r.status = 'published')
    order by i.name limit 4)
  union all
  (select 'country', c.name, c.slug from public.countries c, q
    where char_length(q.v) >= 2
      and (public.f_unaccent(lower(c.name)) like q.v || '%'
           or exists (select 1 from public.country_aliases a where a.country_id = c.id and public.f_unaccent(lower(a.alias)) like q.v || '%'))
    order by c.name limit 4)
$$;

grant execute on function public.search_recipes(text, public.recipe_kind, text, text, text, text, text, text, int, public.difficulty_level, numeric, text, int, int) to anon, authenticated;
grant execute on function public.match_recipes_by_ingredients(bigint[], public.recipe_kind, int) to anon, authenticated;
grant execute on function public.search_suggestions(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recipe photos: public to view, only editors upload. 8 MB, images only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "recipe images are public" on storage.objects for select using (bucket_id = 'recipe-images');
create policy "editors upload recipe images" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.can_edit_content());
create policy "editors replace recipe images" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and public.can_edit_content());
create policy "editors delete recipe images" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and public.can_edit_content());
