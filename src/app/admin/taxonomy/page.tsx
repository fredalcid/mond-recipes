import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader } from "@/components/admin/AdminBits";
import { Checkbox, TextArea, TextInput } from "@/components/admin/fields";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { TABS, tabByKey, type TaxonomyField } from "./config";
import { deleteTaxonomyItem, mergeIngredients, saveTaxonomyItem } from "./actions";

export const metadata = { title: "Categories and ingredients" };
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Props = { searchParams: Promise<{ tab?: string; q?: string; msg?: string }> };
const btn = "min-h-10 rounded-full px-4 text-sm font-semibold";

function Field({ f, value }: { f: TaxonomyField; value: unknown }) {
  if (f.type === "checkbox") return <Checkbox name={f.name} label={f.label} defaultChecked={Boolean(value)} />;
  if (f.type === "textarea") return <TextArea name={f.name} label={f.label} defaultValue={(value as string) ?? ""} rows={2} />;
  return <TextInput name={f.name} label={f.label} type={f.type} defaultValue={(value as string | number | null) ?? ""} hint={f.hint} />;
}

export default async function TaxonomyPage({ searchParams }: Props) {
  if (!canEditContent(await getCurrentMember())) notFound();
  const sp = await searchParams;
  const tab = tabByKey(sp.tab);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const db = await createClient();
  if (!db) return null;
  const isIngredients = tab.key === "ingredients";

  let query = db.from(tab.table).select(isIngredients ? "*, ingredient_aliases ( alias )" : "*").order(tab.order).order("name");
  if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data } = await query.limit(isIngredients ? 200 : 500);
  const rows = (data ?? []) as any[];

  // How often each item is used, so editors know what a deletion affects.
  const usage = new Map<number, number>();
  if (tab.usage && rows.length) {
    const { data: links } = await db.from(tab.usage.table).select(tab.usage.column).in(tab.usage.column, rows.map((r) => r.id)).limit(20000);
    for (const l of (links ?? []) as any[]) usage.set(l[tab.usage.column], (usage.get(l[tab.usage.column]) ?? 0) + 1);
  }
  const hidden = (
    <>
      <input type="hidden" name="table" value={tab.table} />
      <input type="hidden" name="q" value={q} />
    </>
  );

  return (
    <Container className="max-w-5xl py-10">
      <AdminHeader title="Categories and ingredients" />
      <nav aria-label="Lists" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/taxonomy?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${t.key === tab.key ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {sp.msg && (
        <div className="mb-6">
          <FormMessage tone={/^Not /.test(sp.msg) ? "error" : "success"}>{sp.msg}</FormMessage>
        </div>
      )}
      {tab.note && <p className="mb-4 max-w-3xl text-sm text-ink-muted">{tab.note}</p>}

      <form className="mb-6 flex flex-wrap items-end gap-3" role="search">
        <input type="hidden" name="tab" value={tab.key} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Search {tab.label.toLowerCase()}</span>
          <input name="q" defaultValue={q} className="min-h-11 w-64 max-w-full rounded-xl border border-sand-strong px-3" />
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Search
        </button>
      </form>

      <section className="mb-8 rounded-card border border-dashed border-sand-strong bg-white p-5">
        <h2 className="mb-3 text-xl font-semibold text-forest-900">Add to {tab.label.toLowerCase()}</h2>
        <form action={saveTaxonomyItem} className="flex flex-col gap-3">
          {hidden}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput name="name" label="Name" required />
            <TextInput name="slug" label="Web address (optional)" hint="Made from the name if empty." />
          </div>
          {tab.fields.map((f) => (
            <Field key={f.name} f={f} value={f.type === "checkbox" ? false : ""} />
          ))}
          <button type="submit" className={`${btn} self-start bg-forest-900 text-cream`}>
            Add
          </button>
        </form>
      </section>

      {rows.length === 0 ? (
        <p className="text-ink-muted">Nothing here{q ? " matches your search" : " yet"}.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const used = usage.get(r.id) ?? 0;
            return (
              <li key={r.id}>
                <details className="rounded-xl border border-sand-strong bg-white">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
                    <span className="font-semibold text-forest-900">{r.name}</span>
                    <span className="text-sm text-ink-muted">/{r.slug}</span>
                    {tab.usage && (
                      <span className="ml-auto text-sm text-ink-muted">
                        {used} {tab.usage.noun}
                      </span>
                    )}
                  </summary>
                  <div className="flex flex-col gap-4 border-t border-sand p-4">
                    <form action={saveTaxonomyItem} className="flex flex-col gap-3">
                      {hidden}
                      <input type="hidden" name="id" value={r.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextInput name="name" label="Name" defaultValue={r.name} required />
                        <TextInput name="slug" label="Web address" defaultValue={r.slug} hint="Changing it changes page and filter links." />
                      </div>
                      {tab.fields.map((f) => (
                        <Field key={f.name} f={f} value={r[f.name]} />
                      ))}
                      {isIngredients && (
                        <TextArea
                          name="aliases"
                          label="Other names (for search)"
                          defaultValue={(r.ingredient_aliases ?? []).map((a: any) => a.alias).join("\n")}
                          rows={2}
                          hint="One per line, e.g. aubergine for eggplant."
                        />
                      )}
                      <button type="submit" className={`${btn} self-start bg-forest-900 text-cream`}>
                        Save
                      </button>
                    </form>
                    {isIngredients && (
                      <form action={mergeIngredients} className="flex flex-wrap items-end gap-3 rounded-xl bg-sand/50 p-3">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="q" value={q} />
                        <TextInput name="into" label={`Merge “${r.name}” into`} hint="Type the exact name of the ingredient to keep." required />
                        <button type="submit" className={`${btn} border border-forest-900 text-forest-900`}>
                          Merge
                        </button>
                      </form>
                    )}
                    <form action={deleteTaxonomyItem}>
                      {hidden}
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={`${btn} text-danger hover:bg-sand`} disabled={isIngredients && used > 0}>
                        Delete{used > 0 && !isIngredients ? ` (removes it from ${used} ${tab.usage?.noun})` : ""}
                      </button>
                      {isIngredients && used > 0 && <span className="ml-2 text-xs text-ink-muted">Used in recipes: merge it instead.</span>}
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {isIngredients && rows.length === 200 && <p className="mt-4 text-sm text-ink-muted">Showing the first 200. Search to find others.</p>}
    </Container>
  );
}
