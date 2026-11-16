# Phase 4 report: community

## Built

| Area | What's included |
|---|---|
| Profiles | `/members/<username>`: picture, bio, country, followers/following, recipes, photos, videos, tips, optional public favourites. Usernames are created automatically and can be changed |
| Social | Follow, block (hides their content, stops them following or replying to you), report (9 reasons, private to moderators) |
| Posts | Photos (up to 6, 8 MB each), videos (upload up to 100 MB, or a YouTube link), cooking tips; optional link to a recipe ("I made this") or a challenge. Files go straight from the browser to Supabase Storage |
| Comments | On recipes and posts, one level of replies, edit, delete, like, report |
| Reviews | 1–5 stars with optional text; one per member per recipe; recipe ratings calculated by the database from real reviews only; authors can't rate their own recipes |
| Member recipes | `/submit/recipe` with the recipe editor in member mode: save drafts, send for review, edit while waiting or after changes are requested |
| Challenges | Created by staff; members enter while a challenge is open |
| Notifications | Follows, likes, comments, replies, reviews, review decisions (with the moderator's note), new posts and recipes from people you follow; per-type settings; bell with unread count |
| Account | Overview, profile editing, my contributions with statuses, saved recipes, blocked members, notification settings, delete account (removes everything the member shared, including files) |
| Moderation | Queues for member recipes and posts, grouped reports, approve / ask for changes / decline / remove / restore, dismiss reports; members admin (suspend with a reason, restore, feature); challenges admin. Every decision is logged |
| Spam protection | Cloudflare Turnstile on sign-up, sign-in and password reset (verified by Supabase); per-member limits enforced in the database |
| Pages | `/community` (latest, popular, photos, videos, tips, challenges, featured cooks, recently shared recipes), post pages, challenge pages, Community Guidelines (draft) |

## Moderation rules (enforced in the database)

- New recipes and posts are saved as "waiting for review"; members can't approve or publish their own.
- Comments and reviews appear at once. A report flags them; after three separate reports the item is hidden until a moderator decides.
- Suspended members can't post, comment, like, follow or review, and their content is hidden.
- Counters and ratings are maintained by the database from real rows.

## Tested

- **Database:** 206 checks pass, 86 of them new for the community (permissions, moderation, blocking, reporting thresholds, suspension, ratings, notifications and preferences, rate limits, member recipe submission, account deletion clean-up).
- **API integration:** 18 checks run the site's own community queries through PostgREST, the API Supabase uses, against the test database.
- **Signed-in click-through:** 29 browser checks as two members and a moderator: comment, reply, like, review, follow, report, notification settings, posting a tip for review, rate-limit message, saving a recipe draft, approving from the queue, closing a report, suspending and restoring a member. Sign-in was simulated with signed test tokens, because Supabase's sign-in service isn't available here.
- **Unit tests:** 86 pass. Type check, lint and production build are clean. No horizontal overflow at 390 px or 1440 px on the new pages, and no console errors.

## Fixed along the way

- Photo uploads through the admin would have failed above 1 MB (Next.js's default limit for form uploads). The limit is now 9 MB to fit the 8 MB photo maximum.
- `auth.uid()` in the test database now works the same way as Supabase's.

## Not tested with live services

- Real Supabase sign-in, Storage uploads (photos, videos, avatars), Turnstile, and account deletion (needs the service key). The code follows the services' documented APIs.

## Before launch

- Set the Storage file size limit (100 MB needs the Pro plan; the free plan stops at 50 MB).
- Turn on Turnstile in Supabase and on the site at the same time.
- Have the Community Guidelines reviewed with the other legal pages.
- Decide who moderates, and how quickly, since posts and recipes wait for review.
