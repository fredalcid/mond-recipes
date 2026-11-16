# Mònd Recipes

International recipe discovery and community platform. **Discover • Cook • Share.**

This repository contains:

- **Phase 1 — Foundation and Design:** project setup, brand design system, navigation, homepage, footer, database foundation with security rules, member registration and sign-in.
- **Phase 2 — Recipe Engine:** recipe search with combined filters, ingredient finder, recipe and drink pages (servings, metric/US units, cooking mode, timers, save, share, print), country and region pages, Drinks & Tea, and a basic admin for adding and publishing recipes.

Later phases (recipe engine, editorial and shop, community, administration, launch testing) build on this code.

---

## Technology

| Part | Choice |
|---|---|
| Website | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, self-hosted fonts (Fraunces for headings, Inter for text) |
| Database & sign-in | Supabase (PostgreSQL, Supabase Auth, Row Level Security) |
| Hosting | Hostinger Node.js web app (Business or Cloud plan) |
| Tests | Vitest (unit tests) and a SQL security test suite |

Fonts are bundled with the site rather than loaded from Google, so no visitor data is sent to a font service.

## Project layout

```
src/
  app/                 Pages and routes
    page.tsx           Homepage (11 sections)
    (auth)/            Join, sign in, reset password, choose new password
    auth/confirm       Handles links in confirmation / reset emails
    auth/sign-out      Sign out (POST only)
    account/           Member's account page
    [slug]/            Honest "coming in Phase N" pages for sections not built yet
    actions/           Server actions (newsletter sign-up)
  components/          Reusable UI: buttons, fields, badges, cards, header, footer
  lib/                 Site config, validation, formatting, Supabase clients, sample data
  proxy.ts             Refreshes the sign-in session; keeps signed-out visitors off member pages
supabase/
  migrations/          Database schema (run in order)
  seed.sql             Reference data: 249 countries, categories, drink types, diets, allergens
  tests/               Security tests (run on a throwaway database only)
public/brand/          Logo
```

## Brand colours (taken from the logo)

| Token | Colour | Use |
|---|---|---|
| `forest-900` | `#1E3713` | Logo green: headings, primary buttons, footer |
| `gold-500` / `gold-600` | `#F2B537` / `#F29D28` | Logo rings: highlights, focus outlines, badges |
| `olive-500` | `#809A1C` | Logo leaves (decoration only) |
| `olive-700` | `#556A10` | Small labels (readable on ivory) |
| `cream` | `#FFFFF0` | Chef hat: text on green |
| `ivory` | `#FAF4EE` | Page background |
| `sand` | `#F1E7DA` | Card and section backgrounds |

All text colours pass WCAG AA contrast on their backgrounds. Bright gold is never used as text on ivory.

---

## Run it on your computer

Requires Node.js 20.9 or newer (22 recommended).

```bash
npm install
cp .env.example .env.local     # then fill in the Supabase values
npm run dev                    # http://localhost:3000
```

Without Supabase values the site still runs: the homepage works, and sign-in pages show that accounts aren't switched on yet.

Checks:

```bash
npm run check      # typecheck + lint + unit tests + production build
npm run test:db    # security tests; needs DATABASE_URL pointing at an EMPTY test database
```

---

## Set up Supabase (one time)

1. Create a project at supabase.com. Choose the **Canada (Central)** region to keep members' data in Canada. Use the **Pro** plan before launch (free projects pause after a week without activity).
2. **SQL Editor** → run, in this order:
   1. `supabase/migrations/20261116000100_foundation.sql`
   2. `supabase/migrations/20261116000200_security.sql`
   3. `supabase/migrations/20261116000300_recipe_engine.sql`
   4. `supabase/migrations/20261116000400_recipe_admin.sql`
   5. `supabase/migrations/20261116000500_editorial_shop.sql`
   6. `supabase/migrations/20261116000600_community.sql`
   7. `supabase/migrations/20261116000700_administration.sql`
   8. `supabase/seed.sql`
   9. *(Optional, for a staging site only)* `supabase/sample_content.sql`: the 13 sample recipes. Remove them before launch with `delete from public.recipes where is_sample;`

   (Or with the Supabase CLI: `supabase link` then `supabase db push`, then run `seed.sql`.)
