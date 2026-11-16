import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ entity?: string; action?: string; actor?: string; page?: string }> };
type Entry = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown> | null; created_at: string };

const ENTITY_LABEL: Record<string, string> = {
  recipe: "Recipe",
  recipes: "Recipe",
  article: "Article",
  video: "Video",
  product: "Product",
  products: "Product",
  post: "Community post",
  comment: "Comment",
  review: "Review",
  profile: "Member",
  report: "Report",
  user_roles: "Team role",
  site_settings: "Website setting",
  ad_placement: "Ad placement",
  newsletter_subscribers: "Newsletter",
  countries: "Country",
  regions: "Region",
  cuisines: "Cuisine",
  country_cuisines: "Country cuisines",
  country_featured_recipes: "Country featured recipes",
  ingredients: "Ingredient",
  ingredient_aliases: "Ingredient alias",
  categories: "Recipe category",
  drink_categories: "Drink category",
  dietary_tags: "Diet",
  allergens: "Allergen",
  article_categories: "Article topic",
  product_categories: "Product category",
  retailers: "Retailer",
  challenges: "Challenge",
  blocks: "Member block",
};

/** Describes an entry in plain words, without dumping raw data. */
function summary(e: Entry): string {
  const d = e.details ?? {};
  const parts: string[] = [];
  if (typeof d.label === "string") parts.push(d.label);
  if (typeof d.title === "string") parts.push(d.title);
  if (typeof d.name === "string") parts.push(d.name);
  if (typeof d.status === "string") parts.push(`status: ${d.status}`);
  if (Array.isArray(d.changed) && d.changed.length) parts.push(`changed: ${(d.changed as string[]).map((c) => c.replace(/_/g, " ")).join(", ")}`);
  if (typeof d.note === "string" && d.note) parts.push(`note: “${d.note}”`);
  if (typeof d.reason === "string" && d.reason) parts.push(`reason: “${d.reason}”`);
  if (typeof d.merged === "string") parts.push(`merged “${d.merged}” (${d.recipes_moved ?? 0} recipes moved)`);
  if (typeof d.rows === "number") parts.push(`${d.rows} rows`);
  return parts.join(" · ");
}

export default async function AuditPage({ searchParams }: Props) {
  const member = await getCurrentMember();
  if (!member?.roles.includes("super_admin")) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 100;
  const db = (await createClient())!;

  let q = db.from("admin_activity_log").select("id, actor_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false });
  if (sp.entity && /^[a-z_]+$/.test(sp.entity)) q = q.eq("entity_type", sp.entity);
  if (sp.action && /^[a-z_]+$/.test(sp.action)) q = q.eq("action", sp.action);
  if (sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor)) q = q.eq("actor_id", sp.actor);
  const { data } = await q.range((page - 1) * size, page * size);
  const rows = ((data ?? []) as Entry[]).slice(0, size);
  const hasMore = (data ?? []).length > size;

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = actorIds.length ? await db.from("profiles").select("id, display_name, username").in("id", actorIds) : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p]));
  const qs = (extra: Record<string, string>) => `/admin/audit?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page")), ...extra })}`;

  return (
    <Container className="py-10">
      <AdminHeader title="Audit log" />
      <p className="mb-6 max-w-3xl text-sm text-ink-muted">
        Every change made by the team: publishing, moderation, roles, settings, countries, categories and more. Entries can&apos;t be edited or deleted,
        not even by super admins.
      </p>
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">What</span>
          <select name="entity" defaultValue={sp.entity ?? ""} className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
            <option value="">Everything</option>
            {Object.entries(ENTITY_LABEL)
              .filter(([k], i, all) => all.findIndex(([, v]) => v === ENTITY_LABEL[k]) === i)
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Action</span>
          <input name="action" defaultValue={sp.action ?? ""} placeholder="e.g. update, delete" className="min-h-11 w-44 rounded-xl border border-sand-strong px-3" />
        </label>
        {sp.actor && <input type="hidden" name="actor" value={sp.actor} />}
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Filter
        </button>
        {(sp.entity || sp.action || sp.actor) && (
          <Link href="/admin/audit" className="min-h-11 content-center px-2 text-sm font-semibold underline">
            Clear filters
          </Link>
        )}
      </form>
      <Table head={["When", "Who", "Action", "What", "Details"]} empty={rows.length === 0 && "No entries match."}>
        {rows.map((e) => {
          const who = e.actor_id ? names.get(e.actor_id) : null;
          return (
            <tr key={e.id} className="align-top">
              <td className="px-4 py-2 whitespace-nowrap text-ink-muted">
                {new Date(e.created_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
              </td>
              <td className="px-4 py-2">
                {who ? (
                  <Link href={qs({ actor: e.actor_id! })} className="text-forest-900 hover:underline">
                    {who.display_name}
                  </Link>
                ) : (
                  <span className="text-ink-muted">{e.actor_id ? "Former team member" : "System"}</span>
                )}
              </td>
              <td className="px-4 py-2 capitalize">{e.action.replace(/_/g, " ")}</td>
              <td className="px-4 py-2">{ENTITY_LABEL[e.entity_type] ?? e.entity_type}</td>
              <td className="max-w-md px-4 py-2 text-ink-muted">{summary(e)}</td>
            </tr>
          );
        })}
      </Table>
      <div className="mt-6 flex justify-between">
        {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="font-semibold text-forest-900 underline">← Newer</Link> : <span />}
        {hasMore && <Link href={qs({ page: String(page + 1) })} className="font-semibold text-forest-900 underline">Older →</Link>}
      </div>
    </Container>
  );
}
