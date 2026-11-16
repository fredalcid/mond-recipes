-- ---------------------------------------------------------------------------
-- Mònd Recipes — Phase 5: administration
-- SEO fields, country cuisines and featured recipes, audit trail for reference
-- data and settings, role safety, ingredient merging, real dashboard statistics
-- and activity trends, and admin helpers. Every function checks the caller's
-- role itself; nothing here trusts the website alone.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------- SEO fields
alter table public.recipes
  add column canonical_url text check (canonical_url ~ '^https://[^\s]+$' and char_length(canonical_url) <= 500),
  add column og_image_path text check (char_length(og_image_path) <= 300),
  add column noindex boolean not null default false;
alter table public.articles
  add column canonical_url text check (canonical_url ~ '^https://[^\s]+$' and char_length(canonical_url) <= 500),
  add column og_image_path text check (char_length(og_image_path) <= 300),
  add column noindex boolean not null default false;
alter table public.videos
  add column canonical_url text check (canonical_url ~ '^https://[^\s]+$' and char_length(canonical_url) <= 500),
  add column og_image_path text check (char_length(og_image_path) <= 300),
  add column noindex boolean not null default false;
alter table public.countries
  add column canonical_url text check (canonical_url ~ '^https://[^\s]+$' and char_length(canonical_url) <= 500),
  add column og_image_path text check (char_length(og_image_path) <= 300);

-- ---------------------------------------------------------------- countries: cuisines and featured recipes
create table public.country_cuisines (
  country_id bigint not null references public.countries (id) on delete cascade,
  cuisine_id bigint not null references public.cuisines (id) on delete cascade,
  primary key (country_id, cuisine_id)
);
create index country_cuisines_cuisine on public.country_cuisines (cuisine_id);

create table public.country_featured_recipes (
  country_id bigint not null references public.countries (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null default 1 check (position between 1 and 12),
  primary key (country_id, recipe_id)
);

alter table public.country_cuisines enable row level security;
alter table public.country_featured_recipes enable row level security;
create policy "public read" on public.country_cuisines for select using (true);
create policy "editors manage" on public.country_cuisines for all to authenticated
  using (public.can_edit_content()) with check (public.can_edit_content());
-- Featured recipes are only shown publicly while the recipe is published.
create policy "public read published" on public.country_featured_recipes for select
  using (public.can_edit_content() or exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published'));
create policy "editors manage" on public.country_featured_recipes for all to authenticated
  using (public.can_edit_content()) with check (public.can_edit_content());

-- ---------------------------------------------------------------- moderators may lift a block (e.g. after a dispute)
create policy "moderators remove blocks" on public.blocks for delete to authenticated using (public.is_moderator());

-- ---------------------------------------------------------------- roles: never lose the last super admin
create or replace function public.guard_last_super_admin()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'super_admin' and (select count(*) from public.user_roles where role = 'super_admin') <= 1 then
    raise exception 'The site needs at least one super admin';
  end if;
  return old;
end $$;
create trigger user_roles_keep_super_admin before delete on public.user_roles
  for each row execute function public.guard_last_super_admin();

-- Who granted a role is recorded by the database, not the form.
create or replace function public.stamp_role_grant()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.granted_by := coalesce(auth.uid(), new.granted_by);
  return new;
end $$;
create trigger user_roles_stamp before insert on public.user_roles for each row execute function public.stamp_role_grant();

-- ---------------------------------------------------------------- audit trail
-- Changes made by signed-in staff to reference data, settings and roles are
-- recorded automatically (actor, table, id, which fields changed, a readable label).
create or replace function public.audit_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed jsonb;
begin
  if auth.uid() is null then return null; end if;
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(n.key order by n.key), '[]') into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from v_old -> n.key and n.key not in ('updated_at', 'search_vector', 'updated_by');
    if v_changed = '[]' then return null; end if;
  end if;
  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> tg_argv[0], ''),
    jsonb_strip_nulls(jsonb_build_object(
      'label', coalesce(v_row ->> 'name', v_row ->> 'title', v_row ->> 'slug', v_row ->> 'key', v_row ->> 'role', v_row ->> 'alias'),
      'changed', v_changed,
      'role', case when tg_table_name = 'user_roles' then v_row ->> 'role' end,
      'user', case when tg_table_name = 'user_roles' then v_row ->> 'user_id' end
    ))
  );
  return null;
end $$;

do $$
declare
  t record;
