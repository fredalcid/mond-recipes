import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "../AuthForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-forest-900">Reset your password</h1>
      <p className="mt-2 mb-8 text-ink-muted">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
      <ResetRequestForm />
      <p className="mt-8 text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-forest-900 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
