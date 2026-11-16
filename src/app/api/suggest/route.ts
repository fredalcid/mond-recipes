import { NextResponse, type NextRequest } from "next/server";
import { getData } from "@/lib/data";

/** Search suggestions as the visitor types. Public, read-only, cached briefly. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  try {
    const suggestions = await getData().suggest(q);
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
