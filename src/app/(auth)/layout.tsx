import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md">
        {!isSupabaseConfigured() && (
          <div className="mb-6">
            <FormMessage tone="info">Member accounts aren&apos;t switched on yet. They open when the database is connected.</FormMessage>
          </div>
        )}
        <div className="rounded-[1.5rem] border border-sand-strong bg-white p-6 shadow-card sm:p-10">{children}</div>
      </div>
    </Container>
  );
}