begin
  for t in select * from (values
    ('countries', 'id'), ('country_aliases', 'id'), ('regions', 'id'), ('cuisines', 'id'), ('categories', 'id'),
    ('dietary_tags', 'id'), ('allergens', 'id'), ('drink_categories', 'id'), ('ingredients', 'id'), ('ingredient_aliases', 'id'),
    ('article_categories', 'id'), ('product_categories', 'id'), ('country_cuisines', 'country_id'),
    ('country_featured_recipes', 'country_id'), ('site_settings', 'key'), ('user_roles', 'user_id'),
    ('retailers', 'id'), ('challenges', 'id'), ('blocks', 'blocker_id')
  ) as x(tbl, idcol) loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_change(%L)',
      t.tbl || '_audit', t.tbl, t.idcol);
  end loop;
end $$;

-- Super admins read the whole log; moderators and editors may read their own entries.
create policy "staff read own audit entries" on public.admin_activity_log for select to authenticated
  using (actor_id = auth.uid() and public.is_staff());

-- ---------------------------------------------------------------- ingredient merge
-- Members can create ingredients when they submit recipes, so duplicates happen
-- ("tomatoes", "tomato"). Merging moves every recipe to the kept ingredient and
-- keeps the old name as an alias so searches still find it.
create or replace function public.merge_ingredients(p_from bigint, p_into bigint)
returns int language plpgsql security definer
set search_path = ''
as $$
declare
  v_from public.ingredients;
  v_moved int;
begin
  if not public.can_edit_content() then raise exception 'Only editors can merge ingredients' using errcode = '42501'; end if;
  if p_from = p_into then raise exception 'Choose two different ingredients'; end if;
  select * into v_from from public.ingredients where id = p_from;
  if v_from.id is null or not exists (select 1 from public.ingredients where id = p_into) then raise exception 'Ingredient not found'; end if;

  update public.recipe_ingredients set ingredient_id = p_into where ingredient_id = p_from;
  get diagnostics v_moved = row_count;
  insert into public.ingredient_aliases (ingredient_id, alias)
    select p_into, a from (select v_from.name a union select alias from public.ingredient_aliases where ingredient_id = p_from) s
    where not exists (select 1 from public.ingredient_aliases x where x.ingredient_id = p_into and lower(x.alias) = lower(s.a))
      and lower(s.a) <> (select lower(name) from public.ingredients where id = p_into);
  update public.ingredients set grams_per_cup = coalesce(grams_per_cup, v_from.grams_per_cup) where id = p_into;
  delete from public.ingredients where id = p_from;

  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'merge', 'ingredients', p_into::text, jsonb_build_object('merged', v_from.name, 'recipes_moved', v_moved));
  return v_moved;
end $$;
revoke execute on function public.merge_ingredients(bigint, bigint) from public, anon;
grant execute on function public.merge_ingredients(bigint, bigint) to authenticated;

-- ---------------------------------------------------------------- dashboard statistics
-- Every number is counted from real rows at the moment the dashboard opens.
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - interval '30 days';
begin
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'recipes_total', (select count(*) from public.recipes),
    'recipes_published', (select count(*) from public.recipes where status = 'published'),
    'recipes_pending', (select count(*) from public.recipes where status = 'pending'),
    'recipes_draft', (select count(*) from public.recipes where status = 'draft'),
    'recipes_member', (select count(*) from public.recipes where status = 'published' and author_id is not null),
    'drinks_published', (select count(*) from public.recipes where status = 'published' and kind = 'drink'),
    'recipes_sample', (select count(*) from public.recipes where is_sample),
    'members_total', (select count(*) from public.profiles),
    'members_new_30d', (select count(*) from public.profiles where created_at > v_since),
    'members_active_30d', (select count(distinct who) from (
        select author_id who from public.community_posts where created_at > v_since
        union all select author_id from public.comments where created_at > v_since
        union all select author_id from public.recipe_reviews where created_at > v_since
        union all select user_id from public.likes where created_at > v_since
        union all select follower_id from public.follows where created_at > v_since
        union all select user_id from public.saved_recipes where created_at > v_since
        union all select author_id from public.recipes where author_id is not null and created_at > v_since) a),
    'members_suspended', (select count(*) from public.profiles where is_suspended),
    'posts_approved', (select count(*) from public.community_posts where status in ('approved', 'reported')),
    'posts_pending', (select count(*) from public.community_posts where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'comments_total', (select count(*) from public.comments where status in ('approved', 'reported')),
    'reviews_total', (select count(*) from public.recipe_reviews where status in ('approved', 'reported')),
    'articles_published', (select count(*) from public.articles where status = 'published'),
    'articles_total', (select count(*) from public.articles),
    'videos_published', (select count(*) from public.videos where status = 'published'),
    'videos_total', (select count(*) from public.videos),
    'products_active', (select count(*) from public.products where is_active),
    'products_total', (select count(*) from public.products),
    'products_broken', (select count(*) from public.products where link_status = 'broken'),
    'clicks_30d', (select count(*) from public.affiliate_clicks where clicked_at > v_since),
    'subscribers_confirmed', (select count(*) from public.newsletter_subscribers where status = 'confirmed'),
    'subscribers_pending', (select count(*) from public.newsletter_subscribers where status = 'pending'),
    'ads_enabled', (select count(*) from public.ad_placements where is_enabled),
    'ads_total', (select count(*) from public.ad_placements),
    'countries_indexable', (select count(*) from public.countries where is_indexable),
    'countries_with_recipes', (select count(distinct rc.country_id) from public.recipe_countries rc join public.recipes r on r.id = rc.recipe_id and r.status = 'published'),
    'ingredients_total', (select count(*) from public.ingredients),
    'generated_at', now()
  );
