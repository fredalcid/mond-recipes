-- ---------------------------------------------------------------------------
-- Mònd Recipes — Phase 4: community
-- Profiles, follows, blocks, posts (photos, videos, tips), comments and replies,
-- likes, recipe reviews, reports, moderation, notifications, challenges,
-- member recipe submissions and rate limits.
--
-- Rules enforced here (not only in the interface):
--   * only verified, non-suspended members publish, comment, like, follow or review
--   * posts and member recipes wait for review; comments and reviews appear at once
--     and can be reported
--   * content from suspended members and from members you blocked is hidden
--   * counters and ratings are maintained by triggers from real rows only
-- ---------------------------------------------------------------------------

create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'reported', 'removed');
create type public.post_kind as enum ('photo', 'video', 'tip');
create type public.like_target as enum ('recipe', 'post', 'comment');
create type public.report_target as enum ('recipe', 'post', 'comment', 'review', 'profile');
create type public.report_reason as enum ('spam', 'harassment', 'hate', 'sexual', 'violence', 'dangerous', 'copyright', 'misinformation', 'other');

-- ---------------------------------------------------------------- profiles
alter table public.profiles
  add column notification_prefs jsonb not null
    default '{"follows": true, "likes": true, "comments": true, "replies": true, "moderation": true, "activity": true}',
  add column show_saved boolean not null default false,
  add column is_featured boolean not null default false,
  add column follower_count int not null default 0,
  add column following_count int not null default 0,
  add column suspended_reason text check (char_length(suspended_reason) <= 500),
  add column suspended_at timestamptz;

-- Every member gets a username for their public profile address.
create or replace function public.make_username(p_name text)
returns text language plpgsql volatile
set search_path = ''
as $$
declare
  v_base text := left(regexp_replace(lower(public.f_unaccent(coalesce(p_name, ''))), '[^a-z0-9]+', '', 'g'), 20);
  v_try text;
begin
  if char_length(v_base) < 3 then v_base := 'cook'; end if;
  loop
    v_try := v_base || (1000 + floor(random() * 9000))::int;
    exit when not exists (select 1 from public.profiles where username = v_try);
  end loop;
  return v_try;
end $$;

create or replace function public.profiles_default_username()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.username is null then new.username := public.make_username(new.display_name); end if;
  return new;
end $$;
create trigger profiles_username before insert on public.profiles for each row execute function public.profiles_default_username();
update public.profiles set username = public.make_username(display_name) where username is null;
alter table public.profiles alter column username set not null;

-- Members can't change counters, featuring or suspension.
create or replace function public.guard_profile_fields()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then return new; end if;
  if (new.is_suspended is distinct from old.is_suspended or new.suspended_reason is distinct from old.suspended_reason
      or new.suspended_at is distinct from old.suspended_at or new.is_featured is distinct from old.is_featured)
     and not (public.has_role('moderator') or public.has_role('super_admin')) then
    raise exception 'Only moderators can change suspension or featuring';
  end if;
  if new.follower_count is distinct from old.follower_count or new.following_count is distinct from old.following_count then
    raise exception 'Follower counts are maintained automatically';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- follows and blocks
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id, created_at desc);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- True when this member's content may be shown to the current viewer.
create or replace function public.can_see_member(p_member uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select p_member = auth.uid() or public.is_staff() or (
    exists (select 1 from public.profiles p where p.id = p_member and not p.is_suspended)
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p_member)
  )
$$;

-- ---------------------------------------------------------------- challenges
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 3000),
  hero_image_path text,
  starts_on date not null,
  ends_on date not null,
  status public.content_status not null default 'draft',
  sponsor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create trigger challenges_updated_at before update on public.challenges for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- posts
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.post_kind not null,
  body text not null check (char_length(body) between 1 and 3000),
  recipe_id uuid references public.recipes (id) on delete set null,
  challenge_id uuid references public.challenges (id) on delete set null,
  status public.moderation_status not null default 'pending',
  moderation_note text check (char_length(moderation_note) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  is_featured boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  report_count int not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger community_posts_updated_at before update on public.community_posts for each row execute function public.set_updated_at();
create index community_posts_feed on public.community_posts (status, approved_at desc);
create index community_posts_author on public.community_posts (author_id, created_at desc);
create index community_posts_recipe on public.community_posts (recipe_id) where recipe_id is not null;
create index community_posts_challenge on public.community_posts (challenge_id) where challenge_id is not null;

-- Files live in Storage (bucket "community"); only their paths are stored here.
create table public.post_media (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.community_posts (id) on delete cascade,
  position smallint not null default 1 check (position between 1 and 6),
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text check (storage_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._/-]+$'),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  alt text check (char_length(alt) <= 200),
  check ((storage_path is not null) <> (youtube_id is not null)),
  check (youtube_id is null or media_type = 'video')
);
create index post_media_post on public.post_media (post_id, position);

create or replace function public.can_see_post(p_post uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_posts p where p.id = p_post
      and (p.author_id = auth.uid() or public.is_staff()
           or (p.status in ('approved', 'reported') and public.can_see_member(p.author_id)))
  )
$$;

-- Members can only create pending posts and can't touch moderation fields or counters.
create or replace function public.guard_post_fields()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.like_count <> 0 or new.comment_count <> 0 or new.report_count <> 0 or new.is_featured
       or new.moderated_by is not null or new.approved_at is not null then
      raise exception 'New posts wait for review';
    end if;
  elsif not public.is_staff() then
    if new.status is distinct from old.status or new.like_count is distinct from old.like_count
       or new.comment_count is distinct from old.comment_count or new.report_count is distinct from old.report_count
       or new.is_featured is distinct from old.is_featured or new.moderation_note is distinct from old.moderation_note
       or new.author_id is distinct from old.author_id or new.kind is distinct from old.kind then
      raise exception 'Only moderators can change these post fields';
    end if;
    if old.status <> 'pending' then raise exception 'Posts can only be edited while they wait for review'; end if;
  end if;
  return new;
end $$;
create trigger community_posts_guard before insert or update on public.community_posts for each row execute function public.guard_post_fields();

-- ---------------------------------------------------------------- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status public.moderation_status not null default 'approved',
  is_edited boolean not null default false,
  like_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(recipe_id, post_id) = 1)
);
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
create index comments_recipe on public.comments (recipe_id, created_at) where recipe_id is not null;
create index comments_post on public.comments (post_id, created_at) where post_id is not null;
create index comments_parent on public.comments (parent_id);

