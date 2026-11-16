/** Admin functions through PostgREST, the API Supabase uses (run by scripts/test-api.sh). */
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createClient as createSupabase } from "@supabase/supabase-js";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.JWT_SECRET ?? "test-secret-for-local-integration-only-0123456789";
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const EDITOR = "00000000-0000-0000-0000-00000000000e";
const MOD = "00000000-0000-0000-0000-00000000000f";
const MEMBER = "00000000-0000-0000-0000-00000000000b";

function jwt(sub: string | null): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = b64({ role: sub ? "authenticated" : "anon", ...(sub ? { sub } : {}), exp: Math.floor(Date.now() / 1000) + 3600 });
  const head = b64({ alg: "HS256", typ: "JWT" });
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
}
const as = (sub: string | null) =>
  createSupabase(URL_, jwt(sub), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${jwt(sub)}` } } });

describe("admin API", () => {
  it("gives staff real dashboard numbers and refuses members", async () => {
    const { data, error } = await as(MOD).rpc("admin_dashboard_stats");
    expect(error).toBeNull();
    const { count } = await as(ADMIN).from("recipes").select("*", { count: "exact", head: true }).eq("status", "published");
    expect((data as Record<string, number>).recipes_published).toBe(count);
    expect((await as(MEMBER).rpc("admin_dashboard_stats")).error).not.toBeNull();
    expect((await as(null).rpc("admin_dashboard_stats")).error).not.toBeNull();
  });

  it("returns one row per day for analytics", async () => {
    const { data, error } = await as(EDITOR).rpc("admin_activity_series", { p_days: 30 });
    expect(error).toBeNull();
    expect((data as unknown[]).length).toBe(30);
  });

  it("lets only super admins see account emails", async () => {
    const { data } = await as(ADMIN).rpc("admin_member_account", { p_member: MEMBER });
    expect((data as { email: string }[])[0].email).toBe("member@example.com");
    expect((await as(MOD).rpc("admin_member_account", { p_member: MEMBER })).error).not.toBeNull();
  });

  it("serves website settings to visitors and parses them", async () => {
    const { data, error } = await as(null).from("site_settings").select("key, value");
    expect(error).toBeNull();
    const { parseSettings } = await import("@/lib/settings");
    const s = parseSettings(data ?? []);
    expect(s.name).toBe("Mònd Recipes");
    expect(s.seo.allowIndexing).toBe(false);
  });

  it("lets super admins (only) write settings", async () => {
    const ok = await as(ADMIN).from("site_settings").upsert({ key: "footer.note", value: "Test note" }, { onConflict: "key" });
    expect(ok.error).toBeNull();
    await as(EDITOR).from("site_settings").update({ value: "Hacked" }).eq("key", "footer.note");
    const { data } = await as(null).from("site_settings").select("value").eq("key", "footer.note").single();
    expect(data!.value).toBe("Test note");
  });

  it("loads the country editor query and saves cuisines as an editor", async () => {
    const db = as(EDITOR);
    const { data: c, error } = await db
      .from("countries")
      .select("*, regions ( id, slug, name, description, display_order ), country_aliases ( alias ), country_cuisines ( cuisine_id ), country_featured_recipes ( recipe_id, position )")
      .eq("slug", "india")
      .single();
    expect(error).toBeNull();
    const { data: cu } = await db.from("cuisines").select("id").limit(1).single();
    await db.from("country_cuisines").delete().eq("country_id", c!.id);
    expect((await db.from("country_cuisines").insert({ country_id: c!.id, cuisine_id: cu!.id })).error).toBeNull();
    expect((await as(MEMBER).from("country_cuisines").insert({ country_id: c!.id, cuisine_id: cu!.id })).error).not.toBeNull();
  });

  it("loads the public country page with editors' picks and linked cuisines", async () => {
    const { supabaseSource } = await import("@/lib/data/supabase-source");
    const c = await supabaseSource.getCountry("india");
    expect(c).not.toBeNull();
    expect(Array.isArray(c!.featured)).toBe(true);
    expect(c!.cuisines.length).toBeGreaterThan(0);
  });

  it("reads the audit log as a super admin, with actor names", async () => {
    const { data, error } = await as(ADMIN).from("admin_activity_log").select("id, actor_id, action, entity_type, details").order("created_at", { ascending: false }).limit(20);
    expect(error).toBeNull();
    expect((data ?? []).some((e) => e.entity_type === "site_settings")).toBe(true);
    const mine = await as(EDITOR).from("admin_activity_log").select("actor_id");
    expect((mine.data ?? []).every((e) => e.actor_id === EDITOR)).toBe(true);
  });

  it("merges ingredients through the API", async () => {
    const db = as(EDITOR);
    const a = await db.from("ingredients").insert({ slug: "api-dup", name: "Api Dup" }).select("id").single();
    const b = await db.from("ingredients").insert({ slug: "api-keep", name: "Api Keep" }).select("id").single();
    const { error } = await db.rpc("merge_ingredients", { p_from: a.data!.id, p_into: b.data!.id });
    expect(error).toBeNull();
    const { data: alias } = await db.from("ingredient_aliases").select("alias").eq("ingredient_id", b.data!.id);
    expect(alias!.map((x) => x.alias)).toContain("Api Dup");
  });
});
