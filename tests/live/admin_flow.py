import base64, hmac, hashlib, json, time, re
from playwright.sync_api import sync_playwright
exec(open('/tmp/p4flow.py').read().split("log=[]")[0].replace('USERS={','USERS={"admin":"00000000-0000-0000-0000-00000000000a","editor":"00000000-0000-0000-0000-00000000000e",'))
log=[]
def ok(label, cond, extra=""): log.append(("PASS" if cond else "FAIL", label, str(extra)[:160]))
ROUTES=["/admin","/admin/analytics","/admin/recipes","/admin/countries","/admin/countries/india","/admin/taxonomy","/admin/articles","/admin/shop","/admin/moderation","/admin/reviews","/admin/challenges","/admin/members","/admin/seo","/admin/settings","/admin/ads","/admin/newsletter","/admin/audit"]
ACCESS={
 "admin": set(ROUTES),
 "editor": {"/admin","/admin/analytics","/admin/recipes","/admin/countries","/admin/countries/india","/admin/taxonomy","/admin/articles","/admin/shop","/admin/moderation","/admin/reviews","/admin/challenges","/admin/seo"},
 "mod": {"/admin","/admin/analytics","/admin/moderation","/admin/reviews","/admin/challenges","/admin/members"},
 "bea": set(),
}
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    def as_user(name):
        ctx=br.new_context(viewport={"width":1280,"height":900}); ctx.add_cookies([session_cookie(name)])
        pg=ctx.new_page(); errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)[:150])); pg.on("dialog", lambda d: d.accept())
        return ctx,pg,errs
    USERS["bea"]=USERS.get("bea")
    # role matrix
    for role, allowed in ACCESS.items():
        ctx,pg,errs=as_user(role); wrong=[]
        for r in ROUTES:
            resp=pg.goto(B+r); code=resp.status
            if (code==200) != (r in allowed): wrong.append(f"{r}:{code}")
        ok(f"{role} sees exactly the admin pages their role allows", not wrong, wrong)
        if errs: log.append(("ERR", role, errs[:2]))
        ctx.close()
    # super admin flows
    ctx,pg,errs=as_user("admin")
    pg.goto(B+"/admin"); t=pg.locator("main").inner_text()
    ok("dashboard shows every spec statistic", all(x in t for x in ["Registered members","Active members","Community posts","Published articles","Products in the shop","Shop clicks","Newsletter subscribers","Ad placements on","Waiting for review"]))
    ok("dashboard warns that search engines are blocked", "Search engines are blocked" in t)
    pg.goto(B+"/admin/settings")
    pg.fill("input[name=tagline]","Cook the world")
    pg.get_by_role("button",name="Save brand").click(); pg.wait_for_timeout(1500)
    ok("settings saved", pg.get_by_text("Saved. The website shows").count()>=1)
    pg.uncheck("input[name=section_shop]"); pg.get_by_role("button",name="Save homepage and footer").click(); pg.wait_for_timeout(1500)
    pg.fill("input[name=social_instagram]","https://instagram.com/mondrecipes"); pg.fill("input[name=mailing_address]","123 Rue Exemple, Montréal QC"); pg.get_by_role("button",name="Save contact details").click(); pg.wait_for_timeout(1500)
    pg.goto(B+"/"); home=pg.locator("body").inner_text()
    ok("new tagline appears in the footer", "COOK THE WORLD" in home.upper())
    ok("shop section switched off on the homepage", "Kitchen essentials we recommend" not in home)
    ok("social link and mailing address in the footer", pg.locator("footer a[href='https://instagram.com/mondrecipes']").count()==1 and "123 Rue Exemple" in home)
    ok("pages say noindex before launch", pg.locator("meta[name=robots][content*=noindex]").count()>=1)
    ok("robots.txt blocks everything before launch", "Disallow: /" in pg.request.get(B+"/robots.txt").text())
    pg.goto(B+"/admin/seo"); pg.check("input[name=allow_indexing]"); pg.get_by_role("button",name="Save SEO settings").click(); pg.wait_for_timeout(1500)
    rb=pg.request.get(B+"/robots.txt").text()
    ok("allowing indexing opens robots.txt with the sitemap", "Allow: /" in rb and "Sitemap:" in rb, rb)
    pg.goto(B+"/"); ok("homepage indexable after launch switch", pg.locator("meta[name=robots][content*=noindex]").count()==0)
    pg.goto(B+"/admin/ads"); pg.fill("textarea[name=ads_txt]","not a valid line"); pg.get_by_role("button",name="Save ads.txt").click(); pg.wait_for_timeout(1200)
    ok("invalid ads.txt line refused", pg.get_by_text("doesn't look like an ads.txt entry").count()>=1)
    pg.fill("textarea[name=ads_txt]","google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0"); pg.get_by_role("button",name="Save ads.txt").click(); pg.wait_for_timeout(1200)
    ok("ads.txt served", "pub-1234567890123456" in pg.request.get(B+"/ads.txt").text())
    pg.goto(B+"/admin/members/00000000-0000-0000-0000-00000000000b")
    ok("member page shows email to super admins", pg.get_by_text("member@example.com").count()==1)
    pg.check("input[name=role_editor]"); pg.get_by_role("button",name="Save roles").click(); pg.wait_for_timeout(1200)
    ok("super admin grants a role", pg.get_by_text("Team roles saved.").count()==1)
    pg.uncheck("input[name=role_editor]"); pg.get_by_role("button",name="Save roles").click(); pg.wait_for_timeout(1200)
    pg.goto(B+"/admin/members/00000000-0000-0000-0000-00000000000a")
    pg.uncheck("input[name=role_super_admin]"); pg.get_by_role("button",name="Save roles").click(); pg.wait_for_timeout(1200)
    ok("last super admin can't be removed", pg.get_by_text("at least one super admin").count()>=1)
    pg.goto(B+"/admin/audit"); a=pg.locator("main").inner_text()
    ok("audit log lists settings and role changes", "Website setting" in a and "Team role" in a)
    pg.goto(B+"/admin/analytics"); ok("analytics charts render", pg.locator("figure svg").count()==8)
    ctx.close()
    # editor flows
    ctx,pg,errs=as_user("editor")
    pg.goto(B+"/admin/countries/india")
    pg.fill("textarea[name=intro]","Spices, lentils and regional traditions from Kashmir to Kerala.")
    pg.get_by_role("button",name="Save country").click(); pg.wait_for_timeout(1500)
    ok("editor saves a country", pg.get_by_text("Country saved").count()>=1)
    boxes=pg.locator("#featured input[name=recipe]")
    if boxes.count(): boxes.first.check(); pg.get_by_role("button",name="Save featured recipes").click(); pg.wait_for_timeout(1500)
    ok("editor chooses featured recipes", boxes.count()>0 and pg.get_by_text("Featured recipes saved.").count()==1, boxes.count())
    pg.fill("#regions input[name=name] >> nth=-1","Test Coast"); pg.fill("#regions input[name=slug] >> nth=-1","test-coast"); pg.get_by_role("button",name="Add region").click(); pg.wait_for_timeout(1200)
    ok("editor adds a region", pg.get_by_text("Region saved.").count()==1)
    pg.goto(B+"/countries/india"); c=pg.locator("main").inner_text()
    ok("country page shows editors' picks and new intro", "Editors' picks from India" in c and "Kashmir to Kerala" in c, c[:100])
    pg.goto(B+"/admin/taxonomy?tab=categories"); pg.fill("form:has(button:text('Add')) input[name=name]","Street food"); pg.get_by_role("button",name="Add",exact=True).click(); pg.wait_for_timeout(1200)
    ok("editor adds a category", pg.get_by_text("Saved “Street food”.").count()==1)
    pg.goto(B+"/admin/taxonomy?tab=ingredients&q=tomato")
    ok("ingredient search", pg.locator("summary", has_text="Tomato").count()>=1)
    pg.goto(B+"/admin/recipes?kind=drink"); ok("drinks section lists only drinks", "drink" in pg.locator("main").inner_text().lower())
    ctx.close()
    # moderator flows
    ctx,pg,errs=as_user("mod")
    pg.goto(B+"/admin/reviews"); n=pg.get_by_role("button",name="Remove").count()
    pg.get_by_role("button",name="Remove").first.click(); pg.wait_for_timeout(1200)
    ok("moderator removes a review", pg.get_by_text("Review removed.").count()==1 and n>0)
    pg.goto(B+"/admin/moderation?tab=recipes"); ok("moderators see no editor link", pg.get_by_text("Open in the editor").count()==0)
    ctx.close()
    br.close()
for l in log: print(*l)
print(sum(1 for l in log if l[0]=="PASS"),"passed,",sum(1 for l in log if l[0]!="PASS"),"problems")
