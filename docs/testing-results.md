# Testing results (Phase 6, 16 November 2026)

Everything here was run on the code in this repository. "Live mode" means the site was built against a real PostgreSQL 16 database with all migrations, served through PostgREST 12 (the API Supabase uses), with a stand-in for Supabase's sign-in service. It was **not** run against a real Supabase project, and no real email, AdSense, Analytics or Turnstile account was used, because none exist yet.

## Summary

| Suite | What it covers | Result |
|---|---|---|
| Unit tests (`npm test`, Vitest) | Validation, safe redirects, upload checks, recipe scaling and units, search parsing, settings, SEO helpers, consent, where ads may appear | **107 passed** |
| Database tests (`npm run test:db`) | Row Level Security on every table, roles, moderation, community rules, admin functions, audit log, the Phase 6 hardening | **244 checks passed** |
| API integration (`npm run test:api`) | The site's real community and admin queries through PostgREST, as visitors and as members | **27 passed** |
| Browser tests (`npm run test:e2e`, Playwright) | Desktop Chrome and a phone-sized Chrome (Pixel 7) on the sample-mode build | **216 passed, 32 skipped, 0 failed** |
| Live community flow (browser) | Commenting, reviews, replies, likes, follows, reports, blocking, posting, member recipes, moderation, suspension | **29 passed** |
| Live admin and roles flow (browser) | Dashboard, every admin page per role, settings, countries, taxonomy, reviews, members and roles, SEO, audit log | **30 passed** |
| Live privacy flow (browser) | Data download, age check at sign-up, privacy officer settings shown on the Privacy page | **10 passed** |
| Affiliate redirect (live) | See below | **Passed** |
| Lighthouse (phone settings, sample mode) | 5 key pages | See below |

The 32 skipped browser tests are deliberate: accessibility and SEO checks run once per page rather than on every device, mobile-only checks skip on desktop, and the country filter test skips in sample mode (sample data has no countries without recipes, so the filter isn't shown).

## What each area tested

**Security**
- Every public table has Row Level Security; every privileged database function has a fixed search path (checked automatically).
- Visitors and members can't read other people's notifications, blocks, reports, drafts or email addresses; members can't give themselves roles; the last Super Admin can't be removed.
- Internal trigger functions and newsletter token functions can't be called from the public API.
- Redirect after sign-in only goes to pages on this site (tested against `//evil.com`, `/\evil.com`, tabs, encoded tricks and full URLs).
- Uploads are checked by their actual contents, not only the file name; a renamed non-image is refused.
- No secret keys end up in the browser files (checked by building with marker values and searching the output).
- Security headers on every page: Content Security Policy, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Dependency audit: 0 known vulnerabilities in production packages. 8 moderate ones in development-only tooling (ESLint's `minimatch`), which never runs on the server.

**Responsive and browsers**
- Every key page on desktop and phone width with no sideways scrolling, one main heading, no console errors; the mobile menu lists every section.
- Chrome only. Firefox and Safari projects are configured but their browsers couldn't be downloaded in this environment.

**Accessibility**
- Automated WCAG 2.1 AA checks (axe) on every key page, desktop and phone: no serious or critical problems. Lighthouse accessibility 100 on all 5 pages.
- Images have alt text; form fields have labels; keyboard focus is visible (manual checks are in the manual checklist).

**SEO**
- Every key page has a title, a description over 30 characters and a canonical address. robots.txt and the sitemap respond.
- Sample pages are never indexed and never carry Recipe structured data or invented ratings.
- Until **Allow search engines to index the site** is turned on in Admin → SEO, every page says `noindex` (this is why Lighthouse SEO shows 69).

**Performance (Lighthouse, phone, simulated slow 4G)**

| Page | Performance | Accessibility | Best practices | Largest paint | Layout shift | Blocking time |
|---|---|---|---|---|---|---|
| Home | 98 | 100 | 100 | 1.0 s | 0.042 | 170 ms |
| Recipes | 97 | 100 | 100 | 0.8 s | 0 | 190 ms |
| A recipe | 99 | 100 | 100 | 1.1 s | 0 | 140 ms |
| A country | 98 | 100 | 100 | 0.8 s | 0 | 170 ms |
| Shop | 99 | 100 | 100 | 0.9 s | 0 | 140 ms |

Measured on a local server. Real numbers on Hostinger will depend on the plan and the visitor's location.

**Authentication and roles**
- Signed-out visitors are sent to sign-in from account, submit and admin pages. Each admin page checks the role on the server, not only in the menu: editors, moderators, ad managers and Super Admins each see only their pages.

**Forms**
- Join (now including the 14+ age confirmation), sign-in, password reset, newsletter, contact, comments, reviews, posts, recipe submission and admin forms show clear errors for missing or invalid values, and keep what you typed.

**Affiliate redirect**
- `/go/<product>` sends the visitor to the stored product address with the retailer's tracking parameters added (`…/p/123?color=red` became `…/p/123?color=red&tag=mond-20&utm_source=mondrecipes`).
- The click was recorded with only the product, the page it came from and the referring website: no IP address, name or email.
- A search-engine bot was redirected but not counted.
- An inactive or unknown product sends the visitor back to the Shop instead of a broken link.

**Advertising placement**
- With no AdSense account, no ad code loads and ad slots take no space. Ads and Analytics only load after the visitor consents.
- Ads never show on sign-in, account, admin, posting forms or legal pages (AdSense doesn't allow ads on pages without publisher content). This was a gap found in Phase 6: the footer placement would have appeared on those pages.
- Real ads couldn't be tested without an approved account.

## Problems found and fixed in Phase 6

1. **Who blocked whom could be discovered.** Anyone could ask the database whether two members had blocked each other. Now only those two members and staff can.
2. **Internal functions reachable through the API.** Trigger functions and the newsletter confirm/unsubscribe functions could be called directly. Access removed; the website calls them with its server key.
3. **A redirect trick after sign-in.** An address like `/\tevil.com` could have sent people to another site. The check now parses the address properly.
4. **Uploads trusted the file name.** The server now reads the start of each file to confirm it really is a JPEG, PNG, WebP, GIF or AVIF.
5. **Security headers were missing** (Content Security Policy, HSTS and others). Added for every page.
6. **The homepage had no canonical address.** Added.
7. **Privacy, Terms and Cookie pages were placeholders.** Drafts written (see the launch checklist for the lawyer review).
8. **No way to download your data, and no age check.** Quebec gives people the right to a copy of their data in a common format and requires a parent's consent under 14. Added **My data** with a JSON download, and sign-up now asks people to confirm they're 14 or older.
9. **No place for the privacy officer's details**, which Quebec requires on the Privacy page. Added to Settings, with a dashboard reminder until filled in.
10. **A scrollable table on the Cookie page couldn't be reached by keyboard.** Fixed.
11. **Out-of-date wording** on the countries page ("once the community opens"). Fixed.
12. **The footer ad placement would have shown on sign-in, account and admin pages**, which AdSense doesn't allow. Ads are now kept off those pages.
13. **A test left a block between two test members**, which made a later browser test fail. The test now cleans up after itself.

## Not tested here

- A real Supabase project (sign-in emails, password reset emails, Storage uploads, account deletion with the service key, Turnstile).
- Real email delivery through Resend, real AdSense ads, real Google Analytics.
- Firefox, Safari, and real phones.
- Hosting on Hostinger.

These are covered by the [manual testing checklist](manual-testing.md), to run once the accounts in the [launch checklist](launch-checklist.md) are set up.
