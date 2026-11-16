# Phase 2 report — Recipe Engine

Date: 16 November 2026

## Automated test results

| Check | Result |
|---|---|
| TypeScript | Passed, 0 errors |
| Lint | Passed, 0 errors, 0 warnings |
| Unit tests | 34 of 34 passed (11 from Phase 1, 23 new) |
| Production build | Passed |
| Database tests | 87 of 87 passed on PostgreSQL 16 (40 security, 26 recipe engine, 21 admin) |
| Layout | No horizontal overflow on 12 pages at 390 px, 768 px and 1440 px; no browser console errors |

### What the new tests cover

- Every filter combination returns only published recipes that match all filters; drafts never appear
- A dish shared by several countries (Jollof Rice: Nigeria and Ghana) appears under each
- Typos ("jolof"), accents and ingredient alternative names ("scallions") are found
- Minimum-rating filters never match unrated recipes; result counts stay correct while paging
- Ingredient finder ranks the best match first and lists only what's missing
- Suggestions include recipes, drinks, ingredients and countries, and wait for two characters
- Saved recipes: members only see their own; unpublished recipes can't be saved; save counts update
- Only editors can upload recipe photos
- Editor: members can't use it; publishing without ingredients/steps fails and leaves nothing behind; new ingredients and cuisines are created; regions stay within chosen countries; the original version is kept on edit; every create, status change and delete is logged
- Units: weight↔weight and volume↔volume exact, cups→grams only with a known density (marked ≈), counted items unchanged, kitchen-friendly fractions
- Search parameters from the URL are validated; junk values are ignored
- Sample library uses only slugs that exist in the database seed; vegan recipes list no milk or egg allergens

### Checked in a real browser

- Servings 4 → 6 rescales every ingredient; Metric and US switch units correctly
- Cooking mode opens, moves between steps, shows timers, closes with Esc
- Suggestions appear while typing; mobile menu, filters and ingredient chips work
- The recipe editor adds, reorders and removes rows, shows drink fields for drinks, and asks for confirmation before the test-kitchen badge

## Manual checklist once Supabase is connected

- [ ] Run the four migrations and `seed.sql`; optionally `sample_content.sql` on a staging project
- [ ] Make yourself super admin; open `/admin` and confirm the dashboard numbers
- [ ] Create a draft recipe with a photo; confirm it's not visible when signed out
- [ ] Publish it; confirm it appears in search, its country page, and `sitemap.xml`
- [ ] Edit it; confirm the change appears within 5 minutes
- [ ] Sign in as a normal member; save the recipe; confirm "Saved" persists after reload
- [ ] Visit `/admin` as a normal member → 404
- [ ] Delete the test recipe (type DELETE); confirm it's gone
