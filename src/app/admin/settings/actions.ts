"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { validateImage } from "@/lib/admin-schema";
import { HOMEPAGE_SECTIONS, SOCIAL_NETWORKS } from "@/lib/settings";
import type { AdminFormState } from "@/components/admin/AdminForm";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").trim().slice(0, max);
const orNull = (v: string) => (v ? v : null);

async function superAdminDb() {
  const m = await getCurrentMember();
  if (!m?.emailVerified || !m.roles.includes("super_admin")) return null;
  return createClient();
}

/** Saves several settings at once; the database only lets super admins write them. */
async function save(values: Record<string, unknown>): Promise<AdminFormState> {
  const db = await superAdminDb();
  if (!db) return { status: "error", message: "Only super admins can change website settings." };
  const { data: me } = await db.auth.getUser();
  // Settings can't be NULL in the database: an empty value is stored as empty text (read back as "not set").
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: value ?? "", is_public: true, updated_by: me.user?.id, updated_at: new Date().toISOString() }));
  const { error } = await db.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { status: "error", message: `Not saved: ${error.message}` };
  updateTag("site-settings");
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved. The website shows the change straight away." };
}

async function uploadImage(fd: FormData, field: string, folder: string): Promise<{ path?: string | null; error?: string }> {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return {};
  const problem = validateImage(file);
  if (problem) return { error: problem };
  const db = await superAdminDb();
  if (!db) return { error: "Only super admins can upload here." };
  const path = `${folder}/${randomUUID().slice(0, 12)}.${EXT[file.type]}`;
  const { error } = await db.storage.from("media").upload(path, file, { contentType: file.type });
  return error ? { error: `Upload failed: ${error.message}` } : { path };
}

export async function saveBrand(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const name = text(fd, "name", 60);
  if (name.length < 2) return { status: "error", errors: { name: "Add the website name." } };
  const values: Record<string, unknown> = {
    "brand.name": name,
    "brand.tagline": text(fd, "tagline", 80),
    "brand.description": text(fd, "description", 300),
  };
  const logo = await uploadImage(fd, "logo", "brand");
  if (logo.error) return { status: "error", errors: { logo: logo.error } };
  if (logo.path) values["brand.logo_path"] = logo.path;
  else if (fd.get("remove_logo") === "on") values["brand.logo_path"] = null;
  return save(values);
}

export async function saveContact(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const email = text(fd, "email", 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", errors: { email: "Enter a valid email address." } };
  const social: { network: string; url: string }[] = [];
  const errors: Record<string, string> = {};
  for (const [key, label] of SOCIAL_NETWORKS) {
    const url = text(fd, `social_${key}`, 300);
    if (!url) continue;
    if (!/^https:\/\/\S+$/.test(url)) errors[`social_${key}`] = `${label}: use the full https:// address.`;
    else social.push({ network: key, url });
  }
  if (Object.keys(errors).length) return { status: "error", errors };
  return save({ "contact.email": orNull(email), "contact.mailing_address": orNull(text(fd, "mailing_address", 300)), "social.links": social });
}

export async function saveHomepage(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const sections = Object.fromEntries(HOMEPAGE_SECTIONS.map(([k]) => [k, fd.get(`section_${k}`) === "on"]));
  return save({
    "homepage.sections": sections,
    "newsletter.intro": text(fd, "newsletter_intro", 300),
    "footer.note": text(fd, "footer_note", 200),
  });
}

export async function saveSeoSettings(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const values: Record<string, unknown> = {
    "seo.default_title": text(fd, "default_title", 70),
    "seo.default_description": orNull(text(fd, "default_description", 300)),
    "seo.allow_indexing": fd.get("allow_indexing") === "on",
  };
  const og = await uploadImage(fd, "og_image", "social");
  if (og.error) return { status: "error", errors: { og_image: og.error } };
  if (og.path) values["seo.default_og_image_path"] = og.path;
  else if (fd.get("remove_og") === "on") values["seo.default_og_image_path"] = null;
  return save(values);
}

export async function saveAdsTxt(_p: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const lines = String(fd.get("ads_txt") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // ads.txt lines look like: google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
  const bad = lines.find((l) => !l.startsWith("#") && !/^[a-z0-9.-]+\.[a-z]{2,}\s*,\s*[^,\s]+\s*,\s*(DIRECT|RESELLER)(\s*,\s*[a-z0-9]+)?$/i.test(l));
  if (bad) return { status: "error", errors: { ads_txt: `This line doesn't look like an ads.txt entry: “${bad.slice(0, 80)}”` } };
  return save({ "ads.txt": lines.join("\n").slice(0, 5000) });
}
