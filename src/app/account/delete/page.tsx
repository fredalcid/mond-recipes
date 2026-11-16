import type { Metadata } from "next";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata: Metadata = { title: "Delete account", robots: { index: false } };

export default function DeleteAccountPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-semibold text-forest-900">Delete your account</h1>
      <p className="mt-4 text-lg">This permanently deletes your account and everything you shared:</p>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>your profile, picture and username</li>
        <li>your recipes, including published ones</li>
        <li>your photos, videos, tips, comments, replies and reviews</li>
        <li>your likes, follows, saved recipes and notifications</li>
        <li>your newsletter subscription, if you have one</li>
      </ul>
      <p className="mt-4 text-ink-muted">
        This can&apos;t be undone. We may keep a minimal record of moderation decisions (without your profile) where needed to protect the community.
        If you&apos;d rather take a break, you can simply sign out.
      </p>
      <DeleteAccountForm />
    </div>
  );
}
