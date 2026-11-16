-- Phase 3 tests: articles, videos, shop, ads, newsletter double opt-in, rate limits.
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

-- Editor creates content
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
insert into public.articles (slug, title, excerpt, body, status) values
  ('brewing-tea', 'How to Brew Loose-Leaf Tea', 'Water, time, temperature.', '## Water\nUse fresh water.', 'published'),
  ('draft-article', 'Unfinished Draft', null, 'todo', 'draft');
insert into public.article_category_links (article_id, category_id)
  select a.id, c.id from public.articles a, public.article_categories c where a.slug = 'brewing-tea' and c.slug = 'cooking-techniques';
insert into public.videos (slug, title, provider_video_id, status) values ('knife-skills', 'Knife Skills', 'dQw4w9WgXcQ', 'published');
insert into public.retailers (slug, name, website_url, tracking_params) values ('example-shop', 'Example Shop', 'https://shop.example', 'tag=mond-20');
insert into public.products (slug, name, affiliate_url, retailer_id, category_id, is_sponsored)
  select 'cast-iron-skillet', 'Cast-iron skillet', 'https://shop.example/skillet', r.id, c.id, true
  from public.retailers r, public.product_categories c where r.slug = 'example-shop' and c.slug = 'cookware';
insert into public.products (slug, name, affiliate_url, is_active) values ('hidden-thing', 'Hidden product', 'https://shop.example/hidden', false);
select pg_temp.expect((select published_at is not null from public.articles where slug = 'brewing-tea'), 'publishing an article records the date');
select pg_temp.expect_fail($$insert into public.products (slug, name, affiliate_url) values ('bad', 'Bad link', 'http://insecure.example')$$, 'non-HTTPS affiliate links');
select pg_temp.expect_fail($$insert into public.videos (slug, title, provider_video_id) values ('bad-video', 'Bad', 'not a valid id!')$$, 'invalid YouTube video IDs');
select pg_temp.expect_fail($$insert into public.retailers (slug, name, tracking_params) values ('evil', 'Evil', 'tag=1"><script>')$$, 'unsafe tracking parameters');
update public.ad_placements set is_enabled = true where key = 'footer';
reset role;
select pg_temp.expect((select not is_enabled from public.ad_placements where key = 'footer'), 'editors cannot change ad placements');
set role authenticated;

-- Members
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.expect_fail($$insert into public.articles (slug, title, body, status) values ('member-post', 'Member article', 'x', 'published')$$, 'member publishing an article');
select pg_temp.expect_fail($$insert into public.products (slug, name, affiliate_url) values ('spam', 'Spam', 'https://spam.example')$$, 'member adding a product');
select pg_temp.expect((select count(*) = 0 from public.affiliate_clicks), 'members cannot read click data');

-- Visitors
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect((select count(*) = 1 from public.articles), 'visitors see only published articles');
select pg_temp.expect((select count(*) = 1 from public.article_category_links), 'visitors see categories of published articles only');
select pg_temp.expect((select count(*) = 1 from public.products), 'visitors see only active products');
select public.record_affiliate_click((select id from public.products where slug = 'cast-iron-skillet'), '/shop', 'mondrecipes.com');
select public.record_affiliate_click((select id from public.products where slug = 'cast-iron-skillet'), repeat('x', 500), null);
select pg_temp.expect_fail($$insert into public.affiliate_clicks (product_id) select id from public.products limit 1$$, 'visitors writing clicks directly');
select pg_temp.expect((select count(*) = 0 from public.affiliate_clicks), 'visitors cannot read click data');
select pg_temp.expect_fail($$select public.check_rate_limit('x', 1, 60)$$, 'visitors calling the rate limiter');
select pg_temp.expect((select count(*) = 8 from public.ad_placements), 'ad placements are readable so pages can render them');
reset role;
select pg_temp.expect((select count(*) = 2 and max(char_length(source_path)) = 200 from public.affiliate_clicks), 'clicks are recorded without personal data and long values are trimmed');
select public.record_affiliate_click((select id from public.products where slug = 'hidden-thing'), '/shop', null);
select pg_temp.expect((select count(*) = 2 from public.affiliate_clicks), 'clicks on inactive products are ignored');

-- Click report for staff
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select pg_temp.expect((select clicks = 2 and retailer = 'Example Shop' from public.product_click_report(30) where name = 'Cast-iron skillet'), 'click report counts clicks per product');

-- Newsletter double opt-in
reset role;
set role service_role;
create temp table t_tokens as select * from public.newsletter_request('Cook@Example.com', 'Yes, send me the newsletter', 'test', '198.51.100.7');
grant select on t_tokens to anon, postgres;
reset role;
select pg_temp.expect((select status = 'pending' and confirm_token_hash is not null and confirm_token_hash <> (select confirm_token from t_tokens)
  from public.newsletter_subscribers where email = 'cook@example.com'), 'sign-up is pending and the token is stored only as a hash');
set role anon;
select pg_temp.expect((select not public.newsletter_confirm(repeat('a', 64))), 'a wrong token confirms nothing');
select pg_temp.expect((select not public.newsletter_confirm('short')), 'malformed tokens are rejected');
select pg_temp.expect((select public.newsletter_confirm((select confirm_token from t_tokens))), 'the emailed link confirms the subscription');
select pg_temp.expect((select not public.newsletter_confirm((select confirm_token from t_tokens))), 'a confirmation link works only once');
reset role;
select pg_temp.expect((select status = 'confirmed' and confirmed_at is not null from public.newsletter_subscribers where email = 'cook@example.com'), 'subscriber is confirmed');
set role service_role;
select pg_temp.expect((select already_confirmed and confirm_token is null from public.newsletter_request('cook@example.com', 'again', 'test', null)), 'signing up again does not reset a confirmed subscriber');
set role anon;
select pg_temp.expect((select public.newsletter_unsubscribe((select unsubscribe_token from t_tokens))), 'the unsubscribe link works');
reset role;
select pg_temp.expect((select status = 'unsubscribed' from public.newsletter_subscribers where email = 'cook@example.com'), 'subscriber is unsubscribed');
update public.newsletter_subscribers set confirm_sent_at = now() - interval '8 days', status = 'pending', confirm_token_hash = 'x' where email = 'cook@example.com';
set role service_role;
create temp table t_old as select * from public.newsletter_request('late@example.com', 'consent', 'test', null);
grant select on t_old to anon, postgres;
reset role;
update public.newsletter_subscribers set confirm_sent_at = now() - interval '8 days' where email = 'late@example.com';
set role anon;
select pg_temp.expect((select not public.newsletter_confirm((select confirm_token from t_old))), 'confirmation links expire after 7 days');

-- Rate limiting
reset role;
set role service_role;
select pg_temp.expect((select public.check_rate_limit('newsletter:203.0.113.1', 2, 3600)), 'first request allowed');
select pg_temp.expect((select public.check_rate_limit('newsletter:203.0.113.1', 2, 3600)), 'second request allowed');
select pg_temp.expect((select not public.check_rate_limit('newsletter:203.0.113.1', 2, 3600)), 'third request in the window is blocked');
select pg_temp.expect((select public.check_rate_limit('newsletter:203.0.113.2', 2, 3600)), 'limits are per visitor');

reset role;
\echo 'All Phase 3 tests passed.'
