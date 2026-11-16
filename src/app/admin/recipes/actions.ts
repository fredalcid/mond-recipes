"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { recipePayloadSchema, toDatabasePayload, validateImage } from "@/lib/admin-schema";
import { fieldErrors } from "@/lib/validation";

export type EditorState = { status: "idle" | "error"; message?: string; errors?: Partial<Record<string, string>> };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export async function saveRecipeAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const member = await getCurrentMember();
  if (!canEditContent(member)) return { status: "error", message: "Only editors can save recipes." };
  const supabase = (await createClient())!;

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { status: "error", message: "The form data couldn't be read. Please try again." };
  }
  const parsed = recipePayloadSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };

  const payload = toDatabasePayload(parsed.data);

  // Optional new photo. The bucket also enforces type and size limits.
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const problem = validateImage(file);
    if (problem) return { status: "error", errors: { image: problem } };
    const path = `recipes/${payload.slug}-${randomUUID().slice(0, 8)}.${EXT[file.type]}`;
    const { error } = await supabase.storage.from("recipe-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { status: "error", errors: { image: `Upload failed: ${error.message}` } };
    payload.hero_image_path = path;
  }

  const { data: id, error } = await supabase.rpc("admin_save_recipe", { p: payload });
  if (error) {
    if (/duplicate key.*slug/i.test(error.message)) return { status: "error", errors: { slug: "Another recipe already uses this web address." } };
    return { status: "error", message: error.message };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/recipes/${id}?saved=1`);
}

export async function deleteRecipeAction(formData: FormData): Promise<void> {
  const member = await getCurrentMember();
  if (!canEditContent(member)) redirect("/admin/recipes");
  const id = String(formData.get("id") ?? "");
  if (String(formData.get("confirm") ?? "") !== "DELETE") redirect(`/admin/recipes/${id}?delete=confirm`);
  const supabase = (await createClient())!;
  const { error } = await supabase.rpc("admin_delete_recipe", { p_id: id });
  if (error) redirect(`/admin/recipes/${id}?delete=failed`);
  revalidatePath("/", "layout");
  redirect("/admin/recipes?deleted=1");
}
