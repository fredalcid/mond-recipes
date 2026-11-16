import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "../AuthForms";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-forest-900">Join Mònd Recipes</h1>
      <p className="mt-2 mb-8 text-ink-muted">
        Save recipes, share your cooking and connect with food lovers. We&apos;ll ask you to confirm your email before you can post.
      </p>
      <JoinForm />
      <p className="mt-8 text-center text-sm text-ink-muted">
        Already a member?{" "}
        <Link href="/sign-in" className="font-semibold text-forest-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
