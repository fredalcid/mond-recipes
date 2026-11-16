import type { Metadata } from "next";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrefsForm } from "./PrefsForm";

export const metadata: Metadata = { title: "Notification settings", robots: { index: false } };

export default async function NotificationSettings() {
  const member = await getCurrentMember();
  if (!member) return null; // the layout shows sign-in or "not connected"
  const db = await createClient();
  if (!db) return null;
  const { data } = await db.from("profiles").select("notification_prefs").eq("id", member.id).single();
  return (
    <div>
      <h1 className="text-4xl font-semibold text-forest-900">Notification settings</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Choose what appears in your notifications on Mònd Recipes. We don&apos;t send these by email. Newsletter emails are managed separately, with
        the unsubscribe link in every newsletter.
      </p>
      <PrefsForm prefs={(data?.notification_prefs ?? {}) as Record<string, boolean>} />
    </div>
  );
}
