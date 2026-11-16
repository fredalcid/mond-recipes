-- Mònd Recipes — Phase 1 database foundation
-- Tables, types, helper functions and triggers. Security policies are in the next migration.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('super_admin', 'editor', 'moderator');
create type public.content_status as enum ('draft', 'pending', 'published', 'unpublished', 'rejected', 'removed');
create type public.verification_level as enum ('community', 'editorial', 'test_kitchen');
create type public.recipe_kind as enum ('food', 'drink');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.subscriber_status as enum ('pending', 'confirmed', 'unsubscribed');

-- Accent-insensitive search helper ("mond" finds "Mònd"). Must be immutable for indexes.
create or replace function public.f_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- People and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  bio text check (char_length(bio) <= 500),
  avatar_path text,
  country_id bigint,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Create a profile for every new account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Member'), 60);
begin
  if char_length(v_name) < 2 then v_name := 'Member'; end if;
  insert into public.profiles (id, display_name) values (new.id, v_name);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role checks used by security policies. SECURITY DEFINER so they can read
-- user_roles/auth.users regardless of the caller's own permissions.
create or replace function public.has_role(p_role public.app_role)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid()) $$;

create or replace function public.can_edit_content()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin', 'editor'))
$$;

-- True only for signed-in members who confirmed their email and are not suspended.
create or replace function public.is_verified_member()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid() and u.email_confirmed_at is not null and not p.is_suspended
  )
$$;

-- ---------------------------------------------------------------------------
-- World: countries, regions, cuisines
-- ---------------------------------------------------------------------------
create table public.countries (
  id bigint generated always as identity primary key,
  iso2 char(2) not null unique check (iso2 ~ '^[A-Z]{2}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  flag_path text,
  intro text,
  food_culture text,
  hero_image_path text,
  is_featured boolean not null default false,
  -- Only pages with enough original content are indexed by search engines.
  is_indexable boolean not null default false,
  display_order int not null default 0,
  seo_title text,
  meta_description text check (char_length(meta_description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger countries_updated_at before update on public.countries for each row execute function public.set_updated_at();
create index countries_name_trgm on public.countries using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);

alter table public.profiles add constraint profiles_country_fk foreign key (country_id) references public.countries (id) on delete set null;

create table public.country_aliases (
  id bigint generated always as identity primary key,
  country_id bigint not null references public.countries (id) on delete cascade,
  alias text not null,
  unique (country_id, alias)
);
create index country_aliases_trgm on public.country_aliases using gin (public.f_unaccent(lower(alias)) extensions.gin_trgm_ops);

create table public.regions (
  id bigint generated always as identity primary key,
  country_id bigint not null references public.countries (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_id, slug)
);
create trigger regions_updated_at before update on public.regions for each row execute function public.set_updated_at();

create table public.cuisines (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger cuisines_updated_at before update on public.cuisines for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  display_order int not null default 0
);

create table public.dietary_tags (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

create table public.allergens (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

create table public.drink_categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  is_alcoholic boolean not null default false,
  display_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Ingredients
-- ---------------------------------------------------------------------------
create table public.ingredients (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  -- Density for cup <-> gram conversion. Null means only approximate conversions are shown.
  grams_per_cup numeric(8, 2) check (grams_per_cup > 0),
  created_at timestamptz not null default now()
);
create index ingredients_name_trgm on public.ingredients using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);

create table public.ingredient_aliases (
  id bigint generated always as identity primary key,
  ingredient_id bigint not null references public.ingredients (id) on delete cascade,
  alias text not null,
  unique (ingredient_id, alias)
);
create index ingredient_aliases_trgm on public.ingredient_aliases using gin (public.f_unaccent(lower(alias)) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Recipes (food and drinks share one table; kind tells them apart)
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  kind public.recipe_kind not null default 'food',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  summary text check (char_length(summary) <= 600),
  author_id uuid references public.profiles (id) on delete set null,
  status public.content_status not null default 'draft',
  verification public.verification_level not null default 'community',
  prep_minutes int check (prep_minutes >= 0),
  cook_minutes int check (cook_minutes >= 0),
  total_minutes int generated always as (coalesce(prep_minutes, 0) + coalesce(cook_minutes, 0)) stored,
  servings int check (servings between 1 and 100),
  serving_unit text,
  difficulty public.difficulty_level,
  tips text,
  substitutions text,
  hero_image_path text,
  drink_category_id bigint references public.drink_categories (id) on delete set null,
  alcohol_percent numeric(4, 1) check (alcohol_percent between 0 and 100),
  -- Maintained from real ratings (Phase 2). Never edited by hand.
  rating_average numeric(3, 2),
  rating_count int not null default 0,
  save_count int not null default 0,
  view_count bigint not null default 0,
  seo_title text,
  meta_description text check (char_length(meta_description) <= 300),
  search_vector tsvector,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger recipes_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create index recipes_status_kind on public.recipes (status, kind, published_at desc);
create index recipes_author on public.recipes (author_id);
create index recipes_search on public.recipes using gin (search_vector);
create index recipes_title_trgm on public.recipes using gin (public.f_unaccent(lower(title)) extensions.gin_trgm_ops);

create or replace function public.recipes_search_vector()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(new.summary, ''))), 'B');
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger recipes_search before insert or update of title, summary, status on public.recipes
  for each row execute function public.recipes_search_vector();

create table public.recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id bigint not null references public.ingredients (id) on delete restrict,
  position int not null,
  quantity numeric(10, 3) check (quantity > 0),
  unit text,
  note text,
  group_label text,
  unique (recipe_id, position)
);
create index recipe_ingredients_ingredient on public.recipe_ingredients (ingredient_id);

create table public.recipe_steps (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null,
  body text not null check (char_length(body) between 2 and 2000),
  timer_seconds int check (timer_seconds > 0),
  unique (recipe_id, position)
);

create table public.recipe_images (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  credit text,
  license text,
  position int not null default 0
);

create table public.recipe_sources (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  source_type text not null check (source_type in ('original', 'family', 'adapted', 'licensed', 'test_kitchen')),
  description text,
  url text
);

-- Full snapshot on every edit, so the original recipe is always preserved.
create table public.recipe_versions (
  id bigint generated always as identity primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  edited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recipe_id, version)
);

