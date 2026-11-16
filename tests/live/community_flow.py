import base64, hmac, hashlib, json, time, sys
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; SECRET=b"test-secret-for-local-integration-only-0123456789"
USERS={"bea":"00000000-0000-0000-0000-00000000000b","other":"00000000-0000-0000-0000-00000000000c","mod":"00000000-0000-0000-0000-00000000000f"}
def b64(o): return base64.urlsafe_b64encode(json.dumps(o,separators=(",",":")).encode()).rstrip(b"=").decode()
def token(sub):
    h=b64({"alg":"HS256","typ":"JWT"}); p=b64({"sub":sub,"role":"authenticated","aud":"authenticated","exp":int(time.time())+86400})
    s=base64.urlsafe_b64encode(hmac.new(SECRET,f"{h}.{p}".encode(),hashlib.sha256).digest()).rstrip(b"=").decode()
    return f"{h}.{p}.{s}"
def session_cookie(name):
    sub=USERS[name]; t=token(sub)
    sess={"access_token":t,"refresh_token":"r","expires_at":int(time.time())+86400,"expires_in":86400,"token_type":"bearer",
          "user":{"id":sub,"aud":"authenticated","role":"authenticated","email":f"{name}@example.com","email_confirmed_at":"2026-11-01T00:00:00Z","user_metadata":{},"app_metadata":{}}}
    v="base64-"+base64.urlsafe_b64encode(json.dumps(sess).encode()).rstrip(b"=").decode()
    return {"name":"sb-localhost-auth-token","value":v,"domain":"localhost","path":"/"}
log=[]
def ok(label, cond, extra=""):
    log.append(("PASS" if cond else "FAIL", label, extra)); 
try:
  _ctx = sync_playwright()
