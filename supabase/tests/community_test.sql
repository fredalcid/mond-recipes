-- Phase 4 tests: community, moderation, notifications, member recipes.
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

-- People: a = super admin, e = editor, b = Bea (member), c = other member, d = unverified,
-- f = moderator, g = Gus (member).
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000f', 'mod@example.com', now(), '{"display_name":"Mo Moderator"}'),
  ('00000000-0000-0000-0000-000000000001', 'gus@example.com', now(), '{"display_name":"Gus Ñandú"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000f', 'moderator');
-- Earlier tests made c a moderator; here c is an ordinary member again.
delete from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000c';

create temp table ids (k text primary key, v uuid);
grant all on ids to anon, authenticated;

select pg_temp.expect((select count(*) = 0 from public.profiles where username is null), 'every member has a username');
select pg_temp.expect((select username::text ~ '^gusnandu[0-9]{4}$' from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'usernames are made from the display name without accents');

-- A published recipe written by Bea to talk about.
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.recipes (kind, slug, title, author_id, status)
  values ('food', 'beas-dal', 'Bea''s Dal', null, 'draft');
reset role;
update public.recipes set author_id = '00000000-0000-0000-0000-00000000000b', status = 'published' where slug = 'beas-dal';
insert into ids select 'dal', id from public.recipes where slug = 'beas-dal';

-- ---------------------------------------------------------------- follows
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
insert into public.follows (follower_id, followee_id) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select follower_count = 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'following updates the follower count');
select pg_temp.expect_fail($$insert into public.follows values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')$$, 'following yourself');
select pg_temp.expect_fail($$insert into public.follows values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$, 'following on someone else''s behalf');
select pg_temp.expect_fail($$update public.profiles set follower_count = 9999 where id = auth.uid()$$, 'members setting their own follower count');
select pg_temp.expect_fail($$update public.profiles set is_featured = true where id = auth.uid()$$, 'members featuring themselves');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_fail($$insert into public.follows values ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b')$$, 'unverified accounts following');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 1 from public.notifications where type = 'follow'), 'Bea is told about her new follower');
select pg_temp.expect(public.unread_notification_count() = (select count(*) from public.notifications where read_at is null) and public.unread_notification_count() >= 1, 'unread count for the header bell');

-- ---------------------------------------------------------------- posts
insert into public.community_posts (author_id, kind, body, recipe_id) select auth.uid(), 'photo', 'Made my dal tonight!', v from ids where k = 'dal';
insert into ids select 'post', id from public.community_posts where body = 'Made my dal tonight!';
insert into public.post_media (post_id, media_type, storage_path, alt)
  select v, 'image', '00000000-0000-0000-0000-00000000000b/dal.jpg', 'A bowl of dal' from ids where k = 'post';
select pg_temp.expect_fail($$insert into public.post_media (post_id, media_type, storage_path) select v, 'image', '00000000-0000-0000-0000-00000000000c/stolen.jpg' from ids where k = 'post'$$,
  'attaching files from another member''s folder');
select pg_temp.expect_fail($$insert into public.community_posts (author_id, kind, body, status) values (auth.uid(), 'tip', 'Approve myself', 'approved')$$, 'members approving their own posts');
select pg_temp.expect_fail($$update public.community_posts set status = 'approved' where author_id = auth.uid()$$, 'members approving a post later');
select pg_temp.expect_fail($$update public.community_posts set like_count = 500 where author_id = auth.uid()$$, 'members inflating like counts');
select pg_temp.expect((select count(*) = 1 from public.community_posts), 'authors see their own pending post');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 0 from public.community_posts), 'pending posts are hidden from other members');
select pg_temp.expect_fail($$insert into public.comments (author_id, post_id, body) select auth.uid(), v, 'Hi' from ids where k = 'post'$$, 'commenting on a pending post');
reset role;
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 0 from public.community_posts), 'pending posts are hidden from visitors');
select pg_temp.expect((select count(*) = 0 from public.post_media), 'media of pending posts is hidden');
reset role;

-- Moderator approves
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect((select count(*) = 1 from public.community_posts where status = 'pending'), 'moderators see the review queue');
select public.moderate('post', v, 'approve', null) from ids where k = 'post';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_fail($$select public.moderate('post', v, 'remove', 'no') from ids where k = 'post'$$, 'members moderating');
reset role;
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 1 from public.community_posts where status = 'approved'), 'approved posts are public');
select pg_temp.expect((select count(*) = 1 from public.post_media), 'approved post media is public');
reset role;
select pg_temp.expect((select count(*) = 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'moderation'
  and data ->> 'status' = 'approved'), 'Bea is told her post was approved');