-- One level of replies; a reply always sits on the same recipe or post as its parent.
create or replace function public.prepare_comment()
returns trigger language plpgsql
set search_path = ''
as $$
declare v_parent public.comments;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') and not public.is_staff() then
    if tg_op = 'INSERT' and (new.status <> 'approved' or new.like_count <> 0 or new.report_count <> 0 or new.is_edited) then
      raise exception 'Invalid comment';
    end if;
    if tg_op = 'UPDATE' then
      if new.status is distinct from old.status or new.like_count is distinct from old.like_count or new.report_count is distinct from old.report_count
         or new.author_id is distinct from old.author_id or new.recipe_id is distinct from old.recipe_id
         or new.post_id is distinct from old.post_id or new.parent_id is distinct from old.parent_id then
        raise exception 'Only the text of a comment can be edited';
      end if;
      if new.body is distinct from old.body then new.is_edited := true; end if;
    end if;
  end if;
  if tg_op = 'INSERT' and new.parent_id is not null then
    select * into v_parent from public.comments where id = new.parent_id;
    if v_parent.id is null then raise exception 'Reply target not found'; end if;
    if v_parent.parent_id is not null then new.parent_id := v_parent.parent_id; end if;
    if v_parent.recipe_id is distinct from new.recipe_id or v_parent.post_id is distinct from new.post_id then
      raise exception 'A reply must be on the same page as its comment';
    end if;
  end if;
  return new;
end $$;
create trigger comments_prepare before insert or update on public.comments for each row execute function public.prepare_comment();

-- Who owns the thing being commented on, and can the current member comment there?
create or replace function public.comment_target_owner(p_recipe uuid, p_post uuid)
returns uuid language sql stable security definer
set search_path = ''
as $$
  select coalesce((select author_id from public.recipes where id = p_recipe), (select author_id from public.community_posts where id = p_post))
$$;

create or replace function public.can_comment_on(p_recipe uuid, p_post uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select public.is_verified_member()
    and (
      (p_recipe is not null and exists (select 1 from public.recipes where id = p_recipe and status = 'published'))
      or (p_post is not null and exists (select 1 from public.community_posts where id = p_post and status in ('approved', 'reported')))
    )
    and not public.is_blocked_between(auth.uid(), public.comment_target_owner(p_recipe, p_post))
$$;

-- ---------------------------------------------------------------- likes
create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.like_target not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index likes_target on public.likes (target_type, target_id);

create or replace function public.like_target_owner(p_type public.like_target, p_id uuid)
returns uuid language sql stable security definer
set search_path = ''
as $$
  select case p_type
    when 'recipe' then (select author_id from public.recipes where id = p_id and status = 'published')
    when 'post' then (select author_id from public.community_posts where id = p_id and status in ('approved', 'reported'))
    when 'comment' then (select author_id from public.comments where id = p_id and status in ('approved', 'reported'))
  end
$$;

create or replace function public.can_like(p_type public.like_target, p_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select public.is_verified_member()
    and case p_type
      when 'recipe' then exists (select 1 from public.recipes where id = p_id and status = 'published')
      when 'post' then exists (select 1 from public.community_posts where id = p_id and status in ('approved', 'reported'))
      when 'comment' then exists (select 1 from public.comments where id = p_id and status in ('approved', 'reported'))
    end
    and not public.is_blocked_between(auth.uid(), public.like_target_owner(p_type, p_id))
$$;

-- ---------------------------------------------------------------- recipe reviews (ratings)
create table public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 2000),
  status public.moderation_status not null default 'approved',
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, author_id)
);
create trigger recipe_reviews_updated_at before update on public.recipe_reviews for each row execute function public.set_updated_at();
create index recipe_reviews_recipe on public.recipe_reviews (recipe_id, created_at desc);

