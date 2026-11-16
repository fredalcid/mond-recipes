-- Mònd Recipes — Phase 3: articles, videos, shop, advertising and newsletter confirmation

create or replace function public.set_published_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------
create table public.article_categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  display_order int not null default 0
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  excerpt text check (char_length(excerpt) <= 400),
  body text not null default '' check (char_length(body) <= 100000),
  hero_image_path text,
  hero_alt text,
  author_id uuid references public.profiles (id) on delete set null,
  byline text,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  is_sample boolean not null default false,
  published_at timestamptz,
  seo_title text,
  meta_description text check (char_length(meta_description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger articles_updated_at before update on public.articles for each row execute function public.set_updated_at();
create trigger articles_published_at before insert or update on public.articles for each row execute function public.set_published_at();
create index articles_status on public.articles (status, published_at desc);

create table public.article_category_links (
  article_id uuid not null references public.articles (id) on delete cascade,
  category_id bigint not null references public.article_categories (id) on delete cascade,
  primary key (article_id, category_id)
);
create table public.article_recipes (
  article_id uuid not null references public.articles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  primary key (article_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- Videos (hosted on YouTube for now; member uploads come with the community)
-- ---------------------------------------------------------------------------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  description text check (char_length(description) <= 5000),
  provider text not null default 'youtube' check (provider in ('youtube')),
  provider_video_id text not null check (provider_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  collection text,
  duration_seconds int check (duration_seconds > 0),
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  meta_description text check (char_length(meta_description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger videos_updated_at before update on public.videos for each row execute function public.set_updated_at();
create trigger videos_published_at before insert or update on public.videos for each row execute function public.set_published_at();

create table public.video_recipes (
  video_id uuid not null references public.videos (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  primary key (video_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- Shop: product discovery with outbound affiliate links. No checkout, no prices.
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  display_order int not null default 0
);

create table public.retailers (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  website_url text check (website_url ~ '^https://'),
  -- Appended to every outbound link for this retailer, e.g. "tag=mondrecipes-20".
  tracking_params text check (tracking_params is null or tracking_params ~ '^[A-Za-z0-9_.~=&%-]+$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 140),
  description text check (char_length(description) <= 600),
  image_path text,
  image_alt text,
  category_id bigint references public.product_categories (id) on delete set null,
  brand text,
  retailer_id bigint references public.retailers (id) on delete set null,
  affiliate_url text not null check (affiliate_url ~ '^https://'),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_sponsored boolean not null default false,
  display_order int not null default 0,
  link_status text not null default 'unknown' check (link_status in ('unknown', 'ok', 'broken')),
  link_http_status int,
  link_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create index products_listing on public.products (is_active, category_id, display_order);

-- Outbound clicks: no personal data (no IP, no user id, no full referrer).
create table public.affiliate_clicks (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  source_path text check (char_length(source_path) <= 200),
  referrer_host text check (char_length(referrer_host) <= 120)
);
create index affiliate_clicks_product_time on public.affiliate_clicks (product_id, clicked_at desc);

create or replace function public.record_affiliate_click(p_product_id uuid, p_source_path text default null, p_referrer_host text default null)
returns void language sql security definer
set search_path = ''
as $$
  insert into public.affiliate_clicks (product_id, source_path, referrer_host)
  select p.id, left(p_source_path, 200), left(p_referrer_host, 120)
  from public.products p where p.id = p_product_id and p.is_active
$$;

create or replace function public.product_click_report(p_days int default 30)
returns table (product_id uuid, name text, retailer text, clicks bigint, last_click timestamptz, link_status text)
language sql stable
set search_path = ''
as $$
  select p.id, p.name, r.name, count(c.id), max(c.clicked_at), p.link_status
  from public.products p
  left join public.retailers r on r.id = p.retailer_id
  left join public.affiliate_clicks c on c.product_id = p.id and c.clicked_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by p.id, p.name, r.name, p.link_status
  order by count(c.id) desc, p.name
$$;

-- ---------------------------------------------------------------------------
-- Advertising placements (Google AdSense slots), managed by super admins
-- ---------------------------------------------------------------------------
create table public.ad_placements (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  location text not null,
  is_enabled boolean not null default false,
  adsense_slot text check (adsense_slot ~ '^[0-9]{6,20}$'),
  ad_format text not null default 'auto' check (ad_format in ('auto', 'fluid', 'rectangle', 'horizontal')),
  fallback_kind text not null default 'none' check (fallback_kind in ('none', 'newsletter', 'house')),
  house_text text check (char_length(house_text) <= 160),
  house_url text check (house_url is null or house_url ~ '^(https://|/)'),
  display_order int not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger ad_placements_updated_at before update on public.ad_placements for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Newsletter: double opt-in. Tokens are random, stored only as SHA-256 hashes.
-- ---------------------------------------------------------------------------
alter table public.newsletter_subscribers
  add column confirm_token_hash text,
  add column unsubscribe_token_hash text,
  add column confirm_sent_at timestamptz;

drop function if exists public.subscribe_newsletter(text, text, text, text);

create or replace function public.newsletter_request(p_email text, p_consent_text text, p_source text default 'website', p_ip text default null)
returns table (confirm_token text, unsubscribe_token text, already_confirmed boolean)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ip inet;
  v_confirm text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_unsub text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_status public.subscriber_status;
begin
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 254 then
    raise exception 'invalid email';
  end if;
  if coalesce(trim(p_consent_text), '') = '' then raise exception 'consent required'; end if;
  begin v_ip := p_ip::inet; exception when others then v_ip := null; end;

  select status into v_status from public.newsletter_subscribers where email = lower(trim(p_email));
  if v_status = 'confirmed' then
    return query select null::text, null::text, true;
    return;
  end if;

  insert into public.newsletter_subscribers (email, consent_text, source, consent_ip, status, confirm_token_hash, unsubscribe_token_hash, confirm_sent_at)
  values (lower(trim(p_email)), p_consent_text, left(coalesce(p_source, 'website'), 40), v_ip, 'pending',
          encode(sha256(convert_to(v_confirm, 'UTF8')), 'hex'), encode(sha256(convert_to(v_unsub, 'UTF8')), 'hex'), now())
  on conflict (email) do update set
    status = 'pending', consent_text = excluded.consent_text, consent_at = now(), consent_ip = excluded.consent_ip,
    source = excluded.source, confirm_token_hash = excluded.confirm_token_hash,
    unsubscribe_token_hash = excluded.unsubscribe_token_hash, confirm_sent_at = now(), unsubscribed_at = null;

  return query select v_confirm, v_unsub, false;
end $$;

create or replace function public.newsletter_confirm(p_token text)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare v_count int;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.newsletter_subscribers
     set status = 'confirmed', confirmed_at = now(), confirm_token_hash = null
   where confirm_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and status = 'pending' and confirm_sent_at > now() - interval '7 days';
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;

create or replace function public.newsletter_unsubscribe(p_token text)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare v_count int;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.newsletter_subscribers
     set status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hash = null
   where unsubscribe_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and status <> 'unsubscribed';
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;

-- ---------------------------------------------------------------------------
-- Simple fixed-window rate limiting for server actions (called with the service key only)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits) values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_limit;
end $$;

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------
alter table public.article_categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_category_links enable row level security;
alter table public.article_recipes enable row level security;
alter table public.videos enable row level security;
alter table public.video_recipes enable row level security;
alter table public.product_categories enable row level security;
alter table public.retailers enable row level security;
alter table public.products enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.ad_placements enable row level security;
alter table public.rate_limits enable row level security;

do $$
declare t text;
begin
  foreach t in array array['article_categories', 'product_categories', 'retailers']
  loop
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "editors write" on public.%I for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content())', t);
  end loop;
  foreach t in array array['articles', 'videos']
  loop
    execute format('create policy "read published or as staff" on public.%I for select using (status = ''published'' or public.is_staff())', t);
    execute format('create policy "editors write" on public.%I for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content())', t);
  end loop;
end $$;

create policy "read with article" on public.article_category_links for select
  using (exists (select 1 from public.articles a where a.id = article_id and (a.status = 'published' or public.is_staff())));
create policy "editors write" on public.article_category_links for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "read with article" on public.article_recipes for select
  using (exists (select 1 from public.articles a where a.id = article_id and (a.status = 'published' or public.is_staff())));
create policy "editors write" on public.article_recipes for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "read with video" on public.video_recipes for select
  using (exists (select 1 from public.videos v where v.id = video_id and (v.status = 'published' or public.is_staff())));
create policy "editors write" on public.video_recipes for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

create policy "active products are public" on public.products for select using (is_active or public.is_staff());
create policy "editors write" on public.products for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

create policy "staff read clicks" on public.affiliate_clicks for select to authenticated using (public.is_staff());

create policy "placements are public" on public.ad_placements for select using (true);
create policy "super admins manage placements" on public.ad_placements for update to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
-- rate_limits: no policies; only SECURITY DEFINER functions touch it.

revoke execute on function public.record_affiliate_click(uuid, text, text) from public;
grant execute on function public.record_affiliate_click(uuid, text, text) to anon, authenticated;
revoke execute on function public.newsletter_request(text, text, text, text) from public, anon, authenticated;
grant execute on function public.newsletter_request(text, text, text, text) to service_role;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
grant execute on function public.newsletter_confirm(text) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(text) to anon, authenticated;
grant execute on function public.product_click_report(int) to authenticated;

-- Images for articles, videos and products: public to view, editors upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
create policy "media is public" on storage.objects for select using (bucket_id = 'media');
create policy "editors upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.can_edit_content());
create policy "editors replace media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.can_edit_content());
create policy "editors delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.can_edit_content());

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
insert into public.article_categories (slug, name, display_order) values
  ('food-culture', 'Food culture', 0), ('country-guides', 'Country food guides', 1), ('cooking-techniques', 'Cooking techniques', 2),
  ('ingredient-guides', 'Ingredient guides', 3), ('kitchen-tips', 'Kitchen tips', 4), ('seasonal-food', 'Seasonal food', 5),
  ('healthy-cooking', 'Healthy cooking', 6), ('food-history', 'Food history', 7), ('editors-picks', 'Editor''s picks', 8)
on conflict (slug) do nothing;

insert into public.product_categories (slug, name, display_order) values
  ('kitchen-appliances', 'Kitchen appliances', 0), ('cookware', 'Cookware', 1), ('kitchen-utensils', 'Kitchen utensils', 2),
  ('knives-and-cutting-tools', 'Knives and cutting tools', 3), ('baking-equipment', 'Baking equipment', 4), ('coffee-equipment', 'Coffee equipment', 5),
  ('tea-equipment', 'Tea equipment', 6), ('food-storage', 'Food storage', 7), ('kitchen-accessories', 'Kitchen accessories', 8),
  ('cookbooks', 'Cookbooks', 9), ('ebooks', 'Ebooks', 10), ('digital-meal-planners', 'Digital meal planners', 11)
on conflict (slug) do nothing;

insert into public.ad_placements (key, name, location, fallback_kind, display_order) values
  ('home_mid', 'Homepage, middle', 'Between the Trending and Drinks sections', 'none', 0),
  ('search_results', 'Search results', 'Above the recipe results on Recipes and Drinks & Tea', 'none', 1),
  ('recipe_top', 'Recipe page, after details', 'Below the prep/cook summary, before ingredients', 'none', 2),
  ('recipe_bottom', 'Recipe page, after method', 'After tips and substitutions', 'newsletter', 3),
  ('country_mid', 'Country page', 'Between food culture and dishes', 'none', 4),
  ('article_mid', 'Article page', 'In the middle of the article text', 'none', 5),
  ('community_mid', 'Community pages', 'Reserved for the community (Phase 4)', 'none', 6),
  ('footer', 'Above the footer', 'Every page, just above the footer', 'none', 7)
on conflict (key) do nothing;
