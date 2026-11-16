-- Mònd Recipes — Row Level Security
-- Every table has RLS on. Anything not explicitly allowed here is denied.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.countries enable row level security;
alter table public.country_aliases enable row level security;
alter table public.regions enable row level security;
alter table public.cuisines enable row level security;
alter table public.categories enable row level security;
alter table public.dietary_tags enable row level security;
alter table public.allergens enable row level security;
alter table public.drink_categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_images enable row level security;
alter table public.recipe_sources enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_countries enable row level security;
alter table public.recipe_regions enable row level security;
alter table public.recipe_cuisines enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.recipe_dietary_tags enable row level security;
alter table public.recipe_allergens enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_activity_log enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles: public read (no private fields live here); members edit their own.
-- ---------------------------------------------------------------------------
create policy "profiles are public" on public.profiles for select using (true);
create policy "members update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "moderators manage profiles" on public.profiles for update to authenticated
  using (public.has_role('moderator') or public.has_role('super_admin'));

-- Members can't suspend themselves or lift a suspension.
create or replace function public.guard_profile_fields()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.is_suspended is distinct from old.is_suspended
     and not (public.has_role('moderator') or public.has_role('super_admin'))
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Only moderators can change suspension status';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_fields();

-- ---------------------------------------------------------------------------
-- Roles: members see their own; only super admins grant or remove roles.
-- ---------------------------------------------------------------------------
create policy "see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
create policy "super admins grant roles" on public.user_roles for insert to authenticated
  with check (public.has_role('super_admin'));
create policy "super admins remove roles" on public.user_roles for delete to authenticated
  using (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- Reference data: everyone reads; editors and super admins write.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['countries', 'country_aliases', 'regions', 'cuisines', 'categories', 'dietary_tags',
                           'allergens', 'drink_categories', 'ingredients', 'ingredient_aliases']
  loop
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit_content())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit_content()) with check (public.can_edit_content())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit_content())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
create policy "read published, own or as staff" on public.recipes for select
  using (status = 'published' or author_id = auth.uid() or public.is_staff());

create policy "verified members create own drafts" on public.recipes for insert to authenticated
  with check (
    public.can_edit_content()
    or (author_id = auth.uid() and public.is_verified_member())
  );

create policy "authors edit own unpublished, editors edit all" on public.recipes for update to authenticated
  using (public.can_edit_recipe(id))
  with check (public.can_edit_content() or (author_id = auth.uid() and public.is_verified_member()));

create policy "editors delete" on public.recipes for delete to authenticated
  using (public.can_edit_content() or (author_id = auth.uid() and status = 'draft'));

-- Child tables follow the parent recipe's permissions.
do $$
declare t text;
begin
  foreach t in array array['recipe_ingredients', 'recipe_steps', 'recipe_images', 'recipe_sources',
                           'recipe_countries', 'recipe_regions', 'recipe_cuisines', 'recipe_categories',
                           'recipe_dietary_tags', 'recipe_allergens']
  loop
    execute format('create policy "read with recipe" on public.%I for select using (public.can_view_recipe(recipe_id))', t);
    execute format('create policy "write with recipe" on public.%I for insert to authenticated with check (public.can_edit_recipe(recipe_id))', t);
    execute format('create policy "update with recipe" on public.%I for update to authenticated using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id))', t);
    execute format('create policy "delete with recipe" on public.%I for delete to authenticated using (public.can_edit_recipe(recipe_id))', t);
  end loop;
end $$;

-- Version history: authors and staff can read; rows are only written by the trigger.
create policy "authors and staff read versions" on public.recipe_versions for select to authenticated
  using (public.is_staff() or exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Settings, audit log, newsletter
-- ---------------------------------------------------------------------------
create policy "public settings are readable" on public.site_settings for select
  using (is_public or public.has_role('super_admin'));
create policy "super admins write settings" on public.site_settings for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- Append-only: staff can add entries about themselves; nobody can edit or delete.
create policy "super admins read audit log" on public.admin_activity_log for select to authenticated
  using (public.has_role('super_admin'));
create policy "staff write own audit entries" on public.admin_activity_log for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());

-- Subscribers are private. Sign-ups go through subscribe_newsletter().
create policy "super admins read subscribers" on public.newsletter_subscribers for select to authenticated
  using (public.has_role('super_admin'));
create policy "super admins manage subscribers" on public.newsletter_subscribers for update to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------
revoke execute on function public.subscribe_newsletter(text, text, text, text) from public;
grant execute on function public.subscribe_newsletter(text, text, text, text) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.snapshot_recipe_version() from public, anon, authenticated;
