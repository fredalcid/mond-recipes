# Manual testing checklist

Run this on the **live site** (or a staging copy) once Supabase, Resend and Turnstile are set up. Use two test member accounts (A and B) and your Super Admin account. Use a private browser window for "visitor" checks.

Try each section on: **a computer** (Chrome, Firefox or Edge, and Safari on a Mac), **an iPhone** (Safari) and **an Android phone** (Chrome).

Write down anything that fails, with the page address and a screenshot.

## 1. First look

- [ ] Home, Recipes, Countries, Drinks & Tea, Articles, Videos, Shop, Community, About and Contact all open with no error.
- [ ] The logo and colours look right; nothing overlaps or runs off the screen on a phone.
- [ ] The menu opens and closes on a phone; every link works.
- [ ] Footer links (Privacy, Terms, Cookies, Affiliate Disclosure, Community Guidelines, Advertise) open.
- [ ] A made-up address (e.g. `/recipes/not-real`) shows the "page not found" page.

## 2. Recipes and search

- [ ] Search for a recipe by name and by an ingredient; results make sense and show a count.
- [ ] Filters (country, meal, cuisine, diet, time) narrow the results; clearing them brings everything back.
- [ ] On a recipe: change servings and check quantities change; switch metric/US; start cooking mode and step through; print preview looks clean.
- [ ] Share opens your phone's share sheet (or copies the link on a computer).

## 3. Accounts

- [ ] Join without ticking "14 or older": you get a clear message.
- [ ] Join with account A: the Turnstile check appears, the confirmation email arrives **from your domain**, and its link signs you in.
- [ ] Sign out and sign in again. Try a wrong password: clear message, no hint whether the email exists.
- [ ] "Forgot password": the email arrives and the new password works.
- [ ] Edit profile (name, username, picture, bio, country); the public profile shows the changes.
- [ ] **My data → Download my data** gives a file with your information and no one else's.

## 4. Community (accounts A and B)

- [ ] A saves a recipe; it appears in Saved.
- [ ] A comments on a recipe and leaves a review; B sees them; B replies and likes; A gets notifications.
- [ ] A posts a tip with a photo and a short video; it waits for moderation and isn't visible to B yet.
- [ ] As Super Admin, approve it in **Moderation**; B now sees it.
- [ ] B follows A; A sees the new follower.
- [ ] B reports A's post; it appears in Moderation → Reports.
- [ ] A blocks B; B can no longer comment on A's content or follow A.
- [ ] A submits a recipe; an editor reviews and publishes it; it's labelled as a member recipe (not "tested").
- [ ] Upload a file that isn't an image renamed to `.jpg`: refused with a clear message.

## 5. Admin (Super Admin, then a second account with only Editor or Moderator)

- [ ] The dashboard numbers match what you created. The privacy officer reminder disappears once you fill in Settings.
- [ ] Create, edit, publish and unpublish a recipe, article and video. Images upload and show.
- [ ] Add a country cuisine and featured recipes; they show on the country page.
- [ ] Give the second account the Editor role: it can edit content but can't open Members, Settings or Advertising. Then try Moderator.
- [ ] Every change appears in the **Audit log**.
- [ ] Suspend and restore a test member.

## 6. Shop and affiliate links

- [ ] Add a real product with your affiliate link and the retailer's tracking parameters.
- [ ] Click it from the Shop: it opens the retailer with your tracking tag in the address.
- [ ] In the affiliate program's own dashboard, check the click is counted (may take a day).
- [ ] The click appears in Admin → Shop statistics.
- [ ] Mark the product inactive: its old link now goes back to the Shop.
- [ ] Every product says it's an affiliate link; the Affiliate Disclosure page is linked.

## 7. Email

- [ ] Newsletter sign-up: the confirmation email arrives; the link confirms; the unsubscribe link in an email works.
- [ ] Contact form: the message reaches `CONTACT_EMAIL`, and replying goes to the sender.
- [ ] Check emails don't land in spam (Gmail, Outlook, iCloud).

## 8. Privacy and cookies

- [ ] In a new private window, the cookie banner appears (once Analytics or AdSense is set up) and nothing from Google loads before you accept. Check in the browser's developer tools → Network.
- [ ] Decline, then change your mind with **Cookie settings** in the footer.
- [ ] The Privacy page shows the privacy officer's name, title and email.
- [ ] Delete account A: its posts, comments and picture disappear, and it can't sign in.

## 9. Accessibility (quick manual checks)

- [ ] Use only the keyboard (Tab, Shift+Tab, Enter, Escape) to search, open a recipe, use the menu and submit a form. The focus outline is always visible.
- [ ] Turn on VoiceOver (iPhone/Mac) or TalkBack (Android) and read a recipe page: headings, buttons and images make sense.
- [ ] Zoom the browser to 200%: nothing is cut off.

## 10. Search engines (on launch day)

- [ ] Admin → SEO → turn on **Allow search engines to index the site**.
- [ ] `/robots.txt` now allows crawling and lists the sitemap; `/sitemap.xml` lists real pages only (no sample content).
- [ ] Add the site to Google Search Console and submit the sitemap.
- [ ] Test a recipe page with Google's Rich Results Test.

## 11. Advertising (after AdSense approval)

- [ ] Ads appear only in the placements you switched on, are labelled, and don't cover content on a phone.
- [ ] `/ads.txt` shows Google's line.
- [ ] No ads on account, admin, sign-in or legal pages.
