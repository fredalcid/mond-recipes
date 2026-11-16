# Phase 3 report: articles, videos, shop, advertising, newsletter

## Built

| Area | What's included |
|---|---|
| Articles | `/articles` (topics, featured lead article, videos strip), article pages (Markdown body, hero image, related recipes, share buttons, mid-article ad slot, Article structured data on real articles only) |
| Videos | `/videos`, video pages. YouTube links only; the player loads from youtube-nocookie.com only when the visitor presses play |
| Shop | `/shop`, `/shop/<category>`. Affiliate catalog only: no cart, no checkout, no payments, no prices. Every product links out through `/go/<product>` with `rel="sponsored nofollow"`. Sponsored products are labelled. Affiliate disclosure on every shop page |
| Click tracking | `/go/<product>` records product, page and referring site only (no IP, no cookies, no personal data), skips obvious bots, then sends the visitor to the retailer with the retailer's tracking code added |
| Link checks | `/api/cron/check-links` (protected by `CRON_SECRET`) flags broken product links weekly |
| Advertising | 8 placements (home, search results, recipe top/bottom, country, article, community, footer), all off by default, labelled "Advertisement", with fallbacks. AdSense loads only after consent |
| Cookie consent | Accept / Reject / Choose banner, Google Consent Mode default "denied", "Cookie settings" link. Appears only once ads or analytics are configured |
| Newsletter | Double opt-in by email, 7-day confirmation link, one-click unsubscribe, hashed tokens, rate limits, same reply whether or not the address was already subscribed |
| Pages | About, Contact (topics, honeypot, rate limit), Advertise With Us, Affiliate Disclosure (draft) |
| Admin | Articles, Videos, Shop (products, retailers and tracking codes, click report by period, link status), Advertising and Newsletter (super admins; CSV export of confirmed subscribers, protected against spreadsheet formula injection) |

## Tested

- 124 database checks pass (security, search, admin, Phase 3: click recording, RLS on products/ads/clicks, newsletter token flow, rate limits)
- 66 unit tests pass (YouTube link parsing, tracking codes, Markdown split, consent cookie, CSV cells, admin form validation)
- Type check, lint and production build are clean
- Browser checks at 390 px and 1440 px on 17 pages: no horizontal overflow, no console errors; contact form validation works

The tests found one real bug before release: unchecked checkboxes in the admin forms would have been rejected. It is fixed and covered by a test.

## Not tested against live services

These are built from the services' documented APIs and switch on when their keys are set:

- Sending email through Resend (newsletter confirmations, contact form)
- Google AdSense and Google Analytics
- The admin screens and click tracking against a real Supabase project (they were tested through the database and validation, not end to end)
- The Hostinger cron job

## Before launch

- Join affiliate programs and add real products; remove the sample products
- Have the Affiliate Disclosure, Privacy, Terms and Cookie pages reviewed
- Apply for AdSense only once the site has real content; add a Google-certified consent platform before targeting European visitors