create or replace function public.guard_review()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_staff() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'approved' or new.report_count <> 0 then raise exception 'Invalid review'; end if;
    if exists (select 1 from public.recipes where id = new.recipe_id and author_id = new.author_id) then
      raise exception 'You can''t review your own recipe';
    end if;
  elsif new.status is distinct from old.status or new.report_count is distinct from old.report_count
        or new.recipe_id is distinct from old.recipe_id or new.author_id is distinct from old.author_id then
    raise exception 'Only the rating and text of a review can be edited';
  end if;
  return new;
end $$;
create trigger recipe_reviews_guard before insert or update on public.recipe_reviews for each row execute function public.guard_review();

-- Ratings shown on recipes come only from visible member reviews.
create or replace function public.refresh_recipe_rating(p_recipe uuid)
returns void language sql security definer
set search_path = ''
as $$
  update public.recipes r set
    rating_count = s.n,
    rating_average = case when s.n > 0 then round(s.avg, 2) end
  from (select count(*)::int n, avg(rating)::numeric avg from public.recipe_reviews
        where recipe_id = p_recipe and status in ('approved', 'reported')) s
  where r.id = p_recipe and (r.rating_count is distinct from s.n or r.rating_average is distinct from case when s.n > 0 then round(s.avg, 2) end)
$$;

create or replace function public.recipe_reviews_changed()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.refresh_recipe_rating(coalesce(new.recipe_id, old.recipe_id));
  if tg_op = 'UPDATE' and new.recipe_id is distinct from old.recipe_id then perform public.refresh_recipe_rating(old.recipe_id); end if;
  return null;
end $$;
create trigger recipe_reviews_rating after insert or update or delete on public.recipe_reviews
  for each row execute function public.recipe_reviews_changed();

-- ---------------------------------------------------------------- reports
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_open on public.reports (status, created_at) where status = 'open';
create index reports_target on public.reports (target_type, target_id);

-- ---------------------------------------------------------------- notifications
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment', 'reply', 'review', 'moderation', 'activity')),
  target_type text check (target_type in ('recipe', 'post', 'comment', 'review', 'profile', 'account')),
  target_id uuid,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;

-- Creates a notification unless the member turned that kind off, it's their own action,
-- or either of them blocked the other. Repeated likes from the same person within a day are merged.
create or replace function public.notify(p_user uuid, p_actor uuid, p_type text, p_target_type text, p_target_id uuid, p_data jsonb default '{}')
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_pref text := case p_type when 'follow' then 'follows' when 'like' then 'likes' when 'comment' then 'comments'
                  when 'review' then 'comments' when 'reply' then 'replies' when 'moderation' then 'moderation' else 'activity' end;
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and public.is_blocked_between(p_user, p_actor) then return; end if;
  if not exists (select 1 from public.profiles where id = p_user and coalesce((notification_prefs ->> v_pref)::boolean, true)) then return; end if;
  if p_type in ('like', 'follow') and exists (
    select 1 from public.notifications where user_id = p_user and actor_id = p_actor and type = p_type
      and target_id is not distinct from p_target_id and created_at > now() - interval '1 day') then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, type, target_type, target_id, data)
  values (p_user, p_actor, p_type, p_target_type, p_target_id, coalesce(p_data, '{}'));
end $$;

-- ---------------------------------------------------------------- counters and notification triggers
create or replace function public.follows_changed()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.followee_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    perform public.notify(new.followee_id, new.follower_id, 'follow', 'profile', new.follower_id);
  else
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.followee_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end $$;
create trigger follows_counts after insert or delete on public.follows for each row execute function public.follows_changed();

-- Blocking someone also removes follows in both directions.
create or replace function public.blocks_added()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and followee_id = new.blocked_id)
                                or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end $$;
create trigger blocks_cleanup after insert on public.blocks for each row execute function public.blocks_added();

create or replace function public.likes_changed()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_row public.likes := coalesce(new, old);
  v_delta int := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if v_row.target_type = 'post' then
    update public.community_posts set like_count = greatest(like_count + v_delta, 0) where id = v_row.target_id;
  elsif v_row.target_type = 'comment' then
    update public.comments set like_count = greatest(like_count + v_delta, 0) where id = v_row.target_id;
  end if;
  if tg_op = 'INSERT' then
    perform public.notify(public.like_target_owner(new.target_type, new.target_id), new.user_id, 'like', new.target_type::text, new.target_id);
  end if;
  return null;
end $$;
create trigger likes_counts after insert or delete on public.likes for each row execute function public.likes_changed();

create or replace function public.comments_changed()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_visible_new boolean := tg_op <> 'DELETE' and new.status in ('approved', 'reported');
  v_visible_old boolean := tg_op <> 'INSERT' and old.status in ('approved', 'reported');
  v_row public.comments := coalesce(new, old);
  v_delta int := (case when v_visible_new then 1 else 0 end) - (case when v_visible_old then 1 else 0 end);
  v_owner uuid;
  v_parent_author uuid;