except Exception: pass
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    def as_user(name):
        ctx=br.new_context(viewport={"width":1280,"height":900}); ctx.add_cookies([session_cookie(name)])
        pg=ctx.new_page(); errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)[:150]))
        pg.on("dialog", lambda d: d.accept())
        return ctx,pg,errs
    # --- Bea
    ctx,pg,errs=as_user("bea")
    pg.goto(B+"/account"); ok("Bea's account page", pg.locator("h1").inner_text()=="My account", pg.url)
    pg.goto(B+"/recipes/beas-dal"); pg.wait_for_timeout(1500)
    ok("author can't rate own recipe", pg.get_by_text("This is your recipe").count()==1)
    pg.fill("textarea[placeholder^=\"Share a tip, a question\"]", "Use red lentils for the creamiest result.")
    pg.get_by_role("button", name="Post comment").click(); pg.wait_for_timeout(1500)
    ok("Bea posts a comment", pg.get_by_text("Use red lentils for the creamiest result.").count()==1)
    pg.goto(B+"/account/profile"); pg.fill("textarea[name=bio]","I cook lentils every week."); pg.get_by_role("button",name="Save profile").click(); pg.wait_for_timeout(1500)
    ok("Bea saves her profile", pg.get_by_text("Profile saved.").count()==1, pg.locator("[role=alert]").all_inner_texts()[:2] if pg.locator("[role=alert]").count() else "")
    pg.goto(B+"/account/notifications"); pg.uncheck("input[name=likes]"); pg.get_by_role("button",name="Save settings").click(); pg.wait_for_timeout(1200)
    ok("Bea saves notification settings", pg.get_by_text("Notification settings saved.").count()==1)
    pg.goto(B+"/account/contributions"); ok("contributions page", "My contributions" in pg.locator("h1").inner_text())
    pg.goto(B+"/community?view=tips"); pg.locator("article a[href^='/community/posts/']").first.click(); pg.wait_for_url("**/community/posts/**"); pg.wait_for_timeout(1500)
    pg.get_by_role("button", name="Report").first.click(); pg.check("input[value=spam]"); pg.get_by_role("button",name="Send report").click(); pg.wait_for_timeout(1200)
    ok("Bea reports a tip", pg.get_by_text("Thank you. Our moderators will review it.").count()==1)
    ctx.close()
    # --- other member
    ctx,pg,errs2=as_user("other")
    pg.goto(B+"/recipes/beas-dal"); pg.wait_for_timeout(1500)
    ok("existing review shown as editable for its author", pg.get_by_text("You rated this").count()==1)
    pg.get_by_role("button",name="Edit your review").click()
    pg.locator("label:has(input[value='4'])").first.click(); pg.get_by_role("button",name="Update review").click(); pg.wait_for_timeout(1500)
    ok("other updates the review to 4 stars", pg.get_by_text("4.0").count()>=1, pg.locator("#reviews").inner_text()[:200])
    if pg.get_by_role("button", name="Reply").count()==0:
        for l in log: print(*l)
        print(pg.locator("#comments").inner_text()[:800]); pg.screenshot(path="/tmp/p4dbg.png", full_page=True); raise SystemExit(1)
    pg.get_by_role("button", name="Reply").first.click(); pg.fill("textarea[placeholder='Write a reply…']", "Great tip, thanks!"); pg.get_by_role("button",name="Reply",exact=True).last.click(); pg.wait_for_timeout(1500)
    ok("other replies to Bea's comment", pg.get_by_text("Great tip, thanks!").count()==1)
    like=pg.locator("#comments button[aria-pressed]").first; like.click(); pg.wait_for_timeout(1000)
    ok("other likes the comment", like.get_attribute("aria-pressed")=="true")
    bea_user=pg.evaluate("fetch('http://localhost:3301/rest/v1/profiles?id=eq.00000000-0000-0000-0000-00000000000b&select=username').then(r=>r.json()).then(j=>j[0].username)")
    pg.goto(B+f"/members/{bea_user}"); pg.wait_for_timeout(1500)
    pg.get_by_role("button", name="Follow Bea Member").click(); pg.wait_for_timeout(1500)
    ok("other follows Bea", pg.get_by_role("button", name="Unfollow Bea Member").count()==1)
    pg.goto(B+"/community/new?kind=tip"); pg.wait_for_timeout(800)
    pg.fill("textarea", "Rinse rice until the water runs clear for fluffier grains.")
    pg.get_by_role("button", name="Send for review").click(); pg.wait_for_timeout(2500)
    ok("rate limit explained to a member who posted 10 times this hour", pg.get_by_text("You're doing that too often").count()==1, " ".join(pg.locator("[role=alert]").all_inner_texts())[:150])
    ctx.close()
    # --- Bea sees notifications
    ctx,pg,errs3=as_user("bea")
    pg.goto(B+"/notifications"); txt=pg.locator("main").inner_text()
    ok("Bea notified of follow", "started following you" in txt)
    ok("Bea notified of reply", "replied to your comment" in txt)
    ok("Bea NOT notified of likes (turned off)", "liked your comment" not in txt)
    bell=pg.locator("a[href='/notifications'][aria-label^='Notifications']").first.get_attribute("aria-label")
    ok("header bell shows unread count", "unread" in (bell or ""), bell)
    pg.get_by_role("button",name="Mark all as read").click(); pg.wait_for_timeout(1000)
    ok("mark all as read", pg.get_by_role("button",name="Mark all as read").count()==0)
    pg.goto(B+"/community/new?kind=tip"); pg.wait_for_timeout(800)
    pg.fill("textarea", "Rinse rice until the water runs clear for fluffier grains.")
    pg.get_by_role("button", name="Send for review").click(); pg.wait_for_url("**/account/contributions**", timeout=10000)
    ok("Bea posts a tip for review", "sent=post" in pg.url)
    ok("new tip listed as waiting for review", pg.get_by_text("Waiting for review").count()>=1)
    pg.goto(B+"/submit/recipe"); pg.wait_for_timeout(800)
    pg.fill("input[name=title], #recipe-title, input[id$='-title']", "Bea's Masoor Soup")
    ok("member recipe form hides web address & publishing", pg.get_by_text("Search engines").count()==0 and pg.get_by_text("Publishing").count()==0)
    pg.get_by_role("button", name="Save draft").click(); pg.wait_for_timeout(2500)
    ok("member saves a recipe draft", "/submit/recipe/" in pg.url and "saved=1" in pg.url, pg.url + " | " + " ".join(pg.locator("[role=alert]").all_inner_texts())[:200])
    ctx.close()
    # --- moderator
    ctx,pg,errs4=as_user("mod")
    pg.goto(B+"/admin/moderation?tab=posts"); pg.wait_for_timeout(500)
    ok("moderation queue lists the new tip", pg.get_by_text("Rinse rice until the water runs clear").count()==1)
    card=pg.locator("li", has_text="Rinse rice until the water runs clear").first
    card.get_by_role("button",name="Approve").click(); pg.wait_for_load_state(); pg.wait_for_timeout(800)
    ok("moderator approves the tip", pg.get_by_text("Approved. The author has been notified.").count()==1)
    pg.goto(B+"/admin/moderation?tab=reports")
    ok("report appears for moderators", pg.get_by_text("Spam or advertising").count()>=1)
    pg.get_by_role("button",name="Keep it (close reports)").first.click(); pg.wait_for_timeout(800)
    ok("moderator closes the report", pg.get_by_text("Restored and the reports were closed.").count()==1)
    pg.goto(B+"/admin/members?q=other")
    pg.locator("summary", has_text="Suspend").first.click(); pg.fill("input[name=reason]","Test suspension"); pg.get_by_role("button",name="Suspend account").click(); pg.wait_for_timeout(800)
    ok("moderator suspends a member", pg.get_by_text("Member suspended and notified.").count()==1)
    pg.get_by_role("button",name="Restore").click(); pg.wait_for_timeout(800)
    ok("moderator restores the member", pg.get_by_text("Member restored.").count()==1)
    pg.goto(B+"/admin/challenges"); ok("challenges admin", pg.get_by_text("Soup Week").count()>=1)
    ctx.close()
    for e in errs+errs2+errs3+errs4: log.append(("ERR","page error",e))
    br.close()
for l in log: print(*l)
print(sum(1 for l in log if l[0]=="PASS"), "passed,", sum(1 for l in log if l[0]!="PASS"), "problems")
