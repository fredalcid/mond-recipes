# Phase 5 report: administration

## Built

| Spec item | Where | Notes |
|---|---|---|
| Admin dashboard | `/admin` | Every statistic in the spec, counted live from the database by `admin_dashboard_stats()`. Warnings for moderation, broken shop links, leftover sample recipes and blocked search engines |
| Analytics | `/admin/analytics` | Daily activity charts (members, recipes, saves, reviews, comments, posts, shop clicks, newsletter confirmations) for 7 to 365 days, plus top lists. Each chart has a table view. Visitor traffic is left to Google Analytics; the site doesn't track visitors |
| Content management | Recipes, Drinks & Tea, Articles, Videos | Existing editors plus canonical address, hide-from-search and (recipes) social sharing image |
| Recipe moderation | `/admin/moderation`, `/admin/reviews` | The full submitted recipe is shown in the queue, so moderators can review without editor rights; all ratings and reviews can be removed or restored |
| Member management | `/admin/members`, `/admin/members/<id>` | Suspend, restore, feature, see and lift blocks, reports about the member, history; super admins see the account email and set roles |
| Country and cuisine management | `/admin/countries`, `/admin/taxonomy` | Country text, photo, flag upload, homepage featuring, indexing, editors' picks, linked cuisines, regions, other names, SEO; categories, cuisines, drink categories, diets, allergens, article topics, shop categories, ingredients with merge |
| Shop management | `/admin/shop` | From Phase 3 (products, retailers, click report, broken links) |
| Advertising management | `/admin/ads` | Placements from Phase 3, plus ads.txt served at `/ads.txt` |
| Newsletter management | `/admin/newsletter` | Search, unsubscribe or permanently delete a subscriber, CSV export |
| SEO management | `/admin/seo` | Site-wide indexing switch (off until launch), homepage title, default description and sharing image; checks for missing descriptions and photos, thin indexed countries, hidden recipes |
| Website settings | `/admin/settings` | Name, tagline, description, logo, contact email, mailing address, social links, footer note, homepage sections, newsletter text, all applied across the site |
| Audit logs | `/admin/audit` | Database triggers record changes to reference data, settings, roles, retailers, challenges and blocks, alongside the existing logs for content and moderation. Filter by type, action and person |
| Roles | Server and database | Super admin, editor, community moderator. Each page checks the role on the server, and the database enforces the same rules. The last super admin can't be removed, and who granted a role is recorded automatically |

## Tested

- **Database:** 235 checks pass, 29 of them new for Phase 5 (SEO fields, country cuisines and editors' picks, audit trail, roles, ingredient merging, statistics, account lookups, blocks, settings permissions, the indexing default).
- **API integration:** 27 checks run the site's community and admin queries through PostgREST, the API Supabase uses.
- **Browser:** 30 checks.
  - Role matrix: four roles across 17 admin pages; each role sees exactly what it should and gets "not found" otherwise.
  - Flows: settings shown on the site, the launch switch changing robots.txt and page tags, ads.txt checks, granting roles, protecting the last super admin, the audit log, country editing with editors' picks and regions, adding categories, removing reviews.
  - The Phase 4 community suite still passes (29 checks).
- **Code:** 91 unit tests pass. Type check, lint and build are clean.

## Fixed along the way

- Clearing a website setting (for example an empty contact email) would have failed to save. Empty values are now stored as empty text.
- "Published member recipes" counted sample recipes. It now counts recipes that have a member author.
- With the notification bell from Phase 4, the main menu wrapped onto two lines when signed in. Menu labels now stay on one line, the full menu shows from 1280 px with the compact menu below that, and the account button shows only the avatar unless the screen is very wide.
- Analytics tables overflowed on phones.
- List pages for recipes, articles, videos and the shop now require editor rights. Before, any staff member could open them, although the database already limited what they could change.

## Important for launch

- Search engines are blocked until a super admin ticks "Allow search engines" in Admin → SEO. This protects a staging site, but it must be switched on at launch.
- Apply database update `20261116000700_administration.sql`.

## Not tested with live services

- Uploads (logo, flags, country photos, sharing images) were checked through the forms but not stored in real Supabase Storage.
