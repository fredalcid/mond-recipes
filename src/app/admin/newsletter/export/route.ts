import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { csvCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** CSV of confirmed subscribers for super admins (for importing into an email tool). */
export async function GET() {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!db || !member?.emailVerified || !member.roles.includes("super_admin")) return new NextResponse("Not found", { status: 404 });

  const rows: string[] = ["email,consent_at,confirmed_at,source,consent_text"];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .select("email, consent_at, confirmed_at, source, consent_text")
      .eq("status", "confirmed")
      .order("id")
      .range(from, from + 999);
    if (error) return new NextResponse("Export failed", { status: 500 });
    for (const r of data ?? []) rows.push([r.email, r.consent_at, r.confirmed_at, r.source, r.consent_text].map(csvCell).join(","));
    if (!data || data.length < 1000) break;
  }
  const { data: user } = await db.auth.getUser();
  await db.from("admin_activity_log").insert({ actor_id: user.user?.id, action: "export", entity_type: "newsletter_subscribers", details: { rows: rows.length - 1 } });

  return new NextResponse(rows.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mond-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
