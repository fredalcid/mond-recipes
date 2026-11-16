import type { Metadata } from "next";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/community/types";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

export default async function ProfilePage() {
  const member = await getCurrentMember();
  if (!member) return null; // the layout shows sign-in or "not connected"
  const db = await createClient();
  if (!db) return null;
  const [{ data: p }, { data: countries }] = await Promise.all([
    db.from("profiles").select("display_name, username, bio, avatar_path, show_saved, country:countries ( slug )").eq("id", member.id).single(),
    db.from("countries").select("slug, name").order("name"),
  ]);
  const profile = p as unknown as { display_name: string; username: string; bio: string | null; avatar_path: string | null; show_saved: boolean; country: { slug: string } | null };
  return (
    <div>
      <h1 className="text-4xl font-semibold text-forest-900">Edit profile</h1>
      <p className="mt-2 text-ink-muted">Everything here is shown on your public profile. Your email address is never shown.</p>
      <ProfileForm
        initial={{
          displayName: profile.display_name,
          username: profile.username,
          bio: profile.bio ?? "",
          country: profile.country?.slug ?? "",
          showSaved: profile.show_saved,
          avatarUrl: storageUrl("avatars", profile.avatar_path),
        }}
        countries={(countries ?? []) as { slug: string; name: string }[]}
        canUpload={member.emailVerified}
      />
    </div>
  );
}