3. **Authentication → Sign In / Providers → Email:** keep **Confirm email** turned on.
4. **Authentication → URL Configuration:**
   - Site URL: `https://www.mondrecipes.com` (your real domain)
   - Redirect URLs: add `https://www.mondrecipes.com/**` and `http://localhost:3000/**`
5. **Authentication → Emails → Templates:**
   - *Confirm signup*: make the button link
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
   - *Reset password*: make the button link
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password`
6. **Authentication → Emails → SMTP settings:** connect a real email service (e.g. Resend or Postmark) with your domain. Supabase's built-in sender is for testing only and sends very few emails per hour.
7. **Project Settings → API:** copy the Project URL and the anon/publishable key into your environment variables. Also copy the **service_role / secret** key into `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`).
8. **Storage → Settings:** set the global file size limit to at least **100 MB** so members can upload short videos (the free plan allows at most 50 MB; with that limit, videos over 50 MB are refused with a clear message). Large videos are uploaded straight from the browser to Storage and never pass through Hostinger.
9. **Authentication → Attack Protection (Bot and Abuse Protection):** turn on **CAPTCHA protection**, choose **Turnstile**, and paste the Turnstile **secret key**. Put the matching **site key** in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Create both keys free at dash.cloudflare.com → Turnstile. Turn on both settings at the same time: with CAPTCHA on in Supabase but no site key on the website, nobody can sign in.
10. Make yourself Super Admin: register on the site, confirm your email, then run in the SQL Editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'super_admin' from auth.users where email = 'YOUR@EMAIL.COM';
   ```

---

## Deploy on Hostinger

