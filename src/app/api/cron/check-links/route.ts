import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Broken-link monitor for shop products. Call it on a schedule (e.g. a daily
 * Hostinger cron job) with:  Authorization: Bearer <CRON_SECRET>
 * Checks the 40 least-recently-checked products per run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16 || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "service key not configured" }, { status: 503 });

  const { data, error } = await db
    .from("products")
    .select("id, affiliate_url")
    .eq("is_active", true)
    .order("link_checked_at", { ascending: true, nullsFirst: true })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.all(
    (data ?? []).map(async (p) => {
      const status = await check(p.affiliate_url);
      const link_status = status === null ? "unknown" : status < 400 || status === 403 || status === 429 ? "ok" : "broken";
      await db.from("products").update({ link_status, link_http_status: status, link_checked_at: new Date().toISOString() }).eq("id", p.id);
      return { id: p.id, status, link_status };
    }),
  );
  return NextResponse.json({ checked: results.length, broken: results.filter((r) => r.link_status === "broken").length });
}

/** HTTP status of a URL, following redirects; null if unreachable. 403/429 usually mean bot protection, not a dead link. */
async function check(url: string): Promise<number | null> {
  const opts = { redirect: "follow" as const, signal: AbortSignal.timeout(10000), headers: { "user-agent": "MondRecipesLinkCheck/1.0" } };
  try {
    const head = await fetch(url, { ...opts, method: "HEAD" });
    if (head.status !== 405 && head.status !== 501) return head.status;
    const get = await fetch(url, { ...opts, method: "GET" });
    return get.status;
  } catch {
    return null;
  }
}
