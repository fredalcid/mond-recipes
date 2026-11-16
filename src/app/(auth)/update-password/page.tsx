import type { Metadata } from "next";
import { UpdatePasswordForm } from "../AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-forest-900">Choose a new password</h1>
      <p className="mt-2 mb-8 text-ink-muted">You&apos;ll use it the next time you sign in.</p>
      <UpdatePasswordForm />
    </>
  );
}