begin
  if v_row.post_id is not null and v_delta <> 0 then
    update public.community_posts set comment_count = greatest(comment_count + v_delta, 0) where id = v_row.post_id;
  end if;
  if tg_op = 'INSERT' and v_visible_new then
    v_owner := public.comment_target_owner(new.recipe_id, new.post_id);
    if new.parent_id is not null then
      select author_id into v_parent_author from public.comments where id = new.parent_id;
      perform public.notify(v_parent_author, new.author_id, 'reply', 'comment', new.id,
        jsonb_build_object('recipe_id', new.recipe_id, 'post_id', new.post_id));
    end if;
    if v_owner is distinct from v_parent_author then
      perform public.notify(v_owner, new.author_id, 'comment', 'comment', new.id,
        jsonb_build_object('recipe_id', new.recipe_id, 'post_id', new.post_id));
    end if;
  end if;
  if tg_op = 'DELETE' then
    delete from public.likes where target_type = 'comment' and target_id = old.id;
  end if;
  return null;
end $$;
create trigger comments_counts after insert or update or delete on public.comments for each row execute function public.comments_changed();

create or replace function public.reviews_notify()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.notify((select author_id from public.recipes where id = new.recipe_id), new.author_id, 'review', 'review', new.id,
    jsonb_build_object('recipe_id', new.recipe_id, 'rating', new.rating));
  return null;
end $$;
create trigger recipe_reviews_notify after insert on public.recipe_reviews for each row execute function public.reviews_notify();

create or replace function public.posts_deleted()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.likes where target_type = 'post' and target_id = old.id;
  return null;
end $$;
create trigger community_posts_cleanup after delete on public.community_posts for each row execute function public.posts_deleted();

create or replace function public.recipes_deleted()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.likes where target_type = 'recipe' and target_id = old.id;
  return null;
end $$;
create trigger recipes_likes_cleanup after delete on public.recipes for each row execute function public.recipes_deleted();

-- Followers hear about new approved posts and newly published member recipes (capped fan-out).
create or replace function public.notify_followers(p_author uuid, p_target_type text, p_target_id uuid, p_data jsonb)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_follower uuid;
begin
  for v_follower in select follower_id from public.follows where followee_id = p_author order by created_at desc limit 2000 loop
    perform public.notify(v_follower, p_author, 'activity', p_target_type, p_target_id, p_data);
  end loop;
end $$;

-- ---------------------------------------------------------------- rate limits (per member, in the database)
create or replace function public.enforce_member_rate()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_column text := tg_argv[0];
  v_limit int := tg_argv[1]::int;
  v_window interval := tg_argv[2]::interval;
  v_who uuid;
  v_count int;
begin
  if public.is_staff() or current_user in ('postgres', 'service_role', 'supabase_admin') and auth.uid() is null then return new; end if;
  execute format('select ($1).%I', v_column) using new into v_who;
  if v_who is null then return new; end if;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2', tg_table_schema, tg_table_name, v_column)
    using v_who, v_window into v_count;
  if v_count >= v_limit then
    raise exception 'You''re doing that too often. Please wait a little and try again.' using errcode = 'P0429';
  end if;
  return new;
end $$;
create trigger community_posts_rate before insert on public.community_posts for each row execute function public.enforce_member_rate('author_id', '10', '1 hour');
create trigger comments_rate before insert on public.comments for each row execute function public.enforce_member_rate('author_id', '30', '1 hour');
create trigger recipe_reviews_rate before insert on public.recipe_reviews for each row execute function public.enforce_member_rate('author_id', '20', '1 hour');
create trigger reports_rate before insert on public.reports for each row execute function public.enforce_member_rate('reporter_id', '20', '1 day');
create trigger follows_rate before insert on public.follows for each row execute function public.enforce_member_rate('follower_id', '100', '1 hour');
create trigger recipes_member_rate before insert on public.recipes for each row execute function public.enforce_member_rate('author_id', '10', '1 day');

-- ---------------------------------------------------------------- reporting
create or replace function public.report_target_row_owner(p_type public.report_target, p_id uuid)
returns uuid language sql stable security definer
set search_path = ''
as $$
  select case p_type
    when 'recipe' then (select author_id from public.recipes where id = p_id)
    when 'post' then (select author_id from public.community_posts where id = p_id)
    when 'comment' then (select author_id from public.comments where id = p_id)
    when 'review' then (select author_id from public.recipe_reviews where id = p_id)
    when 'profile' then (select id from public.profiles where id = p_id)
  end
$$;

