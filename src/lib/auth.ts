import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "super_admin" | "editor" | "moderator";

export type CurrentMember = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  roles: AppRole[];
};

/**
 * Data access layer for the signed-in member. Always verifies the session
 * with Supabase (getUser), never trusting the cookie alone.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? (user.user_metadata?.display_name as string | undefined) ?? "Member",
    emailVerified: Boolean(user.email_confirmed_at),
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}
