import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Recipes" };

const STATUSES = ["draft", "pending", "published", "unpublished", "rejected"] as const;
type Props = { searchParams: Promise<{ status?: string; q?: string; kind?: string }> };

export default async function AdminRecipes({ searchParams }: Props) {
  const { status, q, kind } = await searchParams;
  const supabase = (await createClient())!;
  let query = supabase
    .from("recipes")
    .select("id, title, slug, kind, status, verification, is_sample, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (kind === "food" || kind === "drink") query = query.eq("kind", kind);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "").slice(0, 80)}%`);
  const { data, error } = await query;

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">Recipes</h1>
        <LinkButton href="/admin/recipes/new">New recipe</LinkButton>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3" aria-label="Filter recipes">
        <div className="flex flex-col gap-1">
          <label htmlFor="aq" className="text-sm font-semibold">
            Title
          </label>
          <input id="aq" name="q" defaultValue={q} className="min-h-11 rounded-xl border border-sand-strong bg-white px-3" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="as" className="text-sm font-semibold">
            Status
          </label>
          <select id="as" name="status" defaultValue={status ?? ""} className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ak" className="text-sm font-semibold">
            Type
          </label>
          <select id="ak" name="kind" defaultValue={kind ?? ""} className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
            <option value="">Food and drinks</option>
            <option value="food">Food</option>
            <option value="drink">Drinks</option>
          </select>
        </div>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Filter
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-8 text-danger">
          Couldn&apos;t load recipes: {error.message}
        </p>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-sand-strong bg-white p-8 text-ink-muted">No recipes match.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-card border border-sand-strong bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-sand/60 text-xs tracking-wide text-ink-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Title</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Review level</th>
                <th scope="col" className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {(data ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-ivory">
                  <td className="px-4 py-3">
                    <Link href={`/admin/recipes/${r.id}`} className="font-semibold text-forest-900 hover:underline">
                      {r.title}
                    </Link>
                    {r.is_sample && (
                      <span className="ml-2">
                        <Badge tone="sample">Sample</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.kind}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3">{r.verification.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