-- A reported item is flagged for moderators; after three separate reports it is hidden until reviewed.
create or replace function public.reports_added()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare v_open int;
begin
  if (new.target_type = 'recipe' and not exists (select 1 from public.recipes where id = new.target_id))
     or (new.target_type <> 'recipe' and public.report_target_row_owner(new.target_type, new.target_id) is null) then
    raise exception 'Reported item not found';
  end if;
  select count(*) into v_open from public.reports where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if new.target_type = 'post' then
    update public.community_posts set report_count = report_count + 1,
      status = case when status = 'approved' then 'reported' when status = 'reported' and v_open >= 3 then 'pending' else status end
    where id = new.target_id;
  elsif new.target_type = 'comment' then
    update public.comments set report_count = report_count + 1,
      status = case when status = 'approved' then 'reported' when status = 'reported' and v_open >= 3 then 'pending' else status end
    where id = new.target_id;
  elsif new.target_type = 'review' then
    update public.recipe_reviews set report_count = report_count + 1,
      status = case when status = 'approved' then 'reported' when status = 'reported' and v_open >= 3 then 'pending' else status end
    where id = new.target_id;
  end if;
  return null;
end $$;
create trigger reports_flag after insert on public.reports for each row execute function public.reports_added();

-- ---------------------------------------------------------------- moderation
create or replace function public.is_moderator()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('moderator', 'super_admin', 'editor'))
$$;

-- p_action: approve | reject | remove | restore
create or replace function public.moderate(p_type public.report_target, p_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_title text;
  v_status text;
  v_recipe_status public.content_status;
begin
  if not public.is_moderator() then raise exception 'Only moderators can do this' using errcode = '42501'; end if;
  if p_action not in ('approve', 'reject', 'remove', 'restore') then raise exception 'Unknown action'; end if;
  p_note := nullif(left(trim(coalesce(p_note, '')), 500), '');

  if p_type = 'recipe' then
    v_recipe_status := case p_action when 'approve' then 'published' when 'restore' then 'published' when 'reject' then 'rejected' else 'removed' end;
    if v_recipe_status = 'published' and (
      not exists (select 1 from public.recipe_steps where recipe_id = p_id)
      or not exists (select 1 from public.recipe_ingredients where recipe_id = p_id)) then
      raise exception 'A recipe needs ingredients and steps before it can be published';
    end if;
    -- The recipe status trigger tells the author (and followers); it reads the note from here.
    perform set_config('mond.moderation_note', coalesce(p_note, ''), true);
    update public.recipes set status = v_recipe_status where id = p_id returning author_id, title into v_author, v_title;
    if not found then raise exception 'Recipe not found'; end if;
    v_status := v_recipe_status::text;
  elsif p_type = 'post' then
    v_status := case p_action when 'approve' then 'approved' when 'restore' then 'approved' when 'reject' then 'rejected' else 'removed' end;
    update public.community_posts set
      status = v_status::public.moderation_status, moderation_note = p_note, moderated_by = auth.uid(), moderated_at = now(),
      approved_at = case when v_status = 'approved' then coalesce(approved_at, now()) else approved_at end
    where id = p_id returning author_id into v_author;
    if p_action = 'approve' and v_author is not null then
      perform public.notify_followers(v_author, 'post', p_id, '{}');
    end if;
  elsif p_type = 'comment' then
    v_status := case when p_action in ('approve', 'restore') then 'approved' else 'removed' end;
    update public.comments set status = v_status::public.moderation_status where id = p_id returning author_id into v_author;
  elsif p_type = 'review' then
    v_status := case when p_action in ('approve', 'restore') then 'approved' else 'removed' end;
    update public.recipe_reviews set status = v_status::public.moderation_status where id = p_id returning author_id into v_author;
  else
    raise exception 'Use member suspension for profiles';
  end if;
  if v_author is null and p_type <> 'recipe' then raise exception 'Item not found'; end if;

  update public.reports set status = case when p_action in ('approve', 'restore') then 'dismissed' else 'actioned' end,
    handled_by = auth.uid(), handled_at = now(), resolution_note = p_note
  where target_type = p_type and target_id = p_id and status = 'open';

  if v_author is not null and p_type <> 'recipe' then
    perform public.notify(v_author, null, 'moderation', p_type::text, p_id,
      jsonb_build_object('status', v_status, 'note', p_note, 'title', v_title));
  end if;
  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'moderate_' || p_action, p_type::text, p_id::text, jsonb_build_object('status', v_status, 'note', p_note));
end $$;

create or replace function public.dismiss_report(p_report bigint, p_note text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_report public.reports;
begin
  if not public.is_moderator() then raise exception 'Only moderators can do this' using errcode = '42501'; end if;
  update public.reports set status = 'dismissed', handled_by = auth.uid(), handled_at = now(), resolution_note = nullif(left(trim(coalesce(p_note, '')), 500), '')
  where id = p_report and status = 'open' returning * into v_report;
  if v_report.id is null then raise exception 'Report not found or already handled'; end if;
  -- Nothing left open: a flagged item goes back to normal.
  if not exists (select 1 from public.reports where target_type = v_report.target_type and target_id = v_report.target_id and status = 'open') then
    if v_report.target_type = 'post' then update public.community_posts set status = 'approved' where id = v_report.target_id and status = 'reported';
    elsif v_report.target_type = 'comment' then update public.comments set status = 'approved' where id = v_report.target_id and status = 'reported';
    elsif v_report.target_type = 'review' then update public.recipe_reviews set status = 'approved' where id = v_report.target_id and status = 'reported';
    end if;
  end if;
  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'dismiss_report', 'report', p_report::text, jsonb_build_object('target', v_report.target_type, 'target_id', v_report.target_id));
