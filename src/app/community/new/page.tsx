import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { listChallenges } from "@/lib/community/server";
import { NewPostForm } from "./NewPostForm";

export const metadata: Metadata = { title: "Share with the community", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ kind?: string; recipe?: string; challenge?: string }> };

export default async function NewPostPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/community");
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/community/new");
  const sp = await searchParams;
  const db = (await createClient())!;
  const [{ data: profile }, challenges, recipe] = await Promise.all([
    db.from("profiles").select("is_suspended").eq("id", member.id).single(),
    listChallenges(),
    sp.recipe && /^[a-z0-9-]{1,90}$/.test(sp.recipe)
      ? db.from("recipes").select("id, title, slug, kind").eq("slug", sp.recipe).eq("status", "published").maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-4xl font-semibold text-forest-900">Share with the community</h1>
      <p className="mt-3 text-lg text-ink-muted">
        Show what you cooked, post a short video or share a tip. A moderator reviews every post before it appears, usually within a day.
      </p>
      <div className="mt-8">
        {!member.emailVerified ? (
          <FormMessage tone="info">Confirm your email address before posting. Check your inbox for the link we sent when you joined.</FormMessage>
        ) : profile?.is_suspended ? (
          <FormMessage tone="error">Your account is suspended, so you can&apos;t post right now.</FormMessage>
        ) : (
          <NewPostForm
            userId={member.id}
            initialKind={sp.kind === "video" || sp.kind === "tip" ? sp.kind : "photo"}
            recipe={recipe ? { id: recipe.id, title: recipe.title } : null}
            challenges={challenges.current.map((c) => ({ id: c.id, slug: c.slug, title: c.title }))}
            initialChallenge={sp.challenge}
          />
        )}
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        Only share photos and videos you made yourself, and don&apos;t show people who haven&apos;t agreed to appear. Read the{" "}
        <Link href="/community-guidelines" className="font-semibold underline">
          community guidelines
        </Link>
        .
      </p>
    </Container>
  );
}