select pg_temp.expect((select count(*) = 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and type = 'activity'),
  'followers hear about the approved post');
select pg_temp.expect((select count(*) = 1 from public.admin_activity_log where action = 'moderate_approve'), 'moderation is logged');

-- ---------------------------------------------------------------- comments, replies, likes
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.comments (author_id, post_id, body) select auth.uid(), v, 'Looks delicious' from ids where k = 'post';
insert into ids select 'c1', id from public.comments where body = 'Looks delicious';
select pg_temp.expect_fail($$insert into public.comments (author_id, post_id, body, like_count) select auth.uid(), v, 'cheat', 50 from ids where k = 'post'$$, 'comments with made-up likes');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.comments (author_id, post_id, parent_id, body) select auth.uid(), p.v, c.v, 'Thank you!' from ids p, ids c where p.k = 'post' and c.k = 'c1';
insert into ids select 'r1', id from public.comments where body = 'Thank you!';
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
insert into public.comments (author_id, post_id, parent_id, body) select auth.uid(), p.v, r.v, 'Reply to a reply' from ids p, ids r where p.k = 'post' and r.k = 'r1';
select pg_temp.expect((select parent_id = (select v from ids where k = 'c1') from public.comments where body = 'Reply to a reply'),
  'replies to replies stay one level deep');
select pg_temp.expect_fail($$insert into public.comments (author_id, recipe_id, parent_id, body) select auth.uid(), d.v, c.v, 'wrong page' from ids d, ids c where d.k = 'dal' and c.k = 'c1'$$,
  'replying on a different page');
select pg_temp.expect((select comment_count = 3 from public.community_posts), 'comment counts are kept');
insert into public.comments (author_id, recipe_id, body) select auth.uid(), v, 'Great dal recipe' from ids where k = 'dal';
insert into public.likes (user_id, target_type, target_id) select auth.uid(), 'post', v from ids where k = 'post';
select pg_temp.expect((select like_count = 1 from public.community_posts), 'likes are counted');
select pg_temp.expect_fail($$insert into public.likes (user_id, target_type, target_id) select auth.uid(), 'post', v from ids where k = 'post'$$, 'liking twice');
select pg_temp.expect_fail($$insert into public.likes (user_id, target_type, target_id) values (auth.uid(), 'post', gen_random_uuid())$$, 'liking something that doesn''t exist');
delete from public.likes where user_id = auth.uid();
insert into public.likes (user_id, target_type, target_id) select auth.uid(), 'post', v from ids where k = 'post';
select pg_temp.expect((select like_count = 1 from public.community_posts), 'unlike then like again counts once');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 1 from public.notifications where type = 'like'), 'repeated likes from one person notify once');
select pg_temp.expect((select count(*) = 3 from public.notifications where type = 'comment'), 'authors are told about comments on their post and recipe');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 2 from public.notifications where type = 'reply'), 'comment author is told about replies');
select pg_temp.expect_fail($$update public.notifications set type = 'follow'$$, 'changing a notification');
update public.notifications set read_at = now();
select pg_temp.expect(public.unread_notification_count() = 0, 'marking notifications read');
select pg_temp.expect_fail($$insert into public.notifications (user_id, type) values (auth.uid(), 'follow')$$, 'creating notifications directly');
update public.comments set body = 'Looks really delicious' where body = 'Looks delicious';
select pg_temp.expect((select is_edited from public.comments where body = 'Looks really delicious'), 'edited comments are marked');
update public.comments set body = 'hijack' where body = 'Thank you!';
select pg_temp.expect((select count(*) = 0 from public.comments where body = 'hijack'), 'editing another member''s comment does nothing');

-- ---------------------------------------------------------------- reviews and ratings
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.recipe_reviews (recipe_id, author_id, rating, body) select v, auth.uid(), 5, 'Perfect' from ids where k = 'dal';
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
insert into public.recipe_reviews (recipe_id, author_id, rating) select v, auth.uid(), 4 from ids where k = 'dal';
select pg_temp.expect((select rating_count = 2 and rating_average = 4.5 from public.recipes where slug = 'beas-dal'), 'ratings come from real reviews');
select pg_temp.expect_fail($$insert into public.recipe_reviews (recipe_id, author_id, rating) select v, auth.uid(), 1 from ids where k = 'dal'$$, 'reviewing a recipe twice');
select pg_temp.expect_fail($$update public.recipe_reviews set rating = 9 where author_id = auth.uid()$$, 'ratings above 5');
update public.recipe_reviews set rating = 3 where author_id = auth.uid();
select pg_temp.expect((select rating_average = 4.0 from public.recipes where slug = 'beas-dal'), 'changing a rating updates the average');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($$insert into public.recipe_reviews (recipe_id, author_id, rating) select v, auth.uid(), 5 from ids where k = 'dal'$$, 'reviewing your own recipe');
update public.recipes set rating_average = 5 where slug = 'beas-dal';
select pg_temp.expect((select rating_average = 4.0 from public.recipes where slug = 'beas-dal'), 'authors can''t set their own rating');
select pg_temp.expect((select count(*) = 2 from public.notifications where type = 'review'), 'recipe authors are told about reviews');

