# Launch checklist: things that need your accounts, credentials or approval

Nothing below has been done yet. Each item needs you to sign in, accept terms, pay, or approve something. None of these services are connected to the site today; the site runs in sample mode until they are.

Tick each box as you go. Details for most steps are in the [README](../README.md).

## 1. Accounts to create or sign in to

- [ ] **GitHub**: a private repository for the code (Hostinger deploys from it).
- [ ] **Hostinger**: buy the **Business** web hosting plan (or Cloud). The cheaper plans can't run Node.js apps.
- [ ] **Domain**: register or connect your domain (free for a year with the Business plan).
- [ ] **Supabase**: create the organisation, choose **Pro**, create the project in **Canada (Central)**.
- [ ] **Resend**: create an account and add your domain.
- [ ] **Cloudflare**: create free Turnstile keys (dash.cloudflare.com → Turnstile).
- [ ] *(Optional)* **Google Analytics**: create a GA4 property.
- [ ] *(Later)* **Google AdSense**: apply once the site has real content.
- [ ] *(Later)* **Affiliate programs** (for example Amazon Associates): apply for each one you want to use.

## 2. Secret keys to copy into Hostinger's environment variables

Never put these in the code or in GitHub. Values starting with `NEXT_PUBLIC_` are visible in the browser by design; the others must stay secret.

| Variable | Where it comes from | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your domain, e.g. `https://www.mondrecipes.com` | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon / publishable) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role / secret) | **Yes** |
| `RESEND_API_KEY` | Resend → API Keys | **Yes** |
| `EMAIL_FROM` | An address on your verified domain | No |
| `CONTACT_EMAIL` | Your inbox for contact messages | No |
| `CRON_SECRET` | Any long random text you make up (e.g. `openssl rand -hex 32`) | **Yes** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile (site key) | No |
| `NEXT_PUBLIC_GA_ID` | Google Analytics (`G-…`), optional | No |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense (`ca-pub-…`), only once approved | No |

The Turnstile **secret** key goes into Supabase (Authentication → Attack Protection), not into Hostinger.

## 3. Settings only you can change in each service

- [ ] **Supabase SQL Editor**: run the 8 migrations in order, then `seed.sql` (README, "Set up Supabase").
- [ ] **Supabase Authentication**: keep "Confirm email" on; set Site URL and Redirect URLs to your domain; update the two email templates; connect Resend as custom SMTP.
- [ ] **Supabase Storage**: raise the global file size limit to 100 MB.
- [ ] **Supabase Attack Protection**: turn on CAPTCHA with Turnstile **at the same time** as you set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] **Resend / Hostinger DNS**: add the DNS records Resend shows, and wait until the domain is verified.
- [ ] **Hostinger**: create the Node.js web app from GitHub, add the environment variables **before the first build**, connect the domain, turn on SSL.
- [ ] **Hostinger Cron Jobs**: add the weekly link check (README, "Weekly link check").
- [ ] **Make yourself Super Admin** with the SQL in the README, after registering and confirming your email on the live site.

## 4. Inside the Mònd Recipes admin (after you sign in)

- [ ] **Settings → Contact details and social media**: fill in the **Privacy officer** name, title and email. Quebec law requires these on the Privacy page; the dashboard reminds you until they're set.
- [ ] **Settings**: check the site name, tagline, contact email and mailing address.
- [ ] Remove sample recipes if you loaded them: `delete from public.recipes where is_sample;`
- [ ] Add real recipes, articles, products (with your own affiliate links) and photos you have the rights to.
- [ ] **SEO → Allow search engines to index the site**: turn on **only when you're ready to launch**. Until then every page tells search engines not to index it.
- [ ] *(When AdSense approves you)* **Advertising**: paste the ad unit IDs, switch placements on, and paste Google's line into the **ads.txt** editor.

## 5. Approvals and legal steps

- [ ] **Lawyer review** of the Privacy Policy, Terms of Service, Cookie Policy and Affiliate Disclosure (all marked "Draft for legal review").
- [ ] **French versions**: Quebec's Charter of the French language generally requires French to be available for a business's public-facing content and contracts (Terms, Privacy). Ask your lawyer what applies to you. The site is English only today.
- [ ] **Privacy impact assessment** for providers that store data outside Quebec (Supabase backups and email processing, Resend, Google, Cloudflare, Hostinger). Keep it on file.
- [ ] **Data processing agreements**: accept or sign the DPA each provider offers (Supabase, Resend, Google, Cloudflare, Hostinger).
- [ ] **Confidentiality incident register**: keep a simple log (date, what happened, who was affected, what you did). Quebec law requires one even if nothing happens.
- [ ] **AdSense approval**: Google decides; sample or thin content is usually refused.
- [ ] **Affiliate program approval**: each program decides, and some (Amazon) require a few sales within a set time.
- [ ] **European visitors**: if you target the EEA, UK or Switzerland with ads, add a Google-certified consent platform first.

## 6. Final checks on the live site

Run the [manual testing checklist](manual-testing.md) on the live domain with real accounts.
