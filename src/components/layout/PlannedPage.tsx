import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

/**
 * Honest placeholder for a section that is part of the sitemap but is
 * built in a later phase. Not indexed by search engines.
 */
export function PlannedPage({ title, phase, summary, query }: { title: string; phase: number; summary: string; query?: string }) {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Coming in Phase {phase}</p>
        <h1 className="mt-3 text-4xl font-semibold text-forest-900 sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">{summary}</p>
        {query && (
          <p className="mt-6 rounded-xl bg-sand px-4 py-3 text-sm">
            You searched for <strong>“{query}”</strong>. Recipe search is built in Phase 2.
          </p>
        )}
        <div className="mt-8 flex justify-center">
          <LinkButton href="/" variant="secondary">
            Back to the homepage
          </LinkButton>
        </div>
      </div>
    </Container>
  );
}
