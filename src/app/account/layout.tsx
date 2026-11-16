import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getCurrentMember } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { AccountNav } from "./AccountNav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/account");
  return (
    <Container className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