create or replace function public.snapshot_recipe_version()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.recipe_versions (recipe_id, version, snapshot, edited_by)
  values (
    old.id,
    coalesce((select max(version) from public.recipe_versions where recipe_id = old.id), 0) + 1,
    to_jsonb(old) - 'search_vector',
    auth.uid()
  );
  return new;
end $$;
create trigger recipes_versioning after update of title, summary, prep_minutes, cook_minutes, servings, difficulty, tips, substitutions
  on public.recipes for each row execute function public.snapshot_recipe_version();

-- Members may edit their own drafts but never publish or verify their own recipes.
create or replace function public.guard_recipe_fields()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if public.can_edit_content() or current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending') or new.verification <> 'community'
       or new.rating_count <> 0 or new.rating_average is not null or new.save_count <> 0 or new.view_count <> 0 then
      raise exception 'Only editors can publish, verify or set statistics on recipes';
    end if;
  else
    if new.status is distinct from old.status and new.status not in ('draft', 'pending') then
      raise exception 'Only editors can publish recipes';
    end if;
    if old.status not in ('draft', 'pending', 'rejected') then
      raise exception 'Published recipes can only be changed by editors';
    end if;
    if new.verification is distinct from old.verification
       or new.rating_count is distinct from old.rating_count or new.rating_average is distinct from old.rating_average
       or new.save_count is distinct from old.save_count or new.view_count is distinct from old.view_count
       or new.author_id is distinct from old.author_id then
      raise exception 'These recipe fields can only be changed by editors';
    end if;
  end if;
  return new;
end $$;
create trigger recipes_guard before insert or update on public.recipes
  for each row execute function public.guard_recipe_fields();

-- Many-to-many links
create table public.recipe_countries (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  country_id bigint not null references public.countries (id) on delete cascade,
  primary key (recipe_id, country_id)
);
create index recipe_countries_country on public.recipe_countries (country_id);

create table public.recipe_regions (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  region_id bigint not null references public.regions (id) on delete cascade,
  primary key (recipe_id, region_id)
);
create index recipe_regions_region on public.recipe_regions (region_id);

create table public.recipe_cuisines (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  cuisine_id bigint not null references public.cuisines (id) on delete cascade,
  primary key (recipe_id, cuisine_id)
);
create index recipe_cuisines_cuisine on public.recipe_cuisines (cuisine_id);

create table public.recipe_categories (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  primary key (recipe_id, category_id)
);
create index recipe_categories_category on public.recipe_categories (category_id);

create table public.recipe_dietary_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  dietary_tag_id bigint not null references public.dietary_tags (id) on delete cascade,
  primary key (recipe_id, dietary_tag_id)
);

create table public.recipe_allergens (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  allergen_id bigint not null references public.allergens (id) on delete cascade,
  primary key (recipe_id, allergen_id)
);

create or replace function public.can_view_recipe(p_recipe_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and (r.status = 'published' or r.author_id = auth.uid() or public.is_staff())
  )
$$;

create or replace function public.can_edit_recipe(p_recipe_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select public.can_edit_content() or exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id and r.author_id = auth.uid()
      and r.status in ('draft', 'pending', 'rejected') and public.is_verified_member()
  )
$$;

-- ---------------------------------------------------------------------------
-- Site settings, audit log, newsletter
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index admin_activity_log_created on public.admin_activity_log (created_at desc);

create table public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email extensions.citext not null unique,
  status public.subscriber_status not null default 'pending',
  consent_text text not null,
  consent_at timestamptz not null default now(),
  consent_ip inet,
  source text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public sign-up entry point. Records consent; never reveals whether an email was already on the list.
create or replace function public.subscribe_newsletter(p_email text, p_consent_text text, p_source text default 'website', p_ip text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_ip inet;
begin
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 254 then
    raise exception 'invalid email';
  end if;
  if coalesce(trim(p_consent_text), '') = '' then
    raise exception 'consent required';
  end if;
  begin v_ip := p_ip::inet; exception when others then v_ip := null; end;

  insert into public.newsletter_subscribers (email, consent_text, source, consent_ip)
  values (lower(trim(p_email)), p_consent_text, left(coalesce(p_source, 'website'), 40), v_ip)
  on conflict (email) do update
    set status = case when public.newsletter_subscribers.status = 'unsubscribed' then 'pending'::public.subscriber_status
                      else public.newsletter_subscribers.status end,
        consent_text = excluded.consent_text,
        consent_at = now(),
        consent_ip = excluded.consent_ip,
        unsubscribed_at = null;
end $$;