end $$;

create or replace function public.set_member_suspension(p_member uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  if not (public.has_role('moderator') or public.has_role('super_admin')) then
    raise exception 'Only moderators can do this' using errcode = '42501';
  end if;
  if p_member = auth.uid() then raise exception 'You can''t suspend yourself'; end if;
  if exists (select 1 from public.user_roles where user_id = p_member) and not public.has_role('super_admin') then
    raise exception 'Only super admins can suspend staff accounts';
  end if;
  update public.profiles set
    is_suspended = p_suspend,
    suspended_reason = case when p_suspend then nullif(left(trim(coalesce(p_reason, '')), 500), '') end,
    suspended_at = case when p_suspend then now() end
  where id = p_member;
  if not found then raise exception 'Member not found'; end if;
  update public.reports set status = 'actioned', handled_by = auth.uid(), handled_at = now()
  where target_type = 'profile' and target_id = p_member and status = 'open' and p_suspend;
  perform public.notify(p_member, null, 'moderation', 'account', p_member,
    jsonb_build_object('status', case when p_suspend then 'suspended' else 'restored' end, 'note', p_reason));
  insert into public.admin_activity_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_suspend then 'suspend' else 'restore' end, 'profile', p_member::text, jsonb_build_object('reason', p_reason));
end $$;

-- Editors publishing or rejecting a member's recipe directly in the recipe editor also tells the author.
create or replace function public.recipes_status_notify()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.author_id is not null and new.status is distinct from old.status and auth.uid() is distinct from new.author_id
     and new.status in ('published', 'rejected', 'removed', 'unpublished') then
    perform public.notify(new.author_id, null, 'moderation', 'recipe', new.id,
      jsonb_build_object('status', new.status, 'title', new.title, 'note', nullif(current_setting('mond.moderation_note', true), '')));
    if new.status = 'published' and old.published_at is null then
      perform public.notify_followers(new.author_id, 'recipe', new.id, jsonb_build_object('title', new.title));
    end if;
  end if;
  return null;
end $$;
create trigger recipes_status_notify after update of status on public.recipes for each row execute function public.recipes_status_notify();

-- ---------------------------------------------------------------- member recipe submissions
-- Shared by member submissions: replaces ingredients, steps and taxonomy links.
-- Checks permission itself (only the author of an unpublished recipe, or an editor).
create or replace function public.save_recipe_children(v_id uuid, p jsonb)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_ing jsonb;
  v_step jsonb;
  v_ingredient_id bigint;
  v_name text;
  v_slug text;
  v_pos int;