-- ---------------------------------------------------------------- blocking
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) = 0 from public.follows where follower_id = '00000000-0000-0000-0000-000000000001'), 'blocking removes follows');
select pg_temp.expect((select count(*) = 0 from public.comments where author_id = '00000000-0000-0000-0000-000000000001'), 'blocked members'' comments are hidden from you');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_fail($$insert into public.follows values (auth.uid(), '00000000-0000-0000-0000-00000000000b')$$, 'following someone who blocked you');
select pg_temp.expect_fail($$insert into public.comments (author_id, post_id, body) select auth.uid(), v, 'still here' from ids where k = 'post'$$, 'commenting on posts of someone who blocked you');
select pg_temp.expect((select count(*) = 0 from public.blocks), 'you can''t see who blocked you');

-- ---------------------------------------------------------------- reports
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'post', v, 'spam' from ids where k = 'post';
select pg_temp.expect((select status = 'reported' from public.community_posts), 'reported posts are flagged but stay visible');
select pg_temp.expect_fail($$insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'post', v, 'spam' from ids where k = 'post'$$, 'reporting the same thing twice');
select pg_temp.expect_fail($$insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'comment', id, 'spam' from public.comments where author_id = auth.uid() limit 1$$, 'reporting yourself');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'post', v, 'spam' from ids where k = 'post';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'post', v, 'harassment' from ids where k = 'post';
reset role;
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 0 from public.community_posts), 'after three reports a post is hidden until reviewed');
reset role;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 1 from public.reports), 'members see only their own reports');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect((select count(*) = 3 from public.reports where status = 'open'), 'moderators see all open reports');
select public.moderate('post', v, 'restore', 'Not spam') from ids where k = 'post';
select pg_temp.expect((select count(*) = 0 from public.reports where status = 'open'), 'restoring closes the reports');
select pg_temp.expect((select status = 'approved' from public.community_posts), 'restored post is visible again');
select public.moderate('comment', v, 'remove', 'Off topic') from ids where k = 'c1';
select pg_temp.expect((select comment_count = 2 from public.community_posts), 'removed comments leave the count');

-- ---------------------------------------------------------------- suspension
select public.set_member_suspension('00000000-0000-0000-0000-00000000000c', true, 'Repeated spam');
select pg_temp.expect_fail($$select public.set_member_suspension('00000000-0000-0000-0000-00000000000e', true, 'x')$$, 'moderators suspending staff');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) = 0 from public.recipe_reviews where author_id = '00000000-0000-0000-0000-00000000000c'), 'suspended members'' content is hidden');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_fail($$insert into public.community_posts (author_id, kind, body) values (auth.uid(), 'tip', 'I am back')$$, 'suspended members posting');
select pg_temp.expect_fail($$update public.profiles set is_suspended = false where id = auth.uid()$$, 'lifting your own suspension');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select public.set_member_suspension('00000000-0000-0000-0000-00000000000c', false, null);
select pg_temp.expect((select rating_count = 2 from public.recipes where slug = 'beas-dal'), 'ratings are unchanged by suspension');

-- ---------------------------------------------------------------- member recipes
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_fail($$select public.member_save_recipe('{"kind":"food","slug":"gus-soup","title":"Gus Soup","status":"pending"}')$$,
  'sending a recipe for review without ingredients, steps and a country');
insert into ids select 'soup', public.member_save_recipe('{"kind":"food","slug":"gus-soup","title":"Gus Soup","status":"draft"}');
select pg_temp.expect((select status = 'draft' and author_id = auth.uid() and verification = 'community' from public.recipes where slug = 'gus-soup'), 'members save drafts');
select public.member_save_recipe(jsonb_build_object('id', v, 'kind', 'food', 'title', 'Gus Soup', 'status', 'pending',
  'ingredients', '[{"name":"Tomato","quantity":"2"},{"name":"Brand new veg"}]'::jsonb, 'steps', '[{"body":"Cook it."}]'::jsonb,
  'countries', jsonb_build_array((select slug from public.countries limit 1)), 'cuisines', '["Made Up Cuisine"]'::jsonb)) from ids where k = 'soup';
