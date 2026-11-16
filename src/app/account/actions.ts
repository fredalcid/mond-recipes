"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentMember } from "@/lib/auth";
import { fieldErrors } from "@/lib/validation";
import { NOTIFICATION_PREFS, checkUpload } from "@/lib/community/types";
import { checkImageFile } from "@/lib/admin-schema";

export type AccountState = { status: "idle" | "success" | "error"; message?: string; errors?: Partial<Record<string, string>> };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Use at least 2 characters.").max(60),
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,30}$/, "3 to 30 letters, numbers or underscores."),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters.").transform((v) => v || null),
  country: z.string().regex(/^[a-z0-9-]*$/).max(90),
  show_saved: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  remove_avatar: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

const RESERVED = /^(admin|administrator|moderator|mond|mondrecipes|support|help|staff|official|root|system)$/i;

export async function updateProfile(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!member || !db) return { status: "error", message: "Please sign in again." };
  const parsed = profileSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { country, remove_avatar, ...fields } = parsed.data;
  if (RESERVED.test(fields.username) && !member.roles.length) return { status: "error", errors: { username: "That username is reserved." } };

  let country_id: number | null = null;
  if (country) {
    const { data } = await db.from("countries").select("id").eq("slug", country).maybeSingle();
    country_id = data?.id ?? null;
  }

  const update: Record<string, unknown> = { ...fields, country_id };
  const file = fd.get("avatar");
  if (file instanceof File && file.size > 0) {
    const problem = checkUpload(file, "avatar") ?? (await checkImageFile(file));
    if (problem) return { status: "error", errors: { avatar: problem } };
    const path = `${member.id}/avatar-${randomUUID().slice(0, 8)}.${EXT[file.type]}`;
    const { error } = await db.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) return { status: "error", errors: { avatar: "The photo couldn't be uploaded. Make sure your email is confirmed." } };
    update.avatar_path = path;
  } else if (remove_avatar) {
    update.avatar_path = null;
  }

  // Remove the previous avatar file once it's replaced or removed.
  const { data: before } = await db.from("profiles").select("avatar_path").eq("id", member.id).single();
  const { error } = await db.from("profiles").update(update).eq("id", member.id);
  if (error) {
    if (/duplicate key/i.test(error.message)) return { status: "error", errors: { username: "That username is taken." } };
    return { status: "error", message: "Your profile couldn't be saved. Please try again." };
  }
  if (before?.avatar_path && "avatar_path" in update && before.avatar_path !== update.avatar_path) {
    await db.storage.from("avatars").remove([before.avatar_path]);
  }
  // Keep the name shown in the header in step.
  await db.auth.updateUser({ data: { display_name: fields.display_name } });
  revalidatePath(`/members/${fields.username}`);
  return { status: "success", message: "Profile saved." };
}

export async function updateNotificationPrefs(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!member || !db) return { status: "error", message: "Please sign in again." };
  const prefs = Object.fromEntries(NOTIFICATION_PREFS.map(([key]) => [key, fd.get(key) === "on"]));
  const { error } = await db.from("profiles").update({ notification_prefs: prefs }).eq("id", member.id);
  if (error) return { status: "error", message: "Your settings couldn't be saved. Please try again." };
  return { status: "success", message: "Notification settings saved." };
}

export async function unblockMember(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const id = String(fd.get("id") ?? "");
  if (member && db && /^[0-9a-f-]{36}$/i.test(id)) await db.from("blocks").delete().eq("blocker_id", member.id).eq("blocked_id", id);
  revalidatePath("/account/blocked");
}

export async function markAllRead(): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (member && db) await db.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", member.id);
  revalidatePath("/notifications");
}

export async function deletePost(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const id = String(fd.get("id") ?? "");
  if (member && db && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data: media } = await db.from("post_media").select("storage_path").eq("post_id", id);
    const { error } = await db.from("community_posts").delete().eq("id", id).eq("author_id", member.id);
    const paths = (media ?? []).map((m) => m.storage_path).filter((p): p is string => Boolean(p));
    if (!error && paths.length) await db.storage.from("community").remove(paths);
  }
  revalidatePath("/account/contributions");
  redirect("/account/contributions?deleted=1");
}

export async function deleteDraftRecipe(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const id = String(fd.get("id") ?? "");
  if (member && db && /^[0-9a-f-]{36}$/i.test(id)) await db.from("recipes").delete().eq("id", id).eq("author_id", member.id).eq("status", "draft");
  revalidatePath("/account/contributions");
  redirect("/account/contributions?deleted=1");
}

/** Removes every file under the member's own folder in a bucket. */
async function emptyFolder(service: NonNullable<ReturnType<typeof createServiceClient>>, bucket: string, prefix: string) {
  for (let i = 0; i < 20; i++) {
    const { data } = await service.storage.from(bucket).list(prefix, { limit: 1000 });
    const files = (data ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
    if (files.length === 0) return;
    await service.storage.from(bucket).remove(files);
  }
}

/**
 * Permanently deletes the account: profile, posts, comments, reviews, likes, follows,
 * notifications, saved recipes, the member's own recipes and uploaded files.
 */
export async function deleteAccount(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!member || !db) return { status: "error", message: "Please sign in again." };
  if (String(fd.get("confirm") ?? "").trim() !== "DELETE") return { status: "error", errors: { confirm: "Type DELETE to confirm." } };
  if (member.roles.includes("super_admin")) {
    return { status: "error", message: "Super admin accounts can't be deleted here. Ask another super admin to remove your role first." };
  }
  const service = createServiceClient();
  if (!service) return { status: "error", message: "Account deletion isn't switched on yet. Please contact us and we'll delete your account." };

  // Member recipes are personal content, so they go too (published ones included).
  await service.from("recipes").delete().eq("author_id", member.id);
  await emptyFolder(service, "avatars", member.id);
  await emptyFolder(service, "community", member.id);
  await emptyFolder(service, "community", `${member.id}/videos`);
  await emptyFolder(service, "recipe-images", `members/${member.id}`);
  await service.from("newsletter_subscribers").delete().eq("email", member.email);
  const { error } = await service.auth.admin.deleteUser(member.id);
  if (error) return { status: "error", message: "Your account couldn't be deleted. Please contact us and we'll do it for you." };
  await db.auth.signOut();
  redirect("/?account=deleted");
}
