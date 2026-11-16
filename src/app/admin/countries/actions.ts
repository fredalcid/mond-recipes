"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { checkImageFile } from "@/lib/admin-schema";
import { fieldErrors } from "@/lib/validation";
import type { AdminFormState } from "@/components/admin/AdminForm";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg" };
const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const bool = z
  .string()
  .optional()
  .transform((v) => v === "on");
const httpsOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full https:// address, or leave it empty.")
  .transform((v) => v || null);
const NOT_ALLOWED: AdminFormState = { status: "error", message: "Only editors and super admins can change countries." };

async function editor(): Promise<SupabaseClient | null> {
  return canEditContent(await getCurrentMember()) ? createClient() : null;
}

/** Uploads an image to the public recipe-images bucket. Flags may also be SVG. */
async function upload(db: SupabaseClient, fd: FormData, field: string, folder: string, slug: string, allowSvg = false) {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return { path: null as string | null };
  if (allowSvg && file.type === "image/svg+xml") {
    if (file.size > 200 * 1024) return { path: null, error: "Flag SVGs must be under 200 KB." };
    // SVGs can carry scripts; only plain drawings are accepted.
    const text = await file.text();
    if (/<script|on\w+\s*=|javascript:|<foreignObject/i.test(text)) return { path: null, error: "This SVG contains scripts or links and can't be used." };
  } else {
    const problem = await checkImageFile(file);
    if (problem) return { path: null, error: problem };
  }
  const path = `${folder}/${slug}-${randomUUID().slice(0, 8)}.${EXT[file.type]}`;
  const { error } = await db.storage.from("recipe-images").upload(path, file, { contentType: file.type });
  return error ? { path: null, error: `Upload failed: ${error.message}` } : { path };
}

const countrySchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Add a name.").max(80),
  intro: opt(600),
  food_culture: opt(8000),
  is_featured: bool,
  is_indexable: bool,
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
  seo_title: opt(70),
  meta_description: opt(300),
  canonical_url: httpsOrEmpty,
  remove_hero: bool,
  remove_flag: bool,
  remove_og: bool,
});

export async function saveCountry(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = countrySchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, remove_hero, remove_flag, remove_og, ...row } = parsed.data;
  const slug = String(fd.get("slug"));
  const [hero, flag, og] = await Promise.all([
    upload(db, fd, "hero", "countries", slug),
    upload(db, fd, "flag", "flags", slug, true),
    upload(db, fd, "og", "social", slug),
  ]);
  const err = hero.error ?? flag.error ?? og.error;
  if (err) return { status: "error", message: err };
  const update: Record<string, unknown> = { ...row };
  if (hero.path) update.hero_image_path = hero.path;
  else if (remove_hero) update.hero_image_path = null;
  if (flag.path) update.flag_path = flag.path;
  else if (remove_flag) update.flag_path = null;
  if (og.path) update.og_image_path = og.path;
  else if (remove_og) update.og_image_path = null;
  const { error } = await db.from("countries").update(update).eq("id", id);
  if (error) return { status: "error", message: error.message };
  revalidatePath(`/countries/${slug}`);
  revalidatePath("/countries");
  return { status: "success", message: "Country saved. The public page updates within a few minutes." };
}

export async function addCountry(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      iso2: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/, "Two letters, e.g. CA"),
      slug: z.string().trim().regex(SLUG, "Lowercase letters, numbers and hyphens."),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { error } = await db.from("countries").insert(parsed.data);
  if (error) return { status: "error", message: /duplicate key/.test(error.message) ? "A country with this code or web address already exists." : error.message };
  redirect(`/admin/countries/${parsed.data.slug}`);
}

const back = (slug: string, part: string, msg: string) => redirect(`/admin/countries/${slug}?saved=${encodeURIComponent(msg)}#${part}`);

export async function saveRegion(fd: FormData): Promise<void> {
  const db = await editor();
  const countrySlug = String(fd.get("country_slug"));
  if (!db) redirect("/admin");
  const parsed = z
    .object({
      id: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
      country_id: z.coerce.number().int().positive(),
      name: z.string().trim().min(2).max(80),
      slug: z.string().trim().regex(SLUG),
      description: opt(2000),
      display_order: z.coerce.number().int().min(0).max(999).default(0),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) back(countrySlug, "regions", "Region not saved: check the name and the web address (lowercase, hyphens).");
  const { id, ...row } = parsed.data!;
  const { error } = id ? await db!.from("regions").update(row).eq("id", id) : await db!.from("regions").insert(row);
  revalidatePath(`/countries/${countrySlug}`, "layout");
  back(countrySlug, "regions", error ? (/duplicate/.test(error.message) ? "Another region already uses that web address." : "Region not saved.") : "Region saved.");
}

export async function deleteRegion(fd: FormData): Promise<void> {
  const db = await editor();
  const countrySlug = String(fd.get("country_slug"));
  if (db) await db.from("regions").delete().eq("id", Number(fd.get("id")));
  revalidatePath(`/countries/${countrySlug}`, "layout");
  back(countrySlug, "regions", "Region deleted.");
}

export async function saveAliases(fd: FormData): Promise<void> {
  const db = await editor();
  const countrySlug = String(fd.get("country_slug"));
  const countryId = Number(fd.get("country_id"));
  if (!db) redirect("/admin");
  const aliases = [
    ...new Set(
      String(fd.get("aliases") ?? "")
        .split(/[\n,]/)
        .map((a) => a.trim())
        .filter((a) => a.length >= 2 && a.length <= 80),
    ),
  ].slice(0, 20);
  await db!.from("country_aliases").delete().eq("country_id", countryId);
  if (aliases.length) await db!.from("country_aliases").insert(aliases.map((alias) => ({ country_id: countryId, alias })));
  revalidatePath(`/countries/${countrySlug}`);
  back(countrySlug, "aliases", "Other names saved.");
}

export async function saveCountryCuisines(fd: FormData): Promise<void> {
  const db = await editor();
  const countrySlug = String(fd.get("country_slug"));
  const countryId = Number(fd.get("country_id"));
  if (!db) redirect("/admin");
  const ids = fd
    .getAll("cuisine")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  await db!.from("country_cuisines").delete().eq("country_id", countryId);
  if (ids.length) await db!.from("country_cuisines").insert(ids.map((cuisine_id) => ({ country_id: countryId, cuisine_id })));
  revalidatePath(`/countries/${countrySlug}`);
  back(countrySlug, "cuisines", "Cuisines saved.");
}

export async function saveFeaturedRecipes(fd: FormData): Promise<void> {
  const db = await editor();
  const countrySlug = String(fd.get("country_slug"));
  const countryId = Number(fd.get("country_id"));
  if (!db) redirect("/admin");
  const ids = fd
    .getAll("recipe")
    .map(String)
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v))
    .slice(0, 12);
  await db!.from("country_featured_recipes").delete().eq("country_id", countryId);
  if (ids.length) await db!.from("country_featured_recipes").insert(ids.map((recipe_id, i) => ({ country_id: countryId, recipe_id, position: i + 1 })));
  revalidatePath(`/countries/${countrySlug}`);
  back(countrySlug, "featured", "Featured recipes saved.");
}
