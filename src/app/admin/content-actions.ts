"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { checkImageFile } from "@/lib/admin-schema";
import { articleSchema, formToObject, placementSchema, productSchema, retailerSchema, videoSchema } from "@/lib/admin-content-schema";
import { fieldErrors } from "@/lib/validation";
import type { AdminFormState } from "@/components/admin/AdminForm";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

async function editor(): Promise<SupabaseClient | null> {
  const m = await getCurrentMember();
  if (!canEditContent(m)) return null;
  return createClient();
}

async function superAdmin(): Promise<SupabaseClient | null> {
  const m = await getCurrentMember();
  if (!m?.emailVerified || !m.roles.includes("super_admin")) return null;
  return createClient();
}

/** Uploads an optional image to the media bucket. Returns a path, null (no file) or an error message. */
async function upload(db: SupabaseClient, fd: FormData, field: string, folder: string, slug: string): Promise<{ path: string | null; error?: string }> {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return { path: null };
  const problem = await checkImageFile(file);
  if (problem) return { path: null, error: problem };
  const path = `${folder}/${slug}-${randomUUID().slice(0, 8)}.${EXT[file.type]}`;
  const { error } = await db.storage.from("media").upload(path, file, { contentType: file.type });
  return error ? { path: null, error: `Upload failed: ${error.message}` } : { path };
}

async function log(db: SupabaseClient, action: string, entity: string, id: string, details: Record<string, unknown>) {
  const { data } = await db.auth.getUser();
  await db.from("admin_activity_log").insert({ actor_id: data.user?.id, action, entity_type: entity, entity_id: id, details });
}

const dup = (msg: string) => /duplicate key/i.test(msg);
const NOT_ALLOWED: AdminFormState = { status: "error", message: "You don't have permission to do this." };

// ---------------------------------------------------------------- articles
export async function saveArticle(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = articleSchema.safeParse(formToObject(fd, ["categories", "recipes"]));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, categories, recipes, remove_image, ...fields } = parsed.data;
  const img = await upload(db, fd, "image", "articles", fields.slug);
  if (img.error) return { status: "error", errors: { image: img.error } };

  const row = { ...fields, ...(img.path ? { hero_image_path: img.path } : remove_image ? { hero_image_path: null } : {}) };
  const { data: me } = await db.auth.getUser();
  const res = id
    ? await db.from("articles").update(row).eq("id", id).select("id").single()
    : await db.from("articles").insert({ ...row, author_id: me.user?.id }).select("id").single();
  if (res.error) return dup(res.error.message) ? { status: "error", errors: { slug: "Another article already uses this web address." } } : { status: "error", message: res.error.message };
  const articleId = res.data.id as string;

  await db.from("article_category_links").delete().eq("article_id", articleId);
  if (categories.length) {
    const { data: cats } = await db.from("article_categories").select("id").in("slug", categories);
    await db.from("article_category_links").insert((cats ?? []).map((c) => ({ article_id: articleId, category_id: c.id })));
  }
  await db.from("article_recipes").delete().eq("article_id", articleId);
  if (recipes.length) await db.from("article_recipes").insert(recipes.map((r) => ({ article_id: articleId, recipe_id: r })));

  await log(db, id ? "update" : "create", "article", articleId, { title: fields.title, status: fields.status });
  revalidatePath("/", "layout");
  redirect(`/admin/articles/${articleId}?saved=1`);
}

// ---------------------------------------------------------------- videos
export async function saveVideo(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = videoSchema.safeParse(formToObject(fd, ["recipes"]));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, recipes, youtube, duration, ...fields } = parsed.data;
  const row = { ...fields, provider: "youtube", provider_video_id: youtube, duration_seconds: duration };
  const res = id ? await db.from("videos").update(row).eq("id", id).select("id").single() : await db.from("videos").insert(row).select("id").single();
  if (res.error) return dup(res.error.message) ? { status: "error", errors: { slug: "Another video already uses this web address." } } : { status: "error", message: res.error.message };
  const videoId = res.data.id as string;
  await db.from("video_recipes").delete().eq("video_id", videoId);
  if (recipes.length) await db.from("video_recipes").insert(recipes.map((r) => ({ video_id: videoId, recipe_id: r })));
  await log(db, id ? "update" : "create", "video", videoId, { title: fields.title, status: fields.status });
  revalidatePath("/", "layout");
  redirect(`/admin/videos/${videoId}?saved=1`);
}

// ---------------------------------------------------------------- products
export async function saveProduct(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = productSchema.safeParse(formToObject(fd, []));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, category, retailer, remove_image, ...fields } = parsed.data;
  const img = await upload(db, fd, "image", "products", fields.slug);
  if (img.error) return { status: "error", errors: { image: img.error } };
  let category_id: number | null = null;
  if (category) {
    const { data } = await db.from("product_categories").select("id").eq("slug", category).maybeSingle();
    category_id = data?.id ?? null;
  }
  const row = {
    ...fields,
    category_id,
    retailer_id: retailer ? Number(retailer) : null,
    ...(img.path ? { image_path: img.path } : remove_image ? { image_path: null } : {}),
    // A changed link is re-checked on the next run.
    link_status: "unknown",
  };
  const res = id ? await db.from("products").update(row).eq("id", id).select("id").single() : await db.from("products").insert(row).select("id").single();
  if (res.error) return dup(res.error.message) ? { status: "error", errors: { slug: "Another product already uses this web address." } } : { status: "error", message: res.error.message };
  await log(db, id ? "update" : "create", "product", res.data.id, { name: fields.name });
  revalidatePath("/", "layout");
  redirect(`/admin/shop/${res.data.id}?saved=1`);
}

export async function saveRetailer(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await editor();
  if (!db) return NOT_ALLOWED;
  const parsed = retailerSchema.safeParse(formToObject(fd, []));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, ...row } = parsed.data;
  const res = id ? await db.from("retailers").update(row).eq("id", Number(id)) : await db.from("retailers").insert(row);
  if (res.error) return { status: "error", message: dup(res.error.message) ? "A retailer with this short name already exists." : res.error.message };
  revalidatePath("/admin/shop/retailers");
  return { status: "success", message: `Saved ${row.name}.` };
}

// ---------------------------------------------------------------- deleting (articles, videos, products)
export async function deleteContent(fd: FormData): Promise<void> {
  const db = await editor();
  const table = String(fd.get("table"));
  const id = String(fd.get("id"));
  const back = { articles: "/admin/articles", videos: "/admin/videos", products: "/admin/shop" }[table];
  if (!db || !back || !/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin");
  if (String(fd.get("confirm")) !== "DELETE") redirect(`${back}/${id}?delete=confirm`);
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) redirect(`${back}/${id}?delete=failed`);
  await log(db, "delete", table.slice(0, -1), id, {});
  revalidatePath("/", "layout");
  redirect(back);
}

// ---------------------------------------------------------------- advertising (super admins)
export async function savePlacement(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const db = await superAdmin();
  if (!db) return { status: "error", message: "Only super admins can change advertising." };
  const parsed = placementSchema.safeParse(formToObject(fd, []));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { key, ...row } = parsed.data;
  if (row.is_enabled && !row.adsense_slot && row.fallback_kind === "none") {
    return { status: "error", message: "An enabled placement needs an AdSense slot ID or a fallback." };
  }
  const { data: user } = await db.auth.getUser();
  const { error } = await db.from("ad_placements").update({ ...row, updated_by: user.user?.id }).eq("key", key);
  if (error) return { status: "error", message: error.message };
  await log(db, "update", "ad_placement", key, row);
  revalidatePath("/", "layout");
  return { status: "success", message: "Placement saved." };
}
