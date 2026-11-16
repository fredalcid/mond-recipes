import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, Panel, TextArea, TextInput } from "@/components/admin/fields";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { parseSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { saveSeoSettings } from "../settings/actions";

export const metadata = { title: "SEO" };
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

export default async function SeoPage() {
  const member = await getCurrentMember();
  if (!canEditContent(member)) notFound();
  const superAdmin = member!.roles.includes("super_admin");
  const db = await createClient();
  if (!db) return null;
  const [{ data: settingsRows }, noDescription, noPhoto, hidden, thinCountries, articlesNoDescription] = await Promise.all([
    db.from("site_settings").select("key, value"),
    db.from("recipes").select("id, title").eq("status", "published").is("meta_description", null).is("summary", null).limit(50),
    db.from("recipes").select("id, title").eq("status", "published").is("hero_image_path", null).eq("is_sample", false).limit(50),
    db.from("recipes").select("id, title").eq("status", "published").eq("noindex", true).limit(50),
    db.from("countries").select("slug, name, intro, food_culture, hero_image_path").eq("is_indexable", true),
    db.from("articles").select("id, title").eq("status", "published").is("meta_description", null).is("excerpt", null).limit(50),
  ]);
  const s = parseSettings(settingsRows ?? []);
  const thin = ((thinCountries.data ?? []) as any[]).filter((c) => !c.intro || !c.food_culture || !c.hero_image_path);

  const checks: { title: string; rows: { label: string; href: string }[]; empty: string; help: string }[] = [
    {
      title: "Published recipes without a description",
      rows: ((noDescription.data ?? []) as any[]).map((r) => ({ label: r.title, href: `/admin/recipes/${r.id}` })),
      empty: "Every published recipe has a summary or search description.",
      help: "Search engines show this text under the title.",
    },
    {
      title: "Published recipes without a photo",
      rows: ((noPhoto.data ?? []) as any[]).map((r) => ({ label: r.title, href: `/admin/recipes/${r.id}` })),
      empty: "Every published recipe has a photo.",
      help: "Recipes with a photo appear in Google's recipe results and get shared more.",
    },
    {
      title: "Countries open to search engines but missing content",
      rows: thin.map((c) => ({ label: c.name, href: `/admin/countries/${c.slug}` })),
      empty: "Every indexed country has an introduction, food culture text and a photo.",
      help: "Thin pages can lower how Google ranks the whole site.",
    },
    {
      title: "Published articles without a description",
      rows: ((articlesNoDescription.data ?? []) as any[]).map((r) => ({ label: r.title, href: `/admin/articles/${r.id}` })),
      empty: "Every published article has a summary.",
      help: "",
    },
    {
      title: "Recipes hidden from search engines",
      rows: ((hidden.data ?? []) as any[]).map((r) => ({ label: r.title, href: `/admin/recipes/${r.id}` })),
      empty: "No published recipe is hidden.",
      help: "Check these are hidden on purpose.",
    },
  ];

  return (
    <Container className="max-w-5xl py-10">
      <AdminHeader title="SEO" />
      {!s.seo.allowIndexing && (
        <div className="mb-6">
          <FormMessage tone="info">The whole site is currently closed to search engines (robots.txt blocks everything and every page says “noindex”). Allow indexing when you launch.</FormMessage>
        </div>
      )}
      <div className="flex flex-col gap-8">
        {superAdmin ? (
          <AdminForm action={saveSeoSettings} submitLabel="Save SEO settings" multipart>
            <Panel title="Site-wide settings">
              <Checkbox name="allow_indexing" label="Allow search engines to index the site" defaultChecked={s.seo.allowIndexing} />
              <p className="-mt-2 text-xs text-ink-muted">
                Leave this off on staging copies and until real content is published. When on, robots.txt and the sitemap ({site.url}/sitemap.xml) are opened to search engines.
              </p>
              <TextInput name="default_title" label="Homepage title" defaultValue={s.seo.defaultTitle} maxLength={70} />
              <TextArea name="default_description" label="Default description" defaultValue={s.seo.defaultDescription} rows={2} maxLength={300} hint="Used by pages that don't have their own." />
              <div className="flex flex-col gap-2">
                <label htmlFor="f-og" className="text-sm font-semibold">
                  Default social sharing image
                </label>
                {s.seo.ogImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview
                  <img src={s.seo.ogImageUrl} alt="Current sharing image" className="h-24 rounded-lg border border-sand object-cover" />
                )}
                <input id="f-og" name="og_image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
                <p className="text-xs text-ink-muted">1200 × 630 pixels. Used when a page without its own image is shared on social media.</p>
                {s.seo.ogImageUrl && <Checkbox name="remove_og" label="Remove the default sharing image" />}
              </div>
            </Panel>
          </AdminForm>
        ) : (
          <p className="text-sm text-ink-muted">Site-wide SEO settings are managed by super admins. Each recipe, article, video and country has its own search title, description, canonical address and indexing setting.</p>
        )}

        <Panel title="Checks">
          <p className="text-sm text-ink-muted">Each recipe, article, video and country has its own search title, description, web address, canonical address and indexing setting in its editor.</p>
          {checks.map((c) => (
            <section key={c.title} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-forest-900">
                {c.title} <span className="text-ink-muted">({c.rows.length}{c.rows.length === 50 ? "+" : ""})</span>
              </h3>
              {c.help && <p className="text-xs text-ink-muted">{c.help}</p>}
              <Table head={["Page"]} empty={c.rows.length === 0 && c.empty}>
                {c.rows.map((r) => (
                  <tr key={r.href}>
                    <td className="px-4 py-2">
                      <Link href={r.href} className="text-forest-900 hover:underline">
                        {r.label}
                      </Link>
                    </td>
                  </tr>
                ))}
              </Table>
            </section>
          ))}
        </Panel>
      </div>
    </Container>
  );
}
