# Phase 1 report — Foundation and Design

Date: 16 November 2026

## Automated test results

| Check | Result |
|---|---|
| TypeScript (`npm run typecheck`) | Passed, 0 errors |
| Lint (`npm run lint`) | Passed, 0 errors, 0 warnings |
| Unit tests (`npm test`) | 11 of 11 passed |
| Production build (`npm run build`) | Passed |
| Database security tests (`npm run test:db`) | 40 of 40 passed on PostgreSQL 16 |
| Page responses | `/` 200, `/join` 200, `/recipes?q=…` 200, `/account` redirects signed-out visitors to sign-in, unknown page 404 |
| Layout | No horizontal overflow at 1440 px desktop or 390 px mobile |

The database tests ran against PostgreSQL 16 with small stand-ins for Supabase's `auth` schema and roles. They should be run again on the real Supabase project once it exists.

### Security tests that passed

- A profile is created automatically for every new account
- Visitors can read reference data but can't change it
- Visitors can't see newsletter subscribers; duplicate sign-ups merge and stay pending
- Invalid emails and sign-ups without consent are rejected
- Unconfirmed members can't submit recipes
- Members can create their own drafts and submit them for review
- Members can't publish, verify, approve or set ratings on their own recipes
- Members can't post as someone else, promote themselves, lift a suspension, edit another profile, or write to the audit log
- Pending recipes (and their steps) are hidden from other members
- Editors can publish; the original version is kept when a recipe is edited
- Authors can't change a recipe after it's published
- Editors can't grant roles or see subscribers
- Accent-insensitive and typo-tolerant search works
- Super admins can grant roles and read subscribers and the audit log
- Audit log entries can't be edited or deleted

## Manual testing checklist (once Supabase and Hostinger are connected)

- [ ] Homepage loads on desktop, tablet and phone; mobile menu opens, closes with Esc, and closes after choosing a page
- [ ] Tab through the header: "Skip to content" appears first, focus outlines are visible
- [ ] Join with a weak password → clear error; with a strong password → "check your email" message
- [ ] Confirmation email arrives from your own domain; the link opens My account with "Your email is confirmed"
- [ ] Sign in before confirming → "Please confirm your email first"
- [ ] Wrong password → generic error that doesn't reveal whether the email exists
- [ ] Forgot password → email arrives → choose new password → "Your password has been changed"
- [ ] Visit `/account` signed out → sent to sign-in, then back to the account page after signing in
- [ ] Sign out from the header menu and from the account page
- [ ] Newsletter: empty submit shows both errors; valid sign-up shows the confirmation message; the row appears as *pending* in Supabase
- [ ] Make yourself Super Admin (README step 8) → the account page shows the role badge

## Not yet done (planned)

See "Known limitations" in the README.