end $$;
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- Day-by-day activity for the analytics page (counts only; no personal data).
create or replace function public.admin_activity_series(p_days int default 30)
returns table (day date, new_members int, recipes_published int, posts_approved int, comments int, reviews int, saves int, clicks int, subscribers int)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_days int := greatest(7, least(coalesce(p_days, 30), 365));
  v_start date := current_date - (v_days - 1);
begin
  if not public.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  return query
  select d::date,
    (select count(*)::int from public.profiles where created_at::date = d),
    (select count(*)::int from public.recipes where status = 'published' and published_at::date = d),
    (select count(*)::int from public.community_posts where status in ('approved', 'reported') and approved_at::date = d),
    (select count(*)::int from public.comments where created_at::date = d),
    (select count(*)::int from public.recipe_reviews where created_at::date = d),
    (select count(*)::int from public.saved_recipes where created_at::date = d),
    (select count(*)::int from public.affiliate_clicks where clicked_at::date = d),
    (select count(*)::int from public.newsletter_subscribers where status = 'confirmed' and confirmed_at::date = d)
  from generate_series(v_start, current_date, interval '1 day') d
  order by d;
end $$;
revoke execute on function public.admin_activity_series(int) from public, anon;
grant execute on function public.admin_activity_series(int) to authenticated;

-- Account details that only super admins need (e.g. to answer a privacy request).
create or replace function public.admin_member_account(p_member uuid)
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.has_role('super_admin') then raise exception 'Super admins only' using errcode = '42501'; end if;
  return query select u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at from auth.users u where u.id = p_member;
end $$;
revoke execute on function public.admin_member_account(uuid) from public, anon;
grant execute on function public.admin_member_account(uuid) to authenticated;

-- ---------------------------------------------------------------- website settings defaults
-- Managed in Admin → Settings. Values are JSON; the site falls back to built-in defaults.
insert into public.site_settings (key, value) values
  ('brand.description', '"Discover recipes from around the world, explore drinks and tea, and share your cooking with a community of food lovers."'),
  ('brand.logo_path', 'null'),
  ('contact.email', 'null'),
  ('contact.mailing_address', 'null'),
  ('footer.note', '"Recipes and photos on this site are original or used with permission."'),
  ('homepage.sections', '{"countries": true, "popular": true, "trending": true, "drinks": true, "categories": true, "community": true, "articles": true, "shop": true, "newsletter": true}'),
  ('newsletter.intro', '"One email a week: new recipes, a country to explore and seasonal ideas. No spam."'),
  ('seo.default_title', '"Mònd Recipes: recipes, drinks and tea from around the world"'),
  ('seo.default_description', 'null'),
  ('seo.default_og_image_path', 'null'),
  ('seo.allow_indexing', 'false'),
  ('ads.txt', '""')
on conflict (key) do nothing;

-- Uploaded country flags may be SVG (checked for scripts before upload).
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
where id = 'recipe-images';

-- Super admins can remove a subscriber completely (e.g. a privacy deletion request).
create policy "super admins delete subscribers" on public.newsletter_subscribers for delete to authenticated
  using (public.has_role('super_admin'));
