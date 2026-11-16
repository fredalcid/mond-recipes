import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/Button";
import { confirmNewsletter, unsubscribeNewsletter } from "@/app/actions/newsletter";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ action: string }>; searchParams: Promise<{ token?: string; done?: string }> };

const COPY = {
  confirm: {
    title: "Confirm your subscription",
    prompt: "Press the button to start receiving the Mònd Recipes newsletter.",
    button: "Yes, subscribe me",
    ok: "You're subscribed. Welcome! Look out for our next newsletter.",
    bad: "This confirmation link has expired or was already used. Please sign up again from the homepage.",
  },
  unsubscribe: {
    title: "Unsubscribe",
    prompt: "Press the button to stop receiving the Mònd Recipes newsletter.",
    button: "Unsubscribe me",
    ok: "You've been unsubscribed and won't receive any more newsletters.",
    bad: "This link isn't valid or you're already unsubscribed.",
  },
} as const;

/**
 * A button (not just opening the link) completes the action, so email
 * security scanners that pre-open links can't confirm or unsubscribe anyone.
 */
export default async function NewsletterActionPage({ params, searchParams }: Props) {
  const { action } = await params;
  if (action !== "confirm" && action !== "unsubscribe") notFound();
  const { token = "", done } = await searchParams;
  const copy = COPY[action];

  async function submit(formData: FormData) {
    "use server";
    const t = String(formData.get("token") ?? "");
    const ok = action === "confirm" ? await confirmNewsletter(t) : await unsubscribeNewsletter(t);
    redirect(`/newsletter/${action}?done=${ok ? "ok" : "bad"}`);
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-[1.5rem] border border-sand-strong bg-white p-8 text-center shadow-card">
        <h1 className="text-3xl font-semibold text-forest-900">{copy.title}</h1>
        {done ? (
          <div className="mt-6">
            <FormMessage tone={done === "ok" ? "success" : "error"}>{done === "ok" ? copy.ok : copy.bad}</FormMessage>
            <div className="mt-6">
              <LinkButton href="/" variant="secondary">
                Back to Mònd Recipes
              </LinkButton>
            </div>
          </div>
        ) : /^[0-9a-f]{64}$/.test(token) ? (
          <form action={submit} className="mt-6">
            <p className="text-ink-muted">{copy.prompt}</p>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="mt-6 min-h-12 rounded-full bg-forest-900 px-8 font-semibold text-cream hover:bg-forest-800">
              {copy.button}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <FormMessage tone="error">{copy.bad}</FormMessage>
          </div>
        )}
      </div>
    </Container>
  );
}
