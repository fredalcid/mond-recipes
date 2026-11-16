# Mònd Recipes

International recipe discovery and community platform. **Discover • Cook • Share.**

This repository contains **Phase 1 — Foundation and Design**: the project setup, the brand design system, the responsive navigation, the homepage, the footer, the database foundation with security rules, and member registration/sign-in.

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
   3. `supabase/seed.sql`

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
7. **Project Settings → API:** copy the Project URL and the anon/publishable key into your environment variables.
8. Make yourself Super Admin: register on the site, confirm your email, then run in the SQL Editor:

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
5. **Environment variables:** add the three values from `.env.example` **before the first build**.
6. Deploy. Then connect your domain and turn on the free SSL certificate.
7. Every push to `main` can be redeployed from hPanel.

After deploying, update the Supabase **Site URL** and **Redirect URLs** to the live domain.

---

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

## Known limitations of Phase 1

- Recipe, country, drinks, community, articles and shop pages show a clear "Coming in Phase N" page.
- Newsletter confirmation emails are sent once the email service is connected (Phase 3). Until then sign-ups are stored as *pending* and nothing is sent.
- Profile editing, saved recipes, notification settings and account deletion arrive with the community (Phase 4).
- Spam protection on registration (Cloudflare Turnstile) and rate limiting are added in Phase 4. Supabase's built-in auth rate limits apply until then.
- Legal pages (Privacy, Terms, Cookies) must be written and reviewed by a lawyer before launch.
- The logo file is small (312 px). A high-resolution PNG or SVG is needed for print and large banners.
