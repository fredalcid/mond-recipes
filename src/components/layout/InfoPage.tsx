import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

/** Simple layout for information pages (About, Disclosure, …). */
export function InfoPage({ title, intro, children, note }: { title: string; intro?: string; children: React.ReactNode; note?: string }) {
  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: title }]} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold text-forest-900 sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 text-xl leading-relaxed text-ink-muted">{intro}</p>}
        <div className="article-body mt-10">{children}</div>
        {note && <p className="mt-10 rounded-xl bg-sand px-4 py-3 text-sm text-ink-muted">{note}</p>}
      </div>
    </Container>
  );
}
