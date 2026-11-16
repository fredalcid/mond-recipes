import { getSiteSettings } from "@/lib/settings";

/** ads.txt lines from Admin → Advertising (required by Google AdSense once approved). */
export async function GET() {
  const { adsTxt } = await getSiteSettings();
  return new Response(adsTxt.trim() ? `${adsTxt.trim()}\n` : "# No advertising partners yet.\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