begin
  if not public.can_edit_recipe(v_id) then raise exception 'You can''t edit this recipe' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(p -> 'ingredients', '[]')) > 60 or jsonb_array_length(coalesce(p -> 'steps', '[]')) > 40 then
    raise exception 'Too many ingredients or steps';
  end if;

  delete from public.recipe_ingredients where recipe_id = v_id;
  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p -> 'ingredients', '[]')) loop
    v_name := left(trim(v_ing ->> 'name'), 80);
    continue when coalesce(v_name, '') = '';
    v_slug := trim(both '-' from regexp_replace(lower(public.f_unaccent(v_name)), '[^a-z0-9]+', '-', 'g'));
    continue when v_slug = '';
    select i.id into v_ingredient_id from public.ingredients i
      where i.slug = v_slug or lower(i.name) = lower(v_name)
         or exists (select 1 from public.ingredient_aliases a where a.ingredient_id = i.id and lower(a.alias) = lower(v_name))
      limit 1;
    if v_ingredient_id is null then
      insert into public.ingredients (slug, name) values (v_slug, v_name) returning id into v_ingredient_id;
    end if;
    v_pos := v_pos + 1;
    insert into public.recipe_ingredients (recipe_id, ingredient_id, position, quantity, unit, note, group_label)
    values (v_id, v_ingredient_id, v_pos, nullif(v_ing ->> 'quantity', '')::numeric, left(nullif(v_ing ->> 'unit', ''), 20),
            left(nullif(trim(v_ing ->> 'note'), ''), 120), left(nullif(trim(v_ing ->> 'group'), ''), 60));
    v_ingredient_id := null;
  end loop;

  delete from public.recipe_steps where recipe_id = v_id;
  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p -> 'steps', '[]')) loop
    continue when coalesce(trim(v_step ->> 'body'), '') = '';
    v_pos := v_pos + 1;
    insert into public.recipe_steps (recipe_id, position, body, timer_seconds)
    values (v_id, v_pos, left(trim(v_step ->> 'body'), 2000), nullif(v_step ->> 'timer_seconds', '')::int);
  end loop;

  delete from public.recipe_countries where recipe_id = v_id;
  insert into public.recipe_countries (recipe_id, country_id)
    select v_id, c.id from public.countries c where c.slug in (select jsonb_array_elements_text(coalesce(p -> 'countries', '[]'))) limit 5;

  delete from public.recipe_regions where recipe_id = v_id;
  insert into public.recipe_regions (recipe_id, region_id)
    select v_id, g.id from public.regions g
    join public.recipe_countries rc on rc.country_id = g.country_id and rc.recipe_id = v_id
    where g.slug in (select jsonb_array_elements_text(coalesce(p -> 'regions', '[]')));

  -- Members choose from existing cuisines only.
  delete from public.recipe_cuisines where recipe_id = v_id;
  insert into public.recipe_cuisines (recipe_id, cuisine_id)
    select v_id, cu.id from public.cuisines cu
    where lower(cu.name) in (select lower(trim(n)) from jsonb_array_elements_text(coalesce(p -> 'cuisines', '[]')) n);

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
    values (v_id, p #>> '{source,type}', left(nullif(p #>> '{source,description}', ''), 500), left(nullif(p #>> '{source,url}', ''), 500));
  end if;
end $$;

-- SECURITY INVOKER: the member's own permissions, Row Level Security and the recipe guard apply.
create or replace function public.member_save_recipe(p jsonb)
returns uuid language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_status public.content_status := case when p ->> 'status' = 'pending' then 'pending' else 'draft' end;
  v_image text := nullif(p ->> 'hero_image_path', '');
begin
  if not public.is_verified_member() then
    raise exception 'Confirm your email address before sharing recipes' using errcode = '42501';
  end if;
  if v_image is not null and v_image !~ ('^members/' || auth.uid()::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Invalid image';
  end if;

  if v_id is null then
    insert into public.recipes (kind, slug, title, author_id, status)
    values ((p ->> 'kind')::public.recipe_kind, p ->> 'slug', p ->> 'title', auth.uid(), 'draft')
    returning id into v_id;
  elsif not exists (select 1 from public.recipes where id = v_id and author_id = auth.uid() and status in ('draft', 'pending', 'rejected')) then
    raise exception 'This recipe can no longer be edited' using errcode = '42501';
  end if;

  update public.recipes set
    kind = (p ->> 'kind')::public.recipe_kind,
    title = p ->> 'title',
    summary = nullif(p ->> 'summary', ''),
    prep_minutes = nullif(p ->> 'prep_minutes', '')::int,
    cook_minutes = nullif(p ->> 'cook_minutes', '')::int,
    servings = nullif(p ->> 'servings', '')::int,
    serving_unit = nullif(p ->> 'serving_unit', ''),
    difficulty = nullif(p ->> 'difficulty', '')::public.difficulty_level,
    tips = nullif(p ->> 'tips', ''),
    substitutions = nullif(p ->> 'substitutions', ''),
    drink_category_id = case when p ->> 'kind' = 'drink' then (select id from public.drink_categories where slug = p ->> 'drink_category') end,
    alcohol_percent = case when p ->> 'kind' = 'drink' then nullif(p ->> 'alcohol_percent', '')::numeric end,
    hero_image_path = coalesce(v_image, case when (p ->> 'remove_image')::boolean then null else hero_image_path end),
    status = v_status
  where id = v_id;

  perform public.save_recipe_children(v_id, p);

  if v_status = 'pending' and (
    not exists (select 1 from public.recipe_steps where recipe_id = v_id)
    or not exists (select 1 from public.recipe_ingredients where recipe_id = v_id)
    or not exists (select 1 from public.recipe_countries where recipe_id = v_id)) then
    raise exception 'Add ingredients, steps and a country before sending your recipe for review';
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------- Row Level Security
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.challenges enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.recipe_reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy "follows are public" on public.follows for select using (true);
create policy "verified members follow" on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and public.is_verified_member() and not public.is_blocked_between(follower_id, followee_id)
              and exists (select 1 from public.profiles where id = followee_id and not is_suspended));
create policy "members unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy "members see own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid() or public.is_moderator());
create policy "members block" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "members unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy "published challenges are public" on public.challenges for select using (status = 'published' or public.is_staff());
create policy "staff manage challenges" on public.challenges for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

create policy "visible posts" on public.community_posts for select
  using (author_id = auth.uid() or public.is_staff() or (status in ('approved', 'reported') and public.can_see_member(author_id)));
create policy "verified members post" on public.community_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified_member()
              and (challenge_id is null or exists (select 1 from public.challenges c where c.id = challenge_id and c.status = 'published'
                                                   and current_date between c.starts_on and c.ends_on)));
create policy "authors edit pending posts, staff moderate" on public.community_posts for update to authenticated
  using ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator())
  with check ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator());
create policy "authors and staff delete posts" on public.community_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "media with visible post" on public.post_media for select using (public.can_see_post(post_id));
create policy "authors add media to pending posts" on public.post_media for insert to authenticated
  with check (exists (select 1 from public.community_posts p where p.id = post_id and p.author_id = auth.uid() and p.status = 'pending')
              and (storage_path is null or split_part(storage_path, '/', 1) = auth.uid()::text));