Hostinger runs Next.js as a **Node.js web app**. This needs a **Business web hosting** or **Cloud** plan (the cheaper Single/Premium plans don't run Node.js apps).

1. Put this code in a private GitHub repository.
2. hPanel → **Websites → Add website → Node.js web app** (Hostinger may call it "Web App").
3. Connect GitHub and choose the repository and the `main` branch.
4. Settings:
   - Node.js version: **22** (20 or newer is required)
   - Build command: `npm run build`
   - Start command: `npm start`
5. **Environment variables:** add the values from `.env.example` **before the first build** (values starting with `NEXT_PUBLIC_` are built into the site, so rebuild after changing them).
6. Deploy. Then connect your domain and turn on the free SSL certificate.
7. Every push to `main` can be redeployed from hPanel.

After deploying, update the Supabase **Site URL** and **Redirect URLs** to the live domain.

### Email (newsletter and contact form)

1. Create a Resend account, add your domain and add the DNS records it shows (in Hostinger → Domains → DNS).
2. Set `RESEND_API_KEY`, `EMAIL_FROM` (an address on the verified domain) and `CONTACT_EMAIL` (your inbox).
3. Use the same Resend account as Supabase's custom SMTP (step 6 of the Supabase setup) so sign-up emails come from your domain too.

### Weekly link check

Shop links are checked so broken products are flagged in the admin. In hPanel → **Advanced → Cron Jobs**, add a weekly job:

```
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://www.mondrecipes.com/api/cron/check-links
```

### Advertising (Google AdSense)

1. Apply at adsense.google.com once the site has real, original content (thin or sample content is usually refused).
2. When approved, set `NEXT_PUBLIC_ADSENSE_CLIENT` (`ca-pub-…`) and rebuild.
3. Create ad units in AdSense, then paste each unit ID in **Admin → Advertising** and switch the placement on.
4. Add the `ads.txt` line Google gives you to `public/ads.txt`.
5. Visitors in the EEA, UK and Switzerland: Google requires a Google-certified consent platform for personalised ads there. The built-in banner works for Canada and Quebec (ads and analytics only load after consent), but add a certified CMP (for example Google's own "Privacy & messaging") before targeting European traffic.

---

## Tests

- `npm test`: unit tests
- `npm run test:db`: database security and logic checks (needs an empty PostgreSQL 16 database in `DATABASE_URL`)
- `npm run test:api`: runs the site's community and admin queries through PostgREST, the API Supabase uses (needs PostgREST 12 as `POSTGREST`)

## Pages

| Address | What it is |
|---|---|
| `/recipes` | Search and filters (country, meal or dish, cuisine, diet, time, difficulty, rating), sorting, result count, pagination |
| `/recipes/<recipe>` | Recipe page |
| `/ingredients` | "Cook with what you have": recipes ranked by how many of your ingredients they use, with what's missing |
| `/drinks-tea`, `/drinks-tea/<drink>` | Drinks & Tea search and drink pages |
| `/countries`, `/countries/<country>`, `/countries/<country>/<region>` | Country discovery, generated from the database |
| `/articles`, `/articles/<article>` | Articles with topics, related recipes and sharing |
| `/videos`, `/videos/<video>` | YouTube videos (loaded only when the visitor presses play) |
| `/shop`, `/shop/<category>` | Affiliate product catalog. Every product opens on the retailer's website |
| `/go/<product>` | Counts the click (no personal data) and sends the visitor to the retailer |
| `/about`, `/contact`, `/advertise`, `/affiliate-disclosure` | Information pages |
| `/newsletter/confirm`, `/newsletter/unsubscribe` | Newsletter double opt-in links |
| `/community` | Member photos, videos and tips (Latest, Popular, Photos, Videos, Tips), challenges, featured cooks, recently shared recipes |
| `/community/new` | Post a photo (up to 6), a video (upload or YouTube link) or a tip, optionally linked to a recipe or a challenge |
| `/community/posts/<post>` | A post with likes, comments, replies, sharing and reporting |
| `/community/challenges`, `/community/challenges/<challenge>` | Community challenges and their entries |
| `/members/<username>` | Public profile: recipes, photos, videos, tips, optional favourites, followers, follow / block / report |
| `/submit/recipe` | Members share a recipe (draft, then send for review) |
| `/account/…` | Overview, profile, my contributions, saved recipes, notification settings, blocked members, delete account |
| `/notifications` | Follows, likes, comments, replies, reviews, review decisions, activity from people you follow |
| `/community-guidelines` | Community rules (draft) |
| `/admin` … | Staff only. See "The admin area" below |
| `/ads.txt` | Advertising partners file, edited in Admin → Advertising |

When Supabase isn't connected, the site runs on the labelled **sample library** (`src/lib/demo/library.ts`), so every page can be reviewed. Once Supabase is connected, the site reads only from the database.

## Adding recipes (admin)

1. Sign in with an account that has the **editor** or **super_admin** role (README step 8 above).
2. Go to `/admin/recipes` → **New recipe**.
3. Fill in the recipe, upload a photo you own or are licensed to use, choose countries, categories, diets and allergens, then add ingredients and steps.
4. Save as **Draft** while working, then set **Published** when it's ready. Publishing requires ingredients, steps and at least one country.
5. Only give **Editorially reviewed** or **Test-kitchen verified** badges to recipes that actually went through that review. The test-kitchen badge asks you to confirm it.

To let a country page appear in Google, set `is_indexable = true` on that country in Supabase once it has a real introduction and food-culture text and some recipes (a country admin screen arrives in Phase 5).

## What works in Phase 1

- Brand design system based on the logo colours, with consistent buttons, fields, badges, cards and section headings
- Responsive header with exactly the approved navigation, search link, Sign in / Join or account menu, and an accessible mobile menu
- Homepage with all 11 sections from the specification
- Footer with every required link, plus newsletter sign-up
- Registration (name, email, password) with server-side validation, email confirmation, sign-in, sign-out, password reset and password change
- Unconfirmed accounts cannot publish anything (enforced in the database, not only in the interface)
- Newsletter sign-up with consent wording stored as proof, spam honeypot, and "pending" status until the person confirms (CASL-friendly double opt-in)
- Database foundation: profiles, roles, countries, regions, cuisines, categories, diets, allergens, drink categories, ingredients, recipes with steps/images/sources, version history, many-to-many links, site settings, audit log, newsletter subscribers
- Accent-insensitive and typo-tolerant search indexes ("creme mond" finds "Crème Mònd")
- Security headers, `robots.txt`, `sitemap.xml`, page titles and social sharing metadata

## Sample content

Homepage recipes, countries, drinks, articles and products are **sample content** for design review. Each item carries a visible **Sample** badge. No sample shows ratings, reviews, popularity or a verified badge. Trending stays empty until there is real activity. Sample content is replaced by database content in Phase 2.

Photo areas show placeholders until properly licensed food photography is uploaded.

## What works in Phase 2

- Search by name, ingredient (including other names like "scallions"), country, region, cuisine, meal/dish, diet, drink type, time, difficulty and rating; all filters combine; typos and accents tolerated
- Search suggestions while typing, recent searches (kept only in the visitor's own browser), result counts, four sort orders, pagination, helpful empty states
- Ingredient finder with best match first and the missing ingredients listed
- Recipe and drink pages: servings adjuster, As written / Metric / US units (density-aware, approximate weights marked ≈), print layout, share, save (signed-in members), cooking mode with progress, timers and keep-screen-awake, dietary and allergen information, tips, substitutions, related recipes, breadcrumbs, structured data (only from real data; never on sample recipes)
- Verification badges only as set by editors; test-kitchen badge requires confirmation
- Country pages generated from the database with flag, introduction, food culture, regions, dishes, drinks and cuisines; thin pages are kept out of Google
- Admin dashboard (real counts) and recipe editor with photo upload, saved in one database transaction, version history and audit log
- Sitemap lists only published, non-sample recipes and countries marked indexable

## What works in Phase 3

- Articles: Markdown editor, hero image, topics, related recipes, featured, SEO fields, Article structured data
- Videos: paste a YouTube link; privacy-friendly embed (youtube-nocookie) that loads only when the visitor presses play
- Shop: categories, retailers with automatic tracking codes, featured and **Sponsored** labels, no prices, no cart or checkout; links use `rel="sponsored nofollow"`
- Outbound click tracking without cookies or personal data, bot filtering, click report by period, weekly broken-link check
- Advertising: eight placements managed in the admin, every ad labelled “Advertisement”, fallbacks (newsletter or your own promotion), nothing loads before consent
- Cookie banner (Accept / Reject / Choose), Google Consent Mode default “denied”, “Cookie settings” link in the footer. The banner only appears once ads or analytics are configured
- Newsletter double opt-in: confirmation email, 7-day link, one-click unsubscribe, hashed tokens, rate limits, CSV export of confirmed subscribers
- Contact form (with topic, spam honeypot and rate limit), About, Advertise and Affiliate Disclosure pages

## The admin area

| Section | Who | What it does |
|---|---|---|
| Dashboard | All staff | Real counts: recipes (total, published, waiting, drafts, drinks), members (registered, active in 30 days, new, suspended), community posts, moderation queue, reviews, articles, videos, products, shop clicks, newsletter subscribers, ad placements. Warnings for moderation, broken shop links, sample recipes and blocked search engines |
| Analytics | All staff | Day-by-day charts (new members, recipes published, saves, reviews, comments, posts, shop clicks, newsletter confirmations) for 7, 30, 90 or 365 days; most saved and best rated recipes, most clicked products, countries with the most recipes. Visitor numbers come from Google Analytics |
| Recipes, Drinks & Tea | Editors | Create, edit, delete, publish or unpublish, verification badge, search title and description, canonical address, hide from search engines, social sharing image |
| Countries | Editors | Introduction, food culture, photo, flag (upload replaces the built-in one), featured on the homepage, open to search engines, editors' picks (up to 12 recipes), linked cuisines, regions, other names, SEO fields |
| Categories & ingredients | Editors | Recipe categories, cuisines, drink & tea categories, diets, allergens, article topics, shop categories, ingredients (grams per cup, other names, merge duplicates) |
| Articles, Videos, Shop | Editors | As in Phase 3, plus canonical address and hide-from-search for articles and videos |
| Moderation | Moderators, editors | Member recipes (full recipe shown), posts, reports |
| Reviews | Moderators, editors | All ratings and reviews, filter reported, hidden or removed; remove or restore |
| Challenges | Moderators, editors | Create and schedule challenges |
| Members | Moderators, super admins | Search, suspend and restore, feature; member page with blocks (remove a block), reports, activity. Super admins also see the account email and last sign-in, and set team roles |
| SEO | Editors (checks), super admins (settings) | Allow search engines (off until launch), homepage title, default description, default sharing image; lists of pages missing descriptions or photos, thin indexed countries and hidden recipes |
| Settings | Super admins | Name, tagline, description, logo, public contact email, mailing address, social media links, footer note, homepage sections on/off, newsletter sign-up text |
| Advertising, Newsletter | Super admins | As in Phase 3, plus ads.txt, newsletter search, unsubscribe or delete a subscriber |
| Audit log | Super admins | Every team action, with who, when and what changed. Entries can't be edited or deleted |

**Search engines are blocked until you allow them** in Admin → SEO. Until then, robots.txt disallows everything and every page says "noindex". Turn it on at launch.

The database enforces every permission on its own, so a hidden menu link is never the only protection. The site always keeps at least one super admin.

## What works in Phase 4

- **Profiles**: username, picture, bio, country, followers and following, optional public favourites
- **Follow, block and report**: blocking hides the other member's content from you and stops them following, liking or commenting on your content
- **Posts**: photos, videos (upload up to 100 MB or YouTube) and cooking tips, linked to a recipe ("I made this") or a challenge
- **Comments and replies** on recipes and posts (one level of replies), with editing, deleting, likes and reporting
- **Ratings and reviews**: one per member per recipe, editable; recipe ratings are calculated only from real reviews; you can't rate your own recipe
- **Member recipes**: the same editor as the admin, without web address, search or publishing fields; drafts, then "Send for review"
- **Moderation**: new recipes and posts wait for review; comments and reviews appear straight away and can be reported; three reports hide an item until a moderator checks it; approve, ask for changes, decline, remove, restore; every decision is logged and the member is notified with the moderator's note
- **Members admin**: suspend (with a reason the member sees) and restore; feature cooks on the community page. Suspended members' content is hidden and they can't take part
- **Notifications** in the site with a bell and unread count, and per-type settings
- **Account deletion** removes the account and everything the member shared, including uploaded files
- **Spam protection**: Cloudflare Turnstile on sign-up, sign-in and password reset (through Supabase), and per-member limits in the database (for example 10 posts an hour, 30 comments an hour)

## Known limitations

- Email sending, AdSense, Analytics and the link checker were built against the services' documented APIs but not tested with live accounts. They stay off until their keys are set.
- Shop sample products have no links and are labelled “Sample”; the Shop needs real products from affiliate programs you have joined.
- Nutrition information isn't stored yet; recipe pages say so.
- The admin and saving were tested through the database functions and form validation, but not yet against a live Supabase project.
- Community features were tested against the real database API (PostgREST) with a stand-in for Supabase's sign-in service. Real sign-in, file uploads to Storage, Turnstile and account deletion (which needs the service key) were not tested with a live Supabase project.
- Notifications appear on the site only; they are not emailed.
- Uploaded videos play as they are (no automatic compression or thumbnails). Ask members to keep videos short; if video becomes popular, a video service such as Cloudflare Stream or Mux can be added.
- Images are not scanned automatically; moderators review every photo and video before it appears.
- Legal pages (Privacy, Terms, Cookies) and the Affiliate Disclosure draft must be written or checked and reviewed by a lawyer before launch.
- The logo file is small (312 px). A high-resolution PNG or SVG is needed for print and large banners.
