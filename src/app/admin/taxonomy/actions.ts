"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { tabByTable } from "./config";

const done = (tab: string, msg: string, q = "") => redirect(`/admin/taxonomy?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}&msg=${encodeURIComponent(msg)}`);

export async function saveTaxonomyItem(fd: FormData): Promise<void> {
  const tab = tabByTable(String(fd.get("table")));
  const q = String(fd.get("q") ?? "");
  if (!tab || !canEditContent(await getCurrentMember())) redirect("/admin");
  const db = (await createClient())!;
  const id = Number(fd.get("id")) || null;
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const slug = (String(fd.get("slug") ?? "").trim() || slugify(name)).slice(0, 80);
  if (name.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) done(tab!.key, "Not saved: add a name, and use lowercase letters, numbers and hyphens in the web address.", q);
  const row: Record<string, unknown> = { name, slug };
  for (const f of tab!.fields) {
    const v = fd.get(f.name);
    if (f.type === "checkbox") row[f.name] = v === "on";
    else if (f.type === "number") row[f.name] = v === null || String(v).trim() === "" ? (f.name === "display_order" ? 0 : null) : Number(v);
    else row[f.name] = String(v ?? "").trim().slice(0, 2000) || null;
  }
  if (tab!.key === "ingredients" && row.grams_per_cup !== null && !(Number(row.grams_per_cup) > 0 && Number(row.grams_per_cup) < 5000)) {
    done(tab!.key, "Not saved: grams per cup must be a positive number.", q);
  }
  const { error } = id ? await db.from(tab!.table).update(row).eq("id", id) : await db.from(tab!.table).insert(row);

  if (!error && tab!.key === "ingredients" && id) {
    const aliases = [
      ...new Set(
        String(fd.get("aliases") ?? "")
          .split(/[\n,]/)
          .map((a) => a.trim())
          .filter((a) => a.length >= 2 && a.length <= 80),
      ),
    ].slice(0, 30);
    await db.from("ingredient_aliases").delete().eq("ingredient_id", id);
    if (aliases.length) await db.from("ingredient_aliases").insert(aliases.map((alias) => ({ ingredient_id: id, alias })));
  }
  revalidatePath("/", "layout");
  done(tab!.key, error ? (/duplicate/.test(error.message) ? "Not saved: that name or web address is already used." : `Not saved: ${error.message}`) : `Saved “${name}”.`, q);
}

export async function deleteTaxonomyItem(fd: FormData): Promise<void> {
  const tab = tabByTable(String(fd.get("table")));
  const q = String(fd.get("q") ?? "");
  if (!tab || !canEditContent(await getCurrentMember())) redirect("/admin");
  const db = (await createClient())!;
  const { error } = await db.from(tab!.table).delete().eq("id", Number(fd.get("id")));
  revalidatePath("/", "layout");
  done(
    tab!.key,
    error ? (/foreign key|violates/.test(error.message) ? "Not deleted: it's still used. For ingredients, merge it into another one instead." : `Not deleted: ${error.message}`) : "Deleted.",
    q,
  );
}

export async function mergeIngredients(fd: FormData): Promise<void> {
  const q = String(fd.get("q") ?? "");
  if (!canEditContent(await getCurrentMember())) redirect("/admin");
  const db = (await createClient())!;
  const from = Number(fd.get("id"));
  const intoName = String(fd.get("into") ?? "").trim();
  const { data: into } = await db.from("ingredients").select("id, name").ilike("name", intoName).limit(1).maybeSingle();
  if (!into) done("ingredients", `Not merged: no ingredient called “${intoName}”.`, q);
  const { data: moved, error } = await db.rpc("merge_ingredients", { p_from: from, p_into: into!.id });
  revalidatePath("/", "layout");
  done("ingredients", error ? `Not merged: ${error.message}` : `Merged into “${into!.name}” (${moved} recipe${moved === 1 ? "" : "s"} updated).`, q);
}
