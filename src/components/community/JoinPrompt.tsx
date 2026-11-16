"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Explains what a visitor needs to do before they can take part. */
export function JoinPrompt({ reason, action }: { reason: "signin" | "verify" | "suspended"; action: string }) {
  const pathname = usePathname();
  if (reason === "verify") {
    return <p className="rounded-xl bg-sand px-4 py-3 text-sm">Confirm your email address to {action}. Check your inbox for the link we sent when you joined.</p>;
  }
  if (reason === "suspended") {
    return <p className="rounded-xl bg-sand px-4 py-3 text-sm">Your account is suspended, so you can&apos;t {action} right now.</p>;
  }
  const next = encodeURIComponent(pathname);
  return (
    <p className="rounded-xl bg-sand px-4 py-3 text-sm">
      <Link href={`/sign-in?next=${next}`} className="font-semibold text-forest-900 underline underline-offset-4">
        Sign in
      </Link>{" "}
      or{" "}
      <Link href={`/join?next=${next}`} className="font-semibold text-forest-900 underline underline-offset-4">
        join Mònd Recipes
      </Link>{" "}
      to {action}.
    </p>
  );
}
