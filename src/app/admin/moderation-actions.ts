"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canManageMembers, canModerate } from "@/lib/admin";
import { fieldErrors } from "@/lib/validation";
import type { AdminFormState } from "@/components/admin/AdminForm";

const UUID = /^[0-9a-f-]{36}$/i;
const back = (fd: FormData, fallback: string) => {
  const to = String(fd.get("back") ?? "");
  return to.startsWith("/admin/") ? to : fallback;
};

/** Approve, reject, remove or restore a recipe, post, comment or review. */
export async function moderateItem(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const type = String(fd.get("type"));
  const id = String(fd.get("id"));
  const action = String(fd.get("action"));
  const to = back(fd, "/admin/moderation");
  if (!canModerate(member) || !db || !UUID.test(id) || !["recipe", "post", "comment", "review"].includes(type) || !["approve", "reject", "remove", "restore"].includes(action)) {
    redirect(`${to}${to.includes("?") ? "&" : "?"}error=not-allowed`);
  }
  const { error } = await db.rpc("moderate", { p_type: type, p_id: id, p_action: action, p_note: String(fd.get("note") ?? "").slice(0, 500) || null });
  revalidatePath("/", "layout");
  const sep = to.includes("?") ? "&" : "?";
  if (error) redirect(`${to}${sep}error=${encodeURIComponent(/ingredients and steps/.test(error.message) ? "needs-content" : "failed")}`);
  redirect(`${to}${sep}done=${action}`);
}

export async function dismissReport(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const id = Number(fd.get("id"));
  if (canModerate(member) && db && Number.isInteger(id)) {
    await db.rpc("dismiss_report", { p_report: id, p_note: String(fd.get("note") ?? "").slice(0, 500) || null });
  }
  revalidatePath("/admin/moderation");
  redirect(`${back(fd, "/admin/moderation?tab=reports")}&done=dismissed`);
}

export async function setSuspension(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const id = String(fd.get("id"));
  const suspend = fd.get("suspend") === "1";
  const to = back(fd, "/admin/members");
  const sep = to.includes("?") ? "&" : "?";
  if (!canManageMembers(member) || !db || !UUID.test(id)) redirect(`${to}${sep}error=not-allowed`);
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (suspend && !reason) redirect(`${to}${sep}error=reason`);
  const { error } = await db.rpc("set_member_suspension", { p_member: id, p_suspend: suspend, p_reason: reason || null });
  revalidatePath("/", "layout");
  redirect(`${to}${sep}${error ? `error=${encodeURIComponent(/staff/.test(error.message) ? "staff" : "failed")}` : `done=${suspend ? "suspended" : "restored"}`}`);
}

export async function setFeatured(fd: FormData): Promise<void> {
  const member = await getCurrentMember();
  const db = await createClient();
  const table = fd.get("table") === "post" ? "community_posts" : "profiles";
  const id = String(fd.get("id"));
  const featured = fd.get("featured") === "1";
  const to = back(fd, "/admin/members");
  const allowed = table === "profiles" ? canManageMembers(member) : canModerate(member);
  if (allowed && db && UUID.test(id)) await db.from(table).update({ is_featured: featured }).eq("id", id);
  revalidatePath("/community");
  redirect(`${to}${to.includes("?") ? "&" : "?"}done=${featured ? "featured" : "unfeatured"}`);
}

const challengeSchema = z
  .object({
    id: z.string().uuid().or(z.literal("")).optional(),
    title: z.string().trim().min(3, "Add a title.").max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only.")
      .max(90),
    description: z.string().trim().max(3000).transform((v) => v || null),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date."),
    status: z.enum(["draft", "published", "unpublished"]),
    sponsor_name: z.string().trim().max(80).transform((v) => v || null),
  })
  .refine((v) => v.ends_on >= v.starts_on, { path: ["ends_on"], message: "The end date must be after the start date." });

export async function saveChallenge(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!canModerate(member) || !db) return { status: "error", message: "You don't have permission to do this." };
  const parsed = challengeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };
  const { id, ...row } = parsed.data;
  const res = id ? await db.from("challenges").update(row).eq("id", id) : await db.from("challenges").insert(row);
  if (res.error) return { status: "error", message: /duplicate key/.test(res.error.message) ? "Another challenge already uses this web address." : res.error.message };
  revalidatePath("/community", "layout");
  return { status: "success", message: `Saved “${row.title}”.` };
}
