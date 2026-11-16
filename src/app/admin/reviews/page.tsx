import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { canModerate } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_COLUMNS, memberFromRow } from "@/lib/community/types";
import { formatDate } from "@/lib/format";
import { moderateItem } from "../moderation-actions";

export const metadata = { title: "Ratings and reviews" };
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Props = { searchParams: Promise<{ filter?: string; rating?: string; page?: string; done?: string; error?: string }> };
const FILTERS = [
  ["", "All visible"],
  ["reported", "Reported"],
  ["hidden", "Hidden after reports"],
  ["removed", "Removed"],
] as const;

export default async function ReviewsAdmin({ searchParams }: Props) {
  if (!canModerate(await getCurrentMember())) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 50;
  const db = await createClient();
  if (!db) return null;
  let q = db
    .from("recipe_reviews")
    .select(`id, rating, body, status, report_count, created_at, recipe:recipes ( title, slug, kind ), author:profiles!recipe_reviews_author_id_fkey ( ${MEMBER_COLUMNS} )`)
    .order("created_at", { ascending: false });
  q =
    sp.filter === "reported"
      ? q.eq("status", "reported")
      : sp.filter === "hidden"
        ? q.eq("status", "pending")
        : sp.filter === "removed"
          ? q.eq("status", "removed")
          : q.in("status", ["approved", "reported"]);
  if (/^[1-5]$/.test(sp.rating ?? "")) q = q.eq("rating", Number(sp.rating));
  const { data } = await q.range((page - 1) * size, page * size);
  const rows = ((data ?? []) as any[]).slice(0, size);
  const backTo = `/admin/reviews?${new URLSearchParams({ ...(sp.filter ? { filter: sp.filter } : {}), ...(sp.rating ? { rating: sp.rating } : {}) })}`;

  return (
    <Container className="py-10">
      <AdminHeader title="Ratings and reviews" />
      <p className="mb-4 max-w-3xl text-sm text-ink-muted">
        Reviews come only from members. Removing a review takes its rating out of the recipe&apos;s average straight away. Ratings can&apos;t be edited by the team.
      </p>
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <select name="filter" defaultValue={sp.filter ?? ""} aria-label="Show" className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
          {FILTERS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="rating" defaultValue={sp.rating ?? ""} aria-label="Stars" className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Show
        </button>
      </form>
      {sp.done && <div className="mb-4"><FormMessage tone="success">{sp.done === "remove" ? "Review removed." : "Review restored."}</FormMessage></div>}
      {sp.error && <div className="mb-4"><FormMessage tone="error">That didn&apos;t work.</FormMessage></div>}
      <Table head={["Recipe", "Member", "Rating", "Review", "Date", ""]} empty={rows.length === 0 && "No reviews here."}>
        {rows.map((r) => {
          const author = memberFromRow(r.author);
          const visible = r.status === "approved" || r.status === "reported";
          return (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-2">
                {r.recipe ? (
                  <Link href={`${r.recipe.kind === "drink" ? "/drinks-tea" : "/recipes"}/${r.recipe.slug}#reviews`} className="text-forest-900 hover:underline">
                    {r.recipe.title}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2">
                <Link href={`/admin/members/${author.id}`} className="text-forest-900 hover:underline">
                  {author.displayName}
                </Link>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">{"★".repeat(r.rating)}<span className="sr-only">{r.rating} of 5</span></td>
              <td className="max-w-md px-4 py-2">
                {r.body ?? <span className="text-ink-muted">No text</span>}
                {r.report_count > 0 && <span className="mt-1 block text-xs font-semibold text-danger">Reported {r.report_count}×</span>}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-ink-muted">{formatDate(r.created_at)}</td>
              <td className="px-4 py-2">
                <form action={moderateItem}>
                  <input type="hidden" name="type" value="review" />
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value={backTo} />
                  <button
                    type="submit"
                    name="action"
                    value={visible ? "remove" : "restore"}
                    className={`min-h-9 rounded-full px-3 text-sm font-semibold hover:bg-sand ${visible ? "text-danger" : "text-forest-900"}`}
                  >
                    {visible ? "Remove" : "Restore"}
                  </button>
                </form>
              </td>
            </tr>
          );
        })}
      </Table>
      <div className="mt-6 flex justify-between">
        {page > 1 ? <Link href={`${backTo}&page=${page - 1}`} className="font-semibold text-forest-900 underline">← Newer</Link> : <span />}
        {(data ?? []).length > size && <Link href={`${backTo}&page=${page + 1}`} className="font-semibold text-forest-900 underline">Older →</Link>}
      </div>
    </Container>
  );
}
