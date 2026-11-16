import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getContent } from "@/lib/content";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|monitor|curl|wget|python|httpclient/i;

/**
 * Outbound affiliate link: records the click (no personal data) and sends the
 * visitor to the retailer with the retailer's tracking parameters.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const noIndex = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return NextResponse.redirect(new URL("/shop", request.url), { headers: noIndex });

  const link = await getContent().getProductLink(slug).catch(() => null);
  if (!link) return NextResponse.redirect(new URL("/shop", request.url), { headers: noIndex });

  const ua = request.headers.get("user-agent") ?? "";
  if (isSupabaseConfigured() && !BOT.test(ua) && request.headers.get("purpose") !== "prefetch") {
    const from = request.nextUrl.searchParams.get("from") ?? "";
    let referrerHost: string | null = null;
    try {
      referrerHost = new URL(request.headers.get("referer") ?? "").hostname || null;
    } catch {
      /* no referrer */
    }
    const db = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    await db
      .rpc("record_affiliate_click", { p_product_id: link.id, p_source_path: from.startsWith("/") ? from.slice(0, 200) : null, p_referrer_host: referrerHost })
      .then(({ error }) => error && console.error("click not recorded", error.message));
  }

  return NextResponse.redirect(link.url, { status: 302, headers: noIndex });
}
