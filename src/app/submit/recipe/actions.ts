"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { recipePayloadSchema, toDatabasePayload, checkImageFile } from "@/lib/admin-schema";
import { fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { friendlyError } from "@/lib/community/types";
import type { EditorState } from "@/app/admin/recipes/actions";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/**
 * Saves a member's recipe as a draft or sends it for review. The database
 * function only ever stores "draft" or "pending" and the community review level,
 * whatever the form sends.
 */
export async function saveMemberRecipe(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!member || !db) return { status: "error", message: "Please sign in again." };
  if (!member.emailVerified) return { status: "error", message: "Confirm your email address before sharing recipes." };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { status: "error", message: "The form couldn't be read. Please try again." };
  }
  const intent = formData.get("intent") === "pending" ? "pending" : "draft";
  const title = String(raw.title ?? "").trim();
  const slug = raw.id ? String(raw.slug ?? "") : `${slugify(title).slice(0, 60) || "recipe"}-${randomUUID().slice(0, 6)}`;
  const parsed = recipePayloadSchema.safeParse({
    ...raw,
    slug,
    status: intent,
    verification: "community",
    seo_title: "",
    meta_description: "",
    source: { ...(raw.source as object), type: ["original", "family", "adapted", ""].includes(String((raw.source as { type?: string })?.type ?? "")) ? (raw.source as { type?: string }).type : "" },
  });
  if (!parsed.success) return { status: "error", message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };

  const v = parsed.data;
  if (intent === "pending") {
    const errors: Record<string, string> = {};
    if (!v.ingredients.some((i) => i.name)) errors.ingredients = "Add the ingredients before sending your recipe for review.";
    if (!v.steps.some((s) => s.body)) errors.steps = "Add the method before sending your recipe for review.";
    if (v.countries.length === 0) errors.countries = "Choose the country this recipe comes from.";
    if (!v.source.type) errors.source = "Tell us where the recipe comes from.";
    if (Object.keys(errors).length) return { status: "error", message: "A few things are missing.", errors };
  }

  const payload = toDatabasePayload(v);
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const problem = await checkImageFile(file);
    if (problem) return { status: "error", errors: { image: problem } };
    const path = `members/${member.id}/${slugify(title).slice(0, 40) || "recipe"}-${randomUUID().slice(0, 8)}.${EXT[file.type]}`;
    const { error } = await db.storage.from("recipe-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { status: "error", errors: { image: "The photo couldn't be uploaded. Please try again." } };
    payload.hero_image_path = path;
  }

  const { data: id, error } = await db.rpc("member_save_recipe", { p: payload });
  if (error) {
    if (/ingredients, steps and a country/.test(error.message)) return { status: "error", message: "Add ingredients, steps and a country before sending it for review." };
    if (/no longer be edited/.test(error.message)) return { status: "error", message: "This recipe has been published and can no longer be edited here." };
    return { status: "error", message: friendlyError(error.message) };
  }
  redirect(intent === "pending" ? "/account/contributions?sent=recipe" : `/submit/recipe/${id}?saved=1`);
}