select pg_temp.expect((select status = 'pending' from public.recipes where slug = 'gus-soup'), 'members send recipes for review');
select pg_temp.expect((select count(*) = 0 from public.cuisines where name = 'Made Up Cuisine'), 'members can''t create cuisines');
select pg_temp.expect_fail($$update public.recipes set status = 'published' where slug = 'gus-soup'$$, 'members publishing their own recipe');
select pg_temp.expect_fail($$select public.member_save_recipe(jsonb_build_object('id', v, 'kind', 'food', 'title', 'x', 'hero_image_path', 'members/someone-else/x.jpg')) from ids where k = 'soup'$$,
  'using someone else''s photo path');
select pg_temp.expect_fail($$select public.save_recipe_children(v, '{"steps":[{"body":"vandalised"}]}') from ids where k = 'dal'$$, 'changing ingredients of someone else''s recipe');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select public.moderate('recipe', v, 'approve', 'Lovely, thank you') from ids where k = 'soup';
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) = 1 from public.notifications where type = 'moderation' and data ->> 'status' = 'published'
  and data ->> 'note' = 'Lovely, thank you'), 'the author hears the recipe was published, with the note, once');
select pg_temp.expect_fail($$select public.member_save_recipe(jsonb_build_object('id', v, 'kind', 'food', 'title', 'Changed')) from ids where k = 'soup'$$,
  'editing a recipe after it was published');

-- ---------------------------------------------------------------- notification preferences
update public.profiles set notification_prefs = notification_prefs || '{"likes": false}' where id = auth.uid();
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.likes (user_id, target_type, target_id) select auth.uid(), 'recipe', v from ids where k = 'soup';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($$insert into public.likes (user_id, target_type, target_id) select auth.uid(), 'recipe', v from ids where k = 'soup'$$, 'liking content of someone you blocked');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) = 0 from public.notifications where type = 'like'), 'members who turned off like notifications get none');

-- ---------------------------------------------------------------- challenges
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
insert into public.challenges (slug, title, starts_on, ends_on, status) values
  ('soup-week', 'Soup Week', current_date - 1, current_date + 6, 'published'),
  ('old-challenge', 'Old Challenge', current_date - 30, current_date - 20, 'published');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.community_posts (author_id, kind, body, challenge_id) select auth.uid(), 'tip', 'My soup tip', id from public.challenges where slug = 'soup-week';
select pg_temp.expect_fail($$insert into public.community_posts (author_id, kind, body, challenge_id) select auth.uid(), 'tip', 'Too late', id from public.challenges where slug = 'old-challenge'$$,
  'entering a challenge that has ended');
select pg_temp.expect_fail($$insert into public.challenges (slug, title, starts_on, ends_on, status) values ('mine', 'Mine', current_date, current_date, 'published')$$,
  'members creating challenges');

-- ---------------------------------------------------------------- rate limits
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin for i in 1..10 loop insert into public.community_posts (author_id, kind, body) values (auth.uid(), 'tip', 'tip ' || i); end loop; end $$;
select pg_temp.expect_fail($$insert into public.community_posts (author_id, kind, body) values (auth.uid(), 'tip', 'one too many')$$, 'more than 10 posts an hour');

-- ---------------------------------------------------------------- favourites on profiles
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.saved_recipes (user_id, recipe_id) select auth.uid(), v from ids where k = 'soup';
reset role;
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 0 from public.saved_recipes), 'saved recipes are private by default');
reset role;
update public.profiles set show_saved = true where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user(''); set role anon;
select pg_temp.expect((select count(*) = 1 from public.saved_recipes), 'members can choose to show favourites');
reset role;

-- ---------------------------------------------------------------- deleting an account
delete from auth.users where id = '00000000-0000-0000-0000-000000000001';
select pg_temp.expect((select count(*) = 0 from public.comments where author_id = '00000000-0000-0000-0000-000000000001')
  and (select count(*) = 0 from public.likes where user_id = '00000000-0000-0000-0000-000000000001')
  and (select count(*) = 0 from public.recipe_reviews where author_id = '00000000-0000-0000-0000-000000000001'),
  'deleting an account removes the member''s comments, likes and reviews');
select pg_temp.expect((select rating_count = 1 from public.recipes where slug = 'beas-dal'), 'ratings update when a member leaves');

select 'All Phase 4 tests passed.' as result;
\echo 'All Phase 4 tests passed.'
