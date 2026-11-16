import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/Field";
import { safeNextPath } from "@/lib/validation";
import { SignInForm } from "../AuthForms";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold text-forest-900">Welcome back</h1>
      <p className="mt-2 mb-8 text-ink-muted">Sign in to your Mònd Recipes account.</p>
      {error === "link" && (
        <div className="mb-6">
          <FormMessage tone="error">That link has expired or was already used. Please request a new one.</FormMessage>
        </div>
      )}
      <SignInForm next={safeNextPath(next)} />
      <p className="mt-8 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/join" className="font-semibold text-forest-900 underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