create policy "authors and staff remove media" on public.post_media for delete to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_moderator())));

create policy "visible comments" on public.comments for select
  using (author_id = auth.uid() or public.is_staff()
         or (status in ('approved', 'reported') and public.can_see_member(author_id)
             and (post_id is null or public.can_see_post(post_id))
             and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published'))));
create policy "verified members comment" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_comment_on(recipe_id, post_id));
create policy "authors edit own comments" on public.comments for update to authenticated
  using ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator())
  with check ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator());
create policy "authors and staff delete comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "likes are public" on public.likes for select using (true);
create policy "verified members like" on public.likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_like(target_type, target_id));
create policy "members unlike" on public.likes for delete to authenticated using (user_id = auth.uid());

create policy "visible reviews" on public.recipe_reviews for select
  using (author_id = auth.uid() or public.is_staff() or (status in ('approved', 'reported') and public.can_see_member(author_id)));
create policy "verified members review published recipes" on public.recipe_reviews for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified_member()
              and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published')
              and not public.is_blocked_between(auth.uid(), public.comment_target_owner(recipe_id, null)));
create policy "authors edit own reviews" on public.recipe_reviews for update to authenticated
  using ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator())
  with check ((author_id = auth.uid() and public.is_verified_member()) or public.is_moderator());
create policy "authors and staff delete reviews" on public.recipe_reviews for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "members see own reports, moderators all" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy "verified members report" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_verified_member() and status = 'open' and handled_by is null
              and public.report_target_row_owner(target_type, target_id) is distinct from auth.uid());

create policy "members read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "members mark own notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members clear own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Members may show their saved recipes ("favourites") on their profile.
create policy "shared favourites are public" on public.saved_recipes for select
  using (exists (select 1 from public.profiles p where p.id = user_id and p.show_saved and not p.is_suspended));

-- Only the read/unread flag of a notification can change.
create or replace function public.guard_notification()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then return new; end if;
  if (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Notifications are read-only';
  end if;
  return new;
end $$;
create trigger notifications_guard before update on public.notifications for each row execute function public.guard_notification();

revoke insert on public.notifications from anon, authenticated;

-- ---------------------------------------------------------------- function permissions
revoke execute on function public.notify(uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_followers(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.refresh_recipe_rating(uuid) from public, anon, authenticated;
revoke execute on function public.make_username(text) from public, anon, authenticated;
revoke execute on function public.moderate(public.report_target, uuid, text, text) from public, anon;
revoke execute on function public.dismiss_report(bigint, text) from public, anon;
revoke execute on function public.set_member_suspension(uuid, boolean, text) from public, anon;
revoke execute on function public.member_save_recipe(jsonb) from public, anon;
revoke execute on function public.save_recipe_children(uuid, jsonb) from public, anon;
grant execute on function public.moderate(public.report_target, uuid, text, text) to authenticated;
grant execute on function public.dismiss_report(bigint, text) to authenticated;
grant execute on function public.set_member_suspension(uuid, boolean, text) to authenticated;
grant execute on function public.member_save_recipe(jsonb) to authenticated;
grant execute on function public.save_recipe_children(uuid, jsonb) to authenticated;

-- Unread count for the header bell.
create or replace function public.unread_notification_count()
returns int language sql stable
set search_path = ''
as $$ select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null $$;
grant execute on function public.unread_notification_count() to authenticated;

-- ---------------------------------------------------------------- discovery
-- Popular posts: likes and comments, weighted towards recent ones.
create or replace function public.popular_posts(p_days int default 30, p_limit int default 24)
returns setof public.community_posts language sql stable
set search_path = ''
as $$
  select * from public.community_posts
  where status in ('approved', 'reported') and approved_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
    and public.can_see_member(author_id)
  order by (like_count + 2 * comment_count) desc, approved_at desc
  limit least(greatest(p_limit, 1), 60)
$$;
grant execute on function public.popular_posts(int, int) to anon, authenticated;

-- ---------------------------------------------------------------- storage
-- Member photos and videos: up to 100 MB per file (images are limited to 8 MB by the site),
-- stored under the member's own folder. Large files never go into database rows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', true, 104857600,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "community media is public" on storage.objects for select using (bucket_id in ('community', 'avatars'));
create policy "members upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('community', 'avatars') and split_part(name, '/', 1) = auth.uid()::text and public.is_verified_member());
create policy "members replace own files" on storage.objects for update to authenticated
  using (bucket_id in ('community', 'avatars') and split_part(name, '/', 1) = auth.uid()::text);
create policy "members and moderators delete files" on storage.objects for delete to authenticated
  using (bucket_id in ('community', 'avatars') and (split_part(name, '/', 1) = auth.uid()::text or public.is_moderator()));
create policy "members upload own recipe photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and name like 'members/' || auth.uid()::text || '/%' and public.is_verified_member());
create policy "members delete own recipe photos" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and name like 'members/' || auth.uid()::text || '/%');
